"""STL generation endpoint.

POST /api/generate accepts a category and parameters, runs the parametric
modeler pipeline, and returns binary STL bytes.

Requires Docker environment with build123d installed.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

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


@router.post("/api/generate")
async def generate_stl(body: GenerateRequest) -> Response:
    """Generate an STL file from a parametric template.

    Parameters
    ----------
    body
        JSON body with ``category`` (str) and ``parameters`` (dict).

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
