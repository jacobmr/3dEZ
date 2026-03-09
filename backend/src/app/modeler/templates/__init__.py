"""Template registry for parametric modeler.

Maps design category strings to their template generator functions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable

from app.modeler.templates.enclosure import generate_enclosure
from app.modeler.templates.mounting_bracket import generate_mounting_bracket
from app.modeler.templates.organizer import generate_organizer

if TYPE_CHECKING:
    from build123d import Part

TEMPLATE_REGISTRY: dict[str, Callable[..., Part]] = {
    "mounting_bracket": generate_mounting_bracket,
    "enclosure": generate_enclosure,
    "organizer": generate_organizer,
}

__all__ = [
    "TEMPLATE_REGISTRY",
    "generate_enclosure",
    "generate_mounting_bracket",
    "generate_organizer",
]
