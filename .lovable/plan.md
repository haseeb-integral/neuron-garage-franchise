# Prospect homework and Google invite improvements

## What I found

- Step 2 already has an **Email FDD** button, but it sits below Red Flags rather than inside **Post-Call Actions**.
- Step 2 has old support for a `sent_fdd` checklist item, but that item is missing from the visible list.
- The prospect portal already has the personality profile link in its saved homework list. The recruiter’s homework list does not display that link.
- The linked Google Calendar connection is **Shared NG Franchise Development**. The app creates calls on the shared calendar owned by Sam. Google controls the invite sender and organizer; changing text in the app cannot change the sending address.
- The requested Google invite address is **skyler.bossen@neurongarage.com**.

## Phase 1 — Put homework and FDD actions in the right places

**Estimate: 1 implementation turn, then your review.**

1. Add **Email FDD** to Step 2 **Post-Call Actions**.
2. Move the existing FDD email controls into that item. Keep the sent date, version, delivery log, and proof-packet download together. Remove the old copy of these controls below Red Flags.
3. Show a saved completion check in that same spot after sending is confirmed. Queued or failed email must not count as sent. Existing staff-recorded sends remain recognized.
4. Keep staff’s outside-the-app date and version entry available. A simple checklist tick must never create delivery proof, change the FDD version, or unlock signing or downloads.
5. Add a clear **Take the personality profile** link beside the recruiter’s Step 2 homework item. Use the same saved destination as the prospect portal:

   https://zorakle.net/assessment-portal/welcome/neuron-garage

6. Check the prospect’s Step 2 link on screen. Keep or improve its visibility without adding a second link or changing homework completion. Opening the link must not mark the task done.

### Affected areas

- Candidate Pipeline → Qualification Process → Step 2 → Post-Call Actions and Status of Homework.
- Prospect portal → Step 2 → After this call.
- Likely files: `ProcessTab.tsx`, `FddSentDateField.tsx`, and the relevant focused tests. Change `PortalHome.tsx` only if the screen check finds a visibility issue.
- Existing reads of `candidate_compliance`, `fdd_email_sends`, and `fdd_delivery_events` provide the completion evidence. No new tables or sending service are planned.

### What stays unchanged

- FDD email wording, recipient checks, version selection, delivery proof, and saved signatures.
- Full FDD viewing and Item 23 signing.
- The 16-day franchise-signing rule.
- Other steps, stage moves, and all calendar actions.

### Testing

- Confirm the FDD controls appear only once, inside Step 2 Post-Call Actions.
- Test confirmed, queued, failed, and previously recorded send states. Reload the card to confirm the completion check persists.
- Confirm no checklist action can bypass the existing FDD delivery checks.
- Open the personality profile from both staff and prospect screens. Confirm both use the exact URL above and do not tick homework automatically.
- Use an approved test prospect for any real FDD email. Do not send a test email to a real prospect without approval.

## Phase 2 — Verify and change the Google invite identity safely

**Estimate: 1–2 implementation turns, depending on Google account access, then your review.**

1. Inspect the connected Google account, shared calendar access, and one existing event’s creator and organizer. No invites are changed during this check.
2. Connect Skyler’s Google account separately if needed. Keep Sam’s working connection intact until the replacement passes testing. Skyler will need to complete Google’s approval screen.
3. First test whether calls created by Skyler on the same shared calendar show the desired sender. Google may still show the shared calendar’s identity or send its own notification address. Do not promise an exact email From address before inspecting the received invite.
4. If the shared calendar cannot show Skyler as requested, explain the verified result and pause for your choice. A calendar owned by Skyler may be needed. Do not move existing calls or switch calendars without approval.
5. Only switch future call creation after a controlled test passes. Confirm that existing calls can still be updated and canceled through the right calendar and account.

### Affected areas

- Google Calendar account connection and permissions.
- The shared calendar and the staff-only `google-calendar-event` action.
- Candidate Pipeline call scheduling, call edits and cancellations, and the prospect’s next-call card.
- If changing calendars becomes necessary, present a separate small plan for keeping each saved call linked to its original calendar before changing any records.

### What stays unchanged

- Existing Google event IDs, Meet links, call times, and completed history.
- Step 1 sends only the Google invite, with no app booking email or reminder.
- Later calls keep their existing app email rules.
- Do not replace invitations, move old events, or send duplicate invitations.

### Testing

- With an approved test recipient, create one call and inspect its received sender name, sender address, organizer, and Meet link.
- Edit that same call and confirm there is no second event.
- Cancel the test call and confirm the cancellation reaches the recipient.
- Check the staff call list and prospect next-call card.
- Confirm an existing call remains editable with the new account before any switch. If access fails, leave the working setup unchanged.

## Approval and delivery

No app code or Google connection has changed yet. After approval, implement **Phase 1 only**, report the touched files and test results, and pause before Phase 2.

Google documentation: [event organizer rules](https://developers.google.com/workspace/calendar/api/v3/reference/events) and [how calendars own events](https://developers.google.com/workspace/calendar/api/concepts/events-calendars).