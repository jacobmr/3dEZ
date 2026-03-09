# 3dEZ

Conversational 3D design wizard — users describe what they need in plain language, get a print-ready STL.

## Architecture

- **Backend:** Python FastAPI at `backend/src/app/` (src layout, hatchling build)
- **Frontend:** Next.js 16.x with App Router, Tailwind v4, TypeScript strict at `frontend/`
- **Shared types:** `shared/` dir with tsconfig path alias `@shared/*`
- **3D Engine:** build123d/cadquery (OpenCascade) — runs in Docker only, not in pyproject.toml
- **LLM:** Claude API (Anthropic) for conversation + photo analysis
- **Database:** SQLite with aiosqlite (migration path to PostgreSQL via DATABASE_URL)
- **Orchestration:** Makefile for dev/deploy commands

## Development

```bash
make dev          # docker compose up (dev)
make deploy       # docker compose -f docker-compose.prod.yml up -d --build
make deploy-logs  # tail production logs
```

No local dev environment — all development runs via Docker.

## Server / Deployment

- **Server:** ez3d.salundo.com (Hetzner, SSH key: id_ed25519)
- **Reverse proxy:** Caddy with auto-HTTPS (Let's Encrypt)
- **Deploy process:** git push → SSH to server → git pull → make deploy
- **No external ports** for backend/frontend — Caddy is sole entry point
- **SQLite data volume** at /app/data for persistence across container restarts
- **Photo storage:** disk at data/photos/{session_id}/ (not DB blobs)

## Key Patterns

- **API proxy:** Next.js rewrites in next.config.ts (frontend :3000 → backend :8000)
- **40/60 desktop split** for conversation/preview panels
- **SSE via StreamingResponse** with POST (not WebSocket)
- **Session:** localStorage UUID (no auth for V1)
- **Ownership guard** pattern for multi-tenant conversation access
- **Template registry** on ModelEngine for category→function routing
- **Lazy singleton** for AsyncAnthropic client
- **UUID4 primary keys** on all tables
- **Discriminated union** on category field for type-safe parameter routing
- **Non-streaming** create_message() for tool use detection

## Design Categories (V1)

mounting_bracket, enclosure, organizer — each with sensible 3D printing defaults.

## Conventions

- Python: ruff for linting, pytest for tests
- Frontend: ESLint, TypeScript strict
- Commits: `{type}({phase}-{plan}): {description}` (feat/fix/test/refactor/docs)
- Planning artifacts in `.planning/` — don't modify during normal development
- Stage files individually in git (never `git add .` or `git add -A`)
