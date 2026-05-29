# Fix candidates collapsing into "New Lead"

## What happened
No candidates were moved or lost — your database still has all 19 candidates in their correct stages (verified: 8 New Lead, 4 Business Overview, 2 Initial Qual, 2 Signing, 2 Immersion, 1 FDD Review, 1 Disqualified).

In the previous fix I replaced two stage maps with helper functions but did not update the call sites that read them. The old code used bracket lookup (`dbStageToUi[stage]`), the new helpers are functions (`dbStageToUi(stage)`). Indexing a function with a string returns `undefined`, so every candidate fell back to the default `"new_lead"` on the board, and any drag-to-new-column also wrote `undefined` to the DB.

## Fix (frontend only, no migration)

**`src/pages/CandidatePipeline.tsx`** — convert all bracket calls to function calls:
- Line 86: `dbStageToUi[r.current_stage]` → `dbStageToUi(r.current_stage)`
- Lines 421, 435, 436, 531, 535, 536, 587: `uiStageToDb[stage]` → `uiStageToDb(stage)`
- Lines 450–451: rename the inner `toDbStage`/`fromDbStage` locals (they shadow the imports) and use `uiStageToDb(toStage)` / `uiStageToDb(fromStage)`; update lines 457, 473, 485 accordingly.

**`src/components/candidate-pipeline/NewCandidateModal.tsx`**
- Line 115: `uiStageToDb[form.initial_stage]` → `uiStageToDb(form.initial_stage)`

**`HomeworkTab.tsx`** — already uses `toDbStage(candidate.stage)` correctly, no change.

## Verification after build
1. Reload Candidate Pipeline → all 19 candidates back in their correct columns.
2. Open Brittany Cruz (Initial Qual) → Homework tab → no toast.
3. Drag a candidate to another column → persists after reload.
