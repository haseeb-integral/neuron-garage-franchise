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

## The three levels, explained

The tool is organized into three layers that answer three different questions.

### Level 1 — "Are the tables alive and well?"

This is the **health check** layer. For each important table in our database (cities, teachers, candidates, schools, etc.), it checks:

- **Existence** — does the table still exist?
- **Row count** — are there a reasonable number of rows? (e.g. an empty teachers table is a red flag)
- **Column completeness** — are key columns filled in, or are too many rows missing values?
- **Freshness** — when was the table last updated? Stale data is suspicious.
- **Reasonable ranges** — do numeric values fall inside expected bounds?

Each table gets a **color score**:

- 🟢 **Green** — healthy, nothing to worry about
- 🟡 **Yellow** — minor issue worth a look
- 🔴 **Red** — something is broken or wrong

At the top of the page you'll see the **Trust Score** — a single number from 0–100 that rolls up the health of every table into one at‑a‑glance answer to *"how good is our data right now?"*

### Level 2 — "Is the data actually *correct*?"

Level 1 tells you the table is *alive*. Level 2 tells you the values inside it make sense.

This layer runs **custom rules** written in plain English, like:

- "No city should have a negative population."
- "Every teacher prospect must have an email address."
- "Candidate stage should never be empty."
- "School enrollment should be between 50 and 5000."

When a rule fails, the tool shows you **exactly which rows broke it**, so the fix is obvious. No hunting through thousands of rows.

It also surfaces **outliers** — values that aren't technically wrong but look suspiciously far from the norm (e.g. a city with 100× the population of all its peers). These are usually data entry mistakes worth investigating.

### Level 3 — "What happened in the past, and what should I be told about?"

This is the **history and alerts** layer.

- **30‑day history** — every 6 hours, the tool takes a snapshot of all the scores. You can scroll back to see how data quality has trended over the last month. Great for catching slow degradations.
- **Incidents** — when a check stays failed for a while (not just a one‑off blip), the tool opens an **incident**, like a support ticket for the data. It stays open until the issue is resolved, so nothing falls through the cracks.
- **Subscriptions** — anyone can subscribe to be notified when specific incidents open or close. No more "I wish someone had told me."

---

## The Weekly Email

Every **Monday at 9:00 AM Eastern**, Brett and Sam automatically receive a clean, professional email summarizing the past week's data health:

- Current **Trust Score** and whether it's up or down from last week
- Any **incidents** that opened, are still open, or were resolved
- A snapshot of which tables/rules are passing or failing
- Quick links back into the tool for the full picture

No login required to read it — everything important is in the email itself.

---

## A normal workflow

1. **Monday morning** — Brett/Sam read the weekly email over coffee. If the Trust Score is green and no incidents are open, they move on.
2. **If something is red** — click the link in the email or open the Data Observability page in the sidebar.
3. **Start at Level 1** — find the red table.
4. **Drop into Level 2** — see which rule failed and which exact rows are the problem.
5. **Fix the data** — update the source (e.g. re‑run the import, correct the row, ask the teammate who owns it).
6. **The tool re‑checks automatically** — within a few hours the score recovers and the incident closes.

---

## Who can see what

- **Everyone on the team** — Kaylie, Sam, Brett, and Haseeb are all managers and have full access to the Data Observability page. Any future teammate added to Neuron Garage automatically becomes a manager too.
- **The weekly email** — currently sent to Brett and Sam only. Easy to add more recipients if you want them.

---

## FAQ

**Do I have to do anything to keep it running?**
No. It runs itself in the background. The weekly email is automatic.

**How often does it check?**
Snapshots every 6 hours. Rules and health checks evaluate on every snapshot.

**What if I want to add a new rule?**
Tell us the rule in plain English (e.g. "no candidate should have a hire date before their application date") and we'll add it.

**What if I want someone else on the weekly email?**
Just say the word — adding a recipient takes a minute.

**Can it tell me *why* something broke?**
It tells you exactly which rule failed and which rows triggered it. The *why* (bad import, manual edit, upstream API change) still needs a human, but you'll have a very narrow place to start looking.

---

*Questions or want to tweak how this works? Ping Haseeb.*
