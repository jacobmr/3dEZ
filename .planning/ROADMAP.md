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
- [ ] **Phase 3: Parametric Modeler** — OCP-based geometry generation from parameter dictionaries, STL export
- [ ] **Phase 4: 3D Preview** — Interactive Three.js renderer with dimension overlays
- [ ] **Phase 5: Photo Upload** — Mobile photo capture, Claude Vision analysis, dimension inference
- [ ] **Phase 6: Conversational Iteration** — Natural language design modification and re-render loop
- [ ] **Phase 7: Integration & Polish** — End-to-end flow, mobile UX, error handling, performance

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
**Plans**: 4 plans

Plans:

- [x] 03-01: OCP engine setup — OpenCascade Python bindings, basic shape primitives, STL export pipeline
- [x] 03-02: Template system — Parametric template architecture, parameter-to-geometry mapping
- [ ] 03-03: Object templates — Mounting brackets, enclosures, organizers (initial V1 categories)
- [ ] 03-04: Mesh validation — Watertight checks, manifold validation, dimensional accuracy verification

### Phase 4: 3D Preview

**Goal**: Interactive browser-based 3D preview with dimension overlays, working on mobile
**Depends on**: Phase 3 (generates meshes to preview)
**Research**: Unlikely (Three.js is well-documented)
**Plans**: 3 plans

Plans:

- [ ] 04-01: Three.js renderer — Load and display STL/glTF, orbit controls, lighting, mobile WebGL
- [ ] 04-02: Dimension overlays — Display key measurements on the 3D model, annotation system
- [ ] 04-03: Preview integration — Connect modeler output to renderer, loading states, error display

### Phase 5: Photo Upload

**Goal**: Mobile photo upload with Claude Vision analysis for physical context and dimension inference
**Depends on**: Phase 2 (conversation engine for dimension confirmation flow)
**Research**: Likely (Claude Vision API for dimension inference from photos)
**Research topics**: Claude Vision API capabilities, reference object detection (wall plates, USB ports, screws), dimension estimation techniques, mobile camera API
**Plans**: 3 plans

Plans:

- [ ] 05-01: Photo upload UI — Mobile camera capture, gallery upload, image compression, upload endpoint
- [ ] 05-02: Vision analysis — Claude Vision integration, reference object detection, context extraction
- [ ] 05-03: Dimension inference — Estimate dimensions from reference objects, user confirmation flow

### Phase 6: Conversational Iteration

**Goal**: Users modify designs through natural language, system updates parameters and re-renders
**Depends on**: Phase 2 (conversation), Phase 3 (modeler), Phase 4 (preview)
**Research**: Unlikely (builds on existing conversation engine and modeler)
**Plans**: 3 plans

Plans:

- [ ] 06-01: Change detection — Parse natural language modifications, map to parameter changes
- [ ] 06-02: Parameter updates — Apply changes to parameter dictionary, regenerate geometry, re-render
- [ ] 06-03: Iteration UX — Version history within session, undo/redo, comparison view

### Phase 7: Integration & Polish

**Goal**: Polished end-to-end flow from conversation to STL download, mobile-optimized
**Depends on**: All previous phases
**Research**: Unlikely (internal integration work)
**Plans**: 3 plans

Plans:

- [ ] 07-01: End-to-end flow — Connect all components, happy path testing, STL download
- [ ] 07-02: Mobile UX polish — Responsive layout, touch interactions, performance on low-end devices
- [ ] 07-03: Error handling & edge cases — Graceful failures, retry logic, input validation, loading states

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase                       | Plans Complete | Status      | Completed  |
| --------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation               | 3/3            | Complete    | 2026-03-09 |
| 2. Conversation Engine      | 5/5            | Complete    | 2026-03-09 |
| 3. Parametric Modeler       | 2/4            | In progress | -          |
| 4. 3D Preview               | 0/3            | Not started | -          |
| 5. Photo Upload             | 0/3            | Not started | -          |
| 6. Conversational Iteration | 0/3            | Not started | -          |
| 7. Integration & Polish     | 0/3            | Not started | -          |
