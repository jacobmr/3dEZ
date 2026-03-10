"""Tests for photo upload and retrieval endpoints."""

from __future__ import annotations

import io
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import Conversation, Session

pytestmark = pytest.mark.asyncio


def _headers(session_id: str) -> dict[str, str]:
    return {"X-Session-ID": session_id}


def _make_fake_image(size: int = 100) -> bytes:
    """Create a minimal valid-looking image payload."""
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * size


async def _setup_conversation(db_engine, session_id: str) -> str:
    """Create session and conversation, return conversation_id."""
    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        s = Session(id=session_id)
        db.add(s)
        await db.commit()

        conv = Conversation(session_id=session_id)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv.id


class TestUploadPhoto:
    async def test_upload_valid_photo(self, app_client: AsyncClient, db_engine, tmp_path):
        sid = str(uuid.uuid4())
        conv_id = await _setup_conversation(db_engine, sid)

        # Monkey-patch DATA_DIR to use tmp_path
        import app.api.photos as photos_mod
        original_data_dir = photos_mod.DATA_DIR
        photos_mod.DATA_DIR = tmp_path
        photos_mod.PHOTOS_DIR = tmp_path / "photos"

        try:
            resp = await app_client.post(
                f"/api/conversations/{conv_id}/photos",
                headers=_headers(sid),
                files={"file": ("test.png", _make_fake_image(), "image/png")},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "id" in data
            assert data["filename"] == "test.png"
        finally:
            photos_mod.DATA_DIR = original_data_dir
            photos_mod.PHOTOS_DIR = original_data_dir / "photos"

    async def test_upload_non_image_returns_400(self, app_client: AsyncClient, db_engine):
        sid = str(uuid.uuid4())
        conv_id = await _setup_conversation(db_engine, sid)

        resp = await app_client.post(
            f"/api/conversations/{conv_id}/photos",
            headers=_headers(sid),
            files={"file": ("doc.pdf", b"fake pdf", "application/pdf")},
        )
        assert resp.status_code == 400
        assert "image" in resp.json()["detail"].lower()

    async def test_upload_oversized_returns_413(
        self, app_client: AsyncClient, db_engine, tmp_path
    ):
        sid = str(uuid.uuid4())
        conv_id = await _setup_conversation(db_engine, sid)

        import app.api.photos as photos_mod
        original_data_dir = photos_mod.DATA_DIR
        photos_mod.DATA_DIR = tmp_path
        photos_mod.PHOTOS_DIR = tmp_path / "photos"

        try:
            huge_file = b"\x00" * (6 * 1024 * 1024)  # 6MB
            resp = await app_client.post(
                f"/api/conversations/{conv_id}/photos",
                headers=_headers(sid),
                files={"file": ("big.png", huge_file, "image/png")},
            )
            assert resp.status_code == 413
        finally:
            photos_mod.DATA_DIR = original_data_dir
            photos_mod.PHOTOS_DIR = original_data_dir / "photos"

    async def test_upload_to_wrong_session_returns_404(
        self, app_client: AsyncClient, db_engine
    ):
        sid = str(uuid.uuid4())
        conv_id = await _setup_conversation(db_engine, sid)

        other_sid = str(uuid.uuid4())
        resp = await app_client.post(
            f"/api/conversations/{conv_id}/photos",
            headers=_headers(other_sid),
            files={"file": ("test.png", _make_fake_image(), "image/png")},
        )
        assert resp.status_code == 404

    async def test_missing_session_header(self, app_client: AsyncClient):
        resp = await app_client.post(
            f"/api/conversations/{uuid.uuid4()}/photos",
            files={"file": ("test.png", _make_fake_image(), "image/png")},
        )
        assert resp.status_code == 400
