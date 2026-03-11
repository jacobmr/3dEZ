"""Shared FastAPI dependencies for 3dEZ API routes."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_db
from app.db.models import Session, User
from app.services.auth import decode_token


@dataclass
class RequestContext:
    """Identity context resolved from JWT or anonymous session."""

    session_id: str
    user_id: str | None = None
    is_authenticated: bool = False
    all_session_ids: list[str] = field(default_factory=list)


async def get_request_context(
    request: Request,
    authorization: str | None = Header(default=None),
    x_session_id: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> RequestContext:
    """Resolve identity from JWT Bearer token or X-Session-ID header.

    Priority: Bearer JWT > X-Session-ID.
    Returns RequestContext with session and optional user info.
    """
    # Try JWT auth first
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        try:
            payload = decode_token(token, expected_type="access")
            user_id = payload["sub"]

            # Verify user exists
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user is not None:
                # Get all sessions belonging to this user
                sess_result = await db.execute(
                    select(Session.id).where(Session.user_id == user_id)
                )
                session_ids = [row[0] for row in sess_result.fetchall()]

                # Use X-Session-ID as primary when available so conversations
                # are always tied to the localStorage UUID. This ensures they
                # remain accessible even after JWT expiration.
                if x_session_id:
                    primary_session_id = x_session_id
                    if x_session_id not in session_ids:
                        session_ids.append(x_session_id)
                elif session_ids:
                    primary_session_id = session_ids[0]
                else:
                    new_session = Session(user_id=user_id)
                    db.add(new_session)
                    await db.flush()
                    primary_session_id = new_session.id
                    session_ids = [primary_session_id]

                return RequestContext(
                    session_id=primary_session_id,
                    user_id=user_id,
                    is_authenticated=True,
                    all_session_ids=session_ids,
                )
        except Exception:
            pass  # Fall through to anonymous session

    # Fall back to X-Session-ID
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

    return RequestContext(
        session_id=x_session_id,
        all_session_ids=[x_session_id],
    )


async def get_session_id(
    ctx: RequestContext = Depends(get_request_context),
) -> str:
    """Backward-compatible dependency returning session_id string."""
    return ctx.session_id
