## What's actually breaking

The toast tells us exactly what SmartLead is rejecting:

> `SmartLead 500 on /campaigns/3358536/status: Cron Exp value is empty! Please set the scheduler time and start the campaign!`

That campaign (`[TEST] Sample Campaign`, id 3358536) is one of the **old drafted** campaigns. It was created before the drawer started POSTing a schedule, so SmartLead has no cron for it → `START` is refused.

Separately, the new-campaign flow had three silent failure points: schedule / settings / sequences calls were each wrapped in `try { … } catch { console.warn }`. If any of those failed (e.g. malformed `min_time_btw_emails`, missing required field), the draft would still be created and the launch would later fail with "Cron Exp empty" or similar — and the user would see no warning.

Email accounts ARE connected (3 healthy SMTPs on `mailerss.co`), so that part is fine. The new drawer already assigns them.

## Fix plan

### 1. Make the "Launch" button on the campaigns list self-healing

In `SmartLeadCampaignsPanel.tsx`, when the user clicks ▶ Launch on a `DRAFTED` campaign, before calling `/status { START }`:

1. POST a **default schedule** to `/campaigns/{id}/schedule` (timezone = browser TZ, days Mon–Fri, 09:00–18:00, gap 10 min, cap 50/day). This fixes "Cron Exp empty" on legacy drafts.
2. GET `/email-accounts/`. If the campaign has none assigned, POST all account ids to `/campaigns/{id}/email-accounts`.
3. POST `/status { START }`.
4. Any failure → show the **real** SmartLead error string in the toast (already wired via `callProxy`).

This makes legacy drafted campaigns launchable in one click without recreating them.

### 2. Stop swallowing errors in the New Campaign drawer

In `NewCampaignDrawer.tsx submit(launch=true)`:

- Remove the silent `try/catch console.warn` around `schedule`, `settings`, `sequences`, and `email-accounts assign` **when `launch === true`**. Let them throw so the toast shows the actual SmartLead error instead of a fake success.
- Keep silent-warn behavior only when saving as Draft (so partial drafts are recoverable).
- Validate inputs before any network call: name non-empty, ≥1 day selected, start_hour < end_hour, sequences non-empty with subject+body, gap 1–180, cap 1–200. Show an inline error and abort if invalid.

### 3. One shared error surface

Add a small helper `surfaceError(e)` used by both panels — strips `SmartLead 500 on …: ` noise into a short title + technical detail line. Errors that contain `Cron Exp` map to a friendlier "Schedule is missing — re-open the campaign and set the schedule, or click Launch to auto-apply the default schedule."

### 4. Optional: dev-mode debug panel

When `localStorage.getItem('debug') === '1'`, print every SmartLead request/response into the browser console with the endpoint + status + body. Off by default. Useful for the next round of testing without me needing to ask for screenshots.

## Files touched

- `src/components/email-outreach/SmartLeadCampaignsPanel.tsx` — self-healing Launch flow, shared error helper
- `src/components/email-outreach/NewCampaignDrawer.tsx` — input validation, no silent catches on launch
- (new) `src/components/email-outreach/smartleadErrors.ts` — `surfaceError` + debug logger

## Out of scope

- No changes to the `smartlead-proxy` edge function (it already returns the real error body wrapped as `{ok:false}`).
- No new SmartLead endpoints, no schema changes, no new tables.

## After this lands

Click **▶ Launch** on `[TEST] Sample Campaign` → drawer auto-applies a default schedule + ensures inboxes are assigned → SmartLead accepts `START` → status flips to `ACTIVE` and emails begin sending within the gap window. If anything still fails, the toast tells you exactly which endpoint + why.