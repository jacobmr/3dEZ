"""Tests for ModelEngine and template registry.

Note: build123d/trimesh are Docker-only dependencies. These tests mock
the actual 3D generation and focus on the engine routing logic.
"""

from __future__ import annotations

import sys
from unittest.mock import MagicMock, patch

import pytest

# Guard against missing Docker-only dependencies (trimesh, build123d).
# We mock trimesh at the sys.modules level so the engine module can import.
_trimesh_mock = MagicMock()
_trimesh_patched = "trimesh" not in sys.modules
if _trimesh_patched:
    sys.modules["trimesh"] = _trimesh_mock

from app.modeler.engine import ModelEngine  # noqa: E402


class TestModelEngine:
    def test_register_and_list_templates(self):
        engine = ModelEngine()
        mock_fn = MagicMock()
        engine.register_template("test_category", mock_fn)
        assert "test_category" in engine._templates

    def test_unknown_category_raises(self):
        engine = ModelEngine()
        with pytest.raises(ValueError, match="Unknown category"):
            engine.generate("nonexistent", {})

    def test_unknown_category_lists_available(self):
        engine = ModelEngine()
        engine.register_template("alpha", MagicMock())
        engine.register_template("beta", MagicMock())

        with pytest.raises(ValueError, match="alpha"):
            engine.generate("gamma", {})

    def test_empty_stl_raises(self):
        engine = ModelEngine()
        mock_fn = MagicMock(return_value=MagicMock())
        engine.register_template("test", mock_fn)

        with patch("app.modeler.engine.export_stl_bytes", return_value=b""):
            with pytest.raises(ValueError, match="empty output"):
                engine.generate("test", {"width": 50})

    def test_calls_template_with_parameters(self):
        engine = ModelEngine()
        mock_fn = MagicMock(return_value=MagicMock())
        engine.register_template("bracket", mock_fn)

        mock_result = MagicMock()
        mock_result.is_valid = True
        mock_result.warnings = []

        with (
            patch("app.modeler.engine.export_stl_bytes", return_value=b"\x00" * 100),
            patch("app.modeler.engine.validate_mesh", return_value=mock_result),
        ):
            result = engine.generate("bracket", {"width": 50, "height": 30})

        mock_fn.assert_called_once_with(width=50, height=30)
        assert isinstance(result, bytes)

    def test_validation_failure_raises(self):
        engine = ModelEngine()
        mock_fn = MagicMock(return_value=MagicMock())
        engine.register_template("test", mock_fn)

        mock_result = MagicMock()
        mock_result.is_valid = False
        mock_result.is_watertight = False
        mock_result.volume = -1.0
        mock_result.warnings = ["not watertight"]

        with (
            patch("app.modeler.engine.export_stl_bytes", return_value=b"\x00" * 100),
            patch("app.modeler.engine.validate_mesh", return_value=mock_result),
        ):
            with pytest.raises(ValueError, match="Mesh validation failed"):
                engine.generate("test", {})


class TestTemplateRegistry:
    def test_registry_has_all_categories(self):
        """Verify template registry has all V1 categories.
        This import will fail if build123d is not available,
        so we catch ImportError."""
        try:
            from app.modeler.templates import TEMPLATE_REGISTRY

            assert "mounting_bracket" in TEMPLATE_REGISTRY
            assert "enclosure" in TEMPLATE_REGISTRY
            assert "organizer" in TEMPLATE_REGISTRY
            assert len(TEMPLATE_REGISTRY) == 3
        except ImportError:
            pytest.skip("build123d not available (Docker-only)")

    def test_registry_values_are_callable(self):
        try:
            from app.modeler.templates import TEMPLATE_REGISTRY

            for name, fn in TEMPLATE_REGISTRY.items():
                assert callable(fn), f"{name} template is not callable"
        except ImportError:
            pytest.skip("build123d not available (Docker-only)")
