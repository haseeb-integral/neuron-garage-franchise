# Outreach Spec — Neuron Garage Email Outreach

**Version 1.0 · October 2026**

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
   -> Outreach Queue row (queued -> sent / failed / snoozed / replied)
   -> SmartLead sends on schedule from the mailboxes
   -> Reply arrives by webhook -> Reply Triage (7 categories)
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
- **Test Mode** lets a campaign send only to your own inbox.
- Each campaign row shows a **compliance shield**: green = all good, red = something missing, none = still checking. Cached 10 minutes; checked 5 campaigns at a time.

### 4.4 Outreach Queue (outbox)

- One row per teacher per campaign push.
- States: **queued, sent, failed, snoozed, replied**. Failed rows keep the error text. Snoozed rows have a "snoozed until" date.
- Filters: All, Queued, Sent, Failed, Replied.

### 4.5 Reply Triage

- SmartLead sends each reply to our webhook within seconds. It is saved in smartlead_events.
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
- Charts over time and a reply funnel (Sent → Opened → Replied → Interested), plus a per-campaign table.
- Data pulled in 30-day windows and stitched together; cached 10 minutes.

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

**Where it is checked (same rule everywhere):**

| Place | What happens if it fails |
| :---- | :---- |
| New Campaign drawer (while writing) | Amber warning under the step; draft can still be saved |
| Launch button | Launch refused; error names the spot, e.g. "Step 2, Variant B" |
| Campaign list shield | Red shield |
| Lead push (dry run and real) | Push refused with a compliance error |

The browser and the lead-push function share the same check, so they can never disagree.

**Company mailing address:**
- Saved once in the **Company mailing address** card (Setup & reference). Only admins can edit; staff can read.
- Stored in company_settings and used in all default footers.
- If empty, the card says "Not set — campaigns can't launch," and launches and pushes are blocked.

---

## 6. Do-not-email list (suppression)

- Table: suppressed_emails (server-only; no browser access).
- People are added when SmartLead reports an **unsubscribe, bounce, or spam complaint**, or through the public unsubscribe page.
- Every push removes these people first and reports how many were skipped.
- Once on the list, a person is never emailed again.

**Unsubscribe sync (backup to the instant alerts):**
- Pulls unsubscribed leads from every campaign into the list.
- **Nightly** at 07:00 UTC (2:00 AM Central in winter, 1:00 AM in summer).
- **"Sync Unsubscribes" button** for staff: pop-up says "Synced X new unsubscribes" and lists any campaign that could not be checked; then a 60-second wait before the next press.
- **"Last new unsubscribe"** shows when a new person was last added (not when the job last ran).
- Only signed-in staff or the nightly timer can run it. The timer uses a private stored pass and can run at most once every 20 hours.

---

## 7. Security rules

- The SmartLead key lives only on the server. The browser talks to SmartLead only through the proxy function, which requires a signed-in user.
- All SmartLead functions refuse calls with no sign-in or a fake sign-in.
- Database tables have row-level security: staff can read outreach data; writes to mailbox links and suppression go through the server only.
- Max SmartLead speed: 10 requests every 2 seconds.

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

- Never send an email that is missing the unsubscribe link or address.
- Never email anyone on the do-not-email list.
- Never delete a mailbox record during a sync.
- Never put the SmartLead key in the browser.
- Never use "ACTIVE" for launching (SmartLead needs "START").

---

## 11. Related docs

- **Outreach Guide** — plain-English daily how-to.
- **SmartLead API Spec** — technical SmartLead connection details.
