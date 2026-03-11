"""Design parameter models for 3dEZ.

Pydantic v2 models defining the typed parameter schemas for each supported
design category.  The discriminated union ``DesignParamsUnion`` is used by
the Claude tool-use flow to validate extracted parameters.

Keep in sync with shared/design-params.ts.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Dimension constraints (mm) — practical limits for 3D printing
# ---------------------------------------------------------------------------

#: Smallest dimension a printer can reliably produce.
MIN_DIMENSION_MM = 1.0
#: Largest dimension for common desktop printers (300mm build plate).
MAX_DIMENSION_MM = 500.0
#: Minimum wall / material thickness for structural integrity.
MIN_THICKNESS_MM = 0.4
#: Maximum wall thickness before waste becomes unreasonable.
MAX_THICKNESS_MM = 50.0
#: Maximum hole diameter.
MAX_HOLE_MM = 100.0
#: Maximum compartments in organizer grid.
MAX_COMPARTMENTS = 20
#: Maximum number of holes in a bracket.
MAX_HOLE_COUNT = 20


class BaseDesignParams(BaseModel):
    """Fields common to every design category."""

    category: str = Field(description="Design category discriminator")
    units: Literal["mm", "in"] = Field(
        default="mm", description="Measurement unit system"
    )
    notes: str = Field(
        default="",
        max_length=500,
        description="Free-form user notes",
    )


class MountingBracketParams(BaseDesignParams):
    """Parameters for an L/U-shaped mounting bracket."""

    category: Literal["mounting_bracket"] = Field(
        description="Design category discriminator"
    )
    width: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Overall width")
    height: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Overall height")
    depth: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Overall depth / projection")
    thickness: float = Field(default=3.0, ge=MIN_THICKNESS_MM, le=MAX_THICKNESS_MM, description="Material thickness")
    hole_diameter: float = Field(
        default=4.5, ge=0, le=MAX_HOLE_MM, description="Mounting-hole diameter (0 = no holes)"
    )
    hole_count: int = Field(default=2, ge=0, le=MAX_HOLE_COUNT, description="Number of mounting holes")
    lip_height: float = Field(
        default=5.0, ge=0, le=MAX_DIMENSION_MM, description="Height of retaining lip"
    )


class EnclosureParams(BaseDesignParams):
    """Parameters for a box / enclosure with optional lid."""

    category: Literal["enclosure"] = Field(
        description="Design category discriminator"
    )
    inner_width: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Interior width")
    inner_height: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Interior height")
    inner_depth: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Interior depth")
    wall_thickness: float = Field(default=2.0, ge=MIN_THICKNESS_MM, le=MAX_THICKNESS_MM, description="Wall thickness")
    lid_type: Literal["snap", "slide", "screw", "none"] = Field(
        default="snap", description="Lid attachment method"
    )
    ventilation_slots: bool = Field(
        default=False, description="Add ventilation slot pattern"
    )
    cable_hole_diameter: float = Field(
        default=0.0, ge=0, le=MAX_HOLE_MM, description="Cable pass-through hole diameter (0 = none)"
    )
    corner_radius: float = Field(
        default=2.0, ge=0, le=MAX_THICKNESS_MM, description="Fillet radius on vertical edges"
    )


class OrganizerParams(BaseDesignParams):
    """Parameters for a grid-style desk / drawer organizer."""

    category: Literal["organizer"] = Field(
        description="Design category discriminator"
    )
    width: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Overall width")
    height: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Overall height")
    depth: float = Field(ge=MIN_DIMENSION_MM, le=MAX_DIMENSION_MM, description="Overall depth")
    compartments_x: int = Field(
        default=1, ge=1, le=MAX_COMPARTMENTS, description="Grid columns"
    )
    compartments_y: int = Field(
        default=1, ge=1, le=MAX_COMPARTMENTS, description="Grid rows"
    )
    wall_thickness: float = Field(default=1.5, ge=MIN_THICKNESS_MM, le=MAX_THICKNESS_MM, description="Wall thickness")
    has_labels: bool = Field(
        default=False, description="Emboss label areas on compartments"
    )
    stackable: bool = Field(
        default=False, description="Add stacking alignment features"
    )


# Discriminated union keyed on the ``category`` field.
DesignParamsUnion = Annotated[
    Union[MountingBracketParams, EnclosureParams, OrganizerParams],
    Field(discriminator="category"),
]
