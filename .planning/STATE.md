# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** The conversational design wizard — the guided, multi-turn conversation that transforms a vague idea into a fully specified, dimensionally accurate 3D model.
**Current focus:** Phase 5 — Photo Upload (in progress)

## Current Position

Phase: 5 of 7 (Photo Upload)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-03-09 — Completed 05-02-PLAN.md

Progress: █████████████░ 63%

## Performance Metrics

**Velocity:**

- Total plans completed: 17
- Average duration: 9 min
- Total execution time: 3.1 hours

**By Phase:**

| Phase                  | Plans | Total  | Avg/Plan |
| ---------------------- | ----- | ------ | -------- |
| 1. Foundation          | 3/3   | 48 min | 16 min   |
| 2. Conversation Engine | 5/5   | 15 min | 3 min    |
| 3. Parametric Modeler  | 3/3   | 19 min | 6 min    |
| 4. 3D Preview          | 3/3   | 91 min | 30 min   |
| 4.1 Server Deployment  | 1/1   | 13 min | 13 min   |
| 5. Photo Upload        | 2/3   | 7 min  | 4 min    |

**Recent Trend:**

- Last 5 plans: 3m, 58m, 13m, 4m, 3m
- Trend: Stable execution times

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- OCP deps (build123d, cadquery) installed in Docker only, not pyproject.toml
- hatchling build backend for Python project
- src layout pattern: backend/src/app/
- Next.js 16.x with App Router, Tailwind v4, TypeScript strict mode
- Standalone output mode for future Docker production builds
- API proxy rewrites in next.config.ts (frontend :3000 → backend :8000)
- 40%/60% desktop split for conversation/preview panels
- Shared types in shared/ dir with tsconfig path alias @shared/\*
- Makefile over npm scripts for cross-service orchestration
- Parallel CI jobs (backend + frontend) without Docker/OCP
- pydantic-settings as separate dependency (required for Pydantic v2 Settings classes)
- Lazy singleton pattern for AsyncAnthropic client (no global mutable state)
- SQLite with aiosqlite for V1, migration path to PostgreSQL via DATABASE_URL config
- UUID4 primary keys on all tables for distributed-safe IDs
- Three V1 design categories: mounting_bracket, enclosure, organizer
- Discriminated union on category field for type-safe parameter routing
- Sensible 3D printing defaults (3mm bracket thickness, 2mm enclosure walls, M4 holes)
- Non-streaming create_message() for tool use detection (stream_message only yields text)
- Async generator event dicts for SSE consumption pattern
- prompts/ and services/ packages for system prompt and business logic
- SSE via StreamingResponse with POST (not WebSocket)
- Session upsert on every request via get_session_id dependency
- Ownership guard pattern for multi-tenant conversation access
- HomeClient.tsx wrapper keeps page.tsx as server component
- parseSSE async generator for POST-based SSE streaming
- localStorage session UUID (no auth for V1)
- Mobile sidebar as slide-out overlay drawer
- tempfile-based STL export (build123d export_stl requires file path, not BytesIO)
- libgl1 added to Dockerfile.dev for OCP OpenGL dependency
- Template registry pattern on ModelEngine for category→function routing
- create_engine() factory for auto-registering templates from TEMPLATE_REGISTRY
- Fillet-last with try/except fallback for OCCT geometry failures
- BuildPart + GridLocations for patterned hole placement
- trimesh for mesh validation (lightweight, no GUI deps)
- Validation-in-pipeline: validate_mesh() runs after every STL export
- 503 guard on /api/generate when build123d unavailable (non-Docker)
- ArrayBuffer → STLLoader.parse() in useMemo (POST-based, not useLoader)
- frameloop="demand" for mobile battery savings
- Geometry dispose on unmount via useEffect cleanup
- Billboard + Text with outline for camera-facing dimension labels
- Color-coded dimensions: yellow=width, cyan=height, orange=depth, green=thickness
- onBoundsComputed callback for child→parent geometry data flow
- 10% bounding box offset for dimension line positioning
- Serialized params comparison for usePreview change detection
- Stale response discard pattern in usePreview hook
- 503 error shows Docker-specific message in PreviewPanel
- Server: ez3d.salundo.com on Hetzner (SSH key: id_ed25519)
- Frontend build context at repo root (shared/ imports require monorepo context)
- Caddy reverse proxy with auto-HTTPS (simpler than nginx + certbot)
- No external ports for backend/frontend — Caddy is sole entry point
- SQLite data volume at /app/data for persistence across container restarts
- Disk storage for photos at data/photos/{session_id}/ (not DB blobs)
- Client-side canvas resize to 1568px max edge before upload (Claude Vision optimal)
- Photo linked to conversation (not message) for cross-message reference
- photo_ids JSON column on Message for multi-photo support per message
- Async \_build_api_messages with db session for on-demand base64 encoding
- photo_analysis SSE event type for streaming analyze_photo tool results

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-09
Stopped at: Completed 05-02-PLAN.md
Resume file: None
