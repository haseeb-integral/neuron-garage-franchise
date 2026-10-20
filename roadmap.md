# Approved Phase 2 — turn 2

- [x] Use the saved company address in new-campaign footers and all launch checks.
- [x] Enforce the saved address before lead pushes, including dry runs.
- [x] Run rule tests and signed-in page checks; deploy the changed function.

Verified: 10 tests passed; address save/reload and default footers passed; deployed lead-push rejects both dry runs and real pushes with no address. Temporary address restored; no emails sent.
Live SmartLead activation remains unverified because its key is rejected; the campaign-list address rule is covered by the shared validation tests.