# Plan: Pipeline + Portal improvements (Sam's list)

Your list has 30 changes. I grouped them into 7 small phases. Each phase is safe on its own. I build one phase, you test it, then we do the next.

Things we will NOT touch: signed forms and their PDFs, the FDD proof records, the 16-day rule for signing, Email Outreach, City Search, Teacher Search, staff sign-in.

---

## Phase 1 — Quick wording and removals (about 1 turn)
Low risk. Mostly words and taking things out.

Prospect portal:
- Step 1: say the call is 45 to 60 minutes.
- Remove every "Send us a file" box from all steps.
- Step 2 "After this call": change "Business overview, FDD review" to just "Review the FDD."
- Step 3 call: remove "Start noticing schools in your market."
- Step 4 after the call: remove "Prepare any final questions."
- "Watch for your welcome and onboarding details": remove the due date.

Candidate pipeline:
- Remove the "FDD Review" column from the board (it is already part of Step 2). Before I remove it, I check no candidate is still sitting in it. If any are, I move them to the Step 2 column first.
- Step 2 post-call actions: remove "Sent Background and Credit form", "Send personality assessment invite", and "Sent FDD and saved proof". Prospects do these in the portal now. Old saved answers stay in the database; they just stop showing.
- Rename "Track Homework" to "Status of Homework".

## Phase 2 — Look and feel of the portal (about 1–2 turns)
- Main buttons use the brand red. Example: "Start" on homework.
- "Back to your path" becomes a red button.
- Each homework item sits in its own white box with a border, so it is easy to see.
- Step 1 "After the call" tick boxes: when ticked, the box turns green. No strike-through. "Do before your next call" goes away and is replaced by "Done — submitted."
- Add confetti and a "Congratulations!" message when the last step (signing) is marked done. It shows once per prospect, not every visit.

## Phase 3 — Homework due dates done right (about 1–2 turns)
- First, I review all the due-date rules and write down what each item does today. I fix anything wrong.
- Each homework item shows: "Due X days before your next call" and, if the call is booked, the real date (in the prospect's time zone, not UTC).
- If overdue: red tag that says "Overdue".
- Staff "Status of Homework" shows percent done (for example "75% complete") and an "Overdue" flag when any item is late.
- Tests for each due-date rule.

## Phase 4 — Separate prospect sign-in page + auto refresh (about 1–2 turns)
- New prospect sign-in page (for example `/portal/sign-in`) with on-brand words. Staff keep their own sign-in page. Same safe account rules as today: prospects still land only on the portal.
- Auto refresh: when staff move a prospect to a new stage, the prospect's open page updates by itself. Light on the server: it listens for a change to that one prospect only (one live connection), plus a check when the tab comes back into view. No constant polling.
- I will send you an updated website "Sign In" link prompt if the address changes.

## Phase 5 — Pipeline workflow upgrades (about 2 turns)
- Under each step's post-call actions: a button "Move prospect to next stage: [stage name]". It moves the card and opens the next portal step (and sends the "next step is ready" email, as today). It asks "Are you sure?" first. Signing still follows the 16-day rule.
- Step 1 post-call actions: show the qualification scores right there, and let staff edit them. It is the same saved score as the Overview tab, so both always match.
- Step 2 scheduling: label it clearly "Schedule the Business Immersion and Evaluation call". On the prospect side that call shows under Step 3.
- Keep the open candidate card when you switch tabs and come back. The open card is remembered in the web address, so it reopens by itself.

## Phase 6 — FDD email and unlock rules (about 2 turns)
This touches the FDD record, so it is the most careful phase.
- New Step 2 post-call button: "Email FDD". It sends the prospect an email with the latest FDD attached (or a secure download link if the file is too big for email — I will check size first and tell you).
- Pressing it logs the send in the FDD audit trail and fills the "FDD sent" date by itself.
- Step 2 stays open for the prospect, but:
  - "Download the latest FDD" stays locked until the FDD email is sent.
  - "Sign Item 23 receipt" stays locked until the FDD email is sent.
- Prospects who already got the FDD the old way stay unlocked (their existing send record counts).

## Phase 7 — Forms and emails (about 2 turns)
Request for Consideration (Step 1):
- Remove "County".
- Ask ZIP code. When they type a ZIP, city and state fill in by themselves (they can still change them).
- Remove the References section.

New References form (Step 3, "After this call"):
- Same reference questions moved here.
- When submitted, the answers show under Qualification Process → References for staff.
- Old RFC submissions with references stay as they were.

Emails:
- Friendlier, on-brand words for the portal invite email and the "call is booked" email; light polish on the others. I will show you the exact new words for approval before sending is changed.

---

## Things to test after each phase
- Phase 1: the board, Step 2 actions, each portal step's list.
- Phase 3: a prospect with a booked call, one without, and one overdue.
- Phase 4: sign in as prospect and as staff on the right pages; move a stage while the prospect tab is open.
- Phase 6: send FDD on the test prospect, check unlocks, check audit trail and proof packet.

## Open questions I will ask at the right phase
- Phase 6: should the FDD go as an attachment or a link if it is big?
- Phase 7: exact new email words (I will draft, you approve).

## Technical details
- Portal steps/tasks: `src/lib/portalPath.ts`, `PortalHome.tsx`, `PortalStepFiles.tsx`.
- Forms: `src/lib/portalForms/rfc.ts`, new `references.ts`, `portal-submit-form`.
- Pipeline: `ProcessTab.tsx`, `CandidateDetailPanel.tsx`, `stageDbMapping.ts`, `pipelineData.ts`, `stageColors.ts`.
- Auto refresh: realtime subscription scoped to the prospect's candidate row + visibilitychange refetch.
- FDD email: new function using existing email rail; appends `fdd_delivery_events` row; unlock gate reads that log.
- ZIP lookup: small built-in lookup (no paid service).
- Total estimate: about 10–13 turns.
