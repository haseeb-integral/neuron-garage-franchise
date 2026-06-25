## Confirmation: Tasks 2 & 3 are DONE ✅

I checked the live code in `src/pages/MarketValidationRollout.tsx`. Both fixes are shipped and match your notes.

### Task 2 — Failure reason in UI ✅
Found in code:
- Red "failed" pill is rendered with `cursor-help` so it invites a hover.
- A tooltip block titled **"Why this run failed"** reads `latestRun.error` straight from the DB and shows the real reason (e.g. `step 'classify' failed (HTTP 504)`).
- A yellow stale-score note sits under the composite score: *"Score may be stale — last run failed on [date]. Click Run to refresh."*

### Task 3 — Completeness % display ✅
Found in code:
- Each city row shows a `sourcesHit / DISCOVER_SOURCES.length` chip (e.g. **5/5 sources**) next to the city name.
- Color logic matches your notes:
  - Green = all 5 sources hit
  - Amber = 3–4 sources hit
  - Red = fewer than 3
- Chip only appears for runs that recorded `discover_counts`, so older runs stay blank until re-run — exactly as your notes say.

### Nothing left to do for these two
Your notes are accurate. Both tasks can be marked **Done** in your tracker.

### Next
Remaining from earlier Wave audit:
- Task 13 — PDF improvements
- Task 14 — Branding (colors / logo)

Want me to plan Task 13 next, or hold for Brett?
