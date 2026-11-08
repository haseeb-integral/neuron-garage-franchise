# Fix the calendar conflict safely

## What I found
- The reported Business Overview call is saved. Its Google event and Meet link are also saved, and it is no longer waiting for Google.
- The app queued its call-booked email. This does not prove inbox arrival.
- I checked that same saved call again without changing its time or guests. Google returned success and said nothing needed changing.
- The error means the final save returned no matching call row. The current evidence does not prove why. A second save during the first request is one possible cause.

## One safe phase — about 1–2 turns after approval
1. Add a final read-back when the guarded save reports no matching row.
2. Treat it as success only when the saved call still matches the requested details, Google event ID, Meet link, and ready state. Do not accept a canceled, deleted, or newly changed call as success.
3. If details really changed, keep the protection against saving old results. Show a normal message in the call window instead of treating it as a page failure.
4. Add focused checks for an already-finished save, a real time change, cancellation, and deletion. Recheck the existing test call without moving its time or sending another booking.

## Areas affected
- The Google Calendar action and its result checks.
- Shared call-saving code and, only if needed, the scheduling window's error message.
- Focused tests beside the existing calendar tests.
- Read-only checks of candidate_events; no new tables or changes to database rules are planned.

## What stays unchanged
- Step 1 sends only Google's invite.
- Other call emails wait until the Google invite and Meet link are ready.
- The same saved Google event is reused. No extra invite is created for a retry.
- Staff access, prospect privacy, forms, FDD evidence, stage movement, and reminder timing stay unchanged.

## Risks and testing
- The main risk is accepting an old Google result after someone changes a call. The read-back must compare the saved call details, not just whether a Meet link exists.
- Do not retry Google writes blindly or remove the changed-call safeguard.
- Confirm that a successful repeat creates no extra notice or invite.
- A real simultaneous-edit test may need a controlled test call. No real prospect calls will be moved or canceled without permission.

## Approval
Wait for approval before changing application code.