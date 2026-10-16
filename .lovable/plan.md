# SmartLead Unsubscribe Sync (daily)

## What and why
A new background job runs every night at 2:00 AM Central time. It asks SmartLead which people unsubscribed from each of our campaigns, then adds any new ones to our do-not-email list. That way nobody who unsubscribed gets emailed again, even if a webhook was missed.

## Things in the brief that don't match the real database (checked)
1. **Column names.** The do-not-email list has `email`, `reason`, `metadata`, `created_at`. There is no `suppressed_at` column. I will use `created_at` as the "suppressed at" time.
2. **Allowed reasons.** The table only allows `unsubscribe`, `bounce`, or `complaint`. `smartlead_unsubscribe` would be rejected. Plan: save `reason = 'unsubscribe'` and mark the source in `metadata` as `{"source":"smartlead_unsubscribe_sync","campaign_id":...}`. This keeps the table rule as is (the brief says don't change tables).
3. **Campaign IDs.** The campaign list table stores the SmartLead ID in `id`, not `smartlead_id`. It has 10 campaigns (all test ones, last synced in June).
4. **Calling through the proxy.** The proxy only lets in signed-in users. A night job has no signed-in user, so the proxy would turn it away. Since the brief says not to change the proxy, the new job will call SmartLead itself, on the server only, with the same saved SmartLead key and the same URL style as the proxy. The browser never sees the key. If you'd rather I change the proxy to also accept the night job, say so.
5. **Schedule style.** It will use the same nightly-job setup as the Weekly Data Health Digest (a database timer that calls the function).

## Phases
**Phase 1 — the job (1 turn)**
- New function `smartlead-unsubscribe-sync`, works by manual POST too.
- For each campaign: fetch unsubscribed leads (pages through all results), wait 250 ms between calls (under SmartLead's 10-per-2-seconds limit), retry on "too many requests".
- Skip emails already on the list (lowercased); add new ones. Duplicates are skipped quietly.
- If one campaign fails, log it and keep going.
- Returns and logs: campaigns checked, new added, already on list, failed campaigns.
- Test once by hand and check the list.

**Phase 2 — nightly timer (1 turn)**
- Daily at 7:00 UTC (= 2:00 AM Central in winter; 1:00 AM Central in summer daylight time — note this). Runs once per day, so cost is tiny.

**Phase 3 — "Last sync" line (1 turn)**
- In the Email Accounts box, a small gray line: "Last sync: 2 hours ago" or "Last sync: Never", from the newest list row this job added.
- Note: this shows the last time the job *added someone*, not the last time it ran. If no one unsubscribes for a week, it will look old. Optional better version: also show the last run time (would need a tiny new log table — only if you approve).

## Do not touch
Other functions (proxy, push, webhook), Reply Triage, Analytics, Import Wizard, Outreach Queue, table rules.

## Risks / testing
- Campaigns are all test ones now, so the first run will likely add 0 people. That is expected.
- Check that the do-not-email list shows new rows with source = sync after a real unsubscribe.
