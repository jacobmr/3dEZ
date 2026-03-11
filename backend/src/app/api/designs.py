"""Design listing, detail, duplicate, and management endpoints."""

from __future__ import annotations

import copy
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import RequestContext, get_request_context
from app.db.engine import get_db
from app.db.models import Conversation, Design

router = APIRouter(prefix="/api/designs", tags=["designs"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class RenameRequest(BaseModel):
    name: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _design_dict(d: Design) -> dict[str, Any]:
    return {
        "id": d.id,
        "conversation_id": d.conversation_id,
        "conversation_title": d.conversation.title if d.conversation else None,
        "name": d.name or (d.conversation.title if d.conversation else None),
        "category": d.category,
        "parameters": d.parameters,
        "version": d.version,
        "parent_design_id": d.parent_design_id,
        "download_count": d.download_count,
        "created_at": d.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/")
async def list_designs(
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort: str = Query(default="newest"),
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """List saved designs for the current session/user.

    Query params:
    - category: filter by design category
    - search: text search in design name or conversation title
    - sort: 'newest' (default) or 'oldest'
    """
    query = (
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Conversation.session_id.in_(ctx.all_session_ids))
        .options(selectinload(Design.conversation))
    )

    if category:
        query = query.where(Design.category == category)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            (Design.name.ilike(pattern)) | (Conversation.title.ilike(pattern))
        )

    if sort == "oldest":
        query = query.order_by(Design.created_at.asc())
    else:
        query = query.order_by(Design.created_at.desc())

    result = await db.execute(query)
    designs = result.scalars().all()

    return [_design_dict(d) for d in designs]


@router.get("/{design_id}")
async def get_design(
    design_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a single design by ID (must belong to session)."""
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Design.id == design_id, Conversation.session_id.in_(ctx.all_session_ids))
        .options(selectinload(Design.conversation))
    )
    design = result.scalar_one_or_none()

    if design is None:
        raise HTTPException(status_code=404, detail="Design not found")

    return _design_dict(design)


@router.patch("/{design_id}")
async def rename_design(
    design_id: str,
    body: RenameRequest,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Rename a design."""
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Design.id == design_id, Conversation.session_id.in_(ctx.all_session_ids))
        .options(selectinload(Design.conversation))
    )
    design = result.scalar_one_or_none()
    if design is None:
        raise HTTPException(status_code=404, detail="Design not found")

    design.name = body.name.strip()
    await db.commit()
    await db.refresh(design)

    return _design_dict(design)


@router.post("/{design_id}/duplicate")
async def duplicate_design(
    design_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Duplicate a design into a new conversation with copied parameters."""
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Design.id == design_id, Conversation.session_id.in_(ctx.all_session_ids))
        .options(selectinload(Design.conversation))
    )
    source = result.scalar_one_or_none()
    if source is None:
        raise HTTPException(status_code=404, detail="Design not found")

    source_name = source.name or (source.conversation.title if source.conversation else "Design")

    # Create new conversation for the duplicate
    new_conversation = Conversation(
        session_id=ctx.session_id,
        title=f"{source_name} (copy)",
        status="active",
    )
    db.add(new_conversation)
    await db.flush()

    # Create duplicate design with copied parameters
    new_design = Design(
        conversation_id=new_conversation.id,
        name=f"{source_name} (copy)",
        category=source.category,
        parameters=copy.deepcopy(source.parameters),
        version=1,
        parent_design_id=source.id,
    )
    db.add(new_design)
    await db.commit()
    await db.refresh(new_design)

    # Load conversation relationship for response
    result = await db.execute(
        select(Design)
        .where(Design.id == new_design.id)
        .options(selectinload(Design.conversation))
    )
    new_design = result.scalar_one()

    return _design_dict(new_design)


@router.get("/{design_id}/variants")
async def list_variants(
    design_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """List designs that were duplicated from this design."""
    # Verify ownership of parent
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Design.id == design_id, Conversation.session_id.in_(ctx.all_session_ids))
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Design not found")

    # Fetch variants
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(
            Design.parent_design_id == design_id,
            Conversation.session_id.in_(ctx.all_session_ids),
        )
        .options(selectinload(Design.conversation))
        .order_by(Design.created_at.desc())
    )
    variants = result.scalars().all()

    return [_design_dict(d) for d in variants]


@router.post("/{design_id}/download")
async def track_download(
    design_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Increment download count for a design."""
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Design.id == design_id, Conversation.session_id.in_(ctx.all_session_ids))
        .options(selectinload(Design.conversation))
    )
    design = result.scalar_one_or_none()
    if design is None:
        raise HTTPException(status_code=404, detail="Design not found")

    design.download_count = (design.download_count or 0) + 1
    await db.commit()
    await db.refresh(design)

    return _design_dict(design)
