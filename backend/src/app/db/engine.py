"""Async SQLAlchemy engine, session factory, and FastAPI dependency."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

_engine = create_async_engine(
    get_settings().DATABASE_URL,
    echo=False,
    future=True,
)

_session_factory = async_sessionmaker(
    _engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields an async database session."""
    async with _session_factory() as session:
        yield session


async def create_tables() -> None:
    """Create all ORM tables (checkfirst=True by default)."""
    from app.db.models import Base  # noqa: F811 — local import avoids circular

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Inline migrations for SQLite (ALTER TABLE ADD COLUMN is idempotent-safe)
    await _run_migrations()


async def _run_migrations() -> None:
    """Add columns that create_all won't add to existing tables."""
    migrations = [
        "ALTER TABLE designs ADD COLUMN name VARCHAR(255)",
        "ALTER TABLE designs ADD COLUMN parent_design_id VARCHAR(36) REFERENCES designs(id)",
        "ALTER TABLE messages ADD COLUMN stl_file_ids JSON",
    ]
    async with _engine.begin() as conn:
        for sql in migrations:
            try:
                await conn.execute(__import__("sqlalchemy").text(sql))
            except Exception:
                # Column already exists — safe to ignore
                pass
