# Finish Phase 3 — Nightly Unsubscribe Sync

## What the original plan said (Phase 3)
- Nightly timer at 7:00 UTC (2:00 AM Central in winter, 1:00 AM in summer). Runs once a day.
- Same timer style as the Weekly Data Health Digest.
- Signed-in staff can also run it by hand.
- "Sync Unsubscribes" button: spinner, toast, last sync time, 60-second wait.

## Where we are now
Done and tested:
- The "Sync Unsubscribes" button, toast, last-sync time, and 60-second wait.
- The sync job only lets in staff who are signed in.
- 12 tests passed.

Not done:
- The nightly timer. It exists, but it is paused. It tries to sign in with a saved server key, and that key is rejected. So the timer cannot get in.
- A real successful sync. This waits on your SmartLead account fix (payment / key). We will test it after you finish that.

## The fix (stick to the original plan)
The Weekly Data Health Digest timer works today. It does not need a secret server key. We will make the nightly timer work the same simple way, but keep it safe.

1. **Give the timer its own "pass".** A "pass" is a long random code made just for this timer. It is stored safely in the backend. Only the timer and the sync job know it. Nobody types it, and it never shows in chat.
2. **Sync job accepts 2 ways in:**
   - A signed-in staff person (the button) — same as now.
   - The timer, if it shows the correct pass.
   Anyone else gets "not allowed."
3. **Extra safety:** the timer way can run at most once every 20 hours. So even if someone copied it, it cannot be spammed.
4. **Turn the timer back on** (7:00 UTC daily) and remove the old broken key from it.
5. **Test now (without SmartLead):** call the job like the timer does and confirm it gets in (it will report SmartLead campaigns as failed — that is expected while the key is rejected). Confirm a wrong pass is blocked. Confirm the button still works.

Backup if step 1 is blocked by the backend: use the Weekly Digest style exactly (public app key) plus the once-per-20-hours limit. I will tell you if I have to use the backup.

## What gets touched
- The sync job (backend function) — only its "who can get in" check.
- The nightly timer.
- Possibly one tiny saved "last timer run" note in the existing company settings (no new table).

## Do not touch
The button/panel, Reply Triage, Analytics, Import Wizard, Outreach Queue, the proxy sign-in check, "START", negative track flags.

## Turns
About 1 turn. Then Phase 3 is done except the live SmartLead test, which waits on you.

## What you test later (after SmartLead is fixed)
- Click "Sync Unsubscribes" — toast should say "Synced X new unsubscribes" with no failed campaigns.
- Next morning, "Last new unsubscribe" may update if anyone unsubscribed.

## Technical details
- Timer pass: random value created inside the database vault via one-off SQL (`vault.create_secret(encode(gen_random_bytes(32),'hex'), 'unsub_sync_cron_token')`); cron job 86 sends it as header `x-cron-token` read from `vault.decrypted_secrets`.
- Function verifies it by calling a SECURITY DEFINER RPC `verify_unsub_cron_token(_token text) returns boolean` (execute granted to service_role only), created via one-off SQL if the migration tool blocks vault access. Constant-time comparison not needed in SQL; token is 64 hex chars.
- 20-hour guard: stored in `company_settings` row key `unsub_sync_last_cron_run`; cron path returns 429 if too soon. Staff path unaffected (keeps 60s UI cooldown).
- Re-enable with `cron.alter_job(86, command := ..., active := true)`.
- Update the AGENTS.md rule wording for unsubscribe sync auth.
