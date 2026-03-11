"""Conversation orchestrator service for the 3dEZ design wizard.

Manages multi-turn conversations with Claude, handling tool use for
parameter extraction and clarification requests.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import uuid
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.claude_client import get_client
from app.core.config import get_settings
from app.db.models import Conversation, Design, Message, Photo, StlFile
from app.models.designs import DesignParamsUnion
from app.models.tools import DESIGN_TOOLS
from app.prompts.design_wizard import get_system_prompt
from app.services.cost_estimation import estimate_cost

_params_adapter = TypeAdapter(DesignParamsUnion)

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
        stl_file_id: str | None = None,
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
                stl_file_ids=[stl_file_id] if stl_file_id else None,
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
            assistant_text, tool_use_blocks, stop_reason, usage = await self._call_claude(
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
                    # Emit cost estimate after parameters are extracted
                    if result_event.get("type") == "parameters_extracted":
                        try:
                            cost = await estimate_cost(self._db, conversation_id)
                            yield {
                                "type": "cost_estimate",
                                **cost.to_dict(),
                            }
                        except Exception:
                            logger.warning(
                                "Cost estimation failed for %s",
                                conversation_id,
                                exc_info=True,
                            )
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
                elif tool_name == "analyze_imported_stl":
                    stl_analysis_event = {
                        "type": "stl_analysis",
                        "stl_file_id": tool_input.get("stl_file_id", ""),
                        "dimensions": tool_input.get("dimensions", {}),
                        "face_count": tool_input.get("face_count", 0),
                        "is_watertight": tool_input.get("is_watertight", False),
                        "suggested_modifications": tool_input.get(
                            "suggested_modifications", []
                        ),
                    }
                    yield stl_analysis_event
                    tool_results.append({
                        "tool_use_id": tool_id,
                        "content": json.dumps(stl_analysis_event),
                    })
                elif tool_name == "modify_stl":
                    result_event = await self._handle_modify_stl(
                        conversation_id, tool_input
                    )
                    yield result_event
                    tool_results.append({
                        "tool_use_id": tool_id,
                        "content": json.dumps(result_event),
                    })
                elif tool_name == "infer_dimensions":
                    dimension_event = {
                        "type": "dimension_inference",
                        "reference_used": tool_input.get("reference_used", ""),
                        "estimated_dimensions": tool_input.get(
                            "estimated_dimensions", {}
                        ),
                        "confidence": tool_input.get("confidence", "low"),
                        "notes": tool_input.get("notes", ""),
                    }
                    yield dimension_event
                    tool_results.append({
                        "tool_use_id": tool_id,
                        "content": json.dumps(dimension_event),
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
                token_usage=usage,
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
                    "conversation_id": latest_design.conversation_id,
                    "conversation_title": conversation.title,
                    "name": latest_design.name or conversation.title,
                    "category": latest_design.category,
                    "parameters": latest_design.parameters,
                    "version": latest_design.version,
                    "parent_design_id": latest_design.parent_design_id,
                    "created_at": latest_design.created_at.isoformat(),
                }
                if latest_design
                else None
            ),
        }

    async def list_conversations(self, session_id: str) -> list[dict[str, Any]]:
        """List all conversations for a session, newest first."""
        return await self.list_conversations_multi([session_id])

    async def list_conversations_multi(self, session_ids: list[str]) -> list[dict[str, Any]]:
        """List all conversations for multiple sessions, newest first."""
        result = await self._db.execute(
            select(Conversation)
            .where(Conversation.session_id.in_(session_ids))
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
            .options(
                selectinload(Conversation.messages),
                selectinload(Conversation.designs),
            )
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
                # Build text content, appending STL metadata if present
                text_content = msg.content
                if msg.stl_file_ids:
                    for stl_id in msg.stl_file_ids:
                        stl_file = await db.get(StlFile, stl_id)
                        if stl_file:
                            bbox = stl_file.bounding_box or {}
                            dims = bbox.get("dimensions", [0, 0, 0])
                            text_content += (
                                f"\n\n[UPLOADED STL FILE: {stl_file.filename}]\n"
                                f"- STL File ID: {stl_file.id}\n"
                                f"- Dimensions: {dims[0]:.1f} x {dims[1]:.1f} x {dims[2]:.1f} mm\n"
                                f"- Faces: {stl_file.face_count:,}\n"
                                f"- Vertices: {stl_file.vertex_count:,}\n"
                                f"- Watertight: {stl_file.is_watertight}\n"
                                f"Please analyze this STL using the analyze_imported_stl tool."
                            )

                if msg.photo_ids:
                    content_blocks: list[dict[str, Any]] = [
                        {"type": "text", "text": text_content},
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
                    api_msgs.append({"role": "user", "content": text_content})
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
    ) -> tuple[str, list[dict[str, Any]], str, dict[str, int]]:
        """Call Claude API and return (text, tool_use_blocks, stop_reason, usage).

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

        usage = {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }

        return "".join(text_parts), tool_use_blocks, response.stop_reason, usage

    async def _handle_extract_parameters(
        self, conversation_id: str, tool_input: dict[str, Any]
    ) -> dict[str, Any]:
        """Validate extracted parameters and save a Design record."""
        try:
            params = _params_adapter.validate_python(tool_input)
        except ValidationError as exc:
            logger.warning("Parameter validation failed: %s", exc)
            return {
                "type": "error",
                "message": f"Parameter validation failed: {exc.errors()}",
            }

        # Determine next version and capture previous parameters
        latest = await self._get_latest_design(conversation_id)
        next_version = (latest.version + 1) if latest else 1
        previous_parameters = latest.parameters if latest else None
        previous_category = latest.category if latest else None

        design = Design(
            conversation_id=conversation_id,
            parameters=params.model_dump(),
            category=params.category,
            version=next_version,
            parent_design_id=latest.id if latest else None,
        )
        self._db.add(design)
        await self._db.commit()
        await self._db.refresh(design)

        event: dict[str, Any] = {
            "type": "parameters_extracted",
            "parameters": params.model_dump(),
            "design_id": design.id,
            "version": next_version,
            "is_revision": next_version > 1,
        }

        # Include previous parameters for revisions so frontend can show diff
        if next_version > 1 and previous_parameters is not None:
            event["previous_parameters"] = previous_parameters
            event["category_changed"] = previous_category != params.category

        # Forward suggested modifications from Claude (not persisted in design)
        suggestions = tool_input.get("suggest_modifications")
        if suggestions and isinstance(suggestions, list):
            event["suggest_modifications"] = suggestions[:3]

        return event

    async def _handle_modify_stl(
        self, conversation_id: str, tool_input: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute a boolean modification on an uploaded STL file."""
        from app.modeler.mesh_ops import boolean_stl, generate_primitive_stl

        stl_file_id = tool_input.get("stl_file_id", "")
        modification_type = tool_input.get("modification_type", "")
        primitive = tool_input.get("primitive", {})
        description = tool_input.get("description", "")

        # Map modification_type to boolean operation
        op_map = {
            "add_feature": "union",
            "cut_hole": "difference",
            "trim": "intersection",
        }
        operation = op_map.get(modification_type)
        if not operation:
            return {
                "type": "error",
                "message": f"Unknown modification type: {modification_type}",
            }

        # Load the base STL file from DB
        stl_file = await self._db.get(StlFile, stl_file_id)
        if stl_file is None:
            return {
                "type": "error",
                "message": f"STL file not found: {stl_file_id}",
            }

        # Read the base STL from disk
        data_dir = Path("data")
        base_path = data_dir / stl_file.file_path
        if not base_path.exists():
            return {
                "type": "error",
                "message": "STL file not found on disk",
            }

        base_stl = base_path.read_bytes()

        # Generate the primitive tool STL
        shape = primitive.get("shape", "box")
        dimensions = primitive.get("dimensions", {})
        position = primitive.get("position")

        try:
            tool_stl = generate_primitive_stl(shape, dimensions, position)
        except Exception as exc:
            logger.exception("Failed to generate primitive")
            return {
                "type": "error",
                "message": f"Failed to generate primitive: {exc}",
            }

        # Run the boolean operation
        try:
            result_stl = boolean_stl(base_stl, tool_stl, operation)
        except Exception as exc:
            logger.exception("Boolean operation failed")
            return {
                "type": "error",
                "message": f"Boolean operation failed: {exc}",
            }

        # Analyze the result mesh
        import trimesh

        result_mesh = trimesh.load(io.BytesIO(result_stl), file_type="stl")
        vertex_count = len(result_mesh.vertices)
        face_count = len(result_mesh.faces)
        is_watertight = bool(result_mesh.is_watertight)
        bounds = result_mesh.bounds
        bounding_box = {
            "min": bounds[0].tolist(),
            "max": bounds[1].tolist(),
            "dimensions": (bounds[1] - bounds[0]).tolist(),
        }

        # Save the result to disk
        new_stl_id = str(uuid.uuid4())
        session_id = stl_file.session_id
        stl_dir = data_dir / "stl" / session_id
        stl_dir.mkdir(parents=True, exist_ok=True)

        disk_filename = f"{new_stl_id}.stl"
        relative_path = f"stl/{session_id}/{disk_filename}"
        disk_path = data_dir / relative_path
        disk_path.write_bytes(result_stl)

        # Create new StlFile record
        new_stl_file = StlFile(
            id=new_stl_id,
            session_id=session_id,
            conversation_id=conversation_id,
            filename=f"modified_{stl_file.filename}",
            content_type="application/octet-stream",
            file_path=relative_path,
            file_size=len(result_stl),
            vertex_count=vertex_count,
            face_count=face_count,
            is_watertight=is_watertight,
            bounding_box=bounding_box,
        )
        self._db.add(new_stl_file)
        await self._db.commit()
        await self._db.refresh(new_stl_file)

        dims = bounding_box.get("dimensions", [0, 0, 0])
        return {
            "type": "stl_modified",
            "stl_file_id": new_stl_id,
            "original_stl_file_id": stl_file_id,
            "modification_type": modification_type,
            "description": description,
            "dimensions": {
                "width_mm": round(dims[0], 1),
                "height_mm": round(dims[1], 1),
                "depth_mm": round(dims[2], 1),
            },
            "face_count": face_count,
            "is_watertight": is_watertight,
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

        followup_text, _, _, followup_usage = await self._call_claude(
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
                token_usage=followup_usage,
            )
            self._db.add(followup_msg)

        await self._db.commit()
