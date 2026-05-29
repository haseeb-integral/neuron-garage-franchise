## 1) Fit filter buckets

Replace the current non-overlapping bands with the cumulative buckets you asked for:

`All | 90+ | 80+ | 70+ | 60+ | <60`

- `90+` → fitScore ≥ 90
- `80+` → fitScore ≥ 80
- `70+` → fitScore ≥ 70
- `60+` → fitScore ≥ 60
- `<60` → fitScore < 60

Files: `src/stores/candidatePipelineStore.ts` (FitFilter type + persisted value reset), `src/pages/CandidatePipeline.tsx` (filter logic + chip list).

Note: buckets will overlap on purpose (a 92-fit candidate appears in 90+, 80+, 70+, and 60+). That matches how thresholds normally read — "show me everyone at or above X."

## 2) Days in stage — fix Brian Thompson "Day 0 in FDD Review"

**Current bug:** the page-level recompute I added earlier reads `candidate_stage_history.changed_at` for the latest row matching the candidate's current stage. If that join misses (no history row, or stage label mismatch between UI `fdd_review` and the DB enum), it silently falls back to `created_at` — and for candidates created today and dropped straight into FDD Review, that still shows the right number, but for older candidates moved between stages it can show 0 when the history insert failed.

**Fix:**
1. Verify the stage-history insert fires on **every** stage change (drag-drop + modal flows). Today only some code paths write to `candidate_stage_history`.
2. Add a one-time backfill: for any candidate with no history row for their current stage, insert a synthetic row using `created_at` so the calc has a baseline.
3. Compute `daysInStage = floor((now − latest changed_at for current stage) / 1 day)`. If still missing, fall back to `created_at` (not 0).

Result: Brian Thompson in FDD Review will show days since he entered FDD Review, not since today.

Files: `src/pages/CandidatePipeline.tsx` (recompute), wherever stage changes are persisted (search for `current_stage` updates), and one SQL backfill migration.

## 3) Typography — column headers + candidate name weight

You're right, the kanban looks heavier than the rest of the app. Compared to City Scoring / Teacher Prospects which use `font-medium` (500) / `font-semibold` (600) for table headers and `font-medium` for row primary text, the pipeline currently uses:

- Column header (`KanbanColumn.tsx`): `text-sm font-bold` + `letterSpacing: -0.01em` + dark navy `#07142f`
- Candidate name (`CandidateCard.tsx`): `text-sm font-semibold` but combined with hover color shift and the score badge it reads heavy

**Fix (matches City Scoring conventions):**
- Column header: `font-bold` → `font-semibold` (600), drop the negative letter-spacing, keep the accent dot.
- Column count pill: `font-bold` → `font-semibold`.
- Candidate name: `font-semibold` → `font-medium` (500), keep size at `text-sm`.
- Jump-to pill labels: keep `font-semibold` (they're small chips, need the weight).
- Day chip: keep current weight, it's already tiny.

Font family stays Inter (same as the rest of the app — City Scoring uses Inter via `index.css`, so it's already consistent; only weight is the issue).

Files: `src/components/candidate-pipeline/KanbanColumn.tsx`, `src/components/candidate-pipeline/CandidateCard.tsx`.

## 4) Column background contrast

Today: column body `#fbfcfd` (near-white), header strip `#f7faff` (very pale blue). The two are almost identical so the header doesn't read as a header, and against the page bg `#f2f4f6` the whole column looks like a flat gray slab.

**Fix:**
- Column body: `#ffffff` (pure white) — gives a clear card feel against page bg.
- Header strip: `#f7faff` stays, but add a slightly stronger bottom border (`#e3e8ef`) so it reads as a banner.
- Disqualified column keeps its muted treatment.

File: `src/components/candidate-pipeline/KanbanColumn.tsx`.

## Smoke test after build

1. Fit chips: `All / 90+ / 80+ / 70+ / 60+ / <60` render in that order, each filters cumulatively.
2. Click Brian Thompson in FDD Review → days-in-stage > 0 and equals (today − the row's latest `fdd_review` `changed_at`).
3. Column headers + card names visibly lighter; column bodies clearly white, header strip clearly distinct.
4. No regressions in Jump-to bar, day chips, score badge, drag-drop.

## Out of scope

- No changes to scoring math, metrics cards, or Jump To behavior (already fixed last round).
- No changes to City Scoring or other pages.
