"""Organizer template — grid-style tray with dividers.

Generates a build123d Part from parameter kwargs.  All dimensions in mm.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from build123d import Part

logger = logging.getLogger(__name__)


def generate_organizer(
    width: float = 150.0,
    height: float = 40.0,
    depth: float = 100.0,
    compartments_x: int = 1,
    compartments_y: int = 1,
    wall_thickness: float = 1.5,
    has_labels: bool = False,
    stackable: bool = False,
    **_kwargs: object,
) -> Part:
    """Generate a grid-style organizer tray with dividers.

    Parameters
    ----------
    width
        Overall width (X-axis).
    height
        Overall height (Z-axis).
    depth
        Overall depth (Y-axis).
    compartments_x
        Number of compartment columns.
    compartments_y
        Number of compartment rows.
    wall_thickness
        Wall and divider thickness.
    has_labels
        Whether to emboss label areas (currently ignored — future enhancement).
    stackable
        Whether to add stacking features (currently ignored — future enhancement).

    Returns
    -------
    Part
        Solid Part ready for STL export.
    """
    from build123d import Box, Pos

    wt = wall_thickness

    # 1. Outer box
    outer = Box(width, depth, height)

    # 2. Inner cutout — offset up by wall_thickness, open top
    inner_w = width - 2 * wt
    inner_d = depth - 2 * wt
    inner_h = height  # extends above to open top
    inner = Pos(0, 0, wt) * Box(inner_w, inner_d, inner_h)
    tray = outer - inner

    # 3. X dividers (vertical walls along X, spaced along width)
    #    Outer box is centered at origin: z from -height/2 to +height/2.
    #    Bottom wall is at z = -height/2 to -height/2 + wt.
    #    Dividers fill from bottom wall top to box top.
    num_x_dividers = compartments_x - 1
    if num_x_dividers > 0:
        divider_h = height - wt  # from bottom wall to top
        divider_z = wt / 2  # center of divider: shifted up by half wall_thickness
        for i in range(1, compartments_x):
            x_pos = -inner_w / 2 + i * inner_w / compartments_x
            divider = Pos(x_pos, 0, divider_z) * Box(wt, inner_d, divider_h)
            tray = tray + divider

    # 4. Y dividers (vertical walls along Y, spaced along depth)
    num_y_dividers = compartments_y - 1
    if num_y_dividers > 0:
        divider_h = height - wt
        divider_z = wt / 2
        for j in range(1, compartments_y):
            y_pos = -inner_d / 2 + j * inner_d / compartments_y
            divider = Pos(0, y_pos, divider_z) * Box(inner_w, wt, divider_h)
            tray = tray + divider

    # 5. Validate
    assert tray.volume > 0, "Organizer has zero volume"

    return tray
