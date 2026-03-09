"""Shared FastAPI dependencies for 3dEZ API routes."""

from __future__ import annotations

import uuid

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_db
from app.db.models import Session


async def get_session_id(
    request: Request,
    x_session_id: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> str:
    """Extract and validate X-Session-ID header, upserting a Session record.

    Returns the validated session ID string.
    Raises 400 if the header is missing or not a valid UUID.
    """
    if not x_session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header is required")

    try:
        uuid.UUID(x_session_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="X-Session-ID must be a valid UUID",
        )

    # Upsert: create session record if it doesn't exist
    result = await db.execute(
        select(Session).where(Session.id == x_session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        session = Session(id=x_session_id)
        db.add(session)
        await db.commit()

    return x_session_id
