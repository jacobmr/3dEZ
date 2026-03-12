"""STL generation endpoint.

POST /api/generate accepts a category and parameters, runs the parametric
modeler pipeline, and returns binary STL bytes.

Requires Docker environment with build123d installed.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import anyio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session_id
from app.core.rate_limit import check_rate_limit
from app.db.engine import get_db
from app.db.models import Design

DATA_DIR = Path("data")

#: Rate limit: STL generations per hour per session.
GENERATIONS_PER_HOUR = 20

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_stl_filename(
    design: Design | None, category: str, design_id: str | None
) -> str:
    """Get sanitized STL filename for HTTP Content-Disposition header.

    Parameters
    ----------
    design
        The Design object (if available).
    category
        The design category.
    design_id
        The design ID (if available).

    Returns
    -------
    str
        Sanitized filename suitable for HTTP headers.
    """
    import re

    name = None
    if design and design.name:
        name = design.name
    elif design_id:
        name = design_id
    else:
        name = category

    # Sanitize: replace spaces and special chars with hyphens
    name = re.sub(r"[^a-zA-Z0-9._-]", "-", name)
    return name

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
    check_rate_limit(
        session_id, "generations", limit=GENERATIONS_PER_HOUR, window_seconds=3600,
    )

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

    # Look up design and check for cached STL
    design: Design | None = None
    if body.design_id:
        design = await db.get(Design, body.design_id)
        if design and not design.cost_approved:
            logger.warning(
                "STL generation for design %s without cost approval",
                body.design_id,
            )

        # Serve cached STL if available
        if design and design.stl_path:
            try:
                cached_bytes = await anyio.Path(design.stl_path).read_bytes()
                logger.info("Serving cached STL for design %s", body.design_id)
                stl_filename = _get_stl_filename(design, body.category, body.design_id)
                return Response(
                    content=cached_bytes,
                    media_type="application/octet-stream",
                    headers={
                        "Content-Disposition": f'attachment; filename="{stl_filename}.stl"'
                    },
                )
            except FileNotFoundError:
                logger.warning("Cached STL missing for design %s, regenerating", body.design_id)

    # Generate fresh STL
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

    # Persist to disk and record path in DB
    if design:
        try:
            stl_dir = anyio.Path(DATA_DIR / "stl" / "generated")
            await stl_dir.mkdir(parents=True, exist_ok=True)
            stl_path = stl_dir / f"{body.design_id}.stl"
            await stl_path.write_bytes(stl_bytes)
            design.stl_path = str(stl_path)
            await db.commit()
            logger.info("Cached STL for design %s at %s", body.design_id, stl_path)
        except Exception:
            logger.exception("Failed to cache STL for design %s", body.design_id)

    stl_filename = _get_stl_filename(design, body.category, body.design_id)
    return Response(
        content=stl_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{stl_filename}.stl"'
        },
    )
