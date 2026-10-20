# Email Outreach Gap Closure (4 gaps)

## What and why
Close the four gaps from the October 19 audit so cold email is safe to send and mailboxes are easy to manage.

## Things in the spec that don't match the app (to handle safely)
1. **Campaign ID type.** `campaign_cache.id` is a text SmartLead ID, not a uuid. The new `campaign_mailbox_assignments.campaign_cache_id` will be **text** so it can link to it. `smartlead_campaign_id` (bigint) is kept as the spec says.
2. **No foreign key to the login user list.** Project rule: new tables store `updated_by` as a plain uuid (no link to the auth table).
3. **SmartLead key is still rejected (401).** I can build everything, but the mailbox sync, warmup toggle, and live unsubscribe sync cannot be fully tested until the key works. The timer will still be installed.
4. **Rules for who can see/change.** New tables copy the `email_accounts` rules (staff only).

## Phases

**Phase 1 — A/B unsubscribe fix (1–2 turns)**
- `canSpam.ts`: check every version (A, B…) on its own. Return a list like "Step 2, Variant B".
- New Campaign drawer: show per-version warnings; block launch if any version is missing the tag.
- Campaign list shield badge and Launch button: use the new check.
- Lead-push function: same per-version check; 400 error names the bad versions.
- Small tests for the new rule.

**Phase 2 — Mailing address (2 turns)**
- New `outreach_settings` table with a default `mailing_address` row (empty).
- New "Company Mailing Address" card on the Email Outreach page: street, city, state, zip. Red "Not configured" when empty, green check when complete.
- Drawer, campaign-list Launch, and lead-push all read this address. If empty, all fail with: "Configure your mailing address in Email Outreach settings before launching campaigns."
- Remove the hardcoded placeholder use.

**Phase 3 — Unsubscribe sync timer + button (1 turn)**
- Nightly timer at 7:00 UTC (2:00 AM Central in winter, 1:00 AM in summer daylight time). Runs once a day, so cost is tiny. Same timer style as the Weekly Data Health Digest.
- Function also allows signed-in staff to run it by hand.
- "Sync Unsubscribes" button in the Mailboxes panel: spinner, toast "Synced X new unsubscribes", last sync time, disabled 60 seconds after use.

**Phase 4 — Mailbox upgrade (2–3 turns)**
- New `campaign_mailbox_assignments` table.
- New `smartlead-sync-mailboxes` function: reads mailboxes and each campaign's mailboxes from SmartLead (server side, rate-limited to stay under 10 per 2 seconds), saves to both tables.
- Mailboxes panel: shows which campaigns each mailbox is on, warmup on/off toggle (through the proxy), "Refresh Mailboxes" button.
- Move the panel out of "Setup & reference" into its own expandable section next to Campaigns.

## Do not touch
Reply Triage, Analytics, Import Wizard, Outreach Queue, the proxy's sign-in check, "START" status, negative track flags.

## Risks / testing
- Old campaigns with a version missing the tag will now show a red shield. That is correct.
- After Phase 2, no campaign can launch or receive leads until the address is filled in.
- Live SmartLead tests wait on a working key.

## Technical details
- All functions use `npm:` imports and `Deno.env.get('SMARTLEAD_API_KEY')`.
- Address check in edge functions reads `outreach_settings` with the service role.
- Timer is created with a one-off SQL call (not a migration), using `pg_cron` + `pg_net`.
- Total estimate: about 6–8 turns. One phase at a time after approval.
