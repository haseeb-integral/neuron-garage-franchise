# Step 2: Business Overview Call and FDD Review

## What will change

We will combine the current Steps 2, 3, and 4 into one new Step 2 named **Business Overview Call and FDD Review**.

The qualification process will then have five steps. Current Step 5 becomes Step 3, current Step 6 becomes Step 4, and current Step 7 becomes Step 5.

## Final Step 2 contents

### Post-Call Actions

1. Change the first action to only say that Market Validation and Site Analysis were run.
   - Remove the words about sending reports and uploading them.
   - Show **INTERNAL ONLY** with this action.
2. Remove “Sent franchisee candidate the Mindset book.”
3. Replace “Sent Background and Credit Check authorization” with **Run Background and Credit Check**.
4. Add **Sent Request for Consideration – Part 2: Financial**.
5. Move **Sent FDD and saved/uploaded proof of date sent** here from current Step 4.
6. Keep its proof upload button and move the FDD sent-date box directly below it.

### Background and credit results

Move these from current Step 3 into Step 2:
- Credit score, including the target 720+ note.
- Background check summary.
- The current explanation about how to review background and credit results.

### Track Homework

Remove:
- Candidate to review Market Validation + Site Analysis.
- Read *Mindset* by Carol Dweck.
- Provide authorization for Background + Credit check.

Keep:
- Complete Request for Consideration – Part 2 (financial).

Move here from current Step 4:
- Sign and return Item 23 of the FDD.
- Complete personality profile assessment.

## Other places affected

- The event calendar’s call-type list will use the new five-step names and numbers.
- Saved qualification records will be combined safely so existing Step 2, 3, and 4 answers are not lost.
- Existing later-step records will move to their new numbers.
- Activity notes and progress counts will use the new step names and numbers.
- Candidate pipeline stages will not change. The 16-day FDD lock will not change.

## Safe phases

### Phase 1 — Combine saved records
**Estimate: 1 Lovable turn**

- Merge any saved Step 3 background and credit answers into Step 2.
- Merge any saved Step 4 FDD action, homework, date fallback, notes, and progress into Step 2 without replacing useful Step 2 values.
- Move saved current Steps 5, 6, and 7 to Steps 3, 4, and 5.
- Check the result after the database update.

### Phase 2 — Update the screen and calendar
**Estimate: 1 Lovable turn**

- Build the new Step 2 content listed above.
- Remove the old separate Steps 3 and 4.
- Renumber the later steps.
- Update calendar call types.
- Add or update focused tests for the step list, action labels, homework, moved fields, FDD upload/date, and calendar choices.
- Smoke-test the Qualification Process screen.

## Risks and protection

- **Saved answers:** Combining rows can lose data if done in the wrong order. The database change will merge first, verify, then remove old rows.
- **FDD rule:** The FDD date must keep writing to the same compliance record. We will move only where the box appears, not change the 16-day rule.
- **Uploads:** Existing FDD proof files must remain linked. Their file category and storage path will not change.
- **Old calendar events:** Existing event titles will remain as written. New events will use the new names and numbers.
- **Do not touch:** Candidate stages, Overview, Documents, Committee Votes, Activity, onboarding, Email Outreach, Teacher Search, or City Search.

## Testing

- Open a candidate and confirm only five qualification steps appear.
- Confirm Step 2 has the new title, actions, background/credit fields, FDD proof upload, and FDD date.
- Confirm removed actions and homework are gone.
- Save and reopen Step 2 to confirm every value returns.
- Confirm the FDD date still controls the 16-day signing rule.
- Schedule an event and confirm the five updated call choices appear.
