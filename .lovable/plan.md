
# v1.2 — Master Pool + SmartLead, with SmartLead-parity stat dashboards

Everything from the previous plan (two-pool architecture, AI-assisted CSV importer, enrichment job, SmartLead dashboard) stays. v1.2 adds a **scoped stats dashboard** that mirrors SmartLead's Prospects screen but works for both pools, plus a clearly visible bridge between them.

---

## The new mental model: "Scope toggle"

At the top of the Email Outreach page, a **prominent scope switcher** (NOT a small filter — a primary control, like a big tab) lets you see one of two views:

```text
┌────────────────────────────────────────────────────────────┐
│  Viewing:  [ ● Master Teacher DB ]   [ ○ SmartLead ]       │
│            500k+ teachers across U.S.    8,432 active leads│
└────────────────────────────────────────────────────────────┘
```

The chosen scope is:
- **Color-coded** — Master DB uses neutral slate; SmartLead uses brand blue. Every stat card, table row, and badge on the page inherits that color so you can never confuse which pool you're looking at.
- **Labeled in plain English** at the top: *"You are viewing the Master Teacher Database. These teachers have NOT been emailed. To email them, push them to SmartLead."* (or the inverse for SmartLead).
- **Persistent across tabs** — Overview, Contacts, Campaigns, Inbox all respect the scope.

---

## The stat strip (works for BOTH scopes, parity with the SmartLead screenshot)

Six stat cards in a 3×2 grid, identical layout for both scopes. The labels stay the same; the *numbers* change based on scope.

| Card | Master DB scope | SmartLead scope |
|---|---|---|
| **Total Contacts** | Count of `teacher_prospects` (optionally filtered by city/state) | Count of leads pushed to SmartLead (sum across campaigns) |
| **Total Emails** | Rows where `email` is not null. "X% of total contacts" | Rows in SmartLead with a deliverable email |
| **Verified Emails** | `verification_status = 'valid'` | SmartLead-verified |
| **Catch-All Emails** | `verification_status = 'catch_all'` | Same |
| **Invalid Emails** | `verification_status = 'invalid'` | Same |
| **No Email Found** | `needs_email_enrichment = true` OR email IS NULL | "Not pushable" — present in master but missing from SmartLead |

Each card has the percentage subtitle (e.g. "66% of total contacts") matching the SmartLead screenshot exactly.

Every card surfaces a **"Show formula"** popover (per AGENTS.md Rule 1) showing the SQL/source.

---

## The bridge: "Push to SmartLead" workflow

This is the explicit answer to *"we can't email until we move them into SmartLead"*. Three entry points, one backend (`smartlead-push-leads` edge function):

### 1. From Master DB stat strip
A persistent banner sits below the stat cards when scope = Master DB:

```text
┌────────────────────────────────────────────────────────────┐
│  📤  3,995 verified emails in Master DB are NOT yet in     │
│      SmartLead. → [ Push verified emails to SmartLead ]    │
└────────────────────────────────────────────────────────────┘
```

Click → modal: pick campaign + filter (city, state, fit score, source) + see "will push N rows" → confirm.

### 2. From Master DB contacts table
Same multi-select / bulk action bar as Teacher Search: check rows → "Push to SmartLead". Same modal.

### 3. From a city detail page (Teacher Search)
Already in the v1.2 plan as part of the enrichment job — same backend.

After push:
- A `outreach_queue` row is written per teacher with `pushed_at`, `smartlead_lead_id`, `campaign_id`.
- A new **`pushed_to_smartlead`** badge appears next to the teacher in Master DB views (subtle blue dot + tooltip "Pushed to [Campaign Name] on May 21").
- The teacher now appears in the SmartLead scope's "Total Contacts" count.

---

## The new Contacts tab (lives inside Email Outreach, scope-aware)

A new tab **"Contacts"** sits between Overview and Campaigns. It's the in-app mirror of SmartLead's Prospects screen.

When scope = **Master DB**: shows all `teacher_prospects` with filters (city, state, source, verification status, "in SmartLead? yes/no"). Big "Push selected to SmartLead" bulk action.

When scope = **SmartLead**: shows only teachers pushed to SmartLead, with their per-campaign status (queued / sent / opened / replied / bounced / unsubscribed). Bulk actions: pause sending, remove from campaign, mark as interested.

Both views use the same table component; columns swap based on scope.

---

## What this adds to the previous plan

### Schema additions (small)

- `teacher_prospects.verification_status` already exists — but we'll **standardize the value set** to: `valid` | `catch_all` | `invalid` | `unknown` | `null`. Backfill existing data.
- New view: `v_master_pool_stats(state, city)` — pre-aggregates the 6 stat-card numbers. Refreshed on demand.
- New view: `v_smartlead_pool_stats(campaign_id?)` — same shape, sourced from `outreach_queue` + `smartlead_events`.
- `outreach_queue` already exists — used as the "is this teacher in SmartLead?" lookup. Add unique index on `(teacher_prospect_id, campaign_id)`.

### Edge function additions

