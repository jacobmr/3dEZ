"""Tests for Claude tool definitions."""

from __future__ import annotations

from app.models.tools import DESIGN_TOOLS


class TestDesignTools:
    def test_tool_count(self):
        assert len(DESIGN_TOOLS) == 4

    def test_tool_names(self):
        names = {t["name"] for t in DESIGN_TOOLS}
        assert names == {
            "extract_design_parameters",
            "analyze_photo",
            "infer_dimensions",
            "request_clarification",
        }

    def test_all_tools_have_required_keys(self):
        for tool in DESIGN_TOOLS:
            assert "name" in tool
            assert "description" in tool
            assert "input_schema" in tool
            assert isinstance(tool["description"], str)
            assert len(tool["description"]) > 0

    def test_extract_parameters_schema_has_discriminator(self):
        tool = next(t for t in DESIGN_TOOLS if t["name"] == "extract_design_parameters")
        schema = tool["input_schema"]
        assert "oneOf" in schema
        assert "discriminator" in schema
        assert schema["discriminator"]["propertyName"] == "category"

    def test_extract_parameters_has_three_categories(self):
        tool = next(t for t in DESIGN_TOOLS if t["name"] == "extract_design_parameters")
        variants = tool["input_schema"]["oneOf"]
        assert len(variants) == 3

        titles = {v["title"] for v in variants}
        assert titles == {
            "MountingBracketParams",
            "EnclosureParams",
            "OrganizerParams",
        }

    def test_each_variant_has_required_fields(self):
        tool = next(t for t in DESIGN_TOOLS if t["name"] == "extract_design_parameters")
        for variant in tool["input_schema"]["oneOf"]:
            assert "required" in variant
            assert "category" in variant["required"]
            assert "properties" in variant

    def test_analyze_photo_requires_environment_and_references(self):
        tool = next(t for t in DESIGN_TOOLS if t["name"] == "analyze_photo")
        assert tool["input_schema"]["required"] == ["environment", "reference_objects"]

    def test_infer_dimensions_requires_all_fields(self):
        tool = next(t for t in DESIGN_TOOLS if t["name"] == "infer_dimensions")
        assert set(tool["input_schema"]["required"]) == {
            "reference_used",
            "estimated_dimensions",
            "confidence",
            "notes",
        }

    def test_request_clarification_requires_question_and_parameter(self):
        tool = next(t for t in DESIGN_TOOLS if t["name"] == "request_clarification")
        assert set(tool["input_schema"]["required"]) == {"question", "parameter_name"}
