## Phase 5 — Real Activity Log

Build a real database-backed activity log so the Notes & Activity tab stops showing fake mock data and starts showing what actually happened to each candidate.

### What it does in plain words

Every time something important happens to a candidate, we write one row to a new table:

- Someone **saves the Lead Sheet** → row "Lead sheet updated"
- Someone **toggles a checkbox** in the Process tab → row "Step 2 — checked 'Sent FDD'"
- A candidate **moves to a new stage** (kanban drag or button) → row "Moved from Step 2 → Step 3"
- A committee member **votes** → row "Kaylie voted Approve"
- Someone **adds a note** in the Notes & Activity tab → row with the note text

Then the **Notes & Activity tab** reads those rows from the DB (newest first) and shows them in the timeline — instead of the in-memory mock list it shows today.

### 1 new DB table

`public.candidate_activities`

Columns:
- `id` uuid
- `candidate_id` uuid → references `candidates(id)` on delete cascade
- `type` text — one of: `note`, `lead_sheet_saved`, `process_step_updated`, `stage_changed`, `vote_cast`
- `content` text — short human sentence ("Lead sheet updated", "Kaylie voted Approve", etc.)
- `metadata` jsonb — small structured payload (e.g. `{ from_stage, to_stage }` or `{ step_number, item_key }`)
- `actor_email` text — `auth.users.email` at write time, nullable
- `created_at` timestamptz default now()

Index on `(candidate_id, created_at desc)`.

RLS: enabled. Policies:
- SELECT: any authenticated user can read all activities (staff CRM)
- INSERT: any authenticated user can insert; row's `actor_email` must be set to the caller's email (or null if no session)
- UPDATE / DELETE: nobody (immutable log)

GRANTs: `SELECT, INSERT ON public.candidate_activities TO authenticated; GRANT ALL TO service_role`.

### One helper file

`src/lib/candidateActivity.ts` exports:

```ts
logActivity(candidateId: string, type: ActivityType, content: string, metadata?: object): Promise<void>
```

It fetches the current user's email and inserts the row. On error it `console.warn`s — never throws, never blocks the parent save.

### Wire it into these write sites (4 files)

1. **`LeadSheetTab.tsx`** — after successful `candidate_profiles` upsert: `logActivity(dbId, "lead_sheet_saved", "Lead sheet updated")`
2. **`ProcessTab.tsx`** — inside `persist()` after successful upsert: `logActivity(dbId, "process_step_updated", "Step N — updated", { step_number })` (debounced with the save — one row per save burst, not per keystroke)
3. **`CandidatePipeline.tsx`** — after each successful `candidate_stage_history` insert (4 spots: kanban move, undo move, disqualify, advance): `logActivity(dbId, "stage_changed", "Moved from {from} → {to}", { from_stage, to_stage })`
4. **`CommitteeVotesTab.tsx`** — after each successful `candidate_votes` upsert (3 spots): `logActivity(dbId, "vote_cast", "{member} voted {decision}", { voter, decision })`

### Rewire Notes & Activity tab

`NotesActivityTab.tsx` changes:
- Stop reading `candidate.activity` (mock).
- On mount + on candidate change, fetch `candidate_activities` for this candidate ordered by `created_at desc`.
- "Add Note" button calls `logActivity(dbId, "note", text)` then re-fetches (or optimistically prepends).
- Show actor email + relative time on each row.
- Icon mapping: `note` → message, `stage_changed` → arrow, `vote_cast` → check, `lead_sheet_saved`/`process_step_updated` → pencil.

`CandidateDetailPanel.tsx` `handleAddNote` callback becomes a no-op shim that just calls `logActivity` (the in-memory append goes away).

### What does NOT change

- No change to scoring, Qualification, Kanban, Stage History, Documents, Lead Sheet fields, Process tab fields.
- Old `candidate.activity` mock data on the `Candidate` type stays (other code may still read the array, defaulting to `[]`). Removing it from the type is a future cleanup.
- No retroactive backfill — older candidates start with an empty activity log, which fills as people use the app.

### Files touched

- **NEW** migration — create table + RLS + GRANTs + index
- **NEW** `src/lib/candidateActivity.ts` — helper
- **EDIT** `src/components/candidate-pipeline/tabs/LeadSheetTab.tsx` — 1 call after save
- **EDIT** `src/components/candidate-pipeline/tabs/ProcessTab.tsx` — 1 call inside `persist`
- **EDIT** `src/pages/CandidatePipeline.tsx` — 4 calls after stage writes
- **EDIT** `src/components/candidate-pipeline/tabs/CommitteeVotesTab.tsx` — 3 calls after vote writes
- **EDIT** `src/components/candidate-pipeline/tabs/NotesActivityTab.tsx` — fetch from DB, write notes through helper
- **EDIT** `src/components/candidate-pipeline/CandidateDetailPanel.tsx` — simplify `handleAddNote` (still passes a callback, but content goes to DB)

### Turns

**2 turns.**
- **Turn 1:** Migration (you approve the SQL popup). I tell you when it's run.
- **Turn 2:** All code edits (helper + 6 file edits) + tests.

### Tests (Lovable, automatic)

1. **Unit test for `logActivity`** — mock supabase client, confirm it inserts the right `{type, content, metadata, actor_email}` payload and swallows errors.
2. **LeadSheetTab test** — extend existing test: after Save, `candidate_activities.insert` was called with `type='lead_sheet_saved'`.
3. **NotesActivityTab test** — renders rows fetched from the (mocked) DB; clicking "Add Note" inserts a row of `type='note'`.

### Human test (Brett + Haseeb, after Turn 2)

1. Open candidate → **Lead Sheet** → change Role → Save → green toast.
2. Open **Notes & Activity** → first row says "Lead sheet updated", with your email and "just now". ✅
3. Open **Process** → tick "Sent FDD" → wait 1 second → refresh Notes & Activity → new row "Step 4 — updated". ✅
4. Drag candidate to a new stage on the kanban → open Notes & Activity → new row "Moved from Business Overview → Background Check" (or similar). ✅
5. Open **Committee Votes** → vote Approve as Kaylie → Notes & Activity → new row "Kaylie voted Approve". ✅
6. In Notes & Activity, type a note and click **Add Note** → row appears at top.
7. Refresh the whole page → all 5 rows still there (not mock).
8. Open a different candidate → only their activity rows show, not the first candidate's.

If all 8 pass, the activity log is fully live and the mock timeline is gone.
