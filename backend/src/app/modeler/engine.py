"""ModelEngine — central entry point for parametric model generation.

Routes a category string + parameter dictionary to the appropriate template
function, invokes it, and exports the resulting Part to STL bytes.

All dimensions are in millimeters.  Templates use build123d algebra mode.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable

from app.modeler.export import export_stl_bytes

if TYPE_CHECKING:
    from build123d import Part


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
            If *category* is not registered or the export produces empty
            output.
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

        return stl_bytes
