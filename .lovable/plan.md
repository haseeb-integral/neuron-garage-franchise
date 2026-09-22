# Step 1 Qualification Process changes

## What will change

Update **Candidate Pipeline → Qualification Process → Step 1** so the call form matches the new process.

- Remove **“Are you married?”** from the screen.
- Remove the full **“Low investment, but not no investment”** group:
  - investment question
  - summer sweat-equity question
  - liquid capital
  - net worth
- Replace **“What would be your role in Neuron Garage?”** with one checkbox:
  - **“I explained that the Owner has to also be the Operator”**
- Move **“Will you have a partner in the business?”** and its partner details below:
  - **“What other opportunities for summer income are you looking at or considering?”**
- Replace **“Desired timeline to start”** with:
  - checkbox: **“Explained the general timeline of finding a facility, opening enrollment, start of camp.”**
  - drop-down: **“If this was a fit, when would they ideally like to begin?”**
  - choices: **This coming Summer**, **Next Summer**, **Other**
  - selecting **Other** opens a fill-in answer
- Move the **Step 1 recruiter notes** to just above **Trial Close**.
- Add one Step 1 homework checkbox:
  - **“Review neurongarage.com and review neurongaragefranchise.com”**

## What is affected

- The Step 1 lead sheet and its saved answers.
- The Step 1 homework progress count.
- The Step 1 recruiter-notes position.
- Tests for the Step 1 form.
- A small database update for the two new “explained” checkboxes.

No other Candidate Pipeline step will be changed. Existing hidden answers for removed questions will stay in the database. They will not be erased.

## Safe phases

### Phase 1 — Save the two new checkboxes
**Estimate: 1 Lovable turn**

Add two saved yes/no fields:
- owner/operator explanation completed
- general timeline explanation completed

Keep the current timeline text field in place behind the new drop-down so old timeline answers are not lost.

### Phase 2 — Update Step 1 and test it
**Estimate: 1 Lovable turn**

- Make all requested Step 1 layout and wording changes.
- Add the single website-review homework item.
- Move only Step 1 recruiter notes above Trial Close.
- Update the focused Step 1 tests.
- Smoke-test saving, reloading, the **Other** answer, and homework progress.

## Risks and protection

- **Old data:** removed questions may already have answers. They will remain stored and untouched.
- **Timeline:** old free-text timeline answers must still load. If an old value does not match the new choices, it will appear as **Other** with that text preserved.
- **Progress:** the new homework item adds one item to Step 1’s total. Existing homework checks remain unchanged.
- **Do not touch:** Steps 2–7, qualification scores, stage rules, FDD lock, calendar, CSV tools, documents, votes, or other Candidate Pipeline tabs.

## Testing

- Confirm removed questions no longer appear.
- Confirm both new checkboxes save and reload.
- Confirm all three timing choices save and reload.
- Confirm **Other** opens a fill-in field and keeps its answer.
- Confirm the partner block appears below the summer-income question.
- Confirm Step 1 recruiter notes appear immediately above Trial Close.
- Confirm the website-review homework checkbox saves and changes Step 1 progress.
