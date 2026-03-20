# Summary: 06-03 Design Library UI

## Status: COMPLETE

## What Was Done

### Task 1: Design model enhancements (`50000de`)

- Added `name` (nullable VARCHAR(255)) and `parent_design_id` (nullable FK to self) to Design model
- Added inline SQLite migrations via `_run_migrations()` in engine.py for ALTER TABLE ADD COLUMN
- Updated `_design_dict()` helper to include all new fields in API responses

### Task 2: Design API enhancements (`50000de`)

- Rewrote `GET /api/designs/` with query params: `category` filter, `search` text, `sort` (newest/oldest)
- Added `PATCH /api/designs/{id}` for renaming designs
- Added `POST /api/designs/{id}/duplicate` — creates new Conversation + Design with copied parameters and `parent_design_id` lineage
- Added `GET /api/designs/{id}/variants` to list child designs

### Task 3: Design library frontend (`55ff7a1`)

- Replaced conversation-based sidebar with design-based library using `listDesigns()` API
- Added category filter tabs (All, Brackets, Enclosures, Organizers)
- Added debounced search input (300ms delay)
- Rewrote DesignCard with `SavedDesign` type, duplicate button, variant badge, red delete hover
- Updated `shared/api-types.ts` with `conversation_title`, `name`, `parent_design_id` fields
- Updated conversation service to return new fields in `latest_design` response

## Deviations

None — plan executed as specified.

## Decisions

- SQLite inline migrations with try/except for idempotency (no Alembic for V1)
- Duplicate creates new Conversation (unit of interaction) + Design with `parent_design_id` linking
- Design name falls back to conversation title, then "Untitled design"
- Variant badge shown as text label, not count (V1 simplicity)
