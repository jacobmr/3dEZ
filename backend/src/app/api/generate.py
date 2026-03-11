"""STL generation endpoint.

POST /api/generate accepts a category and parameters, runs the parametric
modeler pipeline, and returns binary STL bytes.

Requires Docker environment with build123d installed.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session_id
from app.db.engine import get_db
from app.db.models import Design

logger = logging.getLogger(__name__)

router = APIRouter()

# Check if modeler dependencies are available (Docker-only)
_MODELER_AVAILABLE = True
try:
    from app.modeler import create_engine
    from app.modeler.templates import TEMPLATE_REGISTRY
except Exception:
    _MODELER_AVAILABLE = False
    TEMPLATE_REGISTRY = {}  # type: ignore[assignment]


class GenerateRequest(BaseModel):
    """Request body for STL generation."""

    category: str
    parameters: dict[str, Any]
    design_id: str | None = None


@router.post("/api/generate")
async def generate_stl(
    body: GenerateRequest,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate an STL file from a parametric template.

    Parameters
    ----------
    body
        JSON body with ``category`` (str), ``parameters`` (dict), and
        optional ``design_id`` (str).

    Returns
    -------
    Response
        Binary STL bytes with ``application/octet-stream`` content type.
    """
    if not _MODELER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Modeler not available (requires Docker environment)",
        )

    known_categories = set(TEMPLATE_REGISTRY.keys())
    if body.category not in known_categories:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown category {body.category!r}. "
                f"Available: {', '.join(sorted(known_categories))}"
            ),
        )

    # Soft gate: check cost approval if design_id provided
    if body.design_id:
        design = await db.get(Design, body.design_id)
        if design and not design.cost_approved:
            logger.warning(
                "STL generation for design %s without cost approval",
                body.design_id,
            )

    try:
        engine = create_engine()
        stl_bytes = engine.generate(body.category, body.parameters)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("STL generation failed for %s", body.category)
        raise HTTPException(
            status_code=500, detail=f"Generation failed: {exc}"
        ) from exc

    return Response(
        content=stl_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{body.category}.stl"'
        },
    )
