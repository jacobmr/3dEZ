"""Tests for Pydantic API models and design parameter schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.api import ConversationMessage, DesignParameters, HealthResponse
from app.models.designs import (
    DesignParamsUnion,
    EnclosureParams,
    MountingBracketParams,
    OrganizerParams,
)


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------


class TestHealthResponse:
    def test_valid(self):
        r = HealthResponse(status="ok", service="3dez-backend")
        assert r.status == "ok"
        assert r.service == "3dez-backend"


class TestConversationMessage:
    def test_valid_user_message(self):
        m = ConversationMessage(
            role="user", content="hello", timestamp="2024-01-01T00:00:00Z"
        )
        assert m.role == "user"

    def test_valid_assistant_message(self):
        m = ConversationMessage(
            role="assistant", content="hi", timestamp="2024-01-01T00:00:00Z"
        )
        assert m.role == "assistant"

    def test_invalid_role_rejected(self):
        with pytest.raises(ValidationError):
            ConversationMessage(
                role="system", content="x", timestamp="2024-01-01T00:00:00Z"
            )


class TestDesignParameters:
    def test_defaults(self):
        dp = DesignParameters(category="enclosure")
        assert dp.dimensions == {}
        assert dp.features == {}

    def test_with_data(self):
        dp = DesignParameters(
            category="bracket",
            dimensions={"width": 50.0},
            features={"holes": True},
        )
        assert dp.dimensions["width"] == 50.0


# ---------------------------------------------------------------------------
# Design parameter discriminated union
# ---------------------------------------------------------------------------


class TestMountingBracketParams:
    def test_valid_minimal(self):
        p = MountingBracketParams(
            category="mounting_bracket", width=50, height=30, depth=20
        )
        assert p.thickness == 3.0
        assert p.hole_diameter == 4.5
        assert p.hole_count == 2
        assert p.lip_height == 5.0
        assert p.units == "mm"

    def test_custom_values(self):
        p = MountingBracketParams(
            category="mounting_bracket",
            width=100,
            height=60,
            depth=40,
            thickness=5.0,
            hole_diameter=6.0,
            hole_count=4,
            lip_height=10.0,
            units="in",
            notes="custom bracket",
        )
        assert p.width == 100
        assert p.units == "in"
        assert p.notes == "custom bracket"

    def test_zero_width_rejected(self):
        with pytest.raises(ValidationError):
            MountingBracketParams(
                category="mounting_bracket", width=0, height=30, depth=20
            )

    def test_negative_dimension_rejected(self):
        with pytest.raises(ValidationError):
            MountingBracketParams(
                category="mounting_bracket", width=-10, height=30, depth=20
            )


class TestEnclosureParams:
    def test_valid_minimal(self):
        p = EnclosureParams(
            category="enclosure",
            inner_width=80,
            inner_height=40,
            inner_depth=60,
        )
        assert p.wall_thickness == 2.0
        assert p.lid_type == "snap"
        assert p.ventilation_slots is False
        assert p.cable_hole_diameter == 0.0
        assert p.corner_radius == 2.0

    def test_all_lid_types(self):
        for lid in ("snap", "slide", "screw", "none"):
            p = EnclosureParams(
                category="enclosure",
                inner_width=80,
                inner_height=40,
                inner_depth=60,
                lid_type=lid,
            )
            assert p.lid_type == lid

    def test_invalid_lid_type_rejected(self):
        with pytest.raises(ValidationError):
            EnclosureParams(
                category="enclosure",
                inner_width=80,
                inner_height=40,
                inner_depth=60,
                lid_type="glue",
            )


class TestOrganizerParams:
    def test_valid_minimal(self):
        p = OrganizerParams(
            category="organizer", width=200, height=50, depth=150
        )
        assert p.compartments_x == 1
        assert p.compartments_y == 1
        assert p.wall_thickness == 1.5
        assert p.has_labels is False
        assert p.stackable is False

    def test_grid_compartments(self):
        p = OrganizerParams(
            category="organizer",
            width=200,
            height=50,
            depth=150,
            compartments_x=3,
            compartments_y=2,
        )
        assert p.compartments_x == 3
        assert p.compartments_y == 2

    def test_zero_compartments_rejected(self):
        with pytest.raises(ValidationError):
            OrganizerParams(
                category="organizer",
                width=200,
                height=50,
                depth=150,
                compartments_x=0,
            )


class TestDesignParamsUnion:
    """Test the discriminated union dispatches correctly on ``category``."""

    def test_mounting_bracket_dispatch(self):
        from pydantic import TypeAdapter

        adapter = TypeAdapter(DesignParamsUnion)
        result = adapter.validate_python({
            "category": "mounting_bracket",
            "width": 50, "height": 30, "depth": 20,
        })
        assert isinstance(result, MountingBracketParams)

    def test_enclosure_dispatch(self):
        from pydantic import TypeAdapter

        adapter = TypeAdapter(DesignParamsUnion)
        result = adapter.validate_python({
            "category": "enclosure",
            "inner_width": 80, "inner_height": 40, "inner_depth": 60,
        })
        assert isinstance(result, EnclosureParams)

    def test_organizer_dispatch(self):
        from pydantic import TypeAdapter

        adapter = TypeAdapter(DesignParamsUnion)
        result = adapter.validate_python({
            "category": "organizer",
            "width": 200, "height": 50, "depth": 150,
        })
        assert isinstance(result, OrganizerParams)

    def test_unknown_category_rejected(self):
        from pydantic import TypeAdapter

        adapter = TypeAdapter(DesignParamsUnion)
        with pytest.raises(ValidationError):
            adapter.validate_python({
                "category": "spaceship",
                "width": 100, "height": 100, "depth": 100,
            })

    def test_missing_required_fields_rejected(self):
        from pydantic import TypeAdapter

        adapter = TypeAdapter(DesignParamsUnion)
        with pytest.raises(ValidationError):
            adapter.validate_python({
                "category": "mounting_bracket",
                # missing width, height, depth
            })
