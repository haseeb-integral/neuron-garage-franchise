# Approved Phase 2 — turn 2

- [x] Use the saved company address in new-campaign footers and all launch checks.
- [x] Enforce the saved address before lead pushes, including dry runs.
- [x] Run rule tests and signed-in page checks; deploy the changed function.

Verified: 10 tests passed; address save/reload and default footers passed; deployed lead-push rejects both dry runs and real pushes with no address. Temporary address restored; no emails sent.
Live SmartLead activation remains unverified because its key is rejected; the campaign-list address rule is covered by the shared validation tests.

## Approved Phase 3
- [x] Restrict sync to verified staff or protected server calls; invalid tokens return 401.
- [x] Add manual sync, result messages, last-added time, and a 60-second cooldown to Email Accounts.
- [ ] Enable the daily 07:00 UTC timer. Created job 86, but paused after its saved server credential failed authentication. Repair is blocked by managed secret access; no existing timer or managed secret was changed.
- [x] Run rule tests and signed-in checks: 12 tests passed; actual manual POST returned 200 with 9 failed campaigns and 0 new unsubscribes; cooldown disabled the button and reenabled it after 60 seconds. No emails sent.
- [ ] Verify a successful real sync after SmartLead accepts its API key. Both manual and scheduled success remain blocked by the rejected key.