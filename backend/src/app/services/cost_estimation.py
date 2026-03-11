"""Cost estimation service for 3dEZ design generation.

Calculates token costs, compute costs, and final pricing for a design
conversation before STL generation proceeds.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Design, Message


# ---------------------------------------------------------------------------
# Pricing constants
# ---------------------------------------------------------------------------

# Claude Sonnet pricing (per million tokens)
INPUT_TOKEN_COST_PER_M = 3.0   # $3/M input tokens
OUTPUT_TOKEN_COST_PER_M = 15.0  # $15/M output tokens

# Fixed compute cost per design category (estimated server-side generation)
COMPUTE_COST_BY_CATEGORY: dict[str, float] = {
    "mounting_bracket": 0.05,
    "enclosure": 0.08,
    "organizer": 0.06,
}
DEFAULT_COMPUTE_COST = 0.10  # For unknown / STL modification categories

# Markup multiplier (COGS -> retail price)
MARKUP_MULTIPLIER = 2.0


@dataclass
class CostEstimate:
    """Breakdown of estimated cost for a design conversation."""

    conversation_id: str
    design_id: str | None
    category: str | None

    # Token usage
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int

    # Cost breakdown (USD)
    token_cost: float
    compute_cost: float
    cogs: float
    markup_multiplier: float
    estimated_price: float

    def to_dict(self) -> dict:
        """Serialize to dict for JSON response."""
        return asdict(self)


async def estimate_cost(
    db: AsyncSession,
    conversation_id: str,
) -> CostEstimate:
    """Calculate cost estimate for a conversation's design generation.

    Sums token usage across all assistant messages, adds category-specific
    compute cost, applies markup, and returns a full breakdown.
    """
    # Sum token usage from all messages in the conversation
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.token_usage.is_not(None))
    )
    messages = result.scalars().all()

    total_prompt = 0
    total_completion = 0
    for msg in messages:
        usage = msg.token_usage or {}
        total_prompt += usage.get("prompt_tokens", 0)
        total_completion += usage.get("completion_tokens", 0)

    total_tokens = total_prompt + total_completion

    # Calculate token cost
    token_cost = (
        (total_prompt / 1_000_000) * INPUT_TOKEN_COST_PER_M
        + (total_completion / 1_000_000) * OUTPUT_TOKEN_COST_PER_M
    )

    # Get latest design for category-based compute cost
    design_result = await db.execute(
        select(Design)
        .where(Design.conversation_id == conversation_id)
        .order_by(Design.version.desc())
        .limit(1)
    )
    latest_design = design_result.scalar_one_or_none()

    category = latest_design.category if latest_design else None
    design_id = latest_design.id if latest_design else None
    compute_cost = COMPUTE_COST_BY_CATEGORY.get(
        category or "", DEFAULT_COMPUTE_COST
    )

    # COGS and final price
    cogs = token_cost + compute_cost
    estimated_price = cogs * MARKUP_MULTIPLIER

    return CostEstimate(
        conversation_id=conversation_id,
        design_id=design_id,
        category=category,
        total_prompt_tokens=total_prompt,
        total_completion_tokens=total_completion,
        total_tokens=total_tokens,
        token_cost=round(token_cost, 6),
        compute_cost=round(compute_cost, 4),
        cogs=round(cogs, 4),
        markup_multiplier=MARKUP_MULTIPLIER,
        estimated_price=round(estimated_price, 2),
    )
