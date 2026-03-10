"""Tests for Claude tool schemas — ensures API compatibility."""

from __future__ import annotations

import pytest

from app.models.tools import DESIGN_TOOLS

COMPOSITION_KEYS = {"oneOf", "allOf", "anyOf"}

# All properties that should be present from the three category schemas
MOUNTING_BRACKET_PROPS = {
    "width", "height", "depth", "thickness",
    "hole_diameter", "hole_count", "lip_height",
}
ENCLOSURE_PROPS = {
    "inner_width", "inner_height", "inner_depth",
    "wall_thickness", "lid_type", "ventilation_slots",
    "cable_hole_diameter", "corner_radius",
}
ORGANIZER_PROPS = {
    "compartments_x", "compartments_y",
    "wall_thickness", "has_labels", "stackable",
    "width", "height", "depth",
}
COMMON_PROPS = {"category", "units", "notes"}

ALL_EXPECTED_PROPS = (
    COMMON_PROPS
    | MOUNTING_BRACKET_PROPS
    | ENCLOSURE_PROPS
    | ORGANIZER_PROPS
)


def _get_tool(name: str) -> dict:
    for tool in DESIGN_TOOLS:
        if tool["name"] == name:
            return tool
    raise ValueError(f"Tool {name!r} not found")


class TestNoTopLevelComposition:
    """Verify no tool's input_schema uses oneOf/allOf/anyOf at the top level."""

    @pytest.mark.parametrize("tool", DESIGN_TOOLS, ids=lambda t: t["name"])
    def test_no_top_level_composition(self, tool: dict) -> None:
        schema = tool["input_schema"]
        found = COMPOSITION_KEYS & set(schema.keys())
        assert not found, (
            f"Tool {tool['name']!r} uses {found} at the top level of input_schema"
        )


class TestExtractDesignParameters:
    """Verify the flattened extract_design_parameters schema."""

    @pytest.fixture()
    def schema(self) -> dict:
        return _get_tool("extract_design_parameters")["input_schema"]

    def test_extract_design_parameters_has_category_enum(self, schema: dict) -> None:
        props = schema["properties"]
        assert "category" in props
        assert "enum" in props["category"]
        assert set(props["category"]["enum"]) == {
            "mounting_bracket",
            "enclosure",
            "organizer",
        }

    def test_all_category_properties_present(self, schema: dict) -> None:
        props = set(schema["properties"].keys())
        missing = ALL_EXPECTED_PROPS - props
        assert not missing, f"Missing properties in flat schema: {missing}"


class TestNoArrayTypeUnions:
    """Verify no type unions like ["array", "null"] exist in any tool schema."""

    @pytest.mark.parametrize("tool", DESIGN_TOOLS, ids=lambda t: t["name"])
    def test_no_array_type_unions(self, tool: dict) -> None:
        self._check_no_type_list(tool["input_schema"], tool["name"], path="")

    def _check_no_type_list(self, obj: object, tool_name: str, path: str) -> None:
        if isinstance(obj, dict):
            if "type" in obj and isinstance(obj["type"], list):
                raise AssertionError(
                    f"Tool {tool_name!r} has type union {obj['type']} at {path or 'root'}"
                )
            for key, value in obj.items():
                self._check_no_type_list(value, tool_name, f"{path}.{key}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                self._check_no_type_list(item, tool_name, f"{path}[{i}]")
