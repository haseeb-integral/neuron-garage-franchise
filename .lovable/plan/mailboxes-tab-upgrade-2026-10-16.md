# Mailboxes tab upgrade

## What and why
Turn the Email Accounts box into a full Mailboxes area. The app keeps its own copy of each SmartLead mailbox, refreshed every 30 minutes. The page loads faster, and it can warn you when a mailbox is in trouble.

## Blocker to fix first (checked)
SmartLead is turning away our saved API key ("Invalid API Key"). Until you give me a fresh key, nothing can sync. The new screen will show "Never synced" and no mailboxes. I can build everything now and you add the key later, or you add the key first.

## Things in the brief I will adjust (checked)
1. **Proxy needs a signed-in user.** A timer job running every 30 minutes has no signed-in user, so the proxy would turn it away. The brief also says not to change the proxy. So, same as the unsubscribe job, the sync job talks to SmartLead itself, on the server, with the same saved key. The browser still never talks to SmartLead directly. The buttons on the page (Add Mailbox, warmup on/off) still go through the proxy.
2. **Field names.** SmartLead's mailbox list uses `from_email`, `message_per_day`, `daily_sent_count`, and `warmup_details.status` / `warmup_details.warmup_reputation`. Today's screen already reads these names. The sync will read both these and the names in the brief, so neither set gets lost.
3. **Provider.** Worked out from SmartLead's type field (Gmail / Outlook / SMTP).
4. **Who can see it.** Only staff can see the new table, using the same rule as the campaign list. Only the sync job can write to it.

## Phases
**Phase 1 — table (1 turn).** New `email_accounts` table, following the brief. Staff-only reading.

**Phase 2 — sync job (1 turn).** New `email-accounts-sync` job. You can start it by hand, and it runs on a 30-minute timer. That's 48 runs a day. Each run is small, but a timer that runs often keeps the database awake and adds a little Cloud cost. Mailbox numbers change slowly, so hourly (24 runs a day) would also work. I'll use 30 minutes unless you say hourly. Accounts that SmartLead no longer has are left as they are, not deleted.

**Phase 3 — new panel (1–2 turns).** Replaces the current box in place:
- A card for each mailbox: email address, provider, Active/Inactive warmup badge, "12 / 40 sent today" bar, a reputation circle (green 80+, amber 50–79, red under 50), and a health dot. Red = at the daily limit or reputation under 50. Amber = warmup off or over 80% of the daily limit. Green = everything else.
- Warmup on/off switch (through the proxy). It refreshes the list right after.
- An "Add Mailbox" side panel with email, name, SMTP and IMAP details, and a daily limit (through the proxy). It refreshes the list right after.
- A "Sync Now" button and a "Last synced: X minutes ago" line.

**Phase 4 — warning banner (1 turn).** An amber banner at the top of the Email Outreach page, one line per problem mailbox: "Mailbox health issue: [email] is at daily send limit / below 80% warmup reputation. Review in the Mailboxes panel."

## Do not touch
Other panels, other edge functions, Reply Triage, Analytics, Import Wizard, Outreach Queue, the unsubscribe job.

## Open items carried over
- Unsubscribe job Phase 2 (nightly timer) and Phase 3 ("Last sync" line) are still waiting. Phase 3 of that job also puts a line in this same panel, so I'll fold it into this Phase 3.
- A new SmartLead key is needed.

## Testing
After the key is fixed: press Sync Now. Mailboxes should appear. Turn warmup off and on and see the badge change. The banner should show only when a mailbox crosses a limit.
