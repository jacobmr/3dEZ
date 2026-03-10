# 3dEZ

## What This Is

3dEZ is a web app that lets anyone design custom 3D-printable objects through guided conversation instead of CAD software. Users describe what they need in plain language, answer clarifying questions about dimensions and constraints, preview a 3D render, and download a print-ready STL — all without touching a CAD tool.

## Core Value

The conversational design wizard — the guided, multi-turn conversation that transforms a vague idea into a fully specified, dimensionally accurate 3D model. If nothing else works, this must.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Conversational Design Wizard** — Multi-turn LLM-powered conversation (Claude API) that walks users from vague idea to fully specified 3D model. Asks clarifying questions about purpose, dimensions, mounting method, and constraints. Feels like talking to a knowledgeable friend, not filling out a form. Target: idea to STL in ≤10 conversational turns.
- [ ] **Parametric Model Generation** — Python service using OpenCascade (OCP) for solid modeling. Receives parameter dictionary from conversation engine, generates geometry via boolean CSG operations, exports watertight manifold STL. Dimensional accuracy within ±0.2mm.
- [ ] **3D Preview Render** — Interactive Three.js render in browser. Orbit, zoom, pan. Dimension overlays. Loads within 3 seconds. Works on mobile Safari and Chrome.
- [ ] **STL Export** — One-click download of print-ready STL. Must open correctly in Cura, PrusaSlicer, BambuStudio. Manifold, under 5MB for typical functional parts.
- [ ] **Photo Upload** — Mobile camera/gallery upload. System uses photos to understand physical context and infer approximate dimensions from reference objects (wall plates, USB ports, screws). User confirms/corrects measurements.
- [ ] **Conversational Iteration** — After preview, user requests changes in natural language ("make it 3mm deeper", "add a slot on the left"). System modifies parametric model and re-renders. Dimensional changes apply correctly ≥90% of the time.
- [ ] **Multi-tenant Auth** — User registration and login, per-user data isolation, replace localStorage sessions with real accounts
- [ ] **Design Library** — Per-user saved designs with version history and conversation transcripts. Duplicate designs to create variants. Resume where you left off.
- [ ] **STL Upload & Modification** — Upload existing STL files as starting point. Conversation-driven modifications to uploaded meshes.
- [ ] **Cost Estimation & Pricing** — Complexity-based COGS estimation, 2x markup sale price. Show cost before STL generation, require approval. Internal tracking now, payment integration later.
- [ ] **Light/Dark Mode** — Theme toggle with preference persistence
- [ ] **STEP Export** (P2) — Optional STEP file export for CAD tool import. Editable solid bodies, not tessellated mesh.
- [ ] **Print Service Integration** (P2) — Order a print: choose material, color, shipping. Single fulfillment partner at launch.
- [ ] **Template Gallery** (P2) — 20+ pre-built starting points (phone stands, cable organizers, brackets, mounts, planters, hooks). Fully customizable via conversation.

### Out of Scope

- **Professional CAD replacement** — Not competing with SolidWorks/Fusion 360. Targeting people who'd never open those tools.
- **Multi-part assemblies** — V1 is single-body STL/STEP only. No moving parts, hinges, or snap-fits.
- **Slicer integration** — Export STL; user brings their own slicer. May recommend settings but won't embed one.
- **Material/stress simulation** — No FEA. Basic printability constraints (wall thickness, overhangs) only.
- **Organic/sculptural forms** — V1 focuses on geometric, functional, and simple decorative objects. No characters or figurines.
- **Printables marketplace integration** — Future consideration (P2).
- **Auto-measurement from photos** — V1 uses photos for context only; user confirms dimensions manually.
- **Collaborative design** — Future consideration (P2).

## Context

- **Market gap:** 3D printers are cheap and accessible, but CAD software is the bottleneck. Most printer owners download others' designs or let the printer sit idle. AI mesh generators (Meshy, Shap-E) produce non-manifold geometry with poor dimensional accuracy.
- **Differentiation:** Conversational UX + parametric solid modeling + dimensional accuracy + print fulfillment. No CAD skills required, engineering-grade output.
- **Target users:** Small business owners, teachers, hobbyists, parents, makers — people who want custom parts but won't learn CAD. Also non-printer-owners via print service.
- **Architecture:** Parameter-driven, not code-driven. LLM populates structured parameter dictionaries that feed pre-built parametric templates. This is more reliable than having the LLM write OCP scripts from scratch.
- **Success metrics:** 65%+ conversation completion rate, median <8 min to first STL, 70%+ first-print success rate, 35%+ 30-day return usage.

## Constraints

- **Backend:** Python + OpenCascade (OCP) for solid modeling — chosen for clean B-rep geometry that slices reliably
- **LLM:** Claude API for conversation engine and photo analysis
- **Frontend:** Three.js for 3D preview, mobile-first responsive design
- **Model approach:** Parameter-driven templates, not LLM-generated scripts — reliability over flexibility
- **Geometry:** Watertight manifold STL, ±0.2mm accuracy, FDM-optimized (wall thickness, overhangs)

## Key Decisions

| Decision                                     | Rationale                                                                                                 | Outcome   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------- |
| OCP over mesh-based generation               | Solid B-rep produces clean manifold geometry; mesh approaches frequently have gaps and self-intersections | — Pending |
| Parameter-driven templates over LLM code gen | Dramatically improves reliability; makes iteration predictable                                            | — Pending |
| Mobile-first responsive                      | Primary interaction is conversational text + photo upload, natural on mobile                              | — Pending |
| Conversational wizard as core priority       | This is the key differentiator and the hardest UX problem to solve                                        | — Pending |

---

_Last updated: 2026-03-08 after initialization_
