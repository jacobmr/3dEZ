"""Conversation CRUD and SSE streaming endpoints."""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.api.deps import RequestContext, get_request_context, get_session_id
from app.db.engine import get_db
from app.db.models import Design, Photo, StlFile
from app.services.conversation import ConversationService
from app.services.cost_estimation import estimate_cost

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class StartConversationRequest(BaseModel):
    message: str


class ConversationSummary(BaseModel):
    id: str
    title: str | None = None
    status: str
    created_at: str
    updated_at: str


class StartConversationResponse(BaseModel):
    conversation_id: str
    title: str | None = None
    status: str


class SendMessageRequest(BaseModel):
    message: str
    photo_id: str | None = None
    stl_file_id: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _verify_conversation_ownership(
    conversation_id: str,
    ctx: RequestContext,
    service: ConversationService,
) -> dict[str, Any]:
    """Load a conversation and verify it belongs to the request context.

    Supports multi-session ownership for authenticated users.
    Returns the conversation dict.  Raises 404 on mismatch or not-found.
    """
    data = await service.get_conversation(conversation_id)
    if data is None or data["session_id"] not in ctx.all_session_ids:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return data


# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=201)
async def start_conversation(
    body: StartConversationRequest,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> StartConversationResponse:
    """Start a new conversation for the current session."""
    service = ConversationService(db)
    conversation = await service.start_conversation(session_id)
    return StartConversationResponse(
        conversation_id=conversation.id,
        title=conversation.title,
        status=conversation.status,
    )


@router.get("/")
async def list_conversations(
    limit: int = 20,
    offset: int = 0,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationSummary]:
    """List conversations for the current session/user."""
    service = ConversationService(db)
    conversations = await service.list_conversations_multi(ctx.all_session_ids)
    # Apply pagination
    page = conversations[offset : offset + limit]
    return [ConversationSummary(**c) for c in page]


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get a conversation with messages and latest design."""
    service = ConversationService(db)
    return await _verify_conversation_ownership(conversation_id, ctx, service)


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a conversation (cascade deletes messages & designs)."""
    service = ConversationService(db)
    await _verify_conversation_ownership(conversation_id, ctx, service)
    await service.delete_conversation(conversation_id)


# ---------------------------------------------------------------------------
# SSE streaming helpers
# ---------------------------------------------------------------------------

async def _sse_stream(
    events: AsyncGenerator[dict[str, Any], None],
) -> AsyncGenerator[str, None]:
    """Wrap service events as Server-Sent Events text frames.

    Each event is formatted as:
        event: {type}\n
        data: {json}\n\n

    A final ``done`` event is emitted after the source generator is exhausted.
    """
    async for event in events:
        event_type = event.get("type", "message")
        yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
    yield "event: done\ndata: {}\n\n"


# ---------------------------------------------------------------------------
# SSE streaming endpoints
# ---------------------------------------------------------------------------

@router.post("/{conversation_id}/message")
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Send a message and stream the assistant response as SSE."""
    service = ConversationService(db)
    await _verify_conversation_ownership(conversation_id, ctx, service)

    # Validate photo ownership if provided
    if body.photo_id:
        result = await db.execute(select(Photo).where(Photo.id == body.photo_id))
        photo = result.scalar_one_or_none()
        if photo is None or photo.session_id not in ctx.all_session_ids:
            raise HTTPException(status_code=404, detail="Photo not found")

    # Validate STL file ownership if provided
    if body.stl_file_id:
        result = await db.execute(
            select(StlFile).where(StlFile.id == body.stl_file_id)
        )
        stl_file = result.scalar_one_or_none()
        if stl_file is None or stl_file.session_id not in ctx.all_session_ids:
            raise HTTPException(status_code=404, detail="STL file not found")

    events = service.send_message(
        conversation_id,
        body.message,
        photo_id=body.photo_id,
        stl_file_id=body.stl_file_id,
    )
    return StreamingResponse(
        _sse_stream(events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/{conversation_id}/revise")
async def revise_design(
    conversation_id: str,
    body: SendMessageRequest,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Revise an existing design and stream the response as SSE."""
    service = ConversationService(db)
    await _verify_conversation_ownership(conversation_id, ctx, service)

    events = service.revise_design(conversation_id, body.message)
    return StreamingResponse(
        _sse_stream(events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# Cost estimation endpoints
# ---------------------------------------------------------------------------

@router.get("/{conversation_id}/cost-estimate")
async def get_cost_estimate(
    conversation_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return cost breakdown for a conversation before STL generation."""
    service = ConversationService(db)
    await _verify_conversation_ownership(conversation_id, ctx, service)

    cost = await estimate_cost(db, conversation_id)
    return cost.to_dict()


@router.post("/{conversation_id}/approve-cost", status_code=200)
async def approve_cost(
    conversation_id: str,
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Approve cost estimate so STL generation can proceed."""
    service = ConversationService(db)
    await _verify_conversation_ownership(conversation_id, ctx, service)

    # Find the latest design for this conversation
    result = await db.execute(
        select(Design)
        .where(Design.conversation_id == conversation_id)
        .order_by(Design.version.desc())
        .limit(1)
    )
    design = result.scalar_one_or_none()
    if design is None:
        raise HTTPException(
            status_code=404,
            detail="No design found for this conversation",
        )

    design.cost_approved = True
    await db.commit()
    await db.refresh(design)

    return {
        "design_id": design.id,
        "conversation_id": conversation_id,
        "cost_approved": True,
    }
