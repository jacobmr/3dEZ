"""Tests for validation dataclasses (non-Docker, no trimesh needed)."""

from __future__ import annotations

import dataclasses
import sys
from unittest.mock import MagicMock

import pytest

# Mock trimesh if not available (Docker-only dependency)
if "trimesh" not in sys.modules:
    sys.modules["trimesh"] = MagicMock()

from app.modeler.validation import DimensionResult, ValidationResult  # noqa: E402


class TestValidationResult:
    def test_valid_mesh(self):
        r = ValidationResult(
            is_valid=True,
            is_watertight=True,
            is_manifold=True,
            volume=1000.0,
            extents=(50.0, 30.0, 20.0),
        )
        assert r.is_valid
        assert r.warnings == []

    def test_invalid_mesh_with_warnings(self):
        r = ValidationResult(
            is_valid=False,
            is_watertight=False,
            is_manifold=False,
            volume=-1.0,
            extents=(0.0, 0.0, 0.0),
            warnings=["not watertight", "negative volume"],
        )
        assert not r.is_valid
        assert len(r.warnings) == 2

    def test_frozen(self):
        r = ValidationResult(
            is_valid=True,
            is_watertight=True,
            is_manifold=True,
            volume=100.0,
            extents=(10.0, 10.0, 10.0),
        )
        with pytest.raises(dataclasses.FrozenInstanceError):
            r.is_valid = False


class TestDimensionResult:
    def test_accurate(self):
        r = DimensionResult(
            is_accurate=True,
            expected={"width": 50.0, "height": 30.0},
            actual={"width": 50.1, "height": 29.9},
            deviations={"width": 0.1, "height": 0.1},
        )
        assert r.is_accurate

    def test_inaccurate(self):
        r = DimensionResult(
            is_accurate=False,
            expected={"width": 50.0},
            actual={"width": 55.0},
            deviations={"width": 5.0},
        )
        assert not r.is_accurate
