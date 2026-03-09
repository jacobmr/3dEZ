"""Base template protocol for parametric modeler templates.

Every template callable must accept keyword arguments matching its Pydantic
parameter model fields (excluding ``category``, ``units``, and ``notes``)
and return a build123d ``Part`` in algebra mode.

All dimensions are in millimeters.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:
    from build123d import Part


@runtime_checkable
class TemplateProtocol(Protocol):
    """Protocol that all parametric templates must satisfy."""

    def __call__(self, **params: float | int | bool | str) -> Part:
        """Generate a solid Part from keyword parameters.

        Parameters
        ----------
        **params
            Keyword arguments matching the template's Pydantic model fields
            (excluding ``category``, ``units``, ``notes``).

        Returns
        -------
        Part
            A build123d Part with positive volume, suitable for STL export.
        """
        ...
