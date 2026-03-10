"""Tests for conversation CRUD and SSE endpoints."""

from __future__ import annotations

import json
import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


def _headers(session_id: str | None = None) -> dict[str, str]:
    return {"X-Session-ID": session_id or str(uuid.uuid4())}


class TestStartConversation:
    async def test_creates_conversation(self, app_client: AsyncClient):
        headers = _headers()
        resp = await app_client.post(
            "/api/conversations/",
            json={"message": "I need a bracket"},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "conversation_id" in data
        assert data["status"] == "active"

    async def test_missing_session_header_returns_400(self, app_client: AsyncClient):
        resp = await app_client.post(
            "/api/conversations/",
            json={"message": "hello"},
        )
        assert resp.status_code == 400

    async def test_invalid_session_uuid_returns_400(self, app_client: AsyncClient):
        resp = await app_client.post(
            "/api/conversations/",
            json={"message": "hello"},
            headers={"X-Session-ID": "not-a-uuid"},
        )
        assert resp.status_code == 400


class TestListConversations:
    async def test_empty_list(self, app_client: AsyncClient):
        resp = await app_client.get(
            "/api/conversations/", headers=_headers()
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_lists_own_conversations(self, app_client: AsyncClient):
        headers = _headers()
        # Create two conversations
        await app_client.post(
            "/api/conversations/",
            json={"message": "first"},
            headers=headers,
        )
        await app_client.post(
            "/api/conversations/",
            json={"message": "second"},
            headers=headers,
        )

        resp = await app_client.get("/api/conversations/", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_isolation_between_sessions(self, app_client: AsyncClient):
        headers_a = _headers()
        headers_b = _headers()

        await app_client.post(
            "/api/conversations/",
            json={"message": "A's conversation"},
            headers=headers_a,
        )

        resp = await app_client.get("/api/conversations/", headers=headers_b)
        assert resp.status_code == 200
        assert len(resp.json()) == 0


class TestGetConversation:
    async def test_get_own_conversation(self, app_client: AsyncClient):
        headers = _headers()
        create_resp = await app_client.post(
            "/api/conversations/",
            json={"message": "test"},
            headers=headers,
        )
        conv_id = create_resp.json()["conversation_id"]

        resp = await app_client.get(
            f"/api/conversations/{conv_id}", headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == conv_id

    async def test_get_other_sessions_conversation_returns_404(
        self, app_client: AsyncClient
    ):
        headers_a = _headers()
        create_resp = await app_client.post(
            "/api/conversations/",
            json={"message": "test"},
            headers=headers_a,
        )
        conv_id = create_resp.json()["conversation_id"]

        resp = await app_client.get(
            f"/api/conversations/{conv_id}", headers=_headers()
        )
        assert resp.status_code == 404

    async def test_get_nonexistent_returns_404(self, app_client: AsyncClient):
        resp = await app_client.get(
            f"/api/conversations/{uuid.uuid4()}", headers=_headers()
        )
        assert resp.status_code == 404


class TestDeleteConversation:
    async def test_delete_own_conversation(self, app_client: AsyncClient):
        headers = _headers()
        create_resp = await app_client.post(
            "/api/conversations/",
            json={"message": "test"},
            headers=headers,
        )
        conv_id = create_resp.json()["conversation_id"]

        resp = await app_client.delete(
            f"/api/conversations/{conv_id}", headers=headers
        )
        assert resp.status_code == 204

        # Verify it's gone
        resp = await app_client.get(
            f"/api/conversations/{conv_id}", headers=headers
        )
        assert resp.status_code == 404

    async def test_delete_other_sessions_conversation_returns_404(
        self, app_client: AsyncClient
    ):
        headers_a = _headers()
        create_resp = await app_client.post(
            "/api/conversations/",
            json={"message": "test"},
            headers=headers_a,
        )
        conv_id = create_resp.json()["conversation_id"]

        resp = await app_client.delete(
            f"/api/conversations/{conv_id}", headers=_headers()
        )
        assert resp.status_code == 404


class TestPagination:
    async def test_limit_and_offset(self, app_client: AsyncClient):
        headers = _headers()
        for i in range(5):
            await app_client.post(
                "/api/conversations/",
                json={"message": f"conv {i}"},
                headers=headers,
            )

        resp = await app_client.get(
            "/api/conversations/?limit=2&offset=0", headers=headers
        )
        assert len(resp.json()) == 2

        resp = await app_client.get(
            "/api/conversations/?limit=2&offset=4", headers=headers
        )
        assert len(resp.json()) == 1
