# Upgrade "Import to Master Pool" — enrich existing teacher records

## What I checked (answer to your question)

Two parts of your question:

1. **Can you re-import any time and hand-map the columns?**
   Yes. Step 2 of the wizard already lets you fix every column by hand. The AI
   guesses first, then you can change any target field with a dropdown, or set it
   to "skip".

2. **Will new info about existing teachers get added?**
   No. Today the wizard is **insert-only**. If the email already exists in the
   Master Pool, the whole row is skipped. So if Houston came in with only names
   and basics, re-importing a richer file will just say "9,101 already in master,
   skipped" and nothing gets updated. This needs the upgrade below.

Also worth knowing: today only these fields are mapped — first_name, last_name,
name, email, school, district, city, state, grade, subject, teacher_type,
experience_years, linkedin_url, phone. Anything else lands in a raw JSON blob.

## What we will build

Add an **import mode** choice on Step 1 (Setup):

- **Add new only** (today's behavior — safe default)
- **Add new + enrich existing** (new)
- **Enrich existing only** (no new rows added)

When enrich is on, for every CSV row that matches an existing teacher we update
that teacher instead of skipping it.

### Match rules (how we find the existing teacher)
1. Email match (lowercased) — strongest.
2. If no email: LinkedIn URL match.
3. If neither: first name + last name + city + state.
This mirrors the dedupe key the wizard already builds, so the counts stay honest.

### Fill rules (what gets written)
A second small choice, "How to handle conflicts":
- **Fill blanks only** (default, safest) — only writes a field when the existing
  record has nothing there.
- **Overwrite with CSV** — CSV wins for any field that has a value in the file.
Empty CSV cells never wipe existing data in either mode.
Unmapped columns get merged into the row's `raw` JSON instead of replacing it, so
old raw data is not lost.

### Review screen changes (Step 3)
The QA cards become: Total rows · New rows · Rows to enrich · Fields to fill ·
In-batch dupes · Missing city/state. The orange "will create duplicate rows"
warning is replaced with a plain-English line like "9,101 rows match existing
teachers — they will be enriched, not duplicated."

### Result screen
Shows three numbers: inserted, enriched, skipped. The batch record stores the
same numbers so the history stays auditable.

## Safety

- Default mode stays "Add new only", so nothing changes unless you pick enrich.
- Enrichment runs in chunks with a progress toast, same as the insert path.
- `import_batch_id` and `last_enriched_at` get stamped on enriched rows so we can
  trace which import touched which record.
- Undo: full undo of an enrich pass is not possible (old values are overwritten
  only in "overwrite" mode). To keep an audit trail, every enriched row's prior
  values for changed fields get appended into `raw.enrichment_history`.

## Files touched

- `src/components/email-outreach/MasterPoolImportWizard.tsx` — mode + conflict
  pickers, match/enrich logic, new QA counts, new result screen.
- `supabase/functions/teacher-prospects-dedupe-count/index.ts` — return the
  matching ids/keys, not just a count, so the wizard knows which rows to update.
- Docs: `src/data/teacherSearchSpec.md` (short section on enrich mode).

No schema change is needed. No other page is affected.

## Phases and turns

- **Phase 1 (1 turn)** — Edge function returns match map (key → teacher id +
  which fields are already filled).
- **Phase 2 (1–2 turns)** — Wizard: mode pickers, matching, enrich writes,
  new QA + result numbers.
- **Phase 3 (1 turn)** — Docs update and a smoke test with a small Houston CSV.

## What to test after Phase 2

1. Re-import your Houston file with **Add new + enrich existing** and **Fill
   blanks only**. Expect: inserted ≈ 0, enriched ≈ 9,101.
2. Spot-check 3 Houston teachers — school/district/grade should now be filled,
   names unchanged.
3. Run the same file again — second run should report almost nothing to fill.
4. Run one import in the old "Add new only" mode to confirm nothing regressed.
