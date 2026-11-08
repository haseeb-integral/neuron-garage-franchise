# Part 2 — Google Calendar call updates and Meet links

## What will change
Keep calls in the app and on **Shared NG Franchise Development** in sync. Add a real Google invitation and a Meet link to calls booked through the other scheduling tools.

Your successful Part 1 test confirms that creating an invite works. Part 2 will not change that calendar or the Step 1 rule: **Step 1 Schedule Call sends only Google's invite. It sends no app booking, move, or reminder email.**

## Phase A — Update existing Google calls
**Estimate: 1–2 Lovable turns. Implement this phase first.**

- Changing a linked call's date, time, length, title, or notes updates the same Google event. It does not create a second event.
- Canceling or deleting a linked call cancels its Google event and notifies its guests.
- Restoring a canceled call creates or restores the needed invite safely and saves its current Meet link.
- Marking a call completed keeps its past Google event as history. It does not cancel it.
- Show a clear message if the Google update fails. Keep enough information to retry without creating another invite or losing the link to an uncanceled Google event.
- Preserve each call's current app-email setting.

**Affected areas:** Candidate Pipeline scheduled-call list, Edit Event window, calendar view, shared call-saving code, and the Google Calendar server action.

**Checks:** Change time and length; change notes; cancel; restore; delete; mark completed; retry a failed update; confirm only one active Google event; confirm Step 1 calls still send no app emails.

## Phase B — Meet links for other scheduling tools
**Estimate: 2–3 Lovable turns. Start only after Phase A is checked and you approve moving on.**

- Calls booked in the regular event window, calendar view, or Qualification Process get a Google invitation with a Meet link.
- Calls with their existing app-email setting enabled keep their booking, move, and day-before emails. Those emails include the saved Meet link.
- Make the Meet link ready before the app call email is prepared. The current app sends these notices as soon as a call is saved, so simply adding a link afterward could send an email without it.
- Do not let an old pending email use details from a call that was canceled or moved again.
- Keep invite updates working for these calls, including calls canceled by clearing their process date.
- Show the saved Meet link on the prospect's next-call card, using the existing private prospect-only access.
- Leave internal follow-up reminders without a Google invite unless they are explicitly booked as a prospect call.
- Do not create Google events for old calls in bulk. Only newly booked or deliberately edited calls are handled.

**Affected areas:** Regular Schedule Event window, calendar view, Qualification Process call fields, prospect next-call card, call-booked/moved/reminder email preparation and templates, and saved call/notice records. A small database change may be needed to order Google preparation before app emails. Review the exact change before applying it. Staff and prospect access rules must stay intact.

**Checks:** Book one call through each tool; confirm guest, calendar, date, duration, host and Meet link; compare the invite with the app email and portal; change and cancel a call; check reminders and duplicate prevention.

## Risk controls

- Use the saved Google event ID to update an existing event rather than blindly creating a new one. Protect retries after Google succeeds but saving its result fails.
- Keep existing Meet links when updating a call. Allow for Google taking time to finish creating a new link.
- Preserve actual call times and time zones, including daylight-saving changes.
- Keep all Google access on the server and staff-only. Prospects may only read their own call details.
- No changes to pipeline stage movement, homework, forms, FDD delivery, Item 23, signing dates, or email outreach.
- Keep the approved email words. Only add the meeting link to call emails.
- Real invite tests send email. Use a test prospect and an inbox you approve; do not change real prospect appointments just to test.

## Approval and completion
Approve Phase A to begin. After it is built, report the files changed, checks passed, and anything you need to test. Stop before Phase B.
