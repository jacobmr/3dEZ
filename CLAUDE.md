# 3dEZ

Conversational 3D design wizard — users describe what they need in plain language, get a print-ready STL.

## Architecture

- **Backend:** Python FastAPI at `backend/src/app/` (src layout, hatchling build)
- **Frontend:** Next.js 16.x (App Router), React 19, Tailwind v4, TypeScript strict at `frontend/`
- **Shared types:** `shared/` dir with tsconfig path alias `@shared/*` → `../shared/*`
- **3D Engine:** build123d (OpenCascade) + trimesh validation — runs in Docker only, not in pyproject.toml
- **LLM:** Claude API (Anthropic) — model `claude-sonnet-4-5-20250929` for conversation + photo analysis
- **Database:** SQLite with aiosqlite (migration path to PostgreSQL via `DATABASE_URL` env var)
- **3D Preview:** Three.js + React Three Fiber + Drei for in-browser STL rendering
- **Orchestration:** Docker Compose + Makefile

## Project Structure

```
├── backend/
│   ├── pyproject.toml              # Python 3.11+, hatchling, deps
│   ├── Dockerfile / Dockerfile.dev
│   └── src/app/
│       ├── main.py                 # FastAPI app, CORS, router registration
│       ├── api/                    # REST endpoints
│       │   ├── conversations.py    # Conversation CRUD + SSE streaming
│       │   ├── designs.py          # Design listing/detail
│       │   ├── photos.py           # Photo upload/retrieval
│       │   ├── generate.py         # STL generation
│       │   ├── health.py           # Health check
│       │   └── deps.py             # Session dependency (X-Session-ID header)
│       ├── services/
│       │   └── conversation.py     # ConversationService — main orchestrator
│       ├── db/
│       │   ├── engine.py           # SQLAlchemy async setup
│       │   └── models.py           # ORM: Session, Conversation, Message, Design, Photo
│       ├── core/
│       │   ├── config.py           # Settings from env (pydantic-settings)
│       │   └── claude_client.py    # Lazy singleton AsyncAnthropic wrapper
│       ├── models/
│       │   ├── api.py              # Pydantic v2 request/response schemas
│       │   ├── designs.py          # Design parameter discriminated unions
│       │   └── tools.py            # Claude tool definitions (JSON schema)
│       ├── prompts/
│       │   └── design_wizard.py    # System prompt (conversation flow + photo analysis)
│       └── modeler/
│           ├── engine.py           # ModelEngine — registry-based category→template router
│           ├── export.py           # build123d Part → STL bytes (1mm/0.1° tolerance)
│           ├── validation.py       # trimesh: watertight, manifold, positive volume
│           ├── csg_evaluator.py    # Flat CsgTree → build123d Part via boolean ops
│           └── templates/          # Category implementations
│               ├── base.py         # TemplateProtocol interface
│               ├── mounting_bracket.py
│               ├── enclosure.py
│               ├── organizer.py
│               └── csg_primitive.py # CSG template wrapper → csg_evaluator
├── frontend/
│   ├── package.json                # Next.js 16.1.6, React 19.2.3, Three.js 0.183
│   ├── next.config.ts              # API rewrite /api/* → backend:8000
│   ├── Dockerfile / Dockerfile.dev
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          # Root layout (Geist fonts, metadata)
│       │   ├── page.tsx            # Entry → HomeClient
│       │   └── globals.css         # Tailwind globals
│       ├── components/
│       │   ├── HomeClient.tsx      # Main 40/60 split layout
│       │   ├── chat/               # ChatPanel, MessageList, MessageInput,
│       │   │                       # StreamingMessage, PhotoUpload, DimensionCard
│       │   ├── preview/            # PreviewPanel, StlViewer, StlMesh,
│       │   │                       # DimensionOverlay, DimensionLine
│       │   ├── designs/            # DesignsList, DesignCard
│       │   └── layout/             # AppShell, Header, Sidebar
│       ├── hooks/
│       │   ├── useConversation.ts  # Conversation state + SSE event parsing
│       │   └── usePreview.ts       # STL generation + Three.js scene management
│       └── lib/
│           ├── api.ts              # API client (fetch wrappers, SSE parser)
│           └── session.ts          # getSessionId() — localStorage UUID
├── shared/
│   ├── api-types.ts                # ConversationSummary, ConversationMessage, SavedDesign
│   └── design-params.ts           # MountingBracketParams | EnclosureParams | OrganizerParams | CsgPrimitiveParams
├── .planning/                      # Planning artifacts — don't modify during development
├── docker-compose.yml              # Dev environment
├── docker-compose.prod.yml         # Production (backend, frontend, caddy)
├── Caddyfile                       # Reverse proxy with basic auth
├── Makefile                        # Dev/deploy commands
└── CLAUDE.md                       # This file
```

## Development

All development runs via Docker — no local environment setup.

```bash
make dev              # docker compose up -d
make dev-down         # docker compose down
make dev-logs         # docker compose logs -f
make backend-shell    # exec bash in backend container
make frontend-shell   # exec sh in frontend container
make lint             # ruff check + eslint (parallel)
make test             # pytest + npm test (parallel)
make build            # docker compose build
make clean            # down -v, remove caches + .next
```

## Server / Deployment

