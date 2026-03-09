"""Shared API type definitions for 3dEZ.

These Pydantic v2 models define the contract between backend and frontend.
Keep in sync with shared/api-types.ts.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """GET /api/health response."""

    status: str = Field(description="Service health status")
    service: str = Field(description="Service identifier")


class ConversationMessage(BaseModel):
    """A single message in a conversation."""

    role: Literal["user", "assistant"] = Field(description="Who sent the message")
    content: str = Field(description="Message text content")
    timestamp: str = Field(description="ISO-8601 timestamp")


class DesignParameters(BaseModel):
    """Parameters describing a 3D design."""

    category: str = Field(description="Design category (e.g. enclosure, bracket)")
    dimensions: dict[str, float] = Field(
        default_factory=dict, description="Named dimensions in mm"
    )
    features: dict[str, Any] = Field(
        default_factory=dict, description="Feature flags and settings"
    )
