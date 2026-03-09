"""Conversation orchestrator service for the 3dEZ design wizard.

Manages multi-turn conversations with Claude, handling tool use for
parameter extraction and clarification requests.
"""

from __future__ import annotations

import base64
import json
import logging
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.claude_client import get_client
from app.core.config import get_settings
from app.db.models import Conversation, Design, Message, Photo
from app.models.designs import DesignParamsUnion
from app.models.tools import DESIGN_TOOLS
from app.prompts.design_wizard import get_system_prompt

logger = logging.getLogger(__name__)


class ConversationService:
    """Orchestrates design wizard conversations with Claude."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def start_conversation(self, session_id: str) -> Conversation:
        """Create and persist a new conversation for the given session."""
        conversation = Conversation(session_id=session_id)
        self._db.add(conversation)
        await self._db.commit()
        await self._db.refresh(conversation)
        return conversation

    async def send_message(
        self,
        conversation_id: str,
        user_content: str,
        photo_id: str | None = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Send a user message and yield response events.

        Yields dicts with ``type`` key:
        - ``{"type": "text", "content": "..."}`` for streamed text chunks
        - ``{"type": "parameters_extracted", "parameters": {...}, "design_id": "..."}``
        - ``{"type": "clarification", "question": "...", "options": [...]}``
        - ``{"type": "error", "message": "..."}`` on failure
        """
        try:
            conversation = await self._load_conversation(conversation_id)
            if conversation is None:
                yield {"type": "error", "message": "Conversation not found"}
                return

            # Persist user message
            user_msg = Message(
                conversation_id=conversation_id,
                role="user",
                content=user_content,
                photo_ids=[photo_id] if photo_id else None,
            )
            self._db.add(user_msg)
            await self._db.commit()

            # Build API messages from conversation history
            api_messages = await self._build_api_messages(
                conversation.messages + [user_msg], self._db
            )
            system_prompt = get_system_prompt(
                self._build_context(conversation)
            )

            # Call Claude with streaming, collecting tool use blocks
            assistant_text, tool_use_blocks, stop_reason = await self._call_claude(
                api_messages, system_prompt
            )

            # Yield text content
            if assistant_text:
                yield {"type": "text", "content": assistant_text}

            # Process tool use blocks
            tool_results: list[dict[str, Any]] = []
            for block in tool_use_blocks:
                tool_name = block["name"]
                tool_input = block["input"]
                tool_id = block["id"]

                if tool_name == "extract_design_parameters":
                    result_event = await self._handle_extract_parameters(
                        conversation_id, tool_input
                    )
                    yield result_event
                    tool_results.append({
                        "tool_use_id": tool_id,
                        "content": json.dumps(result_event),
                    })
                elif tool_name == "analyze_photo":
                    photo_analysis_event = {
                        "type": "photo_analysis",
                        "environment": tool_input.get("environment", ""),
                        "surface_material": tool_input.get("surface_material"),
                        "reference_objects": tool_input.get("reference_objects", []),
                        "nearby_objects": tool_input.get("nearby_objects", []),
                        "suggested_constraints": tool_input.get("suggested_constraints"),
                    }
                    yield photo_analysis_event
                    tool_results.append({
                        "tool_use_id": tool_id,
                        "content": json.dumps(photo_analysis_event),
                    })
                elif tool_name == "request_clarification":
                    clarification_event = {
                        "type": "clarification",
                        "question": tool_input.get("question", ""),
                        "options": tool_input.get("options"),
                        "parameter_name": tool_input.get("parameter_name", ""),
                    }
                    yield clarification_event
                    tool_results.append({
                        "tool_use_id": tool_id,
                        "content": json.dumps(clarification_event),
                    })

            # Save assistant message
            assistant_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=assistant_text or "",
                tool_use=(
                    [{"name": b["name"], "id": b["id"], "input": b["input"]}
                     for b in tool_use_blocks]
                    if tool_use_blocks
                    else None
                ),
            )
            self._db.add(assistant_msg)
            await self._db.commit()

            # If tool use occurred, send results back and yield follow-up
            if tool_results and stop_reason == "tool_use":
                async for event in self._handle_tool_followup(
                    conversation_id, api_messages, assistant_text,
                    tool_use_blocks, tool_results, system_prompt,
                ):
                    yield event

        except Exception:
            logger.exception("Error in send_message for conversation %s", conversation_id)
            yield {"type": "error", "message": "An unexpected error occurred"}

    async def revise_design(
        self, conversation_id: str, revision_request: str
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Request a revision to the latest design in a conversation."""
        conversation = await self._load_conversation(conversation_id)
        if conversation is None:
            yield {"type": "error", "message": "Conversation not found"}
            return

        # Find the latest design
        latest_design = await self._get_latest_design(conversation_id)
        if latest_design is None:
            yield {"type": "error", "message": "No existing design to revise"}
            return

        # Inject revision context into the message
        revision_context = (
            f"[REVISION REQUEST - v{latest_design.version}] "
            f"Current parameters: {json.dumps(latest_design.parameters)}. "
            f"User wants: {revision_request}"
        )

        async for event in self.send_message(conversation_id, revision_context):
            yield event

    async def get_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        """Return conversation data with messages and latest design."""
        conversation = await self._load_conversation(conversation_id)
        if conversation is None:
            return None

        latest_design = await self._get_latest_design(conversation_id)

        return {
            "id": conversation.id,
            "session_id": conversation.session_id,
            "title": conversation.title,
            "status": conversation.status,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "tool_use": m.tool_use,
                    "created_at": m.created_at.isoformat(),
                }
                for m in conversation.messages
            ],
            "latest_design": (
                {
                    "id": latest_design.id,
                    "category": latest_design.category,
                    "parameters": latest_design.parameters,
                    "version": latest_design.version,
                    "created_at": latest_design.created_at.isoformat(),
                }
                if latest_design
                else None
            ),
        }

    async def list_conversations(self, session_id: str) -> list[dict[str, Any]]:
        """List all conversations for a session, newest first."""
        result = await self._db.execute(
            select(Conversation)
            .where(Conversation.session_id == session_id)
            .order_by(Conversation.updated_at.desc())
        )
        conversations = result.scalars().all()

        return [
            {
                "id": c.id,
                "title": c.title,
                "status": c.status,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            }
            for c in conversations
        ]

    async def delete_conversation(self, conversation_id: str) -> None:
        """Delete a conversation and all related records (cascade)."""
        conversation = await self._load_conversation(conversation_id)
        if conversation is not None:
            await self._db.delete(conversation)
            await self._db.commit()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _load_conversation(
        self, conversation_id: str
    ) -> Conversation | None:
        """Load a conversation with its messages eagerly loaded."""
        result = await self._db.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(selectinload(Conversation.messages))
        )
        return result.scalar_one_or_none()

    async def _get_latest_design(
        self, conversation_id: str
    ) -> Design | None:
        """Return the highest-version design for a conversation."""
        result = await self._db.execute(
            select(Design)
            .where(Design.conversation_id == conversation_id)
            .order_by(Design.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def _build_api_messages(
        db_messages: list[Message],
        db: AsyncSession,
    ) -> list[dict[str, Any]]:
        """Convert DB message records to Anthropic API message format."""
        api_msgs: list[dict[str, Any]] = []
        for msg in db_messages:
            if msg.role == "user":
                if msg.photo_ids:
                    content_blocks: list[dict[str, Any]] = [
                        {"type": "text", "text": msg.content},
                    ]
                    for photo_id in msg.photo_ids:
                        photo = await db.get(Photo, photo_id)
                        if photo:
                            image_data = Path(photo.file_path).read_bytes()
                            b64 = base64.b64encode(image_data).decode()
                            content_blocks.append({
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": photo.content_type,
                                    "data": b64,
                                },
                            })
                    api_msgs.append({"role": "user", "content": content_blocks})
                else:
                    api_msgs.append({"role": "user", "content": msg.content})
            elif msg.role == "assistant":
                content_blocks: list[dict[str, Any]] = []
                if msg.content:
                    content_blocks.append({"type": "text", "text": msg.content})
                if msg.tool_use:
                    for tu in msg.tool_use:
                        content_blocks.append({
                            "type": "tool_use",
                            "id": tu["id"],
                            "name": tu["name"],
                            "input": tu["input"],
                        })
                api_msgs.append({
                    "role": "assistant",
                    "content": content_blocks if content_blocks else msg.content,
                })
            elif msg.role == "tool_result":
                # tool_result messages stored with tool_use containing the result data
                if msg.tool_use:
                    api_msgs.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tr["tool_use_id"],
                                "content": tr["content"],
                            }
                            for tr in msg.tool_use
                        ],
                    })
        return api_msgs

    @staticmethod
    def _build_context(conversation: Conversation) -> dict[str, Any] | None:
        """Build optional context dict from conversation state."""
        if not conversation.designs:
            return None
        latest = max(conversation.designs, key=lambda d: d.version)
        return {
            "design_category": latest.category,
            "revision_number": latest.version,
            "prior_parameters": latest.parameters,
        }

    async def _call_claude(
        self,
        messages: list[dict[str, Any]],
        system_prompt: str,
    ) -> tuple[str, list[dict[str, Any]], str]:
        """Call Claude API and return (text, tool_use_blocks, stop_reason).

        Uses the streaming API with ``get_final_message()`` to get both
        streamed text and complete tool_use blocks.
        """
        settings = get_settings()
        client = get_client()

        kwargs: dict[str, Any] = {
            "model": settings.CLAUDE_MODEL,
            "max_tokens": 4096,
            "messages": messages,
            "system": system_prompt,
            "tools": DESIGN_TOOLS,
        }

        response = await client.messages.create(**kwargs)

        text_parts: list[str] = []
        tool_use_blocks: list[dict[str, Any]] = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_use_blocks.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        return "".join(text_parts), tool_use_blocks, response.stop_reason

    async def _handle_extract_parameters(
        self, conversation_id: str, tool_input: dict[str, Any]
    ) -> dict[str, Any]:
        """Validate extracted parameters and save a Design record."""
        try:
            params = DesignParamsUnion.model_validate(tool_input)
        except ValidationError as exc:
            logger.warning("Parameter validation failed: %s", exc)
            return {
                "type": "error",
                "message": f"Parameter validation failed: {exc.errors()}",
            }

        # Determine next version
        latest = await self._get_latest_design(conversation_id)
        next_version = (latest.version + 1) if latest else 1

        design = Design(
            conversation_id=conversation_id,
            parameters=params.model_dump(),
            category=params.category,
            version=next_version,
        )
        self._db.add(design)
        await self._db.commit()
        await self._db.refresh(design)

        return {
            "type": "parameters_extracted",
            "parameters": params.model_dump(),
            "design_id": design.id,
        }

    async def _handle_tool_followup(
        self,
        conversation_id: str,
        original_messages: list[dict[str, Any]],
        assistant_text: str,
        tool_use_blocks: list[dict[str, Any]],
        tool_results: list[dict[str, Any]],
        system_prompt: str,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Send tool results back to Claude and yield the follow-up response."""
        # Reconstruct the full message sequence including tool results
        assistant_content: list[dict[str, Any]] = []
        if assistant_text:
            assistant_content.append({"type": "text", "text": assistant_text})
        for block in tool_use_blocks:
            assistant_content.append({
                "type": "tool_use",
                "id": block["id"],
                "name": block["name"],
                "input": block["input"],
            })

        tool_result_content = [
            {
                "type": "tool_result",
                "tool_use_id": tr["tool_use_id"],
                "content": tr["content"],
            }
            for tr in tool_results
        ]

        followup_messages = [
            *original_messages,
            {"role": "assistant", "content": assistant_content},
            {"role": "user", "content": tool_result_content},
        ]

        followup_text, _, _ = await self._call_claude(
            followup_messages, system_prompt
        )

        if followup_text:
            yield {"type": "text", "content": followup_text}

        # Save tool_result message to DB
        tool_result_msg = Message(
            conversation_id=conversation_id,
            role="tool_result",
            content="",
            tool_use=tool_results,
        )
        self._db.add(tool_result_msg)

        # Save follow-up assistant message
        if followup_text:
            followup_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=followup_text,
            )
            self._db.add(followup_msg)

        await self._db.commit()
