# Prospect Portal + Candidate Pipeline fixes

## Your Google Meet question (plain answer)

There are two ways:

1. **Simple: one fixed Google Meet link.** We paste one "standing" Meet link into the call email. Easy and safe. Downside: every prospect uses the same room, and it does not go on anyone's Google Calendar.
2. **Better: connect Google Calendar.** We link one Neuron Garage Google account (for example a shared "recruiting" calendar) to the app. When staff schedule a call, the app makes a real Google Calendar event with its own Meet link and adds the prospect as a guest. Google then sends the prospect a real calendar invite. The call shows on your calendar too.
   - If each staff member (Sam, Kaylie, Skyler) wants calls on their **own** calendar, that is a bigger setup. Each person signs in to Google once. More work, more risk.

**My suggestion:** Option 2 with one shared Neuron Garage calendar first. I will ask you to pick before Phase 4 starts.

## Phases

### Phase 1 — Wording fixes (1 turn, very low risk)
- Portal Step 1 title: "Start the Conversation" becomes **"Initial Qualification"** (portal path and the step-opened email name).
- Background/Credit/Funding form, Funding Plan: change **$14,110 to $21,050** to **$8,575 – $13,825**.
- References wording: remove "We'll let you know before we contact them." Found in the References form (and old RFC version text). New line: "Please share three people who know you well, ideally someone who has seen you work with children and someone who has seen you lead." I will search all portal pages and emails again and confirm no other place says this.
- Request for Consideration: find the "References" label shown at the bottom after submission (it is really the signature agreement). Rename it to **"Acknowledgment and Signature"** and tidy the agreement words so they are clear. I will show you the new words before saving.
- Optional homework "Talk with a current Site Director": list both directors with email and phone links:
  - Zainab White — Zainab.White@NeuronGarage.com — 512-537-4448
  - Tanya Livingston — Tanya.Livingston@NeuronGarage.com — 512-593-1476

### Phase 2 — State dropdowns (1 turn, low risk)
Replace free-typing "State" boxes with a dropdown of the 50 states + DC (two letters). Places found:
- Pipeline: Step 1 Contacts and Basics (State/ZIP), Lead Sheet (home state and desired market state), New Candidate window.
- Portal forms already use a dropdown (RFC, Facility, Item 23). I will double-check them.
- Old saved values that are not a valid code (like "Texas") will still show, so nothing is lost.

### Phase 3 — Step layout in the pipeline (1–2 turns, low-medium risk)
- On every step, the **"Move prospect to next stage"** button takes the place of **"Mark Step complete"**. It becomes a solid, filled button. Clicking it moves the card to the next stage and also marks the step complete (so progress counts stay right).
- It uses the same move check as today. **No email is sent** from this button. Note: the prospect portal "new step opened" email today fires when a stage changes. I will turn that email off for these moves, as you asked. I will confirm with you if you want that email kept anywhere.
- Step 5 has no next stage, so it keeps "Mark Step complete".
- Move **"Signals & Red Flags"** to just below **Post-Call Actions** on each step.
- Under **Assigned homework** (Trial Close item), show a small list of that step's homework, for reference only (no new ticks).

### Phase 4 — "Schedule Call" button + Google Meet invite (2–3 turns, medium risk)
- Add a **"Schedule Call"** button above "Contacts and Basics" in Step 1. It opens the same schedule window as other calls (type, length, title, notes, date/time).
- This button sends **no app email**. Only the Google Calendar invite (with Meet link) goes out, if Google is connected.
- The regular "call booked" email will get the Meet link added (Option 1 or 2, your choice).
- Needs your choice and a one-time Google sign-in.

## What will not change
Signed forms, PDFs, Item 23 evidence, FDD records, the 16-day rule, and Email Outreach.

## What to test
- Portal Step 1 says "Initial Qualification"; new funding range shows.
- State dropdowns save and reload.
- Move button moves the card and sends no email.
- Red flags sit under Post-Call Actions.
- Schedule Call makes a calendar invite with a Meet link.

## Technical details
- Files: `portalPath.ts`, `_shared/portalNoticeRules.ts`, `portalForms/bgcf.ts`, `references.ts`, `rfcLegacy.ts` (display text only), `rfc.ts`/`PortalForm.tsx` review labels, `ContactIntakeSection.tsx`, `LeadSheetSection.tsx`, `NewCandidateModal.tsx`, `ProcessTab.tsx`, `CandidateScheduleSection`.
- New shared `US_STATES` list + `StateSelect` component.
- Step-opened notice is a database trigger on stage change; Phase 3 needs a small, careful change so pipeline moves skip it (will show plan detail first).
- Google: standard Google Calendar connector (shared account), event created server-side with `conferenceData.createRequest` and `sendUpdates=all`.
