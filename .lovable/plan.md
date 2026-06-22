## Phase 4 — Remove Homework tab, fold checklist into Process tab (+ activity log on Lead Sheet save)

You were right: the separate **Homework tab** makes life harder and adds nothing the Process tab cannot do. The Google Form / PDF confirms homework is just the **last bullet of the Trial Close** at the end of each step — not its own step or its own data.

### What we change (plain English)

**Change A — One place for Trial Close + homework (inside Process tab)**

Today in **Process tab**, each step shows a "Trial Close" section with 5 text bullets, one of which is "Assigned homework." The bullets are read-only text.

We will:
1. Turn those 5 Trial Close bullets into **real checkboxes** for the current stage, using the same `ChecklistSection` component the Homework tab already uses.
2. Save the checks into the same DB table (`candidate_checklist_items`, `kind = 'homework'`) — so nothing is lost.
3. The user ticks "Assigned homework" right inside the step they are reading. No tab-switching.

**Change B — Delete the Homework tab**

- Remove the "Homework" tab from `CandidateDetailPanel.tsx`.
- Delete `HomeworkTab.tsx` (the file is no longer used).
- All data stays in the DB. Nothing is lost. The checklist now lives inside Process tab.

**Change C — Activity log row on Lead Sheet save**

After a successful Lead Sheet save, insert one row into the existing `candidate_activities` table with type `profile_updated` and text "Lead sheet updated". Brett asked for a trail. If the insert fails, the save still succeeds (console warning only).

### How many turns

**1 turn.** All three changes are small and touch the same area.

### Files touched

- `src/components/candidate-pipeline/tabs/ProcessTab.tsx` — replace the read-only Trial Close bullet list inside the current stage card with `<ChecklistSection kind="homework" ... />`. Other stages stay read-only (preview).
- `src/components/candidate-pipeline/CandidateDetailPanel.tsx` — remove the Homework tab trigger + content, remove the `HomeworkTab` import, drop `onTrialCloseChange` wiring.
- `src/components/candidate-pipeline/tabs/HomeworkTab.tsx` — delete file.
- `src/components/candidate-pipeline/tabs/LeadSheetTab.tsx` — after successful upsert, insert one row into `candidate_activities`.

### What does NOT change

- No DB migration. `candidate_checklist_items` and `candidate_activities` already exist with the right shape.
- No change to scoring, Qualification stars, Kanban, Stage History, Committee Votes, Documents, Lead Sheet fields, Notes & Activity tab.
- The 7-step roadmap text in Process tab stays exactly the same.
- The Trial Close concept stays the same — just clickable now.

### Safety

- One commit. Easy to revert (re-add the tab + file).
- Pre-existing checklist rows keep working — they are keyed by `candidate_id + stage + kind='homework'`, the same key Process tab will use.
- Reading older candidates with no checklist rows: the seed-default logic in `ChecklistSection` will create the rows on first open, same as today in Homework tab.

### Tests (Lovable, automatic)

- Update `LeadSheetTab.test.tsx`: add 1 test that confirms `candidate_activities.insert` is called after save.
- Add `ProcessTab.test.tsx`: confirms the current stage shows a `ChecklistSection` (checkboxes), and other stages show read-only preview text.
- Confirm `CandidateDetailPanel.test.tsx` (if exists) no longer references the Homework tab. If no test exists, add a tiny one confirming the tab list does **not** include "Homework".

### Human test (Brett + Haseeb, after Lovable test passes)

1. Open a candidate → check tabs across the top: **no Homework tab** anymore. Tabs are: Overview, Lead Sheet, Qualification, Process, Notes & Activity, Stage History, Committee Votes, Documents.
2. Click **Process** tab → scroll to the **current stage** card → the Trial Close section now shows **5 checkboxes** (not text bullets). "Assigned homework" is one of them.
3. Tick "Assigned homework" → refresh the page → the tick is still there.
4. Click **Lead Sheet** → change Role → Save → green toast. Open **Notes & Activity** tab → new row "Lead sheet updated" with today's date is visible.
5. Open other tabs (Overview, Qualification, Stage History, Committee Votes, Documents) → all still open with no error.
6. Open a candidate at a **different stage** → Process tab shows that stage's 5 Trial Close checkboxes, not the previous candidate's.

If all 6 pass, the Google Form / Lead Sheet / Process cleanup work is fully done.