- **Server:** ez3d.salundo.com (Hetzner, SSH key: id_ed25519)
- **Reverse proxy:** Caddy with auto-HTTPS (Let's Encrypt) + basic auth
- **Deploy:** `make deploy` (docker-compose.prod.yml up -d --build)
- **Logs:** `make deploy-logs`
- **No external ports** for backend/frontend — Caddy is sole entry point
- **SQLite data volume** at /app/data for persistence across container restarts
- **Photo storage:** disk at `data/photos/{session_id}/` (not DB blobs, 5MB max per photo)
- **STL cache:** disk at `data/stl/generated/{design_id}.stl`, tracked via `Design.stl_path`
- **Secrets:** SOPS-encrypted `secrets.production.env.enc`, decrypted to `/dev/shm/.env.production`

**IMPORTANT — Deploy process:**
- Deployment runs **on the server itself** via `make deploy` (which runs `docker compose -f docker-compose.prod.yml up -d --build`)
- The repo is cloned/pulled **on the server** — there is no rsync, scp, or file-copy step
- **NEVER use rsync or SSH file transfers** to deploy. Always: `git push` → SSH to server → `git pull` → `make deploy`
- All builds happen inside Docker on the server (no local builds shipped)

```bash
make deploy           # docker compose -f docker-compose.prod.yml up -d --build
make deploy-down      # production down
make deploy-logs      # tail production logs
```

## Key Patterns

### API & Session

- **API proxy:** Next.js rewrites in `next.config.ts` (frontend :3000 → backend :8000)
- **Session header:** `X-Session-ID` UUID required on all API calls
- **Session source:** `getSessionId()` generates/persists UUID in localStorage (`3dez-session-id` key)
- **Ownership guard:** `conversation.session_id == request session_id` checked on all access
- **No auth for V1** — sessions are anonymous

### Streaming & LLM

- **SSE via StreamingResponse** with POST (not WebSocket or GET)
- **SSE event format:** `{"type": "text"|"parameters_extracted"|"clarification"|"done"|"error", "data": ...}`
- **Non-streaming** `create_message()` for tool use detection; streaming for response text
- **Lazy singleton** `get_client()` for `AsyncAnthropic` instance
- **Claude tools:** `extract_design_parameters`, `generate_csg`, `analyze_photo`, `infer_dimensions`, `request_clarification`
- **Tool routing:** `extract_design_parameters` for 3 fixed templates; `generate_csg` for everything else (CSG primitives)
- **System prompt** in `prompts/design_wizard.py`: conversation flow (WHAT → WHY → WHERE → SPECIFICS) + CSG routing + reference object calibration

### Data Model

- **UUID4 primary keys** on all tables
- **Timezone-aware timestamps**
- **Foreign keys** with cascade delete
- **JSON columns** for `tool_use`, `parameters`, `photo_ids`
- **ORM models:** Session, Conversation, Message, Design, Photo

### 3D Engine

- **Template registry:** `TEMPLATE_REGISTRY` maps category string → template callable → build123d Part
- **Discriminated union** on `category` field for type-safe parameter routing
- **CSG evaluator:** `csg_evaluator.py` processes flat `CsgTree` → build123d Part via boolean algebra
- **Dimensions in millimeters**, build123d algebra mode
- **STL export:** 1mm linear tolerance, 0.1° angular tolerance
- **STL caching:** generated STLs persist to `data/stl/generated/{design_id}.stl` via `Design.stl_path`
- **Validation:** trimesh checks watertight + manifold + positive volume (0.2mm accuracy tolerance)

## Design Categories

### Fixed Templates (use `extract_design_parameters`)

| Category           | Key Parameters                                                                                            | Defaults                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `mounting_bracket` | width, height, depth, thickness, hole_diameter, hole_count, lip_height                                    | thickness=3mm, holes=4.5mm×2, lip=5mm |
| `enclosure`        | inner_width/height/depth, wall_thickness, lid_type, ventilation_slots, cable_hole_diameter, corner_radius | wall=2mm, corner_radius=2mm           |
| `organizer`        | width, height, depth, compartments_x/y, wall_thickness, has_labels, stackable                             | wall=1.5mm                            |

### CSG Primitives (use `generate_csg`)

| Category           | Description                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `csg_primitive`    | Composable flat list of boxes/cylinders/spheres with union/difference ops. Handles ~80% of custom requests |

- **Flat ordered list** — not a tree. Parts processed left-to-right: union = add, difference = subtract
- **Global coordinates** — all positions/rotations are absolute from origin (0,0,0)
- **First part** is always the base body (union enforced by validator)
- **Max 50 parts**, primitives: box, cylinder, sphere
- **Cannot do:** threads, gear teeth, text embossing, organic/sculptural shapes

## Conventions

- **Python:** ruff for linting (100 char line, py311 target), pytest for tests, mypy for types
- **Frontend:** ESLint (Next.js config), TypeScript strict mode
- **Commits:** `{type}({phase}-{plan}): {description}` — types: feat/fix/test/refactor/docs
- **Planning artifacts** in `.planning/` — don't modify during normal development
- **Stage files individually** in git (never `git add .` or `git add -A`)
- **Docker-only dependencies** (build123d, cadquery, trimesh) are NOT in pyproject.toml — they're installed in Dockerfiles
