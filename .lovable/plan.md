## Bug

When opening **Notes & Activity** for a candidate in the *Initial Qualification Call* stage, a red toast appears:

> Couldn't load checklist — invalid input value for enum candidate_stage: "initial_qual"

## Root cause

The DB enum `candidate_stage` uses `initial_qualification`. The UI `StageId` uses `initial_qual`. We already have a translator (`src/lib/stageDbMapping.ts` → `toDbStage()` / `fromDbStage()`) and `HomeworkTab.tsx` uses it correctly.

`src/components/candidate-pipeline/ChecklistSection.tsx` (which renders the "Roadmap — Initial Qualification Call" block on Notes & Activity) passes the raw UI stage directly into Supabase queries. That fails on every stage where UI ≠ DB — currently only `initial_qual`, hence the error only fires there.

Offending lines in `ChecklistSection.tsx`:
- L52 — `.eq("stage", stage as any)` in the load query
- L67 — `stage: stage as any` in the lazy-seed insert
- L127 — `stage: stage as any` in the add-item insert

## Fix (single file, ~3 lines)

1. Import `toDbStage` from `@/lib/stageDbMapping`.
2. Replace the three occurrences of `stage as any` above with `toDbStage(stage) as any`.

That's the entire change. No schema work, no other files, no impact on the Phase 1/2 reskin.

## Verification

- Open a candidate currently in **Initial Qualification Call** → Notes & Activity tab. The red toast should not appear; the roadmap checklist should load (and seed defaults on first open).
- Add a roadmap item → it persists, no enum error.
- Other stages (`business_overview`, `fdd_review`, `immersion`, `confirmation`, `signing`) continue to work because their UI id already equals the DB enum value.

## Out of scope

- Drag-and-drop toast / day reset / metrics — already implemented in `CandidatePipeline.confirmStageMove`, no change needed.
- Phase 2 color reskin — separate, not blocked by this fix.
