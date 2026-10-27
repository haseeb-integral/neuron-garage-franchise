# Phase 5D — Safe form corrections

## What we are changing and why
The staff answers-and-downloads tab is done. This next part lets staff ask a prospect to correct a submitted form without changing the original signed record.

**A correction is a new submission, not an edit to the old signature.** The old answers, PDF, signing date, and proof stay saved.

## What staff and prospects will see
- Staff get a **Request correction** button on a submitted form in the candidate's Prospect Forms tab.
- A small window asks for the reason. Staff must enter it before confirming.
- The prospect sees **Correction requested**, the reason, and a Continue button on their homework item.
- The correction draft starts with the last submitted answers. The prospect changes only what needs fixing, saves, and returns later as usual.
- The prospect reviews and signs again for forms that require a signature. The Facility form still uses Submit without a signature.
- Staff can read the correction draft and a **Previous submissions** list. Both staff and the prospect can still download the original PDF.
- After the new submission, staff see the corrected answers as the latest submitted copy. Older copies stay available with their own dates.
- Requesting a correction does not move the candidate backward, relock a step, or change a scheduled call.

## Safe phases and estimates

### Phase 1 — Correction requests and a complete correction flow
**About 2 Lovable turns. Build only this phase after approval.**

1. Add a staff-only correction action that copies the last submission into the editable working draft. Keep the original signature record untouched.
2. Save a permanent correction-request entry with candidate, form, original submission, staff member, time, and reason. Reject a second request while a correction is already open.
3. Update the staff tab and prospect homework/form screens to show the request and retain access to previous submissions.
4. Require a fresh review and signature where needed. Do not reuse the previous signature or its consent timestamp as proof of the new submission.
5. Link the new submission to its correction request. Create a new PDF and signature/audit entry using the existing submission path.
6. Log the request and the corrected submission in Activity. Keep the existing submitted-form notification behavior; do not add a new email system here.
7. Keep the existing homework tick and stage progress intact while the correction is pending. The visible form status will show that a correction is still needed.

### Phase 2 — Final check and any narrow repairs
**About 1 turn, only if Phase 1 cannot fit in two turns.**

Finish the same approved flow, run the end-to-end checks below, and fix only problems caused by this change. No extra features. Report what remains untested if testing needs access that is unavailable.

## Extra safeguards for Item 23
- A corrected receipt must name the same FDD version as the receipt being corrected. Do not silently switch to a newer FDD or a later staff selection.
- If that original version cannot be confirmed, block the correction with a clear contact message. Do not guess.
- Do not clear, replace, or reset the first recorded FDD received date. Do not restart the 16-day wait.
- The waiting rule still blocks franchise signing only, not earlier process steps or Item 23 signing.
- Keep the original receipt and corrected receipt in the proof history. Update the proof-packet download to include the receipt history, not only the latest copy.
- Label a corrected receipt's delivery-log entry as a correction linked to the original receipt, not a new first-receipt event.
- Do not change the approved disclosures or seller details.

## What may be affected
- Staff Candidate Pipeline → Prospect Forms and Activity.
- Prospect homework status, form page, review/sign screen, and copy downloads.
- Existing form working records and append-only signature records.
- The form-submission function and FDD proof-packet function.
- One correction-request record store and a staff-only request action.

## What must not change
Original signed answers and PDFs; FDD delivery history, issuance dates, and fingerprints; first FDD received date; signing-only 16-day rule; form questions; known-information fill-in; school Other behavior; calendar; portal file uploads; staff qualification answers; Email Outreach; and other modules.

## Risks and how we limit them
- **Losing signed proof:** make no update or delete to old signature records or PDFs. Use their saved snapshot to start the correction.
- **Two requests or submissions at once:** make request creation and draft reopening one locked database action. Recheck state when submitting so a repeat click cannot produce competing corrections.
- **Prospect opens someone else's form:** keep every request, draft, history entry, and download limited to that prospect's own candidate. Staff access must be checked on the server, not just by hiding a button.
- **Old answers appear under a new PDF:** always pair each history entry's answers with its own signature and PDF.
- **Reused consent:** clear the old consent marker in the correction draft and ask again when that form requires electronic-record consent.
- **Proof packet loses the original receipt:** include all applicable receipt submissions and their request links.
- **A failed submit leaves a broken correction:** mark the request complete only when the new submission is saved. Keep the draft available after a failure.

## Tests before calling it complete
- Staff can request a correction with a reason; prospects and signed-out visitors cannot.
- Empty reasons, duplicate requests, and requests without a saved submission are rejected.
- The old signed snapshot, PDF fingerprint, and signing date stay exactly the same.
- The correction starts with the prior answers and keeps changes after saving and reopening.
- Required consent/signature checks run again. Facility still submits without a signature.
- A new submission gets a separate PDF and history entry; both old and new PDFs download and match their answers.
- Item 23 keeps its original FDD version and received date. Test with a later staff version selection to prove it cannot silently switch.
- Test repeated clicks and failed submission recovery.
- Switching candidates clears the previous candidate's answers and history.
- Run the existing form tests and new tests for each correction safety rule.
- Test the real staff → test prospect → corrected submission → staff read-back flow. Use only the designated test prospect and remove only temporary test records/files afterward.

## Technical details
- Keep the unique `candidate_id + form_key` working record in `candidate_portal_forms`. Reopen it only by copying the immutable latest submission into a correction draft; do not treat the working row as signed evidence.
- Preserve `candidate_portal_signatures` as append-only submission snapshots and PDFs.
- Add an append-only correction-request table with explicit grants, row access rules, and a staff-verified atomic request function. Track fulfillment through the linked new submission rather than rewriting the original request.
- Extend the existing shared staff form-selection helper to distinguish correction drafts from submitted history.
- Review concurrent submit handling in `portal-submit-form` before enabling corrections.
- Pin Item 23 corrections to the FDD version tied to their source receipt, resolving it from saved delivery/signing evidence rather than today's default version lookup.

## Approval requested
Approve Phase 5D's **correction flow** above. No app code or database changes have been made for this step yet.