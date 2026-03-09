# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** The conversational design wizard — the guided, multi-turn conversation that transforms a vague idea into a fully specified, dimensionally accurate 3D model.
**Current focus:** Phase 2 — Conversation Engine

## Current Position

Phase: 2 of 7 (Conversation Engine) — IN PROGRESS
Plan: 1 of 5 complete in current phase
Status: Executing phase plans
Last activity: 2026-03-09 — Completed 02-01 (Claude API client & data layer)

Progress: █▓░░░░░░░░ 17%

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: 13 min
- Total execution time: 0.85 hours

**By Phase:**

| Phase                  | Plans | Total  | Avg/Plan |
| ---------------------- | ----- | ------ | -------- |
| 1. Foundation          | 3/3   | 48 min | 16 min   |
| 2. Conversation Engine | 1/5   | 3 min  | 3 min    |

**Recent Trend:**

- Last 5 plans: 16m, 29m, 3m, 3m
- Trend: Accelerating

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
- Shared types in shared/ dir with tsconfig path alias @shared/*
- Makefile over npm scripts for cross-service orchestration
- Parallel CI jobs (backend + frontend) without Docker/OCP
- pydantic-settings as separate dependency (required for Pydantic v2 Settings classes)
- Lazy singleton pattern for AsyncAnthropic client (no global mutable state)
- SQLite with aiosqlite for V1, migration path to PostgreSQL via DATABASE_URL config
- UUID4 primary keys on all tables for distributed-safe IDs

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-09
Stopped at: Phase 2, Plan 1 complete — executing remaining plans
Resume file: None
