## Status check on #5

Only `mvs-extract-weeks` exists in `supabase/functions/`. The `-all` and `-austin-all` variants are already gone. A single reference remains in a code comment inside `mvs-extract-weeks/index.ts` — I'll strip the comment so future readers don't get confused. **No deletion or redeploy needed.** Effectively complete.

## #2 — QA Queue page

Page lives at `/mvs-qa-queue`, manager/admin only.

**Data**
- 8 open items in `mvs_qa_queue`, all `entity_type='week'` (low-confidence week extractions). Each row points to a `mvs_weeks.id` via `entity_id`.
- Join path: `mvs_qa_queue` → `mvs_weeks` (status, week_start, screenshot_url, source_url, confidence) → `mvs_providers` (name, city).

**UI (single page, no new components library)**
- Header: "QA Queue — N open" + Resolved filter toggle.
- Each item rendered as a card:
  - Left: provider name, city, week date, "AI guessed: <status>", confidence %, reason, link to source page (text only — keep hyperlink pause from earlier in mind; here it's necessary for QA work so we render it).
  - Right: screenshot (if `screenshot_url` present, signed-URL fetch from storage bucket).
  - Bottom row: status dropdown (`sold_out` / `waitlist` / `open` / `unknown`), Save button, "Mark resolved without change" link.
- Save → updates `mvs_weeks.status` (+ `status_evidence='qa_override'`, `confidence=1`) AND sets `mvs_qa_queue.resolved_at = now(), resolved_by = auth.uid()` in a single RPC.

**Auth gate**
- Reuse existing `useUserRoles` / `has_role` pattern. If user lacks manager/admin, render "Forbidden".

**Backend**
- New RPC `public.mvs_qa_resolve(_queue_id uuid, _new_status mvs_week_status)` SECURITY DEFINER, checks `has_role(auth.uid(),'manager') OR has_role(auth.uid(),'admin')`, performs both updates atomically. Grant EXECUTE to authenticated.
- No new table, no new column.

**Files**
- new `src/pages/MVSQAQueue.tsx`
- edit `src/App.tsx` — register route + prefetch
- new migration: RPC + grant
- edit `supabase/functions/mvs-extract-weeks/index.ts` — remove obsolete comment referencing the deleted extractor variants

## Out of scope
PDF, ACS pull, /mvs-preview, Boston gate UI, extractor broadening — separate plans.
