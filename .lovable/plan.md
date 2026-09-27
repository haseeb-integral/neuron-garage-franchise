# Initial Qualification question changes

## What will change and why

Make the first checkbox read **“Explained that the Owner has to also be the Operator”**. Move **“How did you discover Neuron Garage?”** above the children-experience question. Split the long franchise-interest question into two separate answer boxes:

1. **“Why are you interested in owning your own garage franchise?”**
2. **“What is intriguing to you about our model?”**

Move the city/state question, Desired Market, and the ideal-start-time question below **“Will you have a partner in the business?”** Keep the general-timeline checkbox where it is. This makes the call form easier to follow and lets each answer be saved separately.

## What is affected

- Candidate Pipeline → Qualification Process → Step 1 (Initial Qualification): question words and order.
- Saved Step 1 answers: the first question keeps its current Motivation field; the second gets its own new saved field. Existing Motivation answers stay under the first question.
- Focused tests for the Step 1 form.

No other step, page, calendar event, score, or existing saved answer should change. The registration-state warning stays with the city/state question. The partner details stay with the partner checkbox. Other ideal-start-time answers still load as before.

## Safe phases and estimated turns

### Phase 1 — Add a place to save the second answer (1 Lovable turn)

Add one optional text field to the saved candidate profile. Leave the current Motivation field and all existing answers untouched. Check that the new field is available.

### Phase 2 — Rearrange the form and test it (1 Lovable turn)

Update only Step 1’s question text and order. Connect the two boxes to their separate saved fields. Test saving and reopening both answers, the new order, the checkbox wording, and the existing ideal-start-time and partner fields.

## Risks and checks

- An old combined answer may mention both questions. Keep it intact in the first box; do not guess how to split it.
- Two boxes must save and load without overwriting each other.
- Check that moving city/state keeps the registration warning and that Other still shows and saves its fill-in answer.
- Do not change Steps 2–5, the calendar, Candidate Pipeline stages, uploads, or other tabs.