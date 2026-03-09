"""Thin async wrapper around the Anthropic SDK."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import anthropic

from app.core.config import get_settings

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    """Return a lazily-initialised AsyncAnthropic singleton."""
    global _client  # noqa: PLW0603
    if _client is None:
        settings = get_settings()
        _client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


async def create_message(
    messages: list[dict[str, Any]],
    *,
    system: str | None = None,
    tools: list[dict[str, Any]] | None = None,
    max_tokens: int = 4096,
) -> anthropic.types.Message:
    """Send a non-streaming message request and return the full response."""
    settings = get_settings()
    client = get_client()

    kwargs: dict[str, Any] = {
        "model": settings.CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system is not None:
        kwargs["system"] = system
    if tools is not None:
        kwargs["tools"] = tools

    return await client.messages.create(**kwargs)


async def stream_message(
    messages: list[dict[str, Any]],
    *,
    system: str | None = None,
    tools: list[dict[str, Any]] | None = None,
    max_tokens: int = 4096,
) -> AsyncIterator[str]:
    """Stream a message request, yielding text chunks as they arrive."""
    settings = get_settings()
    client = get_client()

    kwargs: dict[str, Any] = {
        "model": settings.CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system is not None:
        kwargs["system"] = system
    if tools is not None:
        kwargs["tools"] = tools

    async with client.messages.stream(**kwargs) as stream:
        async for text in stream.text_stream:
            yield text
