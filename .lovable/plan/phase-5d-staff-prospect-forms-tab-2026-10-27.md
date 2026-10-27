# Phase 5D — Staff Prospect Forms tab

## What comes next
The next unfinished phase is **5D**. The four prospect forms are built, but the candidate card has no dedicated Prospect Forms tab yet.

Add a **Prospect Forms** tab in Candidate Pipeline so staff can see the prospect's answers without opening their login or hunting through files.

## Phase 1 — View answers and download copies
**Estimate: 1–2 Lovable turns. This is the only phase to build after this approval.**

- Show all four forms: Request for Consideration; Background, Credit, and Funding; Item 23 Receipt; Facility Prospect Form.
- Show Not started, Draft with completion percent and last saved time, or Submitted with its date.
- Open a form to read answers by section, including each school and its selected Other reason.
- Mark unfinished answers clearly as Draft. For submitted forms, show the saved submission snapshot, not a later draft.
- Download the existing submitted PDF inside the app, with a clear form name and date. Do not open the storage website in a new tab.
- Show clear loading, empty, and retry states. Switching candidates must never leave the previous candidate's answers visible.
- Use the same form definitions as the prospect pages so question labels and school lists stay consistent.

### What this touches
- The candidate card's tab menu.
- One new staff form-view tab and small shared display/download helpers if needed.
- Read existing form and signature records and existing PDF files. Confirm staff-only access before building. No new tables are expected.

### What stays unchanged
Prospect form questions, autosave, submissions, signatures, original PDFs, FDD delivery records and versions, receipt dates, the signing-only 16-day waiting rule, calendar, uploads, existing tabs, and Email Outreach.

### Risks and safeguards
- **Wrong person's answers:** tie every lookup to the selected candidate; clear old results during loading and candidate changes.
- **Changing signed records:** this phase is read-only. No edits or reopening controls.
- **Wrong submitted copy:** use the saved submission snapshot and its matching PDF. If unavailable, show an honest message rather than guess.
- **Blocked downloads:** use the in-app file download pattern already used by prospects.
- **No saved form:** show Not started, not an error.

### Tests
- Test candidate-specific record selection and submitted-snapshot selection with concrete records.
- Run the existing form tests to catch changes to other forms.
- Sign in as staff; open the test candidate; check all four statuses, available answers, school Other text, and a real PDF download.
- Switch to another candidate and confirm none of the first candidate's answers remain.
- Check that staff cannot edit answers and that prospect access remains separate.
- Use existing records where possible. If new test records are needed, use the designated test prospect and remove only those test records and files afterward.
- Report any checks that cannot be completed; do not call them passed.

## Phase 2 — Safe requests for corrections
**Estimate: 1–2 additional turns, with a separate plan and approval. Not included in Phase 1.**

The original plan included “Reopen for edits.” Signed answers must never be edited in place. Before adding this control, design a new correction draft that keeps the old signed answers, PDF, and audit trail intact. Record who requested the correction and why. Item 23 needs special handling so a correction cannot reset the FDD received date or waiting period.

Keeping this separate makes the staff view low risk and lets you review the correction rules before any saved-form rules change.

## Technical details
- Candidate panel: `src/components/candidate-pipeline/CandidateDetailPanel.tsx`.
- Shared definitions: `src/lib/portalForms`.
- Existing records: `candidate_portal_forms`, `candidate_portal_signatures`.
- Existing files: `candidate_documents` storage.
- Confirm current staff read permissions and file access before implementation. Do not broaden prospect permissions.
- No changes to `portal-submit-form` are planned for Phase 1.

## Approval requested
Approve **Phase 5D, Phase 1 only: staff viewing and downloads**. Stop after that phase, summarize the changes and tests, and ask before the correction phase.