"""Tests for design wizard prompt generation."""

from __future__ import annotations

from app.prompts.design_wizard import DESIGN_WIZARD_SYSTEM_PROMPT, get_system_prompt


class TestGetSystemPrompt:
    def test_no_context_returns_base_prompt(self):
        result = get_system_prompt()
        assert result == DESIGN_WIZARD_SYSTEM_PROMPT

    def test_none_context_returns_base_prompt(self):
        result = get_system_prompt(None)
        assert result == DESIGN_WIZARD_SYSTEM_PROMPT

    def test_empty_dict_returns_base_prompt(self):
        result = get_system_prompt({})
        assert result == DESIGN_WIZARD_SYSTEM_PROMPT

    def test_context_with_category(self):
        result = get_system_prompt({"design_category": "enclosure"})
        assert "## Current Context" in result
        assert "Design category: enclosure" in result

    def test_context_with_revision(self):
        result = get_system_prompt({"revision_number": 3})
        assert "Revision: v3" in result

    def test_context_with_prior_parameters(self):
        params = {"width": 50, "height": 30}
        result = get_system_prompt({"prior_parameters": params})
        assert "Current parameters:" in result
        assert "50" in result

    def test_context_with_notes(self):
        result = get_system_prompt({"notes": "user wants rounded edges"})
        assert "Notes: user wants rounded edges" in result

    def test_full_context(self):
        ctx = {
            "design_category": "mounting_bracket",
            "revision_number": 2,
            "prior_parameters": {"width": 50},
            "notes": "add more holes",
        }
        result = get_system_prompt(ctx)
        assert "## Current Context" in result
        assert "mounting_bracket" in result
        assert "v2" in result
        assert "add more holes" in result

    def test_base_prompt_content(self):
        """Verify key sections exist in the base prompt."""
        prompt = DESIGN_WIZARD_SYSTEM_PROMPT
        assert "## Conversation Flow" in prompt
        assert "## Tool Usage" in prompt
        assert "## Design Categories" in prompt
        assert "## Photo Analysis" in prompt
        assert "## DIMENSION INFERENCE" in prompt
        assert "mounting_bracket" in prompt
        assert "enclosure" in prompt
        assert "organizer" in prompt
