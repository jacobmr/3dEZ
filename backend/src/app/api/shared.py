"""Public endpoints for shared designs (no auth required)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.engine import get_db
from app.db.models import Design

router = APIRouter(prefix="/api/shared", tags=["shared"])


def _shared_design_dict(d: Design) -> dict[str, Any]:
    """Return a read-only view of a shared design (no session info)."""
    return {
        "id": d.id,
        "name": d.name or (d.conversation.title if d.conversation else None),
        "category": d.category,
        "parameters": d.parameters,
        "version": d.version,
        "download_count": d.download_count,
        "created_at": d.created_at.isoformat(),
    }


@router.get("/{share_token}")
async def get_shared_design(
    share_token: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """View a shared design by its share token (no auth required)."""
    result = await db.execute(
        select(Design)
        .where(Design.share_token == share_token)
        .options(selectinload(Design.conversation))
    )
    design = result.scalar_one_or_none()
    if design is None:
        raise HTTPException(status_code=404, detail="Shared design not found")

    return _shared_design_dict(design)
