"""Design listing and detail endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_session_id
from app.db.engine import get_db
from app.db.models import Conversation, Design

router = APIRouter(prefix="/api/designs", tags=["designs"])


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/")
async def list_designs(
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """List saved designs for the current session, newest first."""
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Conversation.session_id == session_id)
        .options(selectinload(Design.conversation))
        .order_by(Design.created_at.desc())
    )
    designs = result.scalars().all()

    return [
        {
            "id": d.id,
            "conversation_id": d.conversation_id,
            "conversation_title": d.conversation.title if d.conversation else None,
            "category": d.category,
            "parameters": d.parameters,
            "version": d.version,
            "created_at": d.created_at.isoformat(),
        }
        for d in designs
    ]


@router.get("/{design_id}")
async def get_design(
    design_id: str,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a single design by ID (must belong to session)."""
    result = await db.execute(
        select(Design)
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Design.id == design_id, Conversation.session_id == session_id)
        .options(selectinload(Design.conversation))
    )
    design = result.scalar_one_or_none()

    if design is None:
        raise HTTPException(status_code=404, detail="Design not found")

    return {
        "id": design.id,
        "conversation_id": design.conversation_id,
        "conversation_title": design.conversation.title if design.conversation else None,
        "category": design.category,
        "parameters": design.parameters,
        "version": design.version,
        "created_at": design.created_at.isoformat(),
    }
