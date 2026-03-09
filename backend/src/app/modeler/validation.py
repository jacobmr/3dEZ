"""Mesh validation for generated STL files.

Uses trimesh to verify watertight, manifold, and dimensional accuracy
of exported STL meshes before delivering to the user.

All dimensions are in millimeters.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field

import trimesh

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ValidationResult:
    """Result of mesh quality validation."""

    is_valid: bool
    is_watertight: bool
    is_manifold: bool
    volume: float
    extents: tuple[float, float, float]
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class DimensionResult:
    """Result of dimensional accuracy validation."""

    is_accurate: bool
    expected: dict[str, float]
    actual: dict[str, float]
    deviations: dict[str, float]


def validate_mesh(stl_bytes: bytes) -> ValidationResult:
    """Validate an STL mesh for watertight, manifold, and positive volume.

    Parameters
    ----------
    stl_bytes
        Binary STL file content.

    Returns
    -------
    ValidationResult
        Validation outcome with details.
    """
    mesh = trimesh.load(io.BytesIO(stl_bytes), file_type="stl")

    warnings: list[str] = []

    is_watertight = bool(mesh.is_watertight)
    is_winding_consistent = bool(mesh.is_winding_consistent)
    volume = float(mesh.volume)
    extents = tuple(float(v) for v in mesh.extents)

    if not is_watertight:
        warnings.append("Mesh is not watertight — may have holes")
    if not is_winding_consistent:
        warnings.append("Mesh has inconsistent face winding (normals)")
    if volume <= 0:
        warnings.append(f"Mesh has non-positive volume ({volume:.4f})")

    # is_manifold: watertight + consistent winding
    is_manifold = is_watertight and is_winding_consistent
    is_valid = is_watertight and volume > 0

    return ValidationResult(
        is_valid=is_valid,
        is_watertight=is_watertight,
        is_manifold=is_manifold,
        volume=volume,
        extents=(extents[0], extents[1], extents[2]),
        warnings=warnings,
    )


def validate_dimensions(
    stl_bytes: bytes,
    expected: dict[str, float],
    tolerance: float = 0.2,
) -> DimensionResult:
    """Validate dimensional accuracy of an STL mesh.

    Compares sorted mesh extents against sorted expected dimensions
    to account for potential axis orientation differences.

    Parameters
    ----------
    stl_bytes
        Binary STL file content.
    expected
        Dictionary mapping dimension names to expected sizes in mm
        (e.g. ``{"width": 50, "height": 30, "depth": 10}``).
    tolerance
        Maximum allowed deviation in mm (default 0.2).

    Returns
    -------
    DimensionResult
        Comparison outcome with per-dimension deviations.
    """
    mesh = trimesh.load(io.BytesIO(stl_bytes), file_type="stl")
    mesh_extents = sorted(float(v) for v in mesh.extents)

    # Sort expected values and pair with sorted extents
    expected_sorted = sorted(expected.items(), key=lambda kv: kv[1])
    dim_names = [name for name, _ in expected_sorted]
    expected_values = [val for _, val in expected_sorted]

    actual: dict[str, float] = {}
    deviations: dict[str, float] = {}
    is_accurate = True

    for i, name in enumerate(dim_names):
        actual_val = mesh_extents[i] if i < len(mesh_extents) else 0.0
        actual[name] = round(actual_val, 4)
        dev = abs(actual_val - expected_values[i])
        deviations[name] = round(dev, 4)
        if dev > tolerance:
            is_accurate = False

    return DimensionResult(
        is_accurate=is_accurate,
        expected={name: val for name, val in zip(dim_names, expected_values)},
        actual=actual,
        deviations=deviations,
    )
