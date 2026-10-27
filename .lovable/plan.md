# Phase 5b — Prospect email notices

## What is next
The forms and staff correction tools are built. The next planned feature is email notices for prospects. The full portal smoke test follows this work.

You chose a **Neuron Garage sender**, not the app’s current Integral Digital sender. No email settings or app code have been changed for this phase.

## What prospects will receive
Each email goes to one prospect about their own process. It links to the portal sign-in page, never to a private file or internal staff page.

### New step opens
**Subject:** Your next Neuron Garage step is ready

Hi {first name},

Your next step, {step title}, is now open. Sign in to see your next tasks and available files.

**Button:** View my path

### Call booked
**Subject:** Your Neuron Garage call is booked

Hi {first name},

Your {call title} is booked for {date and time, with time zone}. Your call is with {host name} and will last {duration} minutes.

**Button:** View my call

### Call moved
**Subject:** Your Neuron Garage call time has changed

Hi {first name},

Your {call title} has moved to {new date and time, with time zone}. Your call is with {host name} and will last {duration} minutes.

**Button:** View my call

### Day-before reminder
**Subject:** Reminder: your Neuron Garage call is tomorrow

Hi {first name},

Your {call title} is tomorrow at {time, with time zone}. Your call is with {host name} and will last {duration} minutes. Sign in to check your call details and any remaining tasks.

**Button:** View my path

Every notice includes the service’s required unsubscribe footer. Unsubscribing stops app notices to that address. Sign-in and password-reset emails still work. No sales or campaign content is added.

## Small, safe phases

### Phase 1 — Sender setup and email wording
**About 1–2 turns, plus any wait for domain verification. Build only this phase after approval.**

1. Open the email setup controls so you can choose the Neuron Garage domain and visible sender. Do not guess an address.
2. Check whether the existing sender can remain in place for the current staff data-health emails. Do not replace that sender or disrupt those emails without explaining the effect and getting approval.
3. Add and preview the four notices above using the current app-email system. Keep all live prospect triggers off.
4. Send a preview only to an approved test recipient after the sender is verified. Do not send to the whole prospect list.

**Phase 1 needs:** access to the chosen Neuron Garage domain’s email setup. If the project cannot keep both senders, stop and present that decision before changing the current sender.

### Phase 2 — Connect notices to real changes
**About 2 turns. Requires separate approval after Phase 1.**

- Send a step notice only when a new portal step opens—not for every pipeline stage change, backward move, or routine save.
- Send call notices for the same scheduled calls shown to the prospect, including calls made from the Qualification Process and the calendar.
- Send a moved-call notice only when the scheduled time changes. Notes edits must not send another notice.
- Do not send to candidates who are not invited, whose process is closed, or whose email is blocked by unsubscribe, bounce, or complaint rules.
- Remember each notice’s event so retries cannot send duplicates.
- Check upcoming calls once an hour for reminders on the day before the call, using the call’s saved time zone. This means 24 checks per day and up to one hour’s delay. It avoids costly minute-by-minute checks.
- Recheck the call before sending, so an old reminder does not go out after a move or cancellation.
- A notice failure must never undo a saved call or stage change.

### Phase 3 — Full portal smoke test
**About 1–2 turns. Requires separate approval.**

Use the designated test prospect to check invites, sign-in, step opening, call changes, files, uploads, all forms, corrections, receipt proof, and email notices. Check staff read-back and private-data protection. Restore temporary test records and files.

Also finish the two open correction checks: truly simultaneous submissions and interrupted-save recovery. Earlier tests verified repeat submission rejection, not simultaneous requests.

## What may be affected
- Prospect emails and their unsubscribe page.
- Candidate Pipeline stage changes and scheduled calls as sources of notices; no visual redesign.
- The existing email sender, email templates, send history, and reminder tracking.
- Staff bell notices only for regression checks; they must keep working.

## What must not change
Original signatures, PDFs, FDD version evidence, first received date, signing-only 16-day rule, form questions, known-information fill-in, Facility Other reasons, call-saving rules, portal file access, staff permissions, Email Outreach/SmartLead, City Search, Teacher Search, and existing staff digest emails.

## Risks and testing
- **Wrong sender:** verify the Neuron Garage sender first; never silently replace the current one.
- **Duplicate emails:** use a saved event identity and test retries.
- **Wrong time:** use a named time zone, and test a moved call and a daylight-saving change.
- **Private data:** email only approved prospect details. No recruiter notes, checks, scores, votes, draft answers, or private file links.
- **Old reminder:** check the latest scheduled call state immediately before sending.
- **Email blocked:** respect unsubscribe and complaint rules. Never clear them to force a send.
- **Unexpected real mail:** use the designated test account, with live triggers kept off until checked.

## Technical details
- Reuse the single app-email send function, its template registry, suppression checks, unsubscribe handling, and delivery queue. Do not rebuild the email infrastructure or mix these notices into SmartLead.
- Add server-verified event handling for portal-visible transitions in `candidates.current_stage` and scheduled `candidate_events`. Cover both calendar and qualification scheduling paths.
- Add narrowly scoped notice tracking with explicit grants and row-access rules if needed. Existing candidate/form tables must not be widened for prospects.
- Reminder scheduling is genuinely time-based; prefer a supported delayed workflow if available, otherwise one hourly reminder check. Each call’s reminder is an individual expected notice, not a campaign.
- Likely files: new email templates and registry entries, the shared send function only if necessary, a portal notice handler, reminder handling, and focused tests. Exact changes depend on the sender setup result.

## Approval
Approve **Phase 1 only: Neuron Garage sender setup and email previews**, including the wording above. No live prospect notices will be enabled in Phase 1.