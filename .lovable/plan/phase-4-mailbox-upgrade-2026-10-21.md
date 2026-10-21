# Phase 4 — Mailbox upgrade

## What and why
Today the Mailboxes box asks SmartLead live every time the page opens. It is hidden inside the closed "Setup & reference" section. It also cannot show which campaigns use each mailbox.

Phase 4 makes the app keep its own saved copy of the mailboxes, shows which campaigns each one is on, and moves the box to its own open section next to Campaigns.

## What I checked
- A saved mailbox list (`email_accounts`) already exists. It has email, provider, warmup on/off, reputation, daily limit, sent today, and last synced time. I will reuse it, not make a new one.
- The saved campaign list uses a text ID. So the new link list will use a text ID too.
- There is no mailbox sync function yet.
- SmartLead still rejects the key. So the real pull cannot be tested until you fix your account. Everything else can be built and tested.

## Parts (one at a time, wait for "go" between each)

**Part 1 — Link list (1 turn)**
- New list `campaign_mailbox_assignments`: which mailbox is on which campaign. Holds campaign ID, SmartLead campaign number, mailbox SmartLead ID, mailbox email, last synced time.
- Only staff can read it. Only the sync function can write to it. Same rules as the mailbox list.

**Part 2 — Sync function (1 turn)**
- New `smartlead-sync-mailboxes` function. Only signed-in staff can run it.
- It asks SmartLead for all mailboxes, then each campaign's mailboxes.
- It stays under 10 requests per 2 seconds.
- It saves to both lists. Mailboxes SmartLead no longer has are kept, not deleted.
- If SmartLead says the key is bad, it returns a clear message. Nothing is wiped.

**Part 3 — Panel upgrade (1–2 turns)**
- The box reads from the saved copy, so it loads fast even when SmartLead is down.
- Each mailbox card shows: the campaigns it is on, warmup badge, "sent today / limit" bar, reputation.
- Warmup on/off switch stays (goes through the proxy). After a switch, it re-syncs.
- New "Refresh Mailboxes" button and a "Last synced X minutes ago" line.
- "Add SMTP" and the Sync Unsubscribes controls stay as they are.

**Part 4 — Move the box (same turn as Part 3)**
- Take Mailboxes out of "Setup & reference".
- Give it its own open section, right after "Campaigns & sending". Section numbers shift by one.

Total: about 3–4 turns.

## Do not touch
Reply Triage, Analytics, Import Wizard, Outreach Queue, the proxy's sign-in check, the unsubscribe sync and timer, "START" status, negative track flags.

## Risks
- Until the key works, the box shows "Never synced" and no cards. That is expected.
- Moving the section changes where you find Mailboxes. Your open/closed choice for old sections stays.

## Testing
- I will test: rules on the new list, the function blocks non-staff, the bad-key message, the panel loads from saved data, the new section placement.
- You test later (after SmartLead fix): press Refresh Mailboxes, see cards and campaigns, flip warmup off and on.

## Technical details
- Function uses `npm:` imports and `Deno.env.get('SMARTLEAD_API_KEY')`; base `https://server.smartlead.ai/api/v1` with `?api_key=`.
- Endpoints: `GET /email-accounts` (paged), `GET /campaigns/{id}/email-accounts` for each row in `campaign_cache`.
- Upsert `email_accounts` on `smartlead_id`; replace each campaign's rows in the link list per sync.
- Staff check via `is_staff` RPC; Zod body parsing.
- Migration includes RLS and GRANTs; staff SELECT only.
