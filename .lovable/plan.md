## Goal
Avoid unnecessary re-crawls of cities that already have recent successful data. Save Firecrawl credits and time, while letting the user override when they want fresh data.

## Rules (approved)
- **0–30 days old** → skip crawl, use saved data automatically.
- **31–60 days old** → show a prompt: *"This city was last crawled on [date]. Use saved data or run fresh?"*
- **> 60 days old** → run fresh crawl automatically.
- **Force fresh** → user can always override with a "Run fresh anyway" button.
- **No saved data** → run fresh crawl (today's behavior).

## What will NOT change
- Scoring math.
- Database schema or saved data structure.
- Firecrawl fallback logic (the "crawl failed → use saved data" path stays as-is — that's a separate layer).
- Edge function pipeline steps.

## Where the change lives
- `src/components/phase2-demo/RunPipelineButton.tsx` — the "Run Pipeline" button. This is the only entry point for starting a crawl from the UI.
- Read freshness from `mvs_pipeline_runs` (latest `done` row for the city) — already queried in this component.

No edge function changes. No DB changes. UI-only pre-check.

## Phases

### Phase 1 — Pre-crawl freshness check (1 turn)
When the user clicks "Run Pipeline":
1. Look up the most recent `done` (or `done_stale`) run for that city.
2. Compute age in days from `finished_at`.
3. Branch:
   - **0–30 days**: Show a green info toast *"Using saved data from {date} ({N} days old) — skipped fresh crawl to save credits."* Do NOT call the edge function. Refresh the city view from existing DB data.
   - **31–60 days**: Open a small confirm dialog (shadcn `AlertDialog`): *"This city was last crawled on {date} ({N} days ago). Use saved data or run a fresh crawl?"* Two buttons: **Use saved data** / **Run fresh crawl**.
   - **> 60 days** or no prior run: Run fresh crawl immediately (today's behavior).
4. Add a small secondary link/button next to "Run Pipeline" labeled **"Force fresh crawl"** that always bypasses the check.

### Phase 2 — Smoke test (1 turn, code audit + optional manual click)
- Verify the 3 branches by reading `mvs_pipeline_runs` ages for a few cities.
- Confirm scoring math, fallback, and other pages untouched.

## Risks / what to watch
- The check relies on `mvs_pipeline_runs.finished_at` being accurate. Already used elsewhere in this file, so safe.
- If a city's saved data is technically present but partial (e.g. only 3 providers), the 0–30 day path will still skip — that's intended; user can hit "Force fresh crawl".
- No risk to fallback logic — that runs inside the edge function on a failed crawl, totally separate code path.

## Estimate
2 turns total. Phase 1 = build. Phase 2 = audit + your manual click test.

Approve and I'll start Phase 1.