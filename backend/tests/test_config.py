"""Tests for application configuration."""

from __future__ import annotations

from unittest.mock import patch

from app.core.config import Settings, get_settings


class TestSettings:
    def test_defaults(self):
        s = Settings(ANTHROPIC_API_KEY="test-key")
        assert s.CLAUDE_MODEL == "claude-sonnet-4-5-20250929"
        assert "sqlite" in s.DATABASE_URL
        assert s.SESSION_SECRET == "change-me-in-production"

    def test_custom_values(self):
        s = Settings(
            ANTHROPIC_API_KEY="sk-test",
            CLAUDE_MODEL="claude-haiku-4-5-20251001",
            DATABASE_URL="postgresql+asyncpg://localhost/test",
            SESSION_SECRET="super-secret",
        )
        assert s.CLAUDE_MODEL == "claude-haiku-4-5-20251001"
        assert "postgresql" in s.DATABASE_URL


class TestGetSettings:
    def test_returns_settings_instance(self):
        s = get_settings()
        assert isinstance(s, Settings)

    def test_cached(self):
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2
