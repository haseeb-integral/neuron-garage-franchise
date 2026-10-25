# Approved Phase 2 — turn 2

- [x] Use the saved company address in new-campaign footers and all launch checks.
- [x] Enforce the saved address before lead pushes, including dry runs.
- [x] Run rule tests and signed-in page checks; deploy the changed function.

Verified: 10 tests passed; address save/reload and default footers passed; deployed lead-push rejects both dry runs and real pushes with no address. Temporary address restored; no emails sent.
Live SmartLead activation remains unverified because its key is rejected; the campaign-list address rule is covered by the shared validation tests.

## Approved Phase 3
- [x] Restrict sync to verified staff or protected server calls; invalid tokens return 401.
- [x] Add manual sync, result messages, last-added time, and a 60-second cooldown to Email Accounts.
- [x] Daily 07:00 UTC timer on, using its own vault pass (max once per 20 hours). Timer-style call got in; wrong pass and no pass return 401.
- [x] Run rule tests and signed-in checks: 12 tests passed; actual manual POST returned 200 with 9 failed campaigns and 0 new unsubscribes; cooldown disabled the button and reenabled it after 60 seconds. No emails sent.
- [ ] (Waits on user's SmartLead account fix) Verify a successful real sync after SmartLead accepts its API key. Both manual and scheduled success remain blocked by the rejected key.
## Approved Phase 4
- [x] Part 1: campaign-mailbox link list (staff read only).
- [x] Part 2: smartlead-sync-mailboxes deployed; strangers 401, staff gets clear bad-key message.
- [x] Part 3+4: panel reads saved copy, campaigns per mailbox, Refresh button, own section.
- [ ] (Waits on SmartLead account fix) live mailbox sync test.

## Prospect Portal (approved plan)
- [x] Phase 1 — safety and accounts
- [x] Phase 2 — invites (live invite email not yet tried on a real address)
- [ ] Phase 3 — path page + next call card + "3 of 4 done" badge + activity log (DONE)
- [ ] Phase 4 — step files, latest FDD link, prospect uploads (+ activity log)
- [ ] Phase 5 — forms, background/credit e-sign, Item 23 e-sign that fills the FDD received date
- [ ] Phase 5b — email nudges (step unlocked, call booked or moved, day-before reminder)
- [ ] Phase 6 — smoke test
