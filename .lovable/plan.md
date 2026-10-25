# Prospect Portal — "Your Path to Ownership"

## What we are building and why
A private website area. Prospects you invite sign in there and see where they are in your 5-step process. It will look like your "Your Path to Ownership" PDF:
- navy and yellow colors
- a numbered yellow circle for each step, joined by a dotted line
- a step card on the left, with the title, a time pill, a description, and the date
- an "After this call" checklist on the right

On a phone, each checklist sits under its step card. A step unlocks only when your staff move the candidate forward in the Candidate Pipeline. Inside an open step, the prospect can:
- download files you share
- upload files
- fill in short forms

All of it shows up in the Candidate Pipeline.

## Your decisions (already set)
- Look: the clean style of your PDF. No game board.
- Unlocking: staff move them. The pipeline stage is the only thing that unlocks steps.
- Login: staff click "Invite to portal" on a candidate, and the prospect gets an email link.
- Privacy: prospects never see internal notes, scores, or committee votes. I will also hide recruiter notes, signals and red flags, background/credit results, and "Internal Only" items. Tell me if you want any of these shown.

## A safety problem we must fix first
Right now, **every new account is made a staff member automatically**. If a prospect signed in today, they could see the whole app: every candidate, every teacher, everything. Phase 1 fixes this before any prospect gets an invite.

## Phases

**Phase 1 — Safety and accounts (about 2 turns)**
- New accounts stop being staff automatically. An admin adds new staff on purpose. Your current staff keep their access.
- Add a "prospect" type of account, linked to exactly one candidate.
- If a prospect tries to open any staff page, they get sent to their portal.
- Test: current staff still sign in fine. A test prospect is blocked from every staff page and from all staff data.

**Phase 2 — Invites (about 1–2 turns)**
- An "Invite to portal" button on the candidate panel. It sends an email link, and the prospect uses it to set a password.
- Shows the invite status: not invited, invited, or active.

**Phase 3 — The path page (about 2 turns)**
- New portal page with your logo, header, and intro line from the PDF.
- The 5 steps use the PDF's exact titles, times, descriptions, and "After this call" lists.
- Done steps get a check mark in the circle. The current step is bright yellow and already opened. Later steps are grey with a lock, but the prospect can still read the title, so they see the whole path.
- "Date scheduled" fills in from the call date your staff save in the pipeline.
- Prospects can tick off their own checklist items, and staff can see the ticks.
- Footer: the company line and "Questions? Skyler Bossen · 512-593-2750".
- "Disqualified" candidates see a polite "process closed" message.

**Phase 4 — Files both ways (about 2 turns)**
- Staff mark which files the prospect can download (for example, the FDD or the Request for Consideration form).
- Prospect uploads go into the open step. They show up in the candidate's Documents tab, tagged "From prospect."
- Prospects only see their own files, never internal ones.

**Phase 5 — Forms (about 2 turns)**
- Short forms for each step (for example, the Request for Consideration). Answers are saved on the candidate, and staff see them in the pipeline.
- Before building this, I will show you the exact questions for each step for your OK. I will not make up questions.

**Phase 6 — Smoke test (1 turn)**
- A full run-through: invite a test prospect, sign in, staff move them forward, the next step unlocks, uploads and downloads work, and staff see everything. Also check that private data stays hidden.

Total: about 10–12 turns.

## What will not change
These stay as they are: the staff pipeline screens, the staff 5-step Qualification Process, the FDD 16-day lock, the calendar, Email Outreach, City Search, and Teacher Search. We only add new pieces next to them.

## Risks and how we handle them
- A prospect seeing staff data: Phase 1 is done and tested first. Every new table only shows a prospect their own rows.
- Staff getting locked out by the Phase 1 change: current staff roles are kept, and I check every staff account afterward.
- Internal text showing by mistake: the portal uses its own approved step text (from your PDF), not the staff checklist.
- One small difference to check: your PDF says signing happens "at least 14 days" after the FDD, but the app's lock uses 16 days. I'll use your PDF's wording unless you tell me otherwise.

## Technical details
- Remove the automatic 'manager' insert from handle_new_user. Add a candidate_portal_users table (user_id to candidate_id). is_staff stays admin/manager only.
- New tables: candidate_portal_users, candidate_portal_checklist, candidate_portal_submissions. Add `prospect_visible boolean default false` and `uploaded_by_prospect` to candidate_files. RLS uses a security-definer `portal_candidate_id(auth.uid())`. GRANTs go in the same migration.
- Storage policies are limited to `candidates/{own id}/portal/...`.
- Invites go through a staff-only edge function that uses the admin invite API, with a redirect to /portal.
- /portal and /portal/login sit outside the staff ProtectedRoute. The staff layout sends prospect users to /portal.
- Plain CSS layout, with navy and yellow added as theme tokens. Unlock state comes from fromDbStage(candidate.stage), mapped onto the 5 steps.
