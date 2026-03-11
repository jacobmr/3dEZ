# Roadmap: 3dEZ

## Overview

3dEZ transforms the 3D printing design experience from CAD software to guided conversation. We build from the ground up: project scaffold, then the conversation engine that extracts design parameters, then the parametric modeler that generates geometry, then the 3D preview, then photo upload for physical context, then conversational iteration for refinement, and finally polish the end-to-end flow for launch.

## Domain Expertise

None

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** — Project scaffold, monorepo setup, dev tooling
- [x] **Phase 2: Conversation Engine** — Claude API multi-turn conversation with structured parameter extraction
- [x] **Phase 3: Parametric Modeler** — OCP-based geometry generation from parameter dictionaries, STL export
- [x] **Phase 4: 3D Preview** — Interactive Three.js renderer with dimension overlays
- [x] **Phase 4.1: Server Deployment & CI/CD** — Hetzner server setup, Docker deployment, GitHub Actions pipeline (INSERTED)
- [x] **Phase 5: Photo Upload** — Mobile photo capture, Claude Vision analysis, dimension inference
- [x] **Phase 6: Multi-tenant Auth & Design Library** — User accounts, auth, per-user design library with duplicate/variant support
- [x] **Phase 7: STL Upload & Modification** — Upload existing STL files, modify designs through conversation
- [x] **Phase 8: Cost Estimation & Pricing** — Complexity-based pricing, pre-approval flow, internal cost tracking
- [ ] **Phase 9: Conversational Iteration** — Natural language design modification and re-render loop
- [ ] **Phase 10: Integration & Polish** — End-to-end flow, mobile UX, error handling, performance

## Phase Details

### Phase 1: Foundation

**Goal**: Monorepo with Python backend (FastAPI), frontend (React/Next.js), shared types, dev environment, CI
**Depends on**: Nothing (first phase)
**Research**: Unlikely (standard project setup)
**Plans**: 3 plans

Plans:

- [x] 01-01: Backend scaffold — Python project with FastAPI, OCP dependencies, Docker dev environment
- [x] 01-02: Frontend scaffold — React/Next.js app with Three.js, Tailwind, mobile-first layout
- [x] 01-03: Monorepo glue — Shared API types, dev scripts, CI pipeline, basic deployment config

### Phase 2: Conversation Engine

**Goal**: Working multi-turn conversation that extracts structured design parameters from natural language
**Depends on**: Phase 1
**Research**: Likely (Claude API structured output, conversation state patterns)
**Research topics**: Claude API tool use for parameter extraction, structured output schemas, conversation state management patterns, prompt engineering for design clarification
**Plans**: 5 plans

Plans:

- [x] 02-01: Claude API client & data layer — Async Anthropic client, SQLAlchemy models, session-based multi-tenancy
- [x] 02-02: Parameter schemas & tool definitions — Pydantic design models, Claude tool schemas, TypeScript mirrors
- [x] 02-03: Design wizard & conversation service — System prompt, ConversationService orchestrator with tool use
- [x] 02-04: Conversation API endpoints — REST CRUD + SSE streaming endpoints for real-time conversation
- [x] 02-05: Conversation UI & design management — Chat components, saved designs sidebar, revision flow

### Phase 3: Parametric Modeler

**Goal**: Generate watertight manifold STL from parameter dictionaries using OpenCascade
**Depends on**: Phase 1 (backend scaffold), Phase 2 (parameter schemas)
**Research**: Likely (OCP Python bindings, parametric template architecture)
**Research topics**: build123d/OCP Python API, parametric template design patterns, CSG boolean operations, STL export with mesh quality control, watertight validation
**Plans**: 3 plans

Plans:

- [x] 03-01: OCP engine setup — OpenCascade Python bindings, basic shape primitives, STL export pipeline
- [x] 03-02: V1 object templates — Mounting bracket, enclosure, organizer templates with registry
- [x] 03-03: Mesh validation & generate endpoint — trimesh validation, dimensional accuracy, POST /api/generate

### Phase 4: 3D Preview

**Goal**: Interactive browser-based 3D preview with dimension overlays, working on mobile
**Depends on**: Phase 3 (generates meshes to preview)
**Research**: Unlikely (Three.js is well-documented)
**Plans**: 3 plans

Plans:

- [x] 04-01: Three.js renderer — Load and display STL/glTF, orbit controls, lighting, mobile WebGL
- [x] 04-02: Dimension overlays — Display key measurements on the 3D model, annotation system
- [x] 04-03: Preview integration — Connect modeler output to renderer, loading states, error display (checkpoint deferred to post-deployment)

### Phase 4.1: Server Deployment & CI/CD (INSERTED)

**Goal**: Production deployment on Hetzner server with Docker, firewall, CI/CD pipeline via GitHub Actions
**Depends on**: Phase 4 (need working app to deploy)
**Research**: Unlikely (standard DevOps)
**Plans**: 1 plan

Plans:

- [x] 04.1-01: Server setup & deployment — Production Docker config, Caddy reverse proxy, multi-stage Dockerfiles

