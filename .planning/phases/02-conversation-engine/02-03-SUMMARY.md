---
phase: 02-conversation-engine
plan: 03
subsystem: services, prompts
tags: [conversation, tool-use, streaming, system-prompt, orchestrator]

requires:
  - phase: 02-conversation-engine
    plan: 01
    provides: AsyncAnthropic client, SQLAlchemy models, get_db dependency
  - phase: 02-conversation-engine
    plan: 02
    provides: Design parameter Pydantic models, Claude tool schemas

provides:
  - Design wizard system prompt with context injection
  - ConversationService orchestrator (start, send_message, revise, list, get, delete)
  - Tool use round-trip handling (extract_design_parameters, request_clarification)
  - Revision flow with version-incremented Design records

affects: [02-04, 02-05]

tech-stack:
  added: []
  patterns: [async generator events, tool result round-trip, discriminated union validation]

key-files:
  created:
    - backend/src/app/prompts/__init__.py
    - backend/src/app/prompts/design_wizard.py
    - backend/src/app/services/__init__.py
    - backend/src/app/services/conversation.py
  modified: []

key-decisions:
  - "Used create_message() (non-streaming) for tool use detection — stream_message() only yields text"
  - "System prompt ~580 tokens, focused on conversational flow not form-filling"
  - "Tool result round-trips handled automatically via _handle_tool_followup()"
  - "Pydantic discriminated union validates extracted parameters before DB persist"

patterns-established:
  - "prompts/ package for system prompt constants"
  - "services/ package for business logic orchestration"
  - "Async generator yielding typed event dicts for SSE consumption"
  - "Error events instead of exceptions for graceful client handling"

issues-created: []

duration: 3min
completed: 2026-03-09
---

# Phase 2 Plan 3: Design Wizard & Conversation Service Summary

**System prompt for guided design extraction and ConversationService orchestrator with tool use round-trips**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Design wizard system prompt (~580 tokens) guiding WHAT→WHY→WHERE→specifics flow
- ConversationService with 6 methods: start, send_message, revise, get, list, delete
- Full tool use handling: extract_design_parameters validated via Pydantic, request_clarification forwarded
- Revision flow injects current parameters, creates new Design with incremented version

## Task Commits

1. **Task 1: Create design wizard system prompt** - `7cbaf3a` (feat)
2. **Task 2: Build conversation orchestrator service** - `72afab3` (feat)

## Files Created/Modified
- `backend/src/app/prompts/__init__.py` - New prompts package
- `backend/src/app/prompts/design_wizard.py` - System prompt + get_system_prompt() helper
- `backend/src/app/services/__init__.py` - New services package
- `backend/src/app/services/conversation.py` - ConversationService orchestrator

## Deviations from Plan

None.

---
*Phase: 02-conversation-engine*
*Completed: 2026-03-09*
