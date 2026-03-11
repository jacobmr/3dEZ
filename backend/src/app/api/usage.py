"""Usage tracking endpoints for 3dEZ."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequestContext, get_request_context
from app.db.engine import get_db
from app.db.models import Conversation, Design, Message

router = APIRouter(prefix="/api/users/me", tags=["usage"])


@router.get("/usage")
async def get_usage(
    ctx: RequestContext = Depends(get_request_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return usage statistics for the current user/session.

    Returns total designs generated, total estimated cost, and
    usage for the current calendar month.
    """
    session_ids = ctx.all_session_ids

    # Total designs generated (all time)
    total_designs_result = await db.execute(
        select(func.count(Design.id))
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Conversation.session_id.in_(session_ids))
    )
    total_designs = total_designs_result.scalar() or 0

    # Total token usage (all time)
    all_messages_result = await db.execute(
        select(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.session_id.in_(session_ids))
        .where(Message.token_usage.is_not(None))
    )
    all_messages = all_messages_result.scalars().all()

    total_prompt_tokens = 0
    total_completion_tokens = 0
    for msg in all_messages:
        usage = msg.token_usage or {}
        total_prompt_tokens += usage.get("prompt_tokens", 0)
        total_completion_tokens += usage.get("completion_tokens", 0)

    total_tokens = total_prompt_tokens + total_completion_tokens

    # Approximate cost calculation (same rates as cost_estimation service)
    input_cost_per_m = 3.0
    output_cost_per_m = 15.0
    total_token_cost = (
        (total_prompt_tokens / 1_000_000) * input_cost_per_m
        + (total_completion_tokens / 1_000_000) * output_cost_per_m
    )

    # Total conversations
    total_conversations_result = await db.execute(
        select(func.count(Conversation.id))
        .where(Conversation.session_id.in_(session_ids))
    )
    total_conversations = total_conversations_result.scalar() or 0

    # This month's usage
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    month_designs_result = await db.execute(
        select(func.count(Design.id))
        .join(Conversation, Design.conversation_id == Conversation.id)
        .where(Conversation.session_id.in_(session_ids))
        .where(Design.created_at >= month_start)
    )
    month_designs = month_designs_result.scalar() or 0

    month_messages_result = await db.execute(
        select(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.session_id.in_(session_ids))
        .where(Message.token_usage.is_not(None))
        .where(Message.created_at >= month_start)
    )
    month_messages = month_messages_result.scalars().all()

    month_prompt_tokens = 0
    month_completion_tokens = 0
    for msg in month_messages:
        usage = msg.token_usage or {}
        month_prompt_tokens += usage.get("prompt_tokens", 0)
        month_completion_tokens += usage.get("completion_tokens", 0)

    month_tokens = month_prompt_tokens + month_completion_tokens
    month_token_cost = (
        (month_prompt_tokens / 1_000_000) * input_cost_per_m
        + (month_completion_tokens / 1_000_000) * output_cost_per_m
    )

    month_conversations_result = await db.execute(
        select(func.count(Conversation.id))
        .where(Conversation.session_id.in_(session_ids))
        .where(Conversation.created_at >= month_start)
    )
    month_conversations = month_conversations_result.scalar() or 0

    return {
        "total": {
            "designs": total_designs,
            "conversations": total_conversations,
            "tokens": total_tokens,
            "estimated_cost": round(total_token_cost, 4),
        },
        "this_month": {
            "designs": month_designs,
            "conversations": month_conversations,
            "tokens": month_tokens,
            "estimated_cost": round(month_token_cost, 4),
        },
        "is_authenticated": ctx.is_authenticated,
    }
