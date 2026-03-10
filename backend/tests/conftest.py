"""Shared fixtures for 3dEZ backend tests."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.models import Base, Conversation, Design, Message, Session


# ---------------------------------------------------------------------------
# Database fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db_engine():
    """Create an in-memory SQLite engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncIterator[AsyncSession]:
    """Provide an async database session for tests."""
    factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with factory() as session:
        yield session


# ---------------------------------------------------------------------------
# Data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def session_id() -> str:
    """A valid UUID session ID."""
    return str(uuid.uuid4())


@pytest_asyncio.fixture
async def db_session_record(db_session: AsyncSession, session_id: str) -> Session:
    """Create a Session record in the DB."""
    session = Session(id=session_id)
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture
async def conversation(
    db_session: AsyncSession, db_session_record: Session
) -> Conversation:
    """Create a Conversation record in the DB."""
    conv = Conversation(session_id=db_session_record.id)
    db_session.add(conv)
    await db_session.commit()
    await db_session.refresh(conv)
    return conv


@pytest_asyncio.fixture
async def design(db_session: AsyncSession, conversation: Conversation) -> Design:
    """Create a Design record in the DB."""
    d = Design(
        conversation_id=conversation.id,
        category="mounting_bracket",
        parameters={
            "category": "mounting_bracket",
            "width": 50,
            "height": 30,
            "depth": 20,
            "thickness": 3.0,
        },
        version=1,
    )
    db_session.add(d)
    await db_session.commit()
    await db_session.refresh(d)
    return d


# ---------------------------------------------------------------------------
# FastAPI test client
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def app_client(db_engine) -> AsyncIterator[AsyncClient]:
    """Provide an httpx AsyncClient wired to the FastAPI app with test DB."""
    from app.db.engine import get_db
    from app.main import app

    factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Mock Claude client
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_claude_response():
    """Factory for mock Claude API responses."""
    def _make(text: str = "Hello!", tool_use: list[dict] | None = None):
        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = text

        content = [text_block]
        if tool_use:
            for tu in tool_use:
                block = MagicMock()
                block.type = "tool_use"
                block.id = tu.get("id", f"tu_{uuid.uuid4().hex[:8]}")
                block.name = tu["name"]
                block.input = tu["input"]
                content.append(block)

        response = MagicMock()
        response.content = content
        response.stop_reason = "tool_use" if tool_use else "end_turn"
        return response
    return _make
