# Portal invite placement and Step 1 updates

## What will change, and why

Prospects will be invited after the first conversation. The portal should make clear that this conversation has happened, while keeping its homework available.

### Phase 1 — Move the staff invite button
**Estimate: 1 Lovable turn after approval.**

- Remove the portal invite button from the candidate contact card header.
- Place it inside **Qualification Process → Step 2 → Post-Call Actions**.
- Keep the current red color before an invite and green color after an invite.
- Keep resend, invite status, and all existing invite checks unchanged.
- This changes where staff find the button. It does not add a new rule that blocks invites based on a date or stage.

**Test:** Open candidates with and without an invite. Check the button is only in Step 2, has the correct color, and still shows the correct invite status. Do not send real invites during testing.

### Phase 2 — Update the prospect’s Step 1
**Estimate: 1 Lovable turn, after Phase 1 is reviewed.**

- Remove **Files for you** and **Send us a file** from **Start the Conversation** only. Keep file controls in all other steps. Do not delete stored files.
- Replace the combined website task with two separate, saved checkboxes:
  - **Explore Neuron Garage** → `https://neurongarage.com/`
  - **NeuronGarageFranchise.com** → `https://neurongaragefranchise.com/`
- Make each title a link that opens in a new tab. Clicking a link will not tick its checkbox.
- Show that Step 1’s conversation has already happened when a prospect signs in. Do not mark its homework complete.
- Keep the Request for Consideration form and both website tasks available, even when the prospect has reached a later step.
- Keep Step 1 homework due notices visible while that work remains unfinished.
- Do not change the candidate’s saved pipeline stage or unlock later steps just because someone signs in.

**Test:** Sign in as a linked test prospect. Confirm Step 1 shows the conversation has happened, but unfinished work remains open. Tick one website task, refresh, and confirm the other stays unticked. Check both link destinations. Check Step 1 has no file controls and Step 2 still does. Check the staff task count uses the new three-item Step 1 list.

## How this fits the current app

- The staff button continues to use the existing invite process.
- The portal continues to use the candidate’s saved stage for later-step access.
- Conversation status and homework status stay separate. A completed call does not mean completed homework.
- The two website tasks use the existing saved-checkbox system. The old combined website tick will not automatically mark either new checkbox done.

## Risks and protections

- **Invite button is harder to find:** It will have one clear home in Step 2 Post-Call Actions; no duplicate button in the contact header.
- **Homework could appear finished too soon:** Only the conversation will be shown as already held. Tasks keep their own saved status.
- **Website task count changes:** Step 1 will have three tasks: the form and two website visits. Add a small task-count test and run the relevant existing tests.
- **Changes could spill into other steps:** Hide file controls for Step 1 only. Check another step in the browser.

## What must not change

Forms and questions, signed answers, PDFs, FDD records, the signing wait rule, file storage, staff access, prospect privacy, email notices, other pipeline steps, and other app sections.

## Technical scope

- Phase 1: `CandidateDetailPanel.tsx` and `tabs/ProcessTab.tsx`; reuse `PortalInviteButton.tsx` unchanged.
- Phase 2: `PortalHome.tsx`, `portalPath.ts`, and relevant task-rule tests. The shared staff progress badge already reads the same task list.
- No new database tables, permission rules, or sending functions are planned.

## Approval and review

After approval, implement Phase 1 only. Summarize the changes, name the files touched, and report test results. Wait for approval to begin Phase 2.