### Phase 5: Photo Upload

**Goal**: Mobile photo upload with Claude Vision analysis for physical context and dimension inference
**Depends on**: Phase 2 (conversation engine for dimension confirmation flow)
**Research**: Likely (Claude Vision API for dimension inference from photos)
**Research topics**: Claude Vision API capabilities, reference object detection (wall plates, USB ports, screws), dimension estimation techniques, mobile camera API
**Plans**: 3 plans

Plans:

- [x] 05-01: Photo upload UI — Mobile camera capture, gallery upload, image compression, upload endpoint
- [x] 05-02: Vision analysis — Claude Vision integration, reference object detection, context extraction
- [x] 05-03: Dimension inference — Estimate dimensions from reference objects, user confirmation flow

### Phase 6: Multi-tenant Auth & Design Library

**Goal**: User accounts with authentication, per-user design isolation, design library with duplicate/variant support
**Depends on**: Phase 5 (working app to add auth to)
**Research**: Likely (auth strategy — magic link vs OAuth vs simple email/password)
**Research topics**: Auth patterns for small SaaS, session management, migration from localStorage sessions to user accounts
**Plans**: 3 plans

Plans:

- [x] 06-01: Auth system — User registration, login, session management (replace localStorage UUID)
- [x] 06-02: Multi-tenant data isolation — Per-user conversations, designs, photos with ownership enforcement
- [x] 06-03: Design library UI — User's saved designs, duplicate/variant creation, design management

### Phase 7: STL Upload & Modification

**Goal**: Users can upload existing STL files and modify them through conversation
**Depends on**: Phase 6 (user accounts for file ownership), Phase 3 (parametric modeler)
**Research**: Likely (STL parsing, mesh-to-parametric conversion strategies)
**Research topics**: STL import into OCP, mesh analysis for feature detection, modification strategies for non-parametric meshes
**Plans**: 2 plans

Plans:

- [x] 07-01: STL upload & parsing — Upload endpoint, STL validation, mesh analysis, storage
- [x] 07-02: STL modification flow — Conversation-driven modifications to uploaded meshes, re-export

### Phase 8: Cost Estimation & Pricing

**Goal**: Estimate design complexity cost, show pricing before STL generation, internal cost tracking
**Depends on**: Phase 6 (user accounts for billing association)
**Research**: Likely (pricing models for AI-generated designs, complexity metrics)
**Research topics**: Claude API token cost estimation, OCP computation cost heuristics, pricing display patterns
**Plans**: 2 plans

Plans:

- [x] 08-01: Cost estimation engine — Complexity metrics, token usage tracking, COGS calculation, 2x markup pricing
- [x] 08-02: Pricing UX & approval flow — Show estimated cost before generation, user approval gate, usage tracking

### Phase 9: Conversational Iteration

**Goal**: Users modify designs through natural language, system updates parameters and re-renders
**Depends on**: Phase 2 (conversation), Phase 3 (modeler), Phase 4 (preview)
**Research**: Unlikely (builds on existing conversation engine and modeler)
**Plans**: 3 plans

Plans:

- [ ] 09-01: Change detection — Parse natural language modifications, map to parameter changes
- [ ] 09-02: Parameter updates — Apply changes to parameter dictionary, regenerate geometry, re-render
- [ ] 09-03: Iteration UX — Version history within session, undo/redo, comparison view

### Phase 10: Integration & Polish

**Goal**: Polished end-to-end flow from conversation to STL download, mobile-optimized
**Depends on**: All previous phases
**Research**: Unlikely (internal integration work)
**Plans**: 3 plans

Plans:

- [ ] 10-01: End-to-end flow — Connect all components, happy path testing, STL download
- [ ] 10-02: Mobile UX polish — Responsive layout, touch interactions, performance on low-end devices
- [ ] 10-03: Error handling & edge cases — Graceful failures, retry logic, input validation, loading states

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 4.1 → 5 → 6 → 7 → 8 → 9 → 10

| Phase                          | Plans Complete | Status      | Completed  |
| ------------------------------ | -------------- | ----------- | ---------- |
| 1. Foundation                  | 3/3            | Complete    | 2026-03-09 |
| 2. Conversation Engine         | 5/5            | Complete    | 2026-03-09 |
| 3. Parametric Modeler          | 3/3            | Complete    | 2026-03-09 |
| 4. 3D Preview                  | 3/3            | Complete    | 2026-03-09 |
| 4.1 Server Deployment & CI/CD  | 1/1            | Complete    | 2026-03-09 |
| 5. Photo Upload                | 3/3            | Complete    | 2026-03-10 |
| 6. Multi-tenant Auth & Library | 3/3            | Complete    | 2026-03-10 |
| 7. STL Upload & Modification   | 2/2            | Complete    | 2026-03-10 |
| 8. Cost Estimation & Pricing   | 2/2            | Complete    | 2026-03-10 |
| 9. Conversational Iteration    | 0/3            | Not started | -          |
| 10. Integration & Polish       | 0/3            | Not started | -          |
