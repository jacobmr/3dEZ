"""Photo upload and retrieval endpoints."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session_id
from app.db.engine import get_db
from app.db.models import Conversation, Photo, PHOTO_MAX_SIZE_BYTES

router = APIRouter(prefix="/api", tags=["photos"])

# Base data directory — matches Docker volume mount
DATA_DIR = Path("data")
PHOTOS_DIR = DATA_DIR / "photos"

ALLOWED_CONTENT_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
    }
)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class PhotoResponse(BaseModel):
    id: str
    filename: str
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _verify_conversation_ownership(
    conversation_id: str,
    session_id: str,
    db: AsyncSession,
) -> Conversation:
    """Load a conversation and verify it belongs to the given session."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None or conversation.session_id != session_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


async def _verify_photo_ownership(
    photo_id: str,
    session_id: str,
    db: AsyncSession,
) -> Photo:
    """Load a photo and verify it belongs to the given session."""
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    photo = result.scalar_one_or_none()
    if photo is None or photo.session_id != session_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/conversations/{conversation_id}/photos",
    response_model=PhotoResponse,
)
async def upload_photo(
    conversation_id: str,
    file: UploadFile,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> PhotoResponse:
    """Upload a photo for a conversation.

    Validates:
    - Session owns the conversation
    - File is an image (content_type starts with image/)
    - File size <= 5 MB
    """
    # Ownership check
    await _verify_conversation_ownership(conversation_id, session_id, db)

    # Validate content type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content and validate size
    contents = await file.read()
    if len(contents) > PHOTO_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {PHOTO_MAX_SIZE_BYTES // (1024 * 1024)}MB",
        )

    # Determine file extension
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "image/heic": ".heic",
        "image/heif": ".heif",
    }
    ext = ext_map.get(content_type, ".jpg")

    # Generate photo ID and save to disk
    photo_id = str(uuid.uuid4())
    session_dir = PHOTOS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{photo_id}{ext}"
    relative_path = f"photos/{session_id}/{filename}"
    disk_path = DATA_DIR / relative_path

    disk_path.write_bytes(contents)

    # Create DB record
    photo = Photo(
        id=photo_id,
        session_id=session_id,
        conversation_id=conversation_id,
        filename=file.filename or filename,
        content_type=content_type,
        file_path=relative_path,
        file_size=len(contents),
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)

    return PhotoResponse(
        id=photo.id,
        filename=photo.filename,
        created_at=photo.created_at.isoformat(),
    )


@router.get("/photos/{photo_id}")
async def get_photo(
    photo_id: str,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Serve a photo file."""
    photo = await _verify_photo_ownership(photo_id, session_id, db)

    file_path = DATA_DIR / photo.file_path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Photo file not found")

    return FileResponse(
        path=str(file_path),
        media_type=photo.content_type,
        filename=photo.filename,
    )
