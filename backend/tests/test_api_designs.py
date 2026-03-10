"""Tests for design listing and detail endpoints."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Conversation, Design, Session

pytestmark = pytest.mark.asyncio


def _headers(session_id: str) -> dict[str, str]:
    return {"X-Session-ID": session_id}


class TestListDesigns:
    async def test_empty_designs(self, app_client: AsyncClient):
        sid = str(uuid.uuid4())
        resp = await app_client.get("/api/designs/", headers=_headers(sid))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_lists_own_designs(self, app_client: AsyncClient, db_engine):
        """Create session/conversation/design directly in DB, then query via API."""
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
        sid = str(uuid.uuid4())

        async with factory() as db:
            session = Session(id=sid)
            db.add(session)
            await db.commit()

            conv = Conversation(session_id=sid, title="Test")
            db.add(conv)
            await db.commit()
            await db.refresh(conv)

            design = Design(
                conversation_id=conv.id,
                category="enclosure",
                parameters={"inner_width": 80},
                version=1,
            )
            db.add(design)
            await db.commit()
            await db.refresh(design)
            design_id = design.id

        resp = await app_client.get("/api/designs/", headers=_headers(sid))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["category"] == "enclosure"
        assert data[0]["id"] == design_id


class TestGetDesign:
    async def test_get_own_design(self, app_client: AsyncClient, db_engine):
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
        sid = str(uuid.uuid4())

        async with factory() as db:
            session = Session(id=sid)
            db.add(session)
            await db.commit()

            conv = Conversation(session_id=sid)
            db.add(conv)
            await db.commit()
            await db.refresh(conv)

            design = Design(
                conversation_id=conv.id,
                category="organizer",
                parameters={"width": 200, "height": 50, "depth": 150},
                version=1,
            )
            db.add(design)
            await db.commit()
            await db.refresh(design)
            design_id = design.id

        resp = await app_client.get(
            f"/api/designs/{design_id}", headers=_headers(sid)
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["category"] == "organizer"
        assert data["parameters"]["width"] == 200

    async def test_get_other_sessions_design_returns_404(
        self, app_client: AsyncClient, db_engine
    ):
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
        sid = str(uuid.uuid4())

        async with factory() as db:
            session = Session(id=sid)
            db.add(session)
            await db.commit()

            conv = Conversation(session_id=sid)
            db.add(conv)
            await db.commit()
            await db.refresh(conv)

            design = Design(
                conversation_id=conv.id,
                category="enclosure",
                parameters={},
                version=1,
            )
            db.add(design)
            await db.commit()
            await db.refresh(design)
            design_id = design.id

        # Different session tries to access
        other_sid = str(uuid.uuid4())
        resp = await app_client.get(
            f"/api/designs/{design_id}", headers=_headers(other_sid)
        )
        assert resp.status_code == 404

    async def test_get_nonexistent_design_returns_404(self, app_client: AsyncClient):
        sid = str(uuid.uuid4())
        resp = await app_client.get(
            f"/api/designs/{uuid.uuid4()}", headers=_headers(sid)
        )
        assert resp.status_code == 404
