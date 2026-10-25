# Prospect Portal — a game board journey for franchise prospects

## What we are building and why
A private website area where invited prospects sign in and see their journey through your 5-step process. On a computer it looks like a game board: a winding path with one tile per step. On a phone it turns into a simple list that opens one step at a time. A step unlocks only when your staff move the candidate forward in the Candidate Pipeline. Inside each open step, the prospect can read what the step is about, download files you share, upload files, and fill in short forms. All of it shows up in the Candidate Pipeline.

## Your decisions (already set)
- Look: game board on a computer, list on phones.
- Unlocking: staff move them (the pipeline stage is the only thing that unlocks steps).
- Login: staff click "Invite to portal" on a candidate, and the prospect gets an email link.
- Privacy: prospects never see internal notes, scores, or committee votes. I will also hide recruiter notes, signals and red flags, background/credit results, and "Internal Only" items. Tell me if you want any of these shown.

## A safety problem we must fix first
Right now, **every new account is made a staff member automatically**. If a prospect signed in today, they could see the whole app: every candidate, every teacher, everything. Phase 1 fixes this before any prospect gets an invite.

## Phases

**Phase 1 — Safety and accounts (about 2 turns)**
- New accounts are no longer staff by default. Staff get added on purpose instead: an admin adds them on Team Members, or their email is on an approved staff list. Your current staff keep their access.
- Add a "prospect" type of account, linked to exactly one candidate.
- Prospects who try to open any staff page get sent to their portal.
- Test: current staff still sign in fine, and a test prospect is blocked from all staff pages and staff data.

**Phase 2 — Invites (about 1–2 turns)**
- An "Invite to portal" button on the candidate panel. It sends an email link, and the prospect sets a password.
- Shows the invite status: not invited, invited, or active.

**Phase 3 — The board (about 2–3 turns)**
- New portal page with your logo: a game board path of the 5 steps. Done steps get a check mark, the current step glows, and later steps are locked.
- Turns into a list (accordion) on phones.
- Each step shows only text that is safe for the prospect: what happens, and their homework.
- Note: "Disqualified" candidates see a polite "process closed" message.

**Phase 4 — Files both ways (about 2 turns)**
- Staff mark which files the prospect can download (for example, the FDD or the Request for Consideration form).
- Prospects upload files into the open step. These appear in the candidate's Documents tab, tagged "From prospect."
- Prospects can only see their own files, and never internal ones.

**Phase 5 — Forms (about 2 turns)**
- Short forms per step (for example, the Request for Consideration answers). Answers are saved to the candidate, and staff see them in the pipeline.
- Before building this, I will show you the exact questions for each step for your OK. I will not make up questions.

**Phase 6 — Smoke test (1 turn)**
- Full run: invite a test prospect, sign in, staff move them forward, the next step unlocks, upload and download work, and staff see everything. Check that private data stays hidden.

Total: about 10–12 turns.

## What will not change
Staff pipeline screens, the 5-step Qualification Process, the FDD 16-day lock, the calendar, Email Outreach, City Search, and Teacher Search. We only add new pieces next to them.

## Risks and how we handle them
- Prospects seeing staff data: Phase 1 is done and tested first, and every new table only shows a prospect their own rows.
- Staff locked out by the Phase 1 change: current staff roles are kept, and I check every staff account afterward.
- Showing internal text by mistake: the portal uses its own separate, approved step text, not the staff checklist.

## Technical details
- Remove the automatic 'manager' insert from handle_new_user; add an `app_role` value `prospect` (or a separate `candidate_portal_users` table mapping user_id to candidate_id). is_staff stays admin/manager only.
- New tables: candidate_portal_users, candidate_portal_submissions; add `prospect_visible boolean default false` and `uploaded_by_prospect` to candidate_files. RLS on all of them uses a security-definer `portal_candidate_id(auth.uid())`. GRANTs go in the same migration.
- Storage policies scoped to `candidates/{own id}/portal/...`.
- Invite through an edge function (staff-only) using the admin invite API, with redirect to /portal.
- New routes /portal and /portal/login sit outside the staff ProtectedRoute; the staff layout redirects prospect users to /portal.
- The board is drawn with SVG/CSS (no new library). Its unlock state comes from fromDbStage(candidate.stage) mapped onto the 5 steps.
