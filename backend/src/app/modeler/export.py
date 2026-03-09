"""STL export utilities for the parametric modeler.

Converts build123d Part objects to STL bytes and validates geometry.
All dimensions are in millimeters.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from build123d import Part


def export_stl_bytes(
    part: Part,
    tolerance: float = 0.001,
    angular_tolerance: float = 0.1,
) -> bytes:
    """Export a build123d Part to STL bytes.

    Parameters
    ----------
    part
        The solid Part to export.
    tolerance
        Linear tessellation tolerance in mm.
    angular_tolerance
        Angular tessellation tolerance in degrees.

    Returns
    -------
    bytes
        Binary STL file content.
    """
    from build123d import export_stl

    with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        export_stl(
            part,
            file_path=str(tmp_path),
            tolerance=tolerance,
            angular_tolerance=angular_tolerance,
        )
        return tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)


def validate_part(part: Part) -> bool:
    """Check that a Part has valid, non-degenerate geometry.

    Parameters
    ----------
    part
        The Part to validate.

    Returns
    -------
    bool
        True if the part has positive volume and a positive bounding box
        in all three axes.
    """
    if part.volume <= 0:
        return False

    bbox = part.bounding_box()
    if bbox.size.X <= 0 or bbox.size.Y <= 0 or bbox.size.Z <= 0:
        return False

    return True
