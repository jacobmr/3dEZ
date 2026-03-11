"""STL file upload and retrieval endpoints."""

from __future__ import annotations

import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequestContext, get_request_context
from app.db.engine import get_db
from app.db.models import (
    Conversation,
    StlFile,
    STL_MAX_FACE_COUNT,
    STL_MAX_SIZE_BYTES,
)

router = APIRouter(prefix="/api", tags=["stl_files"])

# Base data directory — matches Docker volume mount
DATA_DIR = Path("data")
STL_DIR = DATA_DIR / "stl"


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class StlFileResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    vertex_count: int
    face_count: int
    is_watertight: bool
    bounding_box: dict | None
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _verify_conversation_ownership(
    conversation_id: str,
    ctx: RequestContext,
    db: AsyncSession,
) -> Conversation:
    """Load a conversation and verify it belongs to the request context."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None or conversation.session_id not in ctx.all_session_ids:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


async def _verify_stl_ownership(
    stl_file_id: str,
    ctx: RequestContext,
    db: AsyncSession,
) -> StlFile:
    """Load an STL file record and verify it belongs to the request context."""
    result = await db.execute(
        select(StlFile).where(StlFile.id == stl_file_id)
    )
    stl_file = result.scalar_one_or_none()
    if stl_file is None or stl_file.session_id not in ctx.all_session_ids:
        raise HTTPException(status_code=404, detail="STL file not found")
    return stl_file


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/conversations/{conversation_id}/stl-files",
    response_model=StlFileResponse,
)
async def upload_stl(
    conversation_id: str,
    file: UploadFile,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> StlFileResponse:
    """Upload an STL file for a conversation.

    Validates:
    - Session owns the conversation
    - File has .stl extension
    - File size <= 25 MB
    - Mesh face count <= 500k
    - Mesh is watertight
    """
    # Ownership check
    conversation = await _verify_conversation_ownership(conversation_id, ctx, db)
    owner_session_id = conversation.session_id

    # Validate file extension (content type from browsers is unreliable for STL)
    original_filename = file.filename or "upload.stl"
    if not original_filename.lower().endswith(".stl"):
        raise HTTPException(
            status_code=400,
            detail="File must have a .stl extension",
        )

    # Read file content and validate size
    contents = await file.read()
    if len(contents) > STL_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {STL_MAX_SIZE_BYTES // (1024 * 1024)}MB",
        )

    # Validate with trimesh
    try:
        import trimesh

        mesh = trimesh.load(io.BytesIO(contents), file_type="stl")
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid STL file: {exc}",
        )

    vertex_count = len(mesh.vertices)
    face_count = len(mesh.faces)
    is_watertight = bool(mesh.is_watertight)

    if face_count > STL_MAX_FACE_COUNT:
        raise HTTPException(
            status_code=400,
            detail=(
                f"STL file has {face_count:,} faces, which exceeds the "
                f"maximum of {STL_MAX_FACE_COUNT:,}. Please simplify the mesh."
            ),
        )

    if not is_watertight:
        raise HTTPException(
            status_code=400,
            detail=(
                "STL mesh is not watertight (it has holes or non-manifold edges). "
                "Please repair the mesh before uploading."
            ),
        )

    # Extract bounding box
    bounds = mesh.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
    bounding_box = {
        "min": bounds[0].tolist(),
        "max": bounds[1].tolist(),
        "dimensions": (bounds[1] - bounds[0]).tolist(),
    }

    # Save to disk
    stl_id = str(uuid.uuid4())
    session_dir = STL_DIR / owner_session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    disk_filename = f"{stl_id}.stl"
    relative_path = f"stl/{owner_session_id}/{disk_filename}"
    disk_path = DATA_DIR / relative_path

    disk_path.write_bytes(contents)

    # Create DB record
    stl_file = StlFile(
        id=stl_id,
        session_id=owner_session_id,
        conversation_id=conversation_id,
        filename=original_filename,
        content_type=file.content_type or "application/octet-stream",
        file_path=relative_path,
        file_size=len(contents),
        vertex_count=vertex_count,
        face_count=face_count,
        is_watertight=is_watertight,
        bounding_box=bounding_box,
    )
    db.add(stl_file)
    await db.commit()
    await db.refresh(stl_file)

    return StlFileResponse(
        id=stl_file.id,
        filename=stl_file.filename,
        file_size=stl_file.file_size,
        vertex_count=stl_file.vertex_count,
        face_count=stl_file.face_count,
        is_watertight=stl_file.is_watertight,
        bounding_box=stl_file.bounding_box,
        created_at=stl_file.created_at.isoformat(),
    )


@router.get("/stl-files/{stl_file_id}")
async def get_stl_file(
    stl_file_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """Serve an STL file."""
    stl_file = await _verify_stl_ownership(stl_file_id, ctx, db)

    file_path = DATA_DIR / stl_file.file_path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="STL file not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type="application/octet-stream",
        filename=stl_file.filename,
    )


@router.get("/stl-files/{stl_file_id}/metadata")
async def get_stl_metadata(
    stl_file_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> StlFileResponse:
    """Get metadata for an uploaded STL file."""
    stl_file = await _verify_stl_ownership(stl_file_id, ctx, db)

    return StlFileResponse(
        id=stl_file.id,
        filename=stl_file.filename,
        file_size=stl_file.file_size,
        vertex_count=stl_file.vertex_count,
        face_count=stl_file.face_count,
        is_watertight=stl_file.is_watertight,
        bounding_box=stl_file.bounding_box,
        created_at=stl_file.created_at.isoformat(),
    )
