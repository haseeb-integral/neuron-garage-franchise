# Approved Phase 2 — turn 2

- [x] Use the saved company address in new-campaign footers and all launch checks.
- [x] Enforce the saved address before lead pushes, including dry runs.
- [x] Run rule tests and signed-in page checks; deploy the changed function.

Verified: 10 tests passed; address save/reload and default footers passed; deployed lead-push rejects both dry runs and real pushes with no address. Temporary address restored; no emails sent.
Live SmartLead activation remains unverified because its key is rejected; the campaign-list address rule is covered by the shared validation tests.

## Approved Phase 3
- [ ] Secure the unsubscribe sync for scheduled calls and signed-in staff.
- [ ] Add manual sync, result messages, last-added time, and a 60-second cooldown to Email Accounts.
- [ ] Install one daily timer at 07:00 UTC (2 AM Central winter; 1 AM summer, per approved plan).
- [ ] Run rule tests and signed-in checks. Live SmartLead success may remain blocked by its key.