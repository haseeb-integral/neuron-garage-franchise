# Data Observability — User's Guide

A plain‑English guide to the **Data Observability** tool for non‑technical team members. No engineering background needed.

> **In one sentence:** Data Observability is your automated data quality assistant. It watches our most important data 24/7, scores how trustworthy it is, alerts us when something looks off, and emails Brett and Sam a weekly summary so nobody ever has to wonder *"is our data okay?"*

---

## Why this exists

Every decision we make — which cities to target, which teachers to contact, which candidates to advance — depends on the data behind it. If a number is wrong, stale, or missing, we waste time chasing the wrong leads.

Instead of someone manually spot‑checking spreadsheets every week, this tool does it for us, continuously.

---

## How to open it

In the left sidebar, click **Data Observability** (the activity / heartbeat icon). Every registered user of Neuron Garage is a manager and has access — currently that's Kaylie, Sam, Brett, and Haseeb.

---

## Page tour — what every section does

The page is laid out top‑to‑bottom: a header, four stat cards, then three tabs. Here's what each piece is for.

### 1. Page header

At the top you'll see:

- **Title + subtitle** — confirms you're on the right page.
- **Ask AI** (blue button) — opens a chat drawer where you can ask plain‑English questions like *"Is our data healthy right now?"* or *"What's the single biggest data risk this week?"* The AI knows everything on the page plus the underlying tables. Use it whenever you'd rather not click around.
- **Run all checks** — re‑runs every single health check on the page right now, instead of waiting for the next 6‑hour snapshot. Handy after you fix something and want to confirm it's green.

### 2. The four stat cards (the "scoreboard")

Right under the header:

- **Trust Score** — one number from 0–100 that rolls up the health of every domain into a single at‑a‑glance answer to *"how good is our data right now?"* 100 means every check passed. Below 100 means at least one warning or failure — keep scrolling to see what.
- **Healthy Domains** — count of tables where every check passed. Safe to rely on for City Search, Teacher Outreach, etc.
- **Warnings** — count of tables that missed a soft target (e.g. slightly fewer rows than ideal, or an update older than expected). Nothing is broken — worth a glance when you have time.
- **Failing** — count of tables that tripped a hard threshold (empty, very stale, value out of bounds). These need attention.

Hover the little **(i)** icon on any card for the same explanation in‑app.

### 3. The three tabs

Below the stat cards there are three tabs. Each answers a different question.

---

## Tab 1 — Status & Structure ("are the tables alive and well?")

This is the **existence + freshness** layer.

### Issues panel (top of tab)

The colored banner at the top is the plain‑English summary:

- 🟢 **Green banner** — every data source is healthy. No action needed.
- 🟡 **Yellow banner** — soft warnings only. We list each one with a link straight to the affected domain card below.
- 🔴 **Red banner** — at least one source needs a human. Same format: bullet list with click‑through links.

### Domain cards (one per table)

Below the banner there's one card per important table — City scoring, City geography, Teacher prospects, Public schools, Candidates, Seeding runs. Each card runs five kinds of check:

- **Row count** — are there a reasonable number of rows? (e.g. an empty teachers table is a red flag.)
- **Column completeness** — are key columns filled in, or are too many rows missing values?
- **Freshness** — when was the table last updated? Stale data is suspicious.
- **Numeric ranges** — do values fall inside expected bounds? (e.g. composite scores stay between 0 and 100.)
- **Per‑metric color dot** — 🟢 green / 🟡 yellow / 🔴 red, same meaning as the stat cards.

Each metric row has two buttons:

- **Show query** — opens the actual SQL the check runs, so engineers (or the AI drawer) can audit it.
- **Run now** — re‑runs just that one check immediately.

If a check ever times out or hits an error, you'll see a soft yellow note explaining what happened (no raw error messages). The metric is treated as *unknown* rather than failing, so a database hiccup never punishes the Trust Score.

---

## Tab 2 — Accuracy & Rules ("is the data actually correct?")

Status tells you the table is alive. Accuracy tells you the values inside it make sense.

### Invariants (the rules board)

A board of plain‑English rules that should **always be true** — for example *"every city has a non‑negative population"* or *"every teacher prospect has an email."* Each rule is just a SQL query that looks for rows breaking it. **Zero violating rows = pass.**

- **Pill summary** in the header shows how many rules are passing / warning / failing / not yet run.
- **Run all rules** — runs every rule top to bottom.
- **Add rule** (managers only) — opens a dialog where you can name a new rule, write a one‑sentence description, paste a `SELECT` that returns the violating rows, and pick a severity (Info, Warning, Critical).
- **Per‑rule row** — shows status, count of violations, **Show query** (full SQL), **Run now**, and — when there are violations — a **Show N of M violating rows** disclosure with the actual row data.

> Want a new rule but don't write SQL? Describe it in English ("no candidate should have a hire date before their application date") and Haseeb will add it.

### Sample inspector

Click **Roll again** and we pull one random scored city with every column visible. Skim the values and look for anything that obviously looks wrong (population of 7, blanks where there shouldn't be any). It's a 5‑second sanity check — way faster than writing SQL. Useful before demos or whenever you just want to eyeball the data.

### Outlier finder

Pick a column (composite score, population, COL index, etc.) and hit **Find outliers**. We list cities whose value is more than 3 standard deviations from the national mean — statistics shorthand for *"would happen by chance less than 1 time in 300."* Real cities sometimes appear (NYC for density) but unfamiliar surprises are often data bugs worth checking.

---

## Tab 3 — Alerts & History ("what happened, and what should I be told about?")

### 30‑day history

A sparkline per tracked domain (City Scores, City Geo Reference, Teachers, Public Schools, Candidates, Invariant Rules). Read left → right: oldest snapshot to newest. A flat green line is what you want. A patch of red marks a period where the check was failing — hover the sparkline for exact timestamps.

- **Take a snapshot now** — forces an immediate snapshot instead of waiting for the next 6‑hour run.
- **Notify me** (per row) — subscribe to email alerts when this domain goes red.

### Incidents

A log of anything that stayed red across at least one full snapshot (so brief blips don't count). Open incidents are at the top; closed ones resolved themselves when the underlying check returned to green. Use this as your *"what was actually broken, and for how long"* record.

### Rule subscriptions

Same idea as domain notifications but for individual invariants. Toggle **Notify me** on any rule you care about — the subscription is logged immediately and email goes out the moment a subscribed rule flips from passing to failing. You'll never get spammed for transient blips; only confirmed incidents trigger a send.

---

## Ask AI (the chat drawer)

Available globally via the **Ask AI** button in the header, and contextually next to each section header. It can:

- Summarize what's healthy / failing right now in your own words.
- Explain what a specific rule or metric means.
- Suggest a priority order for fixing open incidents.
- Walk you through any number on the page and where it comes from.

Treat it as a knowledgeable teammate who already read every chart on the page.

---

## The Weekly Email

Every **Monday at 9:00 AM Eastern**, Brett and Sam automatically receive a clean, professional email summarizing the past week's data health:

- Current **Trust Score** and whether it's up or down from last week
- Any **incidents** that opened, are still open, or were resolved
- A snapshot of which tables/rules are passing or failing
- Quick links back into the tool for the full picture

No login required to read it — everything important is in the email itself.

---

## Who can see what

- **Everyone on the team** — Kaylie, Sam, Brett, and Haseeb are all managers and have full access to the Data Observability page. Any future teammate added to Neuron Garage automatically becomes a manager too.
- **The weekly email** — currently sent to Brett and Sam only. Easy to add more recipients if you want them.

---

## FAQ

**Do I have to do anything to keep it running?**
No. It runs itself in the background. The weekly email is automatic.

**How often does it check?**
Snapshots every 6 hours. Rules and health checks evaluate on every snapshot. You can also press **Run all checks** at any time.

**What if a check shows a yellow error panel?**
That means the query couldn't finish — usually a database timeout on a big table. The 6‑hour snapshot still runs in the background; just check Alerts & History or press **Run now** later.

**What if I want to add a new rule?**
Tell us the rule in plain English (e.g. "no candidate should have a hire date before their application date") and we'll add it. Managers can also use **Add rule** directly in Tab 2.

**What if I want someone else on the weekly email?**
Just say the word — adding a recipient takes a minute.

**Can it tell me *why* something broke?**
It tells you exactly which rule failed and which rows triggered it. The *why* (bad import, manual edit, upstream API change) still needs a human, but you'll have a very narrow place to start looking. The **Ask AI** drawer is usually the fastest first stop.

---

*Questions or want to tweak how this works? Ping Haseeb.*
