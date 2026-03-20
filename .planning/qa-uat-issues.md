# QA/UAT Issues - STL & Design Management

## Priority 1: STL Saving & Linking (BLOCKING)

**Issue:** Generated STLs don't persist with designs.

- `generate.py` only saves STL if `design_id` is in request body
- Frontend likely not passing `design_id` → STL never cached
- Reload page → STL generation triggers again (not served from cache)

**Fix Steps:**

1. Frontend: Pass `design_id` in `/api/generate` POST body (is it doing this?)
2. Backend: Verify `design.stl_path` is being set and committed (add logging)
3. Test: Generate STL, reload, verify it's served from cache (should not see 3D model rebuild lag)

---

## Priority 2: Design Naming (UX)

**Issue:** Designs are unnamed (`name=None`).

- `_handle_extract_parameters()` creates Design but never sets `.name`
- `_handle_generate_csg()` creates Design but never sets `.name`
- Frontend shows fallback to conversation title (feels generic)

**Fix Steps:**

1. Generate design name from parameters (e.g., `"Mounting Bracket (80×60×40mm)"` or `"CSG Design v2"`)
2. Set `design.name` when creating Design record
3. Test: Create design, check sidebar/list shows proper name

---

## Priority 3: STL Download Filename (UX)

**Issue:** Downloaded STLs named `mounting_bracket.stl`, not design-specific.

- Should use: `design.name` or `design.id` or combo
- Currently hardcoded to `body.category`

**Fix Steps:**

1. Include design name in HTTP header: `attachment; filename="{design_name}.stl"`
2. Fallback to design ID if name is None
3. Test: Download STL, verify filename

---

## Priority 4: Error Handling & Crash Recovery

**Issue:** "App keeps crashing/misbehaving" when generating/rendering STL.

- Need to: Check backend logs for exceptions
- Need to: Add better error messages to frontend
- Need to: Verify modeler engine is not throwing unhandled errors

**Debug Steps:**

1. Run `make dev-logs` and trigger STL generation, watch for stack traces
2. Check `docker exec backend bash -c 'tail -200 /app/data/logs/app.log'` (if logging enabled)
3. Reproduction: Create a design, hit "Generate", watch console/network tab for errors

---

## Test Matrix

| Action                                 | Expected                             | Current                           | Status |
| -------------------------------------- | ------------------------------------ | --------------------------------- | ------ |
| Create mounting bracket → Generate STL | STL rendered in preview              | ? (need to test)                  | ❓     |
| Reload page with design                | STL served from cache (no re-render) | Generates fresh                   | ❌     |
| Download STL                           | File named `bracket-80x60.stl`       | File named `mounting_bracket.stl` | ❌     |
| View design list                       | Shows `Bracket (80×60×40mm)`         | Shows first 80 chars of message   | ❌     |
| CSG design (complex)                   | Generates without crash              | ?                                 | ❓     |

---

## Blockers to Test Now

- [ ] Check frontend code — is it passing `design_id` to `/api/generate`?
- [ ] Check if `stl_path` column actually exists in DB (from recent migration)
- [ ] Check logs for STL generation errors
