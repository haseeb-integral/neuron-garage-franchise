# Outreach Spec — Neuron Garage Email Outreach

**Version 1.1 · Reviewed November 19, 2026**

**Document-only review:** compared with [SmartLead’s official reference](https://api.smartlead.ai/introduction). Provider capabilities and installed app behavior are separate. The source does not establish when each difference was introduced; do not treat this as a dated June-to-November release log.

This spec describes **what the Email Outreach module does and the rules it follows**. It is the product spec. The separate **SmartLead API Spec** covers the low-level SmartLead connection (proxy, endpoints, webhook payloads). The **Outreach Guide** is the plain-English how-to for daily users.

---

## 1. Purpose

Find teacher prospects, email them in a legal and safe way, catch every reply fast, and move interested teachers into the Candidate Pipeline.

**Who uses it:**

| Person | Main job |
| :---- | :---- |
| Haseeb / contractors | Import prospects, QA lists, push leads, run campaigns, manage mailboxes |
| Kaylie / Sam | Read and answer replies, promote interested teachers |
| Admin | Save the company mailing address, manage settings |

Only signed-in staff can see or use this module.

---

## 2. Page layout (Email Outreach page)

The page has two scopes, picked with the scope switcher at the top.

**Scope: SmartLead (outreach work)**

1. **Act on replies** (open) — Reply Triage. Reply here first; approve or skip each one.
2. **Campaigns & sending** (open) — campaign list, compliance shields, Outreach Queue (outbox).
3. **Mailboxes** (open) — "Sync Unsubscribes" controls on top, then one card per sending mailbox.
4. **Setup & reference** (closed) — SmartLead connection health, company mailing address card, full analytics.

**Scope: Master Teacher DB**

1. **Master Teacher DB** — every teacher we know about; push verified ones to SmartLead.
2. **Recent imports** — CSV batches that landed in the Master Pool.
3. **Enrichment runs** — email/contact enrichment jobs per city, with cost and status.

Header buttons: **Refresh** (skips the 10-minute stats cache), **Import to Master Pool** (smart CSV import), **Import to SmartLead** (older direct import).

---

## 3. End-to-end flow

```text
CSV / Manus file
   -> Master Pool import (dedupe by dedupe_key + email, "Fill blanks only" safest)
   -> Teacher records (with signals and evidence)
   -> Push to SmartLead campaign (compliance check + do-not-email filter)
   -> Outreach Queue records app push/work status (not proof of email delivery)
   -> SmartLead sends on schedule from the mailboxes
   -> Registered campaign webhook delivers reply -> saved event -> Reply Triage (7 categories)
   -> Promote to Candidate Pipeline
```

---

## 4. Features and rules

### 4.1 Lead import

- **Master Pool import** auto-detects the 27-column Manus format. It keeps signal text, dedupes by dedupe_key and email, never overwrites a filled field with a blank, and skips sprint files.
- Two modes: **Fill blanks only** (safe, recommended for re-imports) and **Overwrite**.
- Every import is recorded as a batch (teacher_import_batches) with counts for new, updated, and skipped.
- The older **Import to SmartLead** wizard (4 steps: batch info, upload and map, QA review, import) sends straight to SmartLead in chunks of 400.

### 4.2 Pushing leads to a campaign

- Staff pick a campaign and a set of teachers (by IDs or by city/state), up to 5,000 per push.
- **Dry run** shows what would happen without sending anything.
- Before pushing, the server:
  1. Checks the campaign's email steps for compliance (see section 5). If it fails, nothing is pushed — dry run included.
  2. Skips teachers already in that campaign.
  3. Skips anyone on the do-not-email list.
  4. Reports counts: to push, already in, on the do-not-email list.
- Leads go to SmartLead in chunks of 100. Each success makes an Outreach Queue row.

### 4.3 Campaigns

- Campaign list loads from SmartLead and is mirrored in campaign_cache.
- **New Campaign drawer** (4 steps): name and settings, schedule, mailboxes, email steps. Each new step gets a default footer with {{unsubscribe}} and the saved mailing address.
- Status changes: Launch uses **"START"** (never "ACTIVE"), plus Pause and Stop.
- Tracking settings use negative flags (DONT_TRACK_EMAIL_OPEN, DONT_TRACK_LINK_CLICK).
- **Test Mode** adds test recipients based on the selected email and optional aliases. It is not a provider-enforced lock against later real lead additions. Check the actual lead list before launch.
- Each campaign row shows a **compliance shield**: green = all good, red = something missing, none = still checking. Cached 10 minutes; checked 5 campaigns at a time.

### 4.4 Outreach Queue (outbox)

- Queue rows track teacher/campaign work. The Master Pool push writes **pushed** after an accepted import. Other actions use **queued, assigned, sending, sent, failed, snoozed, suppressed, promoted**. Replies can be matched from saved events rather than a queue state.
- **Sent** in a push path means imported into SmartLead, not proven email delivery. Failed rows keep error text; snoozed rows keep a return date. Provider partial-success counts still need live verification.
- Filters: All, Queued, Sent, Failed, Replied.

### 4.5 Reply Triage

- The app registers webhooks **per campaign**. SmartLead can deliver replies to smartlead-webhook, which attempts to save smartlead_events. Registration and a successful acknowledgement are not proof of persistence or inbox delivery. The current handler logs save failures and still acknowledges the request. Event names/payload mapping and callback authentication need a separate review.
- Each reply gets one of **7 categories** (there is no "Neutral"):

| Category | Meaning | Auto-promote? |
| :---- | :---- | :---- |
| INTERESTED | Clear yes | Yes (with confidence check) |
| MEETING_REQUEST | Wants a call | Yes (with confidence check) |
| INFO_REQUEST | Asked a question | No — needs a reply |
| SOFT_NO | Not now / later | No |
| WRONG_PERSON | Not the right contact (may give a referral) | No |
| NOT_INTERESTED | No | No |
| OOO | Out of office auto-reply | No |

- Staff can change a category. The app saves who changed it and when.
- Staff can reply in the same email thread and **Promote to Pipeline**.

### 4.6 Analytics

- Totals: sent, open rate, reply rate, interested count, bounce rate.
- A chart compares sends, opens, and replies **by campaign**, alongside a reply funnel (Sent → Opened → Replied → Interested) and a per-campaign table. It is not a historical date chart.
- Installed aggregate code tries **/analytics/overview**, then per-campaign **/analytics**; cached 10 minutes. It does not currently request date ranges, split/stitch windows, or read separate sequence-analytics results. Historical chart and A/B performance support must not be claimed from this helper.
- Current provider reference documents **/analytics/overall-stats-v2** for account totals and **/campaigns/{id}/analytics-by-date** for inclusive date ranges up to 30 days. These are provider-documented paths, not changes made to app calls in this review.
- The app computes open/reply/click/bounce counts divided by sends, and interested divided by replies. Provider Global Analytics formulas differ and use unique counts for some rates. Unique people and percentages cannot be safely added across date windows. Missing/error data must not be treated as verified zero activity.

### 4.7 Mailboxes

- Own section (section 3), no longer hidden in Setup & reference.
- Cards read from the **saved copy** (email_accounts + campaign_mailbox_assignments), so the page loads fast.
- Each card: email, provider, warmup reputation (green 80+, amber 50–79, red under 50), sent-today bar (default limit 50), warmup **On/Off switch**, and the campaigns it sends for.
- **Refresh Mailboxes** runs the mailbox sync. Header shows "Last synced N ago" or "Never synced". On failure, an amber line explains why and the last saved copy stays.
- **Add SMTP** adds a new sending account.
- Rules for the mailbox sync:
  - Staff only.
  - Updates mailboxes, **never deletes** them.
  - Replaces a campaign's mailbox links only after SmartLead answers that campaign successfully.
  - Skips mailboxes with no id or email. Keeps reputation between 0 and 100.
  - Waits 250 ms between SmartLead calls and retries when SmartLead says "too many".

---

## 5. Compliance rules (CAN-SPAM)

Every cold email must have an unsubscribe link and a real postal address.

**Rule:** every email step, and **every A/B version of every step**, must contain:
1. The tag **{{unsubscribe}}**, and
2. The **saved company mailing address**.

A tag in Variant A does **not** cover Variant B. A campaign with no steps fails.

**Where the installed checks apply:**

| Place | What happens if it fails |
| :---- | :---- |
| New Campaign drawer (while writing) | Amber warning under the step; draft can still be saved |
| Launch button | Launch refused; error names the spot, e.g. "Step 2, Variant B" |
| Campaign list shield | Red shield |
| Master Pool lead push (dry run and real) | Push refused with a compliance error |

The browser and Master Pool lead-push function reuse the mailing-address rule and check each returned version for the unsubscribe tag. Legacy direct-import and manual queue paths need separate gate-coverage checks; these controls are not proof of universal enforcement.

**Company mailing address:**
- Saved once in the **Company mailing address** card (Setup & reference). Only admins can edit; staff can read.
- Stored in company_settings and used in all default footers.
- If empty, the card says "Not set — campaigns can't launch," and launches and pushes are blocked.

---

## 6. Do-not-email list (suppression)

- Table: suppressed_emails (server-only; no browser access).
- People are added when SmartLead reports an **unsubscribe, bounce, or spam complaint**, or through the public unsubscribe page.
- Master Pool pushes remove these people first and report how many were skipped.
- Keeping these people out of all future sends is the required safety rule. Coverage of every legacy/manual send path is not established by this document review.

**Unsubscribe sync (backup to the instant alerts):**
- Pulls unsubscribed leads from numeric campaigns present in **campaign_cache** into the list. Refresh campaign data for coverage; failed or missing cached campaigns are not proven checked. This is not a provider global block-list read.
- **Nightly** at 07:00 UTC (2:00 AM Central in winter, 1:00 AM in summer).
- **"Sync Unsubscribes" button** for staff: pop-up says "Synced X new unsubscribes" and lists any campaign that could not be checked; then a 60-second wait before the next press.
- **"Last new unsubscribe"** shows when a new person was last added (not when the job last ran).
- Only signed-in staff or the nightly timer can run it. The timer uses a private stored pass and can run at most once every 20 hours.

---

## 7. Security rules

- The SmartLead key lives only on the server. The browser talks to SmartLead only through the proxy function, which requires a signed-in user.
- Browser proxy and lead push validate a signed-in session. Mailbox/unsubscribe sync explicitly verify staff; the nightly timer uses its private pass. The webhook is a separate inbound receiver, not a signed-in-user action. Its current source does not verify a provider signature/shared callback secret. Do not describe every function as having the same staff check.
- Database tables have row-level security: staff can read outreach data; writes to mailbox links and suppression go through the server only.
- Provider limits depend on plan and endpoint. Current detailed guide lists Standard 60/minute + 1,000/hour and Pro 120/minute + 3,000/hour, plus separate quotas/concurrency for some reads. This account’s plan is not verified. Existing 250 ms gaps and short retries are app pacing, not a coordinated shared quota limiter.

---

## 8. Data (database tables)

| Table | What it holds |
| :---- | :---- |
| campaign_cache | Local copy of SmartLead campaigns |
| outreach_queue | One row per teacher pushed to a campaign, with state |
| smartlead_events | Every webhook event (replies, bounces, unsubscribes), with reply category |
| suppressed_emails | Do-not-email list |
| email_accounts | Saved copy of each sending mailbox |
| campaign_mailbox_assignments | Which mailbox sends for which campaign |
| company_settings | Company mailing address, timer bookkeeping |
| teacher_import_batches | History of each import |
| teacher_prospects | The Master Teacher Pool |

---

## 9. Backend functions

| Function | Job | Who can call |
| :---- | :---- | :---- |
| smartlead-proxy | Passes browser requests to SmartLead | Signed-in users |
| smartlead-push-leads | Compliance check, filter, push leads | Staff |
| smartlead-webhook | Receives SmartLead events, sorts replies | SmartLead |
| smartlead-unsubscribe-sync | Pulls unsubscribes into the list | Staff or nightly timer |
| smartlead-sync-mailboxes | Pulls mailboxes and campaign links | Staff |
| handle-email-unsubscribe / handle-email-suppression | Public unsubscribe and suppression handling | Public link / server |

---

## 10. What this module must not do

- Required safety rule: never send an email missing the unsubscribe link or address. The installed launch and Master Pool push gates check this. Gate coverage of legacy direct import, manual queue pushes, and Test Mode needs a separate code review; do not claim universal enforcement from one gated path.
- Required safety rule: never email anyone on the do-not-email list. Master Pool pushes filter the shared list. Queue-only suppression labels are not proof of shared suppression coverage on every send path.
- Never delete a mailbox record during a sync.
- Never put the SmartLead key in the browser.
- Never use "ACTIVE" for launching (SmartLead needs "START").

---

## 11. Provider capabilities versus installed features

- Campaign status calls are installed as **POST** with **START / PAUSED / STOPPED**. The old API Spec’s PATCH and PAUSE/STOP examples were stale; the provider’s own examples also conflict. No runtime status behavior changed in this review.
- Current app campaign creation writes one subject/body per step. Compliance checks understand **seq_variants** returned by SmartLead. This does not establish an installed A/B editor or results table.
- Provider **/campaigns/{id}/sequence-analytics** supplies per-version stats and requires ISO date/time fields. It is not the installed text/configuration read.
- Provider **/webhook/create** supports association-based callbacks, separate from the installed campaign webhook flow.
- Provider account categories, paginated block lists, SmartProspect’s separate host, expanded warmup controls, and mailbox reallocation are not automatically shipped app features.

## 12. Remaining verification

A working key and empty campaign list prove only account reads. Controlled campaign writes, non-empty analytics response mapping, A/B results, incoming reply persistence, warmup changes, timer execution, and unsubscribe coverage still need checks. Code repairs require a separate approved phase. Do not create or launch campaigns as part of a document review.

## 13. Related docs

- **Outreach Guide** — plain-English daily how-to.
- **SmartLead API Spec** — technical SmartLead connection details.

- **Official reference** — [Introduction](https://api.smartlead.ai/introduction), [request limits](https://api.smartlead.ai/guides/rate-limits), [metric rules](https://api.smartlead.ai/api-reference/analytics/how-metrics-are-calculated), and [sequence analytics](https://api.smartlead.ai/api-reference/campaign-statistics/sequence-analytics).

The three existing document pages and their Markdown downloads share these source documents. No app behavior, database table, access rule, or email was changed in this review.
