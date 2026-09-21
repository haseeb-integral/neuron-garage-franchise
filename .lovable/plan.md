# Getting ready for the Austin metro file

## What Manus is telling us

Manus has locked the City/Metro export to one fixed header row (27 columns), the same for Houston, Austin and every future city. One row = one teacher. The entrepreneurial signal data sits in two separate groups:

- `verified_enrichment_*` — proof with source links (high trust)
- `secondary_signal_*` — MEDIUM/LOW confidence context for review only

Manus asks us to: load both cities into the same teacher list, match rows on `dedupe_key`, never match on name alone, keep city/state/district/school exact, keep the multi-entry text (joined by " | ") whole, never wipe a filled value with a blank one, keep verified and secondary counts separate, accept any signal label text, and never load their separate "one row per signal" sprint file into the main list.

## Where we already comply

Our import screen already reads all 27 columns, splits " | " lists correctly, matches on the Manus key first (then email, then name + city + state — never name alone), keeps counts as whole numbers, accepts any signal label, and stores verified and secondary evidence as separate kinds. Nothing about the Austin file needs a new table or new columns.

## Three real gaps to close before Austin

1. **A blank count can wipe a real one.** If a count cell is empty, we currently write 0 over an existing number. Fix: leave it untouched when the cell is blank; only use 0 when creating a brand new teacher.
2. **The long signal text is not kept whole.** We split summaries and links into separate evidence rows and keep nothing else. If the lists are uneven, detail can drift or be lost. Fix: also keep the original full strings on the teacher record (in the record's raw data) so nothing from the file is ever lost.
3. **Verified evidence rows all get the same label.** Every verified row is stamped with the whole signal-type string. Fix: line the labels up one-to-one with the summaries, falling back to the whole string when the counts don't line up.

Plus one small guard: if someone picks the "one row per signal" sprint file by mistake, show a warning on the upload step instead of letting it create duplicate teachers.

## Work

One file only: `src/components/email-outreach/MasterPoolImportWizard.tsx`. No database change, no change to the 310,084 existing teachers. Roughly 40 lines touched.

Phase 1 (this turn, 1 prompt): the three fixes plus the wrong-file warning.
Phase 2 (after you upload): run Austin in "add new + enrich" mode, then check on the review screen that signal rows and evidence links read above zero before confirming.

## Risks and testing

- Risk: low. Only the import screen changes; existing records are only touched by an import you start.
- Do not touch: the teacher table structure, the duplicate-count backend function, the Teacher Search pages.
- Test: upload the Austin file, stop at the review screen, confirm the signal counts and evidence-link count are not zero, then import and spot-check three teachers for their signals and source links.
