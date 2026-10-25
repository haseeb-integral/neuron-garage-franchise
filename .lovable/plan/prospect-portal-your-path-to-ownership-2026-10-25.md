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

**Phase 3b — Next call card (part of Phase 3)**
- A card at the top shows the next call: the date, the time in the prospect's own time zone, how long it is, who it is with, and the call title.
- It comes straight from the calls your staff schedule, so no extra work is needed. If a call is moved or canceled, the card updates.
- Staff notes on the event stay hidden.

**Phase 4 — Files both ways (about 2 turns)**
- Each step has its own set of download files. They show up for the prospect on their own as soon as the step unlocks. Staff never have to tick a box.
- Staff upload these step files once, on a new "Portal files" settings card (for example, the Request for Consideration form or the facility prospect form). Every prospect gets the same files.
- Latest FDD: staff upload the newest FDD once. Every prospect who has reached Step 2 gets a "Download latest FDD" link. When a newer FDD is uploaded, the link points to it. You still email the FDD the way you do now.
- Prospects upload their own files into the open step. These show up in the candidate's Documents tab, tagged "From prospect," and staff get a notification.
- Prospects only ever see their own uploads and the shared step files, never internal files.

**Phase 5 — Forms and e-sign (about 3 turns)**
- Step 2: the Background and Credit Check Authorization is filled in right on the web page. The prospect e-signs by typing their full name, ticking "I agree to sign electronically," and pressing Sign. We save:
  - their name and the exact form text
  - the date and time
  - their signed-in account
  - a PDF copy, which goes into Documents
- The saved PDF fills in the "Run Background and Credit Check" area for staff to see.
- The Request for Consideration and the facility prospect form get the same kind of web forms.
- Before I build any form, I will show you its exact questions and the authorization wording for your OK. I will not make these up. Your lawyer should approve the authorization text.

**Phase 6 — Smoke test (1 turn)**
- A full run-through: invite a test prospect, sign in, staff move them forward, the next step unlocks, the next call shows, files download on their own, the FDD link works, the e-sign makes a PDF, uploads work, and staff see everything. Also check that private data stays hidden.

Total: about 12–14 turns.

## My extra ideas (pick any; none are in the phases yet)
1. **Email nudges:** an email when a new step unlocks, when a call is booked, and a reminder the day before a call. (About 2 turns.)
2. **"Waiting on prospect" badge:** a small badge on the pipeline card showing how many tasks the prospect has finished, like "3 of 4 done", so staff know who to chase. (1 turn.)
3. **Item 23 receipt e-sign:** the prospect signs the FDD Item 23 receipt on the page too. That date then fills in the FDD received date and starts the 16-day lock automatically. (1–2 turns. Your lawyer should check this.)
4. **Contact card:** each step shows who the prospect's contact person is, with a photo, email, and phone. (Part of Phase 3.)
5. **Activity log:** each time the prospect signs, uploads, or ticks a task, it shows in the candidate's Activity tab. (Part of Phases 4–5.)
6. **Pick a call time:** let prospects choose a call time themselves from open slots. This is bigger, and it needs a calendar link like Google Calendar. (Later.)

## What will not change
These stay as they are: the staff pipeline screens, the staff 5-step Qualification Process, the FDD 16-day lock, the calendar, Email Outreach, City Search, and Teacher Search. We only add new pieces next to them.

## Risks and how we handle them
- A prospect seeing staff data: Phase 1 is done and tested first. Every new table only shows a prospect their own rows.
- Staff getting locked out by the Phase 1 change: current staff roles are kept, and I check every staff account afterward.
- Internal text showing by mistake: the portal uses its own approved step text (from your PDF), not the staff checklist.
- One small difference to check: your PDF says signing happens "at least 14 days" after the FDD, but the app's lock uses 16 days. I'll use your PDF's wording unless you tell me otherwise.

## Technical details
- Remove the automatic 'manager' insert from handle_new_user. Add a candidate_portal_users table (user_id to candidate_id). is_staff stays admin/manager only.
- New tables: candidate_portal_users, candidate_portal_checklist, candidate_portal_submissions (form answers and signatures: signer name, consent text, signed_at, user_id, user agent), and portal_step_files (step number, file path, is_current_fdd). Add `uploaded_by_prospect` to candidate_files. RLS uses a security-definer `portal_candidate_id(auth.uid())`, and step files are readable only when the prospect's stage is at or past that step. GRANTs go in the same migration.
- Next call: a security-definer RPC returns only the safe event fields (start, duration, title, type, host name) for the prospect's own candidate.
- The signed PDF is made with pdf-lib in an edge function and saved to private storage.
- Storage policies are limited to `candidates/{own id}/portal/...`.
- Invites go through a staff-only edge function that uses the admin invite API, with a redirect to /portal.
- /portal and /portal/login sit outside the staff ProtectedRoute. The staff layout sends prospect users to /portal.
- Plain CSS layout, with navy and yellow added as theme tokens. Unlock state comes from fromDbStage(candidate.stage), mapped onto the 5 steps.
