# Fix: Use correct date when judging "how old is saved data?"

## Why

Right now `findLastGoodRun` in `RunPipelineButton.tsx` looks at the most recent successful run and uses `finished_at` to compute age.

That is wrong for `done_stale` runs. A `done_stale` run means:
- The new crawl failed today.
- The app fell back to older saved data.
- `finished_at` = today, but the actual data could be 45 days old.

If we use `finished_at`, we will wrongly treat a stale fallback as "fresh" and skip a real crawl when one is needed.

## The rule (agreed)

Pick the freshness date like this:

- Run status = `done` → use `finished_at`
- Run status = `done_stale` → use `fallback_data_date`

Then apply the same age tiers we already locked:

- 0–30 days → skip crawl, use saved data automatically
- 31–60 days → prompt: "Use saved data or run fresh?"
- > 60 days → run fresh crawl automatically
- User can always click "Force fresh crawl"

## Scope of change

One file: `src/components/phase2-demo/RunPipelineButton.tsx`

- Update `findLastGoodRun` to also include `done_stale` rows and return both `status` and `fallback_data_date` along with `finished_at`.
- Add a small helper `effectiveDataDate(run)`:
  - if `run.status === 'done_stale'` → return `run.fallback_data_date`
  - else → return `run.finished_at`
- Use that helper everywhere age is computed (auto-skip toast, 31–60 day prompt text, > 60 day branch).
- Toast and dialog wording should show the real saved-data date, not the run finish date.

## Not touched

- Scoring math
- Firecrawl fallback logic (Phase 1 + 2 already shipped)
- Database schema
- Saved Sites, exports, other pages

## Phases

- **Phase 1 (1 turn)**: Update query + helper + all age callsites + dialog/toast copy. Smoke check by reading code paths.
- **Phase 2 (manual)**: You test on a city that has a recent `done_stale` row to confirm the prompt shows the real data date.

## Risk

Very low. UI-only change in one component. Worst case: prompt shows wrong date — easy to revert.
