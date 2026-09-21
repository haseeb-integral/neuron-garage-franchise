# Austin Manus signals import and automatic column matching

## What I confirmed

- The new file is the exact 27-column City/Metro format agreed with Manus.
- It contains 4,699 unique teacher rows. There are no repeated email addresses or Manus keys.
- It includes 2,303 teachers with verified enrichment facts.
- It includes 86 teachers with secondary signals and source links.
- It includes no verified creator signals; that count is correctly zero in the file.
- The database already has the needed teacher fields and separate evidence storage. No database column change is needed.
- The upload screen already matches the 27 headers correctly in the background. The issue is that it still shows every possible field as a long manual mapping list, which makes a standard file look unfinished.
- The earlier Austin upload created 2,896 source-only evidence rows with no detail or link. You approved removing them.

## Phase 1 — Safely import this Austin file

**Goal:** I handle the mapping and import. You do not use the mapping screen for this file.

1. Remove only the 2,896 empty source-only evidence rows from the earlier Austin batch.
2. Import the 4,699 rows using the fixed Manus mapping.
3. Match teachers by Manus `dedupe_key` first, then email as the safe fallback for teachers already loaded from the earlier Austin file.
4. Use “Add new + enrich” and “Fill blanks only” for normal teacher details.
5. Refresh Manus-owned signal counts and labels from this file.
6. Keep the full original signal text and save the 86 secondary evidence records with their detail, link, confidence, and match basis.
7. Do not turn verified fact labels into creator evidence. The file has verified fact labels but no creator summaries or creator links.
8. Check the final database totals against the file before calling the import complete.

**Expected time:** 1 Lovable turn.

## Phase 2 — Remove manual mapping for standard Manus files

**Goal:** Future Houston, Austin, and other City/Metro files work without manual matching.

1. Detect the exact 27-column Manus header automatically.
2. Apply a fixed, tested mapping for all 27 fields.
3. Replace the long mapping table with a simple confirmation that says the standard Manus format was recognized.
4. Show only exceptions. If a required column is missing or changed, stop the import and name the problem instead of asking you to map dozens of fields.
5. Keep the manual mapping screen only for other, non-standard files.
6. Keep the warning that blocks the separate one-row-per-signal sprint file.
7. Update the helper used by automatic mapping so the same field rules are used everywhere.

**Expected time:** 1 Lovable turn.

## Aesthetics

- A recognized Manus file will show a short success summary, not a large field-by-field form.
- The summary will show teacher rows, verified-fact rows, creator-signal rows, secondary-signal rows, and evidence links.
- Warnings will use plain language and appear only when action is needed.
- Manual choices remain available for unusual files, but they will not distract from the standard City/Metro flow.

## What will be affected

- The Austin teacher records and signal evidence from this uploaded file.
- The Teacher Search “Import to Master Teacher Pool” flow.
- The automatic column-matching helper used by that flow.

## What will not be touched

- Houston teacher data.
- Candidate Pipeline data.
- SmartLead campaigns or outreach rules.
- Teacher scoring or automatic franchise-fit scoring.
- Existing hand-entered teacher details. Blank incoming cells will not erase them.
- Database structure, because the needed fields already exist.

## Risks and checks

- **Duplicate teachers:** test Manus key matching and email fallback before writing.
- **Wrong evidence type:** confirm verified facts remain separate from secondary evidence and creator evidence stays zero.
- **Old source-only rows:** delete only rows tied to the earlier Austin batch and only when both detail and link are empty.
- **Partial import:** compare processed rows, matched teachers, signal counts, and evidence links with the file after import.
- **Future format drift:** reject changed standard headers clearly rather than guessing silently.

## Completion checks

- 4,699 file rows processed with no duplicate Manus keys.
- 2,303 teacher records show verified facts above zero.
- 86 teacher records show secondary signals above zero.
- 86 secondary evidence groups retain source, detail, URL, confidence, and match basis.
- Verified creator count remains zero because the file contains none.
- The 2,896 empty source-only evidence rows are gone.
- Re-importing the same file adds no duplicate teachers or duplicate evidence.
- A future exact 27-column Manus file reaches review without manual column work.
