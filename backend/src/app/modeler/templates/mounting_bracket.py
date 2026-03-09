"""Mounting bracket template — L-shaped bracket with mounting holes.

Generates a build123d Part from parameter kwargs.  All dimensions in mm.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from build123d import Part

logger = logging.getLogger(__name__)


def generate_mounting_bracket(
    width: float = 60.0,
    height: float = 40.0,
    depth: float = 30.0,
    thickness: float = 3.0,
    hole_diameter: float = 4.5,
    hole_count: int = 2,
    lip_height: float = 5.0,
    **_kwargs: object,
) -> Part:
    """Generate an L-shaped mounting bracket.

    Parameters
    ----------
    width
        Overall width (X-axis).
    height
        Overall height of the vertical wall (Z-axis).
    depth
        Depth / projection of the base plate (Y-axis).
    thickness
        Material thickness for walls and base.
    hole_diameter
        Mounting-hole diameter. Set to 0 for no holes.
    hole_count
        Number of mounting holes in the base plate.
    lip_height
        Height of the retaining lip at top of wall. Set to 0 for no lip.

    Returns
    -------
    Part
        Solid Part ready for STL export.
    """
    from build123d import Box, BuildPart, Cylinder, GridLocations, Pos

    # 1. Base plate — flat on XY plane
    base = Box(width, depth, thickness)

    # 2. Vertical wall at back edge
    wall = Pos(0, -depth / 2 + thickness / 2, height / 2) * Box(
        width, thickness, height
    )

    # 3. Fuse base + wall for L-bracket shape
    bracket = base + wall

    # 4. Retaining lip at top of wall, projecting forward
    if lip_height > 0:
        lip = Pos(0, -depth / 2 + thickness + thickness / 2, height - lip_height / 2) * Box(
            width, thickness, lip_height
        )
        bracket = bracket + lip

    # 5. Mounting holes in base plate using BuildPart + GridLocations
    if hole_count > 0 and hole_diameter > 0:
        spacing_x = width / (hole_count + 1)
        with BuildPart() as holes:
            with GridLocations(spacing_x, 0, hole_count, 1):
                Cylinder(hole_diameter / 2, thickness)
        bracket = bracket - holes.part

    # 6. Fillets on inner L-corner edges — LAST after all booleans
    try:
        from build123d import Axis, fillet

        inner_edges = bracket.edges().filter_by(Axis.X).sort_by(Axis.Z)
        # The inner corner edge is at z ≈ thickness, y ≈ -depth/2 + thickness
        # Apply a conservative fillet radius
        fillet_radius = min(thickness * 0.8, 2.0)
        if fillet_radius > 0 and len(inner_edges) > 0:
            # Filter edges near the inner L-corner
            target_edges = []
            for edge in inner_edges:
                center = edge.center()
                # Inner corner edges: at base-wall junction
                if (
                    abs(center.Z - thickness) < thickness
                    and center.Y < -depth / 2 + thickness * 2
                ):
                    target_edges.append(edge)
            if target_edges:
                bracket = fillet(target_edges, radius=fillet_radius)
    except Exception:
        logger.warning(
            "Fillet failed on mounting bracket — skipping fillets",
            exc_info=True,
        )

    # 7. Validate
    assert bracket.volume > 0, "Mounting bracket has zero volume"

    return bracket
