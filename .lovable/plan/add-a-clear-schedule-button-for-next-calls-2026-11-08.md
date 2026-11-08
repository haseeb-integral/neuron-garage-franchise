# Add a clear Schedule button for next calls

## What changes and why
Each “Scheduled next call with clear agenda” section will have a solid **Schedule** button below its call fields. This covers Steps 1–4 in Candidate Pipeline → Qualification Process.

Right now, filling the date, time, and time zone automatically saves the calendar call. Later edits can also update Google while staff are still entering the title or agenda. The new button will make sending the invite a clear, deliberate action.

## One safe phase — about 1–2 turns
1. Keep saving the field entries as draft notes, but stop creating or changing the calendar invite from ordinary step autosaves.
2. Add a solid Schedule button with a calendar icon. Clicking it saves the current details and uses the existing calendar call action.
3. Require a valid date, time, time zone, and call length before scheduling. Keep the current default type and title when those fields are left blank.
4. Show “Scheduling…” while saving and prevent a second click. Show success only after Google confirms the invite and Meet link. Keep entered details if it fails.
5. After later edits, staff click Schedule again to update the same call, not create another one. Existing Edit/Delete controls remain the way to cancel a call; clearing a draft field alone will not cancel an invite.
6. Remove the old line saying that filling the fields automatically puts the call on the calendar.

## Areas affected
- Qualification Process page and its shared next-call section.
- The connection between step autosave and calendar call saving.
- Focused scheduling tests.
- No new database tables or changes to Google Calendar permissions are needed.

## What stays unchanged
- The separate Step 1 Schedule Call button still sends only Google's invite.
- Next-call scheduling keeps its existing email rules, Meet links, saved call history, and prospect-page updates.
- Other step fields and checkboxes still save automatically.
- Forms, FDD records, stage movement, and homework rules are not changed.

## Risks and testing
- Main risk: an old autosave might schedule a call before the button is clicked. Remove calendar work from that path and test that entering fields sends nothing.
- Test that one click schedules one invite, repeat clicks cannot overlap, and a later click updates the same call.
- Test missing details and Google failure without losing field entries.
- Check button placement and readable fields on desktop and a narrow screen.
- Do not send test invites to real prospects. Use a test candidate for live checks.

## Approval
Wait for approval before changing application code.