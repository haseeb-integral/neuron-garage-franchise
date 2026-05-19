## What you asked for

1. **Defer 17f** (`{{unsubscribe}}` merge tag) — move from 🔴 BLOCKER to LATER for now.
2. **Generate a 2-row dummy CSV** using your profile email (`haseeb@integralassociates.com`) with `+alias` so SmartLead treats them as 2 distinct leads but both land in your real inbox.
3. **Run 17h then 17i** — flip Test Mode OFF, send for real, confirm both arrive.

## Step 1 — Update docs (defer 17f)

- `OPEN_TASKS.md` item 17f: change marker from 🔴 BLOCKER → 🟡 deferred, add note "Deferred per Haseeb May 19 — accepting CAN-SPAM risk for internal smoke tests with own inbox only. Must add before sending to real teachers."
- `LATER.md`: append "Add `{{unsubscribe}}` merge tag to default sequence body — required before any non-self real send."
- `PROJECT_CONTEXT.md` § 5: drop (a) from the blockers list, leave (b) CSV test and (c) 1-lead launch.

## Step 2 — Write the dummy CSV to `/mnt/documents/dummy_test_leads.csv`

Columns match Import Wizard schema (`email, first_name, last_name, company, city, segment`):

```csv
email,first_name,last_name,company,city,segment
haseeb+test1@integralassociates.com,Haseeb,TestOne,Integral Test School,Austin,Teacher
haseeb+test2@integralassociates.com,Haseeb,TestTwo,Integral Test Academy,Dallas,Teacher
```

Both `+alias` addresses route to your real inbox at `haseeb@integralassociates.com` (standard plus-addressing) — but the wizard's dedupe sees them as 2 distinct rows.

Delivered via `<presentation-artifact>` so you can download in one click.

## Step 3 — Your test loop (no code, you drive)

1. Download CSV from chat
2. Email Outreach → **Import Leads** → pick the file → map columns auto-detect → Continue → Approve both rows → Push to SmartLead
3. Confirm batch appears in **Import Batches** panel (this completes 17h ✅)
4. **New Campaign** → pick the batch → **turn Test Mode OFF** → pick 1 inbox → Launch
5. Wait ~10–15 min for SmartLead cron tick → check `haseeb@integralassociates.com` inbox → expect 2 distinct emails (one per +alias)
6. Reply to one → confirm it shows in Inbox panel with intent badge (this completes 17i ✅)

## Step 4 — After both pass

Green-light your scraped teacher CSV. You share it, I inspect columns + row count + source, we map any column mismatches, then full batch with Test Mode OFF.

## Files touched (docs only)

- `OPEN_TASKS.md` — flip 17f marker
- `LATER.md` — append unsubscribe note
- `PROJECT_CONTEXT.md` — update § 5 blocker list
- `/mnt/documents/dummy_test_leads.csv` — new artifact

No code changes. No new edge functions. No schema changes.

**Switch to build mode and approve and I'll write the CSV + doc edits in one batch.**