- `master-pool-stats` — returns the 6 numbers + percentages, with optional `{ state, city, source, fit_min }` filter. Cached 30s.
- `smartlead-pool-stats` — same shape, sourced from SmartLead via existing proxy + local caches.
- `smartlead-push-leads` (already in v1.2 plan) — gains a "verified-only" filter flag and writes the `pushed_to_smartlead` state.

### UI additions

- `<ScopeSwitcher>` — the big toggle, persists choice in `localStorage`.
- `<StatStripCards>` — 6-card grid, scope-aware, color-themed, with Show Formula popovers.
- `<PushToSmartLeadBanner>` — Master DB only, dismissible per session.
- `<ContactsTab>` — new tab, replaces parts of the current Prospect Batches panel.
- `<PushToSmartLeadModal>` — filter + preview + confirm.
- `<PushedBadge>` — small badge component used on the contacts table.

---

## Build order (updated, replaces v1.2 sprint plan)

**Sprint 1 — Master Pool foundation + Scope-aware stats**
- A1/A2/A3 schema migrations (master pool fields, rename `prospect_batches` → `teacher_import_batches`, new `enrichment_jobs` table)
- Standardize `verification_status` values + backfill
- `v_master_pool_stats` view + `master-pool-stats` edge function
- `<ScopeSwitcher>` + `<StatStripCards>` on Email Outreach page (Master DB scope working first)
- New `MasterPoolImportWizard` (steps 1–4, master-only path)
- `csv-suggest-mapping` edge function

**Sprint 2 — The bridge (push to SmartLead) + SmartLead-scope stats**
- `smartlead-push-leads` edge function with verified-only flag
- `<PushToSmartLeadBanner>` + `<PushToSmartLeadModal>`
- `v_smartlead_pool_stats` view + `smartlead-pool-stats` edge function
- SmartLead scope now functional in `<ScopeSwitcher>` and `<StatStripCards>`
- `<PushedBadge>` everywhere a teacher is listed
- `enrich-teachers` edge function (SmartLead provider) + both UI entry points

**Sprint 3 — Contacts tab + SmartLead dashboard polish**
- `<ContactsTab>` (scope-aware, replaces Prospect Batches Panel UI)
- Campaign sync cron, Overview tab, Campaigns tab (from previous v1.2 plan)

**Sprint 4 — Inbox + Mailboxes + Analytics + Reply promotion**

(Sprint 5 deferred: Apollo + Hunter as alternate enrichment providers.)

---

## Risks / things to flag

1. **`verification_status` value standardization** is a backfill, not just a code change. ~250k rows today, mostly null. We'll write a one-time migration that maps existing free-text values to the new enum-like set. New rows from CSV imports / enrichment will use the standardized values from day one.
2. **"Total Contacts" in Master DB scope can mean different things** depending on whether a city filter is active. The stat strip must clearly show the active filter ("Showing: All cities" vs "Showing: Austin, TX") so the number is never ambiguous.
3. **The scope switcher is a paradigm shift** for anyone used to the current Email Outreach page. We'll add a one-time onboarding tooltip the first time it's seen.
4. **Push-to-SmartLead is idempotent but irreversible from our side.** Once a teacher is in SmartLead, removing them from a campaign requires a SmartLead API call (we'll wire this in Sprint 4, not Sprint 2). Until then, the modal will warn: "This will add N teachers to [Campaign]. To remove them later, you'll need to do it in SmartLead directly."
5. **Doc sync (AGENTS.md Rule 9)**: PROJECT_CONTEXT, HOW_IT_WORKS, APIS, OPEN_TASKS, GLOSSARY all need updates — drafts only after Sprint 1, awaiting Haseeb's explicit "go".

---

## Quick sketch — Email Outreach page top-of-page in v1.2

```text
┌─────────────────────────────────────────────────────────────────┐
│ EMAIL OUTREACH                                                  │
│                                                                 │
│ Viewing:  [ ● Master Teacher DB ]   [ ○ SmartLead ]             │
│ You are viewing the Master Teacher Database. These teachers     │
│ have NOT been emailed. To email them, push them to SmartLead.   │
│                                                                 │
│ Filter: [ All cities ▾ ]  [ All sources ▾ ]  [ Fit ≥ — ▾ ]      │
│                                                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│ │ Total        │ │ Total Emails │ │ Verified     │              │
│ │ Contacts     │ │ 6,584        │ │ Emails       │              │
│ │ 10,000       │ │ 66%          │ │ 3,995  40%   │              │
│ └──────────────┘ └──────────────┘ └──────────────┘              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│ │ Catch-All    │ │ Invalid      │ │ No Email     │              │
│ │ 1,795 18%    │ │ 794 8%       │ │ Found        │              │
│ │              │ │              │ │ 3,416 34%    │              │
│ └──────────────┘ └──────────────┘ └──────────────┘              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📤 3,995 verified emails in Master DB are NOT yet in        │ │
│ │    SmartLead.  [ Push verified emails to SmartLead → ]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Overview]  [Contacts]  [Campaigns]  [Inbox]  [Mailboxes]  …   │
└─────────────────────────────────────────────────────────────────┘
```
