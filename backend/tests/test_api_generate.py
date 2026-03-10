"""Tests for STL generation endpoint."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestGenerateEndpoint:
    async def test_missing_category_returns_422(self, app_client: AsyncClient):
        resp = await app_client.post(
            "/api/generate",
            json={"parameters": {"width": 50}},
        )
        assert resp.status_code == 422

    async def test_unknown_category_returns_400_or_503(self, app_client: AsyncClient):
        """Returns 400 if modeler available (unknown category),
        or 503 if modeler not available (Docker-only)."""
        resp = await app_client.post(
            "/api/generate",
            json={"category": "spaceship", "parameters": {}},
        )
        assert resp.status_code in (400, 503)

    async def test_modeler_unavailable_returns_503(self, app_client: AsyncClient):
        """When build123d is not installed, should return 503."""
        import app.api.generate as gen_mod
        original = gen_mod._MODELER_AVAILABLE
        gen_mod._MODELER_AVAILABLE = False
        try:
            resp = await app_client.post(
                "/api/generate",
                json={"category": "mounting_bracket", "parameters": {"width": 50}},
            )
            assert resp.status_code == 503
            assert "Docker" in resp.json()["detail"]
        finally:
            gen_mod._MODELER_AVAILABLE = original
