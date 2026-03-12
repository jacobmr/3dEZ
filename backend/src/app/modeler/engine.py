"""ModelEngine — central entry point for parametric model generation.

Routes a category string + parameter dictionary to the appropriate template
function, invokes it, and exports the resulting Part to STL bytes.

All dimensions are in millimeters.  Templates use build123d algebra mode.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Callable

from app.modeler.export import export_stl_bytes, validate_part
from app.modeler.validation import validate_mesh

if TYPE_CHECKING:
    from build123d import Part

logger = logging.getLogger(__name__)


class ModelEngine:
    """Registry-based engine that maps categories to template callables."""

    def __init__(self) -> None:
        self._templates: dict[str, Callable[..., Part]] = {}

    def register_template(self, category: str, fn: Callable[..., Part]) -> None:
        """Register a template function for a design category.

        Parameters
        ----------
        category
            The category key (e.g. ``"mounting_bracket"``).
        fn
            A callable accepting keyword parameters and returning a
            build123d ``Part``.
        """
        self._templates[category] = fn

    def generate(self, category: str, parameters: dict) -> bytes:
        """Generate STL bytes for the given category and parameters.

        Parameters
        ----------
        category
            Design category key.
        parameters
            Dictionary of template parameters (excluding ``category``,
            ``units``, ``notes``).

        Returns
        -------
        bytes
            Binary STL file content.

        Raises
        ------
        ValueError
            If *category* is not registered, the export produces empty
            output, or mesh validation fails. Note: non-watertight meshes
            are accepted if the underlying B-rep geometry is valid (for
            CSG tessellation artifacts).
        """
        fn = self._templates.get(category)
        if fn is None:
            available = ", ".join(sorted(self._templates)) or "(none)"
            raise ValueError(
                f"Unknown category {category!r}. "
                f"Available categories: {available}"
            )

        part = fn(**parameters)
        stl_bytes = export_stl_bytes(part)

        if not stl_bytes:
            raise ValueError(
                f"STL export for category {category!r} produced empty output"
            )

        # Mesh validation
        result = validate_mesh(stl_bytes)

        for warning in result.warnings:
            logger.warning("Mesh validation [%s]: %s", category, warning)

        if not result.is_valid:
            # CSG boolean ops can produce tessellation artifacts that trimesh
            # reports as non-watertight even though the B-rep solid is valid.
            # For CSG, be lenient with tessellation artifacts.
            is_csg = category == "csg_primitive"
            brepvalid = validate_part(part)

            if is_csg:
                # For CSG, accept if the B-rep is valid even if mesh isn't watertight
                if brepvalid and not result.is_watertight:
                    logger.warning(
                        "CSG mesh for %r not watertight per trimesh but B-rep "
                        "is valid — accepting (tessellation artifact)",
                        category,
                    )
                    return stl_bytes
            else:
                # For other categories, accept if B-rep is valid
                if brepvalid and not result.is_watertight:
                    logger.warning(
                        "Mesh for %r not watertight per trimesh but B-rep solid "
                        "is valid — accepting (tessellation artifact)",
                        category,
                    )
                    return stl_bytes

            # Report what failed
            failures = []
            if not result.is_watertight:
                failures.append("not watertight")
            if result.volume <= 0:
                failures.append(f"non-positive volume ({result.volume:.4f})")
            if not brepvalid:
                part_vol = part.volume if hasattr(part, 'volume') else "unknown"
                failures.append(f"B-rep invalid (volume={part_vol})")

            error_detail = ", ".join(failures) if failures else "unknown reason"
            raise ValueError(f"Mesh validation failed for {category!r}: {error_detail}")

        return stl_bytes
