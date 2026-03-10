# Summary: 05-03 — Dimension Inference & Confirmation

## Status: COMPLETE

## What Was Done

### Task 1: Dimension inference tool and reference calibration
- Added `infer_dimensions` tool to `backend/src/app/models/tools.py` with reference_used, estimated_dimensions, confidence, and notes fields
- Updated system prompt in `design_wizard.py` with DIMENSION INFERENCE section — calibration instructions, confidence level guidelines, mandatory user confirmation before design extraction
- Added `dimension_inference` SSE event type in ConversationService to stream inference data to frontend
- Fixed tool schema validation: flattened top-level `oneOf` wrapper that Claude API rejected, switched to `TypeAdapter(DesignParamsUnion)` for proper discriminated union validation
- **Commits:** `ee50748`, `81ef0c5`, `e68ce95`, `d5addb4`, `3dedad6`, `d562d46`, `7580213`

### Task 2: Frontend dimension confirmation display
- Created `DimensionCard.tsx` — styled card showing reference object, estimated dimensions (W×H×D), confidence badge (green/yellow/red), and estimation notes
- Added `dimensionInference` field to `ChatMessage` type and `dimension_inference` SSE event handler in `useConversation.ts`
- Updated `MessageBubble.tsx` to render DimensionCard inline within assistant messages
- Added photo thumbnail display in user messages via `/api/photos/{id}` endpoint
- **Commits:** included in Task 1 commits (co-developed)

### Task 3: End-to-end photo flow verification (checkpoint:human-verify)
- Deployed to production at ez3d.salundo.com
- **UAT findings and fixes:**
  - Raw JSON displayed in chat — SSE events contained `{"type":"text","content":"..."}` but frontend appended full JSON string. Fixed by parsing JSON and extracting `.content`/`.question`/`.message` fields per event type (`e3a92f0`)
  - UI labeling — renamed "Conversation" to "Design" throughout sidebar and chat panel (`5377d26`)
  - Missing STL download — added Download STL button to PreviewPanel header with blob download pattern (`5377d26`)
- End-to-end flow verified: photo upload → Vision analysis → dimension inference → conversational confirmation → design parameter extraction → STL generation → 3D preview → download

## Deviations from Plan

1. **Tool schema validation issues** — Claude API rejected nested `oneOf` in tool input schemas. Fixed by flattening to individual tool definitions and using Pydantic `TypeAdapter` for server-side validation.
2. **SSE rendering bug** — Backend wrapped events as full JSON objects but frontend treated `event.data` as plain text. Added JSON parsing with field extraction across all event types.
3. **UAT-driven UI improvements** — STL download button and label renames emerged from production testing.

## Commit Log

| Hash | Type | Description |
|------|------|-------------|
| `ee50748` | fix | Eager-load designs relationship to prevent MissingGreenlet |
| `81ef0c5` | chore | Update SOPS encrypted secrets with real API key |
| `e68ce95` | feat | Add basic auth to Caddy reverse proxy |
| `d5addb4` | feat | SOPS decrypt-to-RAM secrets pattern |
| `3dedad6` | fix | Flatten tool schema to remove top-level oneOf |
| `d562d46` | fix | Use TypeAdapter for DesignParamsUnion validation |
| `7580213` | fix | Move TypeAdapter init below imports to fix E402 |
| `e3a92f0` | fix | Parse SSE JSON data before rendering in chat |
| `5377d26` | feat | Add STL download button and rename Conversation to Design |

## Key Decisions

- **TypeAdapter over schema-level validation** — Pydantic TypeAdapter provides runtime discriminated union validation without complex JSON Schema `oneOf` that Claude API doesn't support in tool schemas
- **JSON parsing with fallback** — SSE event data parsed as JSON with try/catch, falling back to raw text for backwards compatibility
- **Blob download pattern** — ArrayBuffer → Blob → createObjectURL → programmatic click → revokeObjectURL for client-side STL download
- **Commit/push/CI deployment** — Established as standard deployment method (not rsync)
