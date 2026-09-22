# Automatically Add Scheduled Calls to the Calendar

## What we are changing

When a recruiter checks **“Scheduled next call with clear agenda”** in Steps 1–4, the app will automatically add that candidate’s next call to the Calendar.

- Step 1 schedules **Step 2 — Business Overview Call and FDD Review**.
- Step 2 schedules **Step 3 — Business Immersion & Evaluation**.
- Step 3 schedules **Step 4 — Confirmation Call**.
- Step 4 schedules **Step 5 — Signing Call**.
- The event will use the entered date, time, and time zone.
- The event length will start at 30 minutes.
- Changing those details will update the same calendar event, not add another one.
- Unchecking the box will keep the event in history but mark it **Canceled**, as requested.
- Checking it again will restore and update that same event.

If the box is checked before all three details are entered, the step answers will still save. The calendar event will be added once the date, time, and time zone are complete. A clear message will explain what is missing.

## Pages and saved information affected

- **Candidate Pipeline → Qualification Process**, Steps 1–4.
- **Candidate Pipeline → Calendar** and its Upcoming list.
- The existing saved step answers.
- The existing calendar-events table. It will gain a safe link back to the step that created the event.
- The candidate activity history will record automatic creation, updates, and cancellation.

## Safe phases

### Phase 1 — Safe event link (1 turn)

Add a small link on calendar events that records which qualification step created them. Allow only one automatic event per candidate and step. Existing hand-made calendar events stay unchanged.

**Test:** Confirm current events still load and no existing event is changed.

### Phase 2 — Automatic calendar sync (1 turn)

Connect the Step 1–4 checkbox and date, time, and time-zone fields to the calendar. Create, update, cancel, or restore the linked event after the step saves successfully.

The chosen time zone will be used correctly when saving the calendar time, including daylight-saving changes.

**Test:** Check each step, edit its time, reload the candidate, uncheck it, and check it again. Confirm there is always one matching calendar event.

### Phase 3 — Final checks (1 turn)

Run focused checks and a signed-in screen test across Qualification Process and Calendar. Confirm normal hand-made calendar events still work.

**Estimated total:** 3 Lovable turns after approval, one phase per turn.

## Risks and protection

- **Duplicate events:** prevented by the new candidate-and-step link.
- **Wrong time:** prevented by converting the selected time zone before saving.
- **Partial details:** no event is created until date, time, and time zone are all present.
- **Fast edits:** calendar changes happen only after the matching step save succeeds.
- **Existing events:** no automatic matching or rewriting of old hand-made events.
- **Do not touch:** pipeline stages, drag-and-drop, FDD dates and files, qualification scores, CSV import/export, email outreach, teacher search, or any other tabs.
