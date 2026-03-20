# Summary: 07-01 STL Upload & Analysis

## Status: COMPLETE

## What Was Done

### Task 1: StlFile model & migration (`dab3872`)

- Added `StlFile` model to `db/models.py` with fields: id, session_id, conversation_id, filename, file_path, content_type, file_size, vertex_count, face_count, is_watertight, bounding_box (JSON), created_at
- Added `STL_MAX_SIZE_BYTES = 25 * 1024 * 1024` and `STL_MAX_FACE_COUNT = 500_000` constants
- Added `stl_files` relationship to Conversation model
- Added `stl_file_ids` JSON column to Message model (mirrors photo_ids pattern)
- Added migration for stl_file_ids column in engine.py

### Task 2: STL upload endpoint (`00fb42a`)

- Created `backend/src/app/api/stl_files.py` with three endpoints:
  - `POST /api/conversations/{id}/stl-files` — multipart upload with .stl extension validation, trimesh mesh analysis (watertight check, face count < 500k), bounding box extraction, disk storage
  - `GET /api/stl-files/{id}` — file download with ownership check
  - `GET /api/stl-files/{id}/metadata` — metadata-only response
- Registered router in main.py, added `data/stl` directory creation in lifespan

### Task 3: analyze_imported_stl Claude tool (`5f81ea6`)

- Added `analyze_imported_stl` tool definition in `models/tools.py` with stl_file_id, dimensions, face_count, is_watertight, suggested_modifications schema
- Added tool handler in conversation service yielding `stl_analysis` events
- Updated `send_message` to accept `stl_file_id`, inject STL metadata into Claude API messages
- Added `stl_file_id` field to `SendMessageRequest` in conversations.py
- Updated system prompt with STL upload and analysis instructions

### Task 4: Frontend STL upload component (`96b9424`)

- Created `StlUpload.tsx` component with .stl file picker and 3D cube icon
- Integrated into `MessageInput.tsx` alongside PhotoUpload
- Added `uploadStl()` and `fetchStlFile()` to api.ts
- Updated `streamMessage` to accept `stlFileId` parameter
- Added `stl_analysis` event handling and `StlAnalysis` type to useConversation hook
- Wired uploaded STL display through HomeClient to PreviewPanel

## Deviations

None — plan executed as specified.

## Decisions

- Validate .stl file extension rather than content type (browsers send `application/octet-stream`)
- Reject non-watertight uploads with repair suggestion (required for future boolean ops)
- 500k face count cap protects boolean operation performance in 07-02
- STL metadata injected as text content in Claude messages (not binary — Claude can't process STL)
