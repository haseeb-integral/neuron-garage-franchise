# Haseeb — two things

## 1) Brett's changes since yesterday (grade-8 plain English)

Looking at the commit history from today, Brett's session did these user-visible things:

- **Hid the Fit Score everywhere in the UI.** That single number on the candidate card and table is no longer shown. The data still exists, it's just not displayed.
- **Removed the Selection Committee widget** from the candidate detail panel. The committee voting tab is still there; only the small summary widget was removed.
- **Added a score override UI** in the Qualification tab so a person can manually set a pillar/star rating instead of only relying on the auto-computed one, and **fixed a bug** where those star overrides were getting wiped.
- **Fixed a "batched score save" bug** — when you changed several scores quickly, some weren't saving. Now they all save.
- **Synced qualification scores** so the score shown on the kanban card matches the score shown inside the detail panel (no more two different numbers for the same person). Cards now also **pre-fetch the qual scores** so the number shows instantly instead of after a delay.
- **Added an "anatomy card" section** (a labeled walkthrough of what each part of a candidate card means — likely on the user guide / spec page).
- **Lightened the sheet overlay** so when the candidate detail panel opens, the background behind it is less dark/dim.
- **Kept the action button visible in the Qualification tab** when scrolling (it was getting hidden).
- **Cleaned up unreachable mock data** — old sample candidates that the app never actually showed are gone from the code.

Net effect for a user: same app, but the candidate cards/panel feel more consistent (one score everywhere), the Qualification tab is more usable (override + always-visible button), and the Fit Score / Committee widget clutter is gone.

## 2) The "Couldn't load checklist" toast — root cause found

**What it is:** A database error surfaced as a toast. The exact text is `invalid input value for enum candidate_stage: "initial_qual"`.

**Why it happens:** The frontend's stage ID for the "Initial Qualification Call" column is `initial_qual`, but the **database's `candidate_stage` enum** spells it `initial_qualification`. The Candidate Pipeline page already has a small map that translates between the two when loading/saving candidates — but the **Homework tab queries the `candidate_checklist_items` table directly using the raw UI stage value**, skipping that map. Postgres rejects `initial_qual` because it's not in the enum, and the toast pops.

**Which candidates / columns are affected:** Any candidate currently sitting in the **Initial Qualification Call** column will show this toast when you open their Homework tab. Other columns are safe because their UI ids happen to match the DB enum exactly (`new_lead`, `business_overview`, `fdd_review`, `immersion`, `confirmation`, `signing`, `disqualified`). I verified by querying the DB enum.

There is also a latent risk: if anyone later renames another stage on either side, the same class of bug returns. The right fix is to centralize the translation.

## Fix plan

1. **Create a tiny mapping helper** `src/lib/stageDbMapping.ts` with two functions:
   - `toDbStage(uiStage)` → DB enum string
   - `fromDbStage(dbStage)` → UI `StageId`
   
   It will contain the single source of truth currently duplicated inline in `CandidatePipeline.tsx` and `NewCandidateModal.tsx`.

2. **Use `toDbStage` in `HomeworkTab.tsx`** in the three spots that send `candidate.stage` to Supabase: the SELECT filter, the seed INSERT, and the manual add INSERT.

3. **Replace the inline maps** in `CandidatePipeline.tsx` and `NewCandidateModal.tsx` with calls to the helper, so we have one place to maintain stage names.

4. **No DB migration** — the enum is correct; only the client was wrong.

## Manual test after the fix

1. Open the Candidate Pipeline.
2. Click **Brittany Cruz** (or any candidate in the **Initial Qualification Call** column) → Homework tab.
3. ✅ Expected: no red toast; "Trial Close Checklist" loads (either showing seeded items or "No checklist items for this stage yet" without an error).
4. Open one candidate in each other column and click Homework — none should show the toast.
5. Type a checklist item and click Add → it appears and persists after reload.
