# Candidate Pipeline: Table View, CSV Export, CSV Import

Goal: add a third view (Table) to the Candidate Pipeline, download all candidates to CSV (also usable as a backup), and import candidates from a CSV made outside the app.

## What we are changing and why

1. **Table view** — a spreadsheet-style list of every candidate, sortable, using the filters that already exist on the page. Easy to scan, easy to export.
2. **Download CSV** — one button that writes every visible candidate (or all candidates) to a CSV file. Doubles as a backup copy.
3. **Import CSV** — a small wizard: upload file, map/preview rows, see which rows are new / duplicate / bad, then import only the approved rows.

## Where it fits

- The page `/candidate-pipeline` already has a Board / Calendar switch. We add a third button: **Board | Calendar | Table**. Board stays the default, so nothing changes unless the user clicks.
- Table view reads the same candidate list already loaded in the page. No new data fetch, no change to the Kanban board, cards, or detail panel.
- Export and Import buttons live in the Table view toolbar only. Nothing else on the page moves.

## Safety and how to unwind

- No database schema change is needed for export. Import needs one small thing only: an optional `import_batch_id` text column on `candidates` so any bad import can be undone in one step ("delete rows from batch X"). This is additive and safe.
- Every import row is written with that batch id, and the wizard shows an **Undo this import** button right after it finishes.
- Import never updates existing rows in phase 1 — it only inserts new ones. Duplicates (same email) are flagged and skipped. This means an import can never damage existing candidate data.
- Unwinding the whole feature = remove the Table button and the two new files; the board and calendar are untouched.

## Rules for the CSV

- Columns match the database fields for a candidate: name, email, other email, phone, city, state, stage, assigned to, tag, source type / name / campaign, mailing address, partner fields, created date, plus the qualification scores as read-only extra columns.
- A file downloaded from the app can be re-imported (round trip). Score columns and dates are ignored on import in phase 1.
- Required on import: first name, last name, email. Rows missing those are skipped with a reason shown.
- Stage and tag values are checked against the allowed list; unknown values fall back to "New Lead" / no tag with a warning.

## Phases

**Phase 1 — Table view + CSV download (1 turn)**
New `CandidatesTable.tsx` and `candidatePipelineCsv.ts`. Add the third toggle button. Download button exports current filtered rows, with a "download all" option.
Risk: very low, read-only.

**Phase 2 — Import batch column (1 turn)**
Add `import_batch_id` to `candidates` (nullable text) so imports can be undone.
Risk: low, additive only.

**Phase 3 — CSV import wizard (1–2 turns)**
New `CandidateImportWizard.tsx` modeled on the existing teacher import wizard: upload, auto-map columns, preview with approve/reject per row, duplicate check on email, chunked insert, result summary with **Undo this import**.
Risk: medium, but limited by insert-only behaviour and the undo button.

**Phase 4 — Optional polish (1 turn, only if wanted)**
Scheduled/one-click "full backup CSV" including qualification, compliance and event rows as separate files in one zip.

Total: 3–5 turns.

## Do not touch

- Kanban board, drag and drop, candidate detail panel tabs, calendar, compliance rules, or the 16-day FDD logic.
- No changes to stage-change triggers; imported candidates are inserted at their stated stage without firing stage-history side effects beyond the normal insert path.

## What to test after each phase

- Phase 1: switch to Table, sort a column, apply an owner/qualification filter, download and open the CSV in a spreadsheet.
- Phase 3: import a 3-row test file including one duplicate email and one row with no email; check counts, check the new cards appear on the board, then press Undo and check they disappear.

## Technical notes

- Files: `src/pages/CandidatePipeline.tsx` (toggle + view render), `src/components/candidate-pipeline/CandidatesTable.tsx` (new), `src/components/candidate-pipeline/CandidateImportWizard.tsx` (new), `src/lib/candidatePipelineCsv.ts` (new: column spec, serialise, parse/validate).
- CSV parse uses `papaparse`, already a dependency.
- Import inserts in 500-row chunks with `count: "exact"`, same pattern as `TeacherImportWizard.tsx`.
- Column spec lives in one file so export and import can never drift apart.
