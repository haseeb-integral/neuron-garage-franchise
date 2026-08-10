# One tab for the whole qualification process

## Goal

Make the "Qualification Process" tab the single place where staff type things in.
The Overview tab becomes a clean, read-only summary card plus the editable score.

## What changes

### 1. Tab names and tab list
- Rename the **Process** tab to **Qualification Process**.
- Delete the **Lead Sheet** tab (trigger + content).
- Tabs after the change: Overview · Qualification Process · Activity · Committee Votes · Documents.

### 2. Step 1 becomes the full intake form
Inside "Step 1 — Initial Qualification", above the Trial Close checklist, add two blocks in this order:

**Block A — Contact & Basics (new, moved from Overview)**
- First Name, Last Name
- Upload Photo
- Email, Other Email, Phone
- Location (City, State)
- Assigned To, Source
- Mailing Address (street, city, state, zip)
- Spouse / Partner involved (yes/no). If yes: partner name, email, phone.

**Block B — Lead Sheet questions (moved as-is)**
All current Lead Sheet fields: role, married, city located in, desired market,
timeline, how they discovered us, can-invest / sweat-equity, liquid capital,
net worth, motivation, other opportunities, background, additional notes.

Then the existing Trial Close, Post-Call Actions, Homework, notes, and
"Mark Step 1 complete" stay exactly where they are, below the new blocks.

### 3. Overview tab becomes a summary
- Contact info, mailing address, and partner info become **read-only display**
  (no click-to-edit, no photo upload button — a small note points to the
  Qualification Process tab).
- Keep the avatar, registration-state warning, and Pipeline Status card.
- Keep the **editable composite score** section (star ratings + notes) as it is today.

## How it stays safe

- No database changes. The same tables and columns are written as today:
  `candidates`, `candidate_profiles`, `candidate_process_steps`, `candidate_qualification`.
- Saving logic is moved, not rewritten: contact fields still save through the
  existing `onSaveProfile` handler; lead-sheet fields still save through the
  existing Lead Sheet save function.
- Activity logging keeps working (lead sheet save events, process step events).
- Nothing on the Kanban board, Committee Votes, Documents, or exports changes.

## Technical notes

- New file `src/components/candidate-pipeline/tabs/step1/ContactIntakeSection.tsx`
  holding the contact/mailing/partner editors moved out of `OverviewTab.tsx`.
- `LeadSheetTab.tsx` is refactored into `LeadSheetSection.tsx` (same code, rendered
  inline instead of as a tab) and mounted inside Step 1.
- `ProcessTab.tsx` renders both sections when `step.num === 1`, and its blue helper
  text that says "lead details live in the Lead Sheet tab" is rewritten.
- `OverviewTab.tsx` loses the edit handlers and renders plain values.
- `CandidateDetailPanel.tsx`: rename trigger, drop Lead Sheet trigger/content.
  `onSaveProfile` is passed down to `ProcessTab` instead of `OverviewTab`.
- The Qualification Process tab is currently behind the `FF_CANDIDATE_PROCESS_V1`
  flag; it will be shown always so no candidate loses the intake form.

## Phases and effort

- **Phase 1 (1 turn):** Move Lead Sheet into Step 1, delete the Lead Sheet tab,
  rename the tab to "Qualification Process".
- **Phase 2 (1 turn):** Move contact / mailing / partner fields into Step 1 and
  make Overview read-only summary + score.

## Risks and testing

- Risk: Step 1 becomes a long page — it stays inside the accordion so it can be collapsed.
- Risk: partner toggle is saved in two places today; after the move there is one owner.
- Please test: edit a contact field in Step 1 and confirm the Overview summary updates;
  save the lead-sheet fields and reload the panel; confirm Activity shows the entries.
