"""Tests for SQLAlchemy ORM models and relationships."""

from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    PHOTO_MAX_SIZE_BYTES,
    Conversation,
    Design,
    Message,
    Photo,
    Session,
)


pytestmark = pytest.mark.asyncio


class TestSessionModel:
    async def test_create_session(self, db_session: AsyncSession, session_id: str):
        s = Session(id=session_id)
        db_session.add(s)
        await db_session.commit()

        result = await db_session.execute(
            select(Session).where(Session.id == session_id)
        )
        loaded = result.scalar_one()
        assert loaded.id == session_id
        assert loaded.created_at is not None

    async def test_session_uuid_default(self, db_session: AsyncSession):
        s = Session()
        db_session.add(s)
        await db_session.commit()
        assert len(s.id) == 36  # UUID format


class TestConversationModel:
    async def test_create_conversation(
        self, db_session: AsyncSession, db_session_record: Session
    ):
        conv = Conversation(session_id=db_session_record.id)
        db_session.add(conv)
        await db_session.commit()

        assert conv.id is not None
        assert conv.status == "active"
        assert conv.title is None

    async def test_conversation_belongs_to_session(
        self, db_session: AsyncSession, conversation: Conversation, session_id: str
    ):
        assert conversation.session_id == session_id


class TestMessageModel:
    async def test_create_user_message(
        self, db_session: AsyncSession, conversation: Conversation
    ):
        msg = Message(
            conversation_id=conversation.id,
            role="user",
            content="I need a bracket",
        )
        db_session.add(msg)
        await db_session.commit()

        assert msg.id is not None
        assert msg.role == "user"
        assert msg.tool_use is None
        assert msg.photo_ids is None

    async def test_message_with_tool_use(
        self, db_session: AsyncSession, conversation: Conversation
    ):
        tool_data = [{"name": "extract_design_parameters", "id": "tu_1", "input": {}}]
        msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content="Here's the design",
            tool_use=tool_data,
        )
        db_session.add(msg)
        await db_session.commit()

        result = await db_session.execute(
            select(Message).where(Message.id == msg.id)
        )
        loaded = result.scalar_one()
        assert loaded.tool_use == tool_data

    async def test_message_with_photo_ids(
        self, db_session: AsyncSession, conversation: Conversation
    ):
        msg = Message(
            conversation_id=conversation.id,
            role="user",
            content="Check this photo",
            photo_ids=["photo-1", "photo-2"],
        )
        db_session.add(msg)
        await db_session.commit()

        result = await db_session.execute(
            select(Message).where(Message.id == msg.id)
        )
        loaded = result.scalar_one()
        assert loaded.photo_ids == ["photo-1", "photo-2"]


class TestDesignModel:
    async def test_create_design(
        self, db_session: AsyncSession, conversation: Conversation
    ):
        d = Design(
            conversation_id=conversation.id,
            category="enclosure",
            parameters={"inner_width": 80, "inner_height": 40, "inner_depth": 60},
            version=1,
        )
        db_session.add(d)
        await db_session.commit()

        assert d.id is not None
        assert d.category == "enclosure"
        assert d.version == 1

    async def test_design_versioning(
        self, db_session: AsyncSession, conversation: Conversation
    ):
        d1 = Design(
            conversation_id=conversation.id,
            category="organizer",
            parameters={"width": 100},
            version=1,
        )
        d2 = Design(
            conversation_id=conversation.id,
            category="organizer",
            parameters={"width": 120},
            version=2,
        )
        db_session.add_all([d1, d2])
        await db_session.commit()

        result = await db_session.execute(
            select(Design)
            .where(Design.conversation_id == conversation.id)
            .order_by(Design.version.desc())
        )
        designs = result.scalars().all()
        assert len(designs) == 2
        assert designs[0].version == 2


class TestCascadeDeletes:
    async def test_delete_session_cascades(
        self, db_session: AsyncSession, db_session_record: Session
    ):
        conv = Conversation(session_id=db_session_record.id)
        db_session.add(conv)
        await db_session.commit()

        msg = Message(
            conversation_id=conv.id, role="user", content="test"
        )
        db_session.add(msg)
        await db_session.commit()

        await db_session.delete(db_session_record)
        await db_session.commit()

        result = await db_session.execute(
            select(Conversation).where(
                Conversation.session_id == db_session_record.id
            )
        )
        assert result.scalar_one_or_none() is None


class TestPhotoConstants:
    def test_max_size(self):
        assert PHOTO_MAX_SIZE_BYTES == 5 * 1024 * 1024
