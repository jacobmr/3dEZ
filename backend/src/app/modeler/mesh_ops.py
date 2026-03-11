"""Mesh boolean operations and primitive generation for STL modification.

Uses trimesh with manifold3d backend for robust boolean operations.
Primitive generation uses build123d (Docker-only dependency).
"""

from __future__ import annotations

import io
import logging
import tempfile
from pathlib import Path
from typing import Any

import trimesh

from app.modeler.validation import validate_mesh

logger = logging.getLogger(__name__)


def boolean_stl(base_stl: bytes, tool_stl: bytes, operation: str) -> bytes:
    """Run a boolean operation between two STL meshes.

    Uses trimesh with manifold3d as the boolean engine.

    Parameters
    ----------
    base_stl
        Binary STL of the base mesh.
    tool_stl
        Binary STL of the tool mesh.
    operation
        One of ``'union'``, ``'difference'``, ``'intersection'``.

    Returns
    -------
    bytes
        Binary STL of the resulting mesh.

    Raises
    ------
    ValueError
        If the operation is unknown, inputs are invalid, or the result
        is not watertight.
    """
    valid_ops = ("union", "difference", "intersection")
    if operation not in valid_ops:
        raise ValueError(
            f"Unknown operation {operation!r}. Must be one of {valid_ops}"
        )

    base = trimesh.load(io.BytesIO(base_stl), file_type="stl")
    tool = trimesh.load(io.BytesIO(tool_stl), file_type="stl")

    if not isinstance(base, trimesh.Trimesh):
        raise ValueError("Base STL did not load as a single mesh")
    if not isinstance(tool, trimesh.Trimesh):
        raise ValueError("Tool STL did not load as a single mesh")

    logger.info(
        "Boolean %s: base=%d faces, tool=%d faces",
        operation,
        len(base.faces),
        len(tool.faces),
    )

    if operation == "union":
        result = base.union(tool, engine="manifold")
    elif operation == "difference":
        result = base.difference(tool, engine="manifold")
    else:  # intersection
        result = base.intersection(tool, engine="manifold")

    if not isinstance(result, trimesh.Trimesh):
        raise ValueError(
            f"Boolean {operation} produced unexpected result type: "
            f"{type(result).__name__}"
        )

    # Validate the result
    validation = validate_mesh(_mesh_to_stl(result))
    if not validation.is_watertight:
        logger.warning(
            "Boolean %s produced non-watertight mesh — attempting repair",
            operation,
        )
        trimesh.repair.fill_holes(result)
        trimesh.repair.fix_normals(result)

        validation = validate_mesh(_mesh_to_stl(result))
        if not validation.is_watertight:
            raise ValueError(
                f"Boolean {operation} produced non-watertight mesh "
                "that could not be repaired"
            )

    logger.info(
        "Boolean %s result: %d faces, volume=%.2f",
        operation,
        len(result.faces),
        result.volume,
    )

    return _mesh_to_stl(result)


def generate_primitive_stl(
    shape: str,
    dimensions: dict[str, Any],
    position: dict[str, float] | None = None,
) -> bytes:
    """Generate a primitive shape as STL bytes using build123d.

    Parameters
    ----------
    shape
        One of ``'box'``, ``'cylinder'``, ``'sphere'``.
    dimensions
        Shape dimensions in mm.
        - Box: ``width``, ``height``, ``depth``
        - Cylinder: ``radius``, ``height``
        - Sphere: ``radius``
    position
        Optional ``{x, y, z}`` offset from origin in mm.

    Returns
    -------
    bytes
        Binary STL of the primitive.
    """
    try:
        from build123d import Box, Cylinder, Sphere, Location, Part, export_stl
    except ImportError as exc:
        raise RuntimeError(
            "build123d is required for primitive generation. "
            "This must run inside the Docker container."
        ) from exc

    pos = position or {}
    x = pos.get("x", 0)
    y = pos.get("y", 0)
    z = pos.get("z", 0)

    if shape == "box":
        w = dimensions.get("width", 10)
        h = dimensions.get("height", 10)
        d = dimensions.get("depth", 10)
        part = Part() + Location((x, y, z)) * Box(w, h, d)
    elif shape == "cylinder":
        r = dimensions.get("radius", 5)
        h = dimensions.get("height", 10)
        part = Part() + Location((x, y, z)) * Cylinder(r, h)
    elif shape == "sphere":
        r = dimensions.get("radius", 5)
        part = Part() + Location((x, y, z)) * Sphere(r)
    else:
        raise ValueError(
            f"Unknown shape {shape!r}. Must be 'box', 'cylinder', or 'sphere'"
        )

    with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        export_stl(part, str(tmp_path))
        return tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)


def _mesh_to_stl(mesh: trimesh.Trimesh) -> bytes:
    """Export a trimesh mesh to binary STL bytes."""
    out = io.BytesIO()
    mesh.export(out, file_type="stl")
    return out.getvalue()
