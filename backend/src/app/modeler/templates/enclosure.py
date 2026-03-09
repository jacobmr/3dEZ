"""Enclosure template — box shell with optional cable hole and fillets.

Generates a build123d Part from parameter kwargs.  All dimensions in mm.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from build123d import Part

logger = logging.getLogger(__name__)


def generate_enclosure(
    inner_width: float = 80.0,
    inner_height: float = 50.0,
    inner_depth: float = 60.0,
    wall_thickness: float = 2.0,
    lid_type: str = "none",
    ventilation_slots: bool = False,
    cable_hole_diameter: float = 0.0,
    corner_radius: float = 2.0,
    **_kwargs: object,
) -> Part:
    """Generate an open-top enclosure (box shell).

    Parameters
    ----------
    inner_width
        Interior width (X-axis).
    inner_height
        Interior height (Z-axis).
    inner_depth
        Interior depth (Y-axis).
    wall_thickness
        Shell wall thickness.
    lid_type
        Lid attachment method (currently ignored — future enhancement).
    ventilation_slots
        Whether to add vent slots (currently ignored — future enhancement).
    cable_hole_diameter
        Cable pass-through hole diameter on side wall. 0 = no hole.
    corner_radius
        Fillet radius on vertical outer edges. 0 = sharp corners.

    Returns
    -------
    Part
        Solid Part ready for STL export.
    """
    from build123d import Box, Cylinder, Pos, Rot

    wt = wall_thickness

    # Outer dimensions
    outer_w = inner_width + 2 * wt
    outer_d = inner_depth + 2 * wt
    outer_h = inner_height + wt  # bottom wall + inner height

    # 1. Outer box
    outer = Box(outer_w, outer_d, outer_h)

    # 2. Inner cutout — offset up by wall_thickness, extends above to open top
    inner = Pos(0, 0, wt) * Box(inner_width, inner_depth, inner_height + wt)
    shell = outer - inner

    # 3. Cable hole through side wall (Y-axis side)
    if cable_hole_diameter > 0:
        hole_z = inner_height / 2  # center of inner cavity relative to outer center
        cable_hole = Pos(0, outer_d / 2, hole_z) * Rot(90, 0, 0) * Cylinder(
            cable_hole_diameter / 2, wt * 3
        )
        shell = shell - cable_hole

    # 4. Corner fillets on vertical outer edges — LAST after all booleans
    if corner_radius > 0:
        try:
            from build123d import Axis, fillet

            vertical_edges = shell.edges().filter_by(Axis.Z)
            # Filter to outer vertical edges (at the corners of the box)
            outer_edges = []
            for edge in vertical_edges:
                center = edge.center()
                # Outer corners are near ±outer_w/2 and ±outer_d/2
                at_x_edge = abs(abs(center.X) - outer_w / 2) < 0.1
                at_y_edge = abs(abs(center.Y) - outer_d / 2) < 0.1
                if at_x_edge and at_y_edge:
                    outer_edges.append(edge)
            if outer_edges:
                safe_radius = min(corner_radius, wt * 0.9)
                shell = fillet(outer_edges, radius=safe_radius)
        except Exception:
            logger.warning(
                "Fillet failed on enclosure — skipping corner fillets",
                exc_info=True,
            )

    # 5. Validate
    assert shell.volume > 0, "Enclosure has zero volume"

    return shell
