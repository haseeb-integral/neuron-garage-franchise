# Fix the FDD waiting rule without blocking progress

## What is wrong
The Candidate Pipeline checks the 16-day wait whenever a prospect leaves FDD Review. That wrongly blocks moving to Immersion. It can also block other moves out of FDD Review.

The saved franchise agreement signing date already has its own database check. That check is correct and will stay unchanged.

## One safe phase — about 1 Lovable turn after approval
1. Change the pipeline check so the FDD wait applies only when moving into Signing, no matter which step the prospect comes from.
2. Allow moves to Immersion and other earlier steps without waiting 16 days. Keep the usual move confirmation and other existing step checks.
3. Make the warning clearly refer to franchise signing. Correct its old reference to where staff record the FDD sent date.
4. Add small tests for the stage rule: Immersion and Confirmation are not held by the FDD clock; Signing is. Check that signing is blocked before day 16 and allowed on day 16.
5. Smoke-test the Candidate Pipeline while signed in. Move the test prospect to Immersion with a recent FDD date and confirm the saved step reads back correctly. Check the early-Signing warning. Restore any temporary test changes.

## What is affected
- Candidate Pipeline stage moves, including dragging cards between columns.
- The shared FDD rule helper and its tests, if needed to test the stage condition directly.
- Prospect portal progress will reflect the saved step through its existing behavior. No portal code changes are planned.

### Technical scope
The incorrect condition is in `src/pages/CandidatePipeline.tsx`, inside `handleStageDrop`. It currently tests the source stage, `fdd_review`; it should test the destination, `signing`. The live `enforce_fdd_16_day_rule()` database function already checks only `candidate_compliance.fa_signed_at`. No database changes are needed.

## Risks and protection
- **Main risk:** accidentally allowing early franchise signing. Keep the 16-day calculation, the database signing-date check, and the existing Confirmation-before-Signing rule unchanged.
- Keep the existing staff override and feature switch unchanged. Do not add any bypass.
- Do not change FDD sent or received dates, Item 23 receipt signing, FDD versions, signed PDFs, delivery proof, or the audit trail.
- Do not change Email Outreach or other modules.
- This is a narrow fix with no change to saved forms or files. Item 23 receipt signing must remain available because it starts the waiting clock; it is not franchise agreement signing.

## Approval
After approval, complete this one phase and report the files changed, test results, and what Sam should try.