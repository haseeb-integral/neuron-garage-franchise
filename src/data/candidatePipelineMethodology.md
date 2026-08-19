# Candidate Pipeline — Methodology

**Version 1.0 · Last reviewed: August 2026**

This doc explains, in plain words, how the Candidate Pipeline works. It covers every stage, every tab, every checklist, every rule, and every number the app calculates. If you follow this doc, you will know exactly what the app expects from you and what the app does on its own.

---

## 1. What the pipeline is for

The Candidate Pipeline tracks each person who wants to own a Neuron Garage franchise. It follows them from the first contact all the way to signing the franchise agreement.

Two things happen at the same time:

1. **Sales tracking** — where is this person in the journey, who owns them, how long have they been sitting still.
2. **Compliance record** — proof of what was sent, when it was sent, who checked it, and who approved it. This matters because franchise sales are regulated.

Everything is stored in the database. Nothing lives only in someone's head or inbox.

---

## 2. The eight stages

A candidate sits in exactly one stage at a time.

| # | Stage | What it means |
|---|-------|----------------|
| 1 | New Lead | Person just entered the system (form, outreach, referral, import). No real call yet. |
| 2 | Initial Qualification Call | The first 20–30 minute screening call is booked or done. |
| 3 | Business Overview Call | Deeper call — unit economics and the financial model. |
| 4 | FDD & Agreement Review | The Franchise Disclosure Document has been sent and is being reviewed. |
| 5 | Business Immersion & Evaluation | Immersion day, reference checks, Selection Committee review. |
| 6 | Confirmation Call | Committee approved. Final alignment and commitment. |
| 7 | Signing Call / Qualified | Franchise agreement is signed. |
| — | Disqualified | No longer moving forward. A written reason is required. |

You change a stage by dragging the card between columns on the board, or from the table view.

### Rules the app enforces on stage moves

- **Signing needs Confirmation first.** You cannot jump a candidate into Signing unless their history shows they already reached Confirmation.
- **The 16-day FDD lock.** A candidate cannot move forward out of FDD Review until 16 calendar days have passed since the FDD was sent. See Section 8.
- **Disqualified needs a reason.** The app will not save the move without text in the reason box.

Every move is written to the stage-history log with who moved it, from where, to where, and when.

---

## 3. The three views

A toggle at the top switches between three ways to look at the same data.

**Board (Kanban).** One column per stage. Cards can be Comfortable or Compact. Columns can be collapsed. Card colour dots show how long the person has sat in that stage: green = fresh (0–3 days), orange = watch (4–7 days), red = stalled (8+ days).

**Calendar.** Day, week, or month view of every scheduled call and follow-up for **all users**, not just you. Click a block to edit it, double-click to open the candidate card. Call types come from the seven process steps (Step 1 – Initial Qualification, Step 2 – Business Overview Call, and so on) plus "Other call" and "Follow-up reminder".

**Table.** A spreadsheet-style list of every candidate with all fields side by side. This is the view used for CSV export and CSV import.

---

## 4. The top-of-page numbers

Four counters sit above the board:

- **Total candidates** — everyone currently in the pipeline (Disqualified excluded).
- **Hot** — candidates with a qualification composite score of 80 or above.
- **Conversion rate** — the share of candidates who have *ever* reached Signing, taken from the stage-history table, not just those sitting in Signing today.
- **New this week** — candidates created in the last 7 days.

---

## 5. Filters

Four filter rows, all combinable. A "Clear" button appears when any filter is on and shows how many of the total candidates are visible.

- **Owner** — filter by the assigned team member.
- **Tag** — High Potential, Interested, Meeting Requested, Follow-Up, Not a Fit. Tags are chosen **by hand**. Nothing auto-assigns a tag. The default for a new candidate is Follow-Up.
- **Qualification** — 90+, 80+, 70+, 60+, or under 60, based on the composite score.
- **Days in stage** — Fresh (≤3), Watch (4–7), Stalled (8+).

---

## 6. Qualification scoring

Five pillars are scored by the recruiter as **1 to 5 stars** each. There is no AI guessing and no auto-derived value.

| Pillar (as shown on screen) | What you are judging |
|---|---|
| Responsiveness | Do they reply fast, show up on time, keep their word? |
| Experience with Elementary Age Children | Real hands-on experience with the age group we serve. |
| Ability & Willingness to Follow Our Process | Will they run our system, or fight it? |
| Philosophical Alignment | Do they believe what we believe about kids and learning? |
| Market Fit | Is their desired market a market we want? |

Each pillar has its own free-text note box, so the star rating always has a written reason behind it.

**Composite score formula:**

```
composite = round( (sum of the five star ratings / 25) × 100 )
```

So five 5-star ratings = 100. Five 3-star ratings = 60.

**Overrides.** Every pillar has an optional override value stored in its own column. If an override exists, it replaces the raw value when the composite is calculated, and the app marks the score as "adjusted" so you can see it was changed by a person. This one helper is the single source of truth — the card badge, the Overview tab, the filters, the table, and the CSV export all read the same recomputed number.

Scores are entered on the **Overview** tab. Step 1 of the process has a post-call action reminding you to update them after the first call.

---

## 7. The candidate card — tabs

Clicking a card opens a side panel with four tabs, in this order.

### 7.1 Overview

Read-only summary: photo, name, city/state, email, phone, owner, source, days in stage. Below that sit the five qualification pillars with their star ratings, notes, and the composite badge. A **Red Flags summary** lists every warning signal picked up across the process steps. The manual tag picker lives here too.

If the candidate's state requires franchise registration (NY, CA, IL, MD, MN, ND, RI, SD, VA, WA, WI, HI, IN, MI), a yellow banner appears warning you to confirm registration before sending the FDD.

### 7.2 Qualification Process

This is the working tab. It holds the schedule block, the lead-source card, and the seven steps as expandable cards. Each step header shows a progress count (done / total and a percentage) and a red badge counting red flags in that step. Nothing is locked — you can open and fill any step in any order.

Every checkbox, field, and note **auto-saves** about half a second after you stop typing or clicking. There is no Save button. Each save also writes a line to the activity timeline naming the step, the group (Trial Close / Post-Call Action / Homework), the exact item, and whether it was checked or unchecked.

### 7.3 Uploaded Documents

All files tied to the candidate: background and credit check results, FDD proof-of-send, signed Item 23, facility forms, marketing plan, and anything else. Homework upload buttons inside the process steps drop files here automatically.

### 7.4 Committee Votes

Three possible votes: **Approve**, **Needs more info**, **Reject**. A counter at the top totals each. Any logged-in team member can cast a vote, or record a proxy vote for a committee member who has no login. Every vote is timestamped and shows the voter's comment.

### 7.5 Activity

Two parts. The top is the **stage history** — every stage the candidate has been in, when they entered, and how many days they stayed. Below is the **activity timeline** — a system-written feed of every save, checkbox, field edit, stage move, and vote. There is no "add a note" box here; notes belong inside the process steps where they have context.

---

## 8. The seven-step qualification process

Each step has a goal, an optional Trial Close block, Post-Call Actions, and Homework. "Assigned homework" only appears in the Trial Close list on steps that actually have homework.

### Trial Close (the same five items on every call step)

1. Are there any other questions I can answer for you?
2. Will you please summarize your key takeaways from today's call?
3. Would you like to move forward with our process?
4. Scheduled next call with clear agenda
5. Assigned homework

### Step 1 — Initial Qualification

**Goal:** 20–30 minute phone call. Quickly decide if the prospect is viable. This is really a *dis*qualification call. Assert process leadership — the process is deliberately built so both sides can make an informed decision.

Step 1 also holds the full contact intake form: name, emails, phone, city/state, time zone, owner, spouse/partner details, desired market city and state, and the mailing address (which sits just above the Trial Close block in Step 2). It also holds the lead sheet: role (Operator / Investor / Other), how they found us, investment ability, sweat-equity willingness, liquid capital, net worth, timeline, motivation, and background notes.

- **Post-call action:** Update the qualification scores on the Overview tab.
- **Homework:** Complete Request for Consideration Part 1 (non-financial), due 2 days before the next call.

### Step 2 — Business Overview Call

**Goal:** Deeper understanding, including unit economics. Review the financial forecasting template.

- **Post-call actions:** Ran Market Validation + Site Analysis on the desired location and sent/uploaded the reports; sent the Mindset book; sent the background and credit check authorisation.
- **Homework:** Review the Market Validation + Site Analysis reports (no upload needed); complete Request for Consideration Part 2 (financial); read *Mindset* by Carol Dweck (no upload needed); provide authorisation for the background and credit check.

### Step 3 — Internal: Background & Credit Check

**Goal:** Background is judged on recency, decency, and frequency — did they learn the lesson? Credit shows whether they can run their own finances. National average is 683; our target is 720+. Known exceptions are divorce and catastrophic health events.

This is an internal step: no trial close, no homework, no signal questions.

- **Fields:** Credit score (number) and Background check summary (long text).

### Step 4 — FDD & Franchise Agreement Review

**Goal:** Educate and reinforce that franchises are *awarded*, not sold. Google Meet covering the FDD and key agreement terms.

- **Post-call action:** Sent the FDD and saved/uploaded proof of the date sent. An upload button sits next to it for the proof file.
- **FDD sent date field** sits directly under the post-call actions. This single field writes to `candidate_compliance.fdd_sent_at`, which is the exact same place the 16-day lock reads from — so recording it here always unlocks the gate correctly.
- **Homework:** Sign and return Item 23 of the FDD; complete the personality profile assessment.

### Step 5 — Business Immersion & Evaluation

**Goal:** Show the full owner experience: day-in-the-life, support systems, meet a growth guide. Prepare for the Selection Committee.

- **Post-call actions:** Shared the prospect's file with the Selection Committee (they vote in the Committee Votes tab); completed candidate reference checks.
- Below the post-call actions sit three structured reference blocks (name, relationship, contact, notes) — one per reference.
- **Homework:** Facility prospect form with primary and backup locations; local marketing plan summary.

### Step 6 — Confirmation Call

**Goal:** Final alignment and commitment. "The selection committee approved your award of a franchise." First half covers franchisor commitments; second half is prospect Q&A.

- **Post-call action:** Overnighted a personalised Neuron Garage pen with their franchise number on it.

### Step 7 — Signing Call

**Goal:** Finalise the agreement. Held 48 hours after Step 6. The prospect signs the Franchise Agreement and all required exhibits.

- **Post-call actions:** Began the onboarding process (email, phone number, file access); box of local donuts delivered with the challenge-donut description inside.
- No signal questions on this step.

---

## 9. Signals and red flags

Steps with a live call (1, 2, 4, 5, 6) each ask four short questions. Answers are stored inside that step's data. Some answers are marked red, and red answers roll up into the step header badge and the Red Flags summary on the Overview tab.

| Question | Answers (red ones marked) |
|---|---|
| Was the prospect on time for this call? | On time · **Late** · **No-show** |
| Did the prospect reschedule this call? | Not rescheduled · Rescheduled once · **Rescheduled more than once** |
| Was the prospect prepared (homework done)? | Yes · Partly · **No** |
| Was the spouse / partner engaged? | Yes · **No** · Not applicable |

There is also a free-text signal notes box per step. Steps 3 and 7 do not have signal questions because there is no prospect call in them.

---

## 10. FDD 16-day compliance

Federal rules require a minimum 14-day cooling-off period between giving someone the FDD and signing an agreement. **We use 16 calendar days** to stay safely on the right side of the line.

**The math, in one place:**

- Start date = the later of the FDD **sent** date and the FDD **received** date.
- Earliest signing date = start date + 16 days.
- Days remaining = earliest signing date − today, floored at zero.
- A signing date earlier than the earliest signing date is flagged as "too early".

This same helper feeds the compliance panel, the drag-and-drop stage gate, and it is mirrored by a database trigger so the rule cannot be dodged by writing directly to the database.

**What happens when you try to move a locked candidate:**

- No FDD date on file → blocked, with a message telling you to set the FDD sent date on Step 4.
- Compliance row cannot be read → blocked (fail safe, not fail open).
- Days still remaining → blocked, showing the number of days left and the earliest legal signing date.

**Override.** Only an admin can switch on the compliance override, and a written reason is required. The override, the reason, the person, and the timestamp are all stored. A one-click **compliance packet PDF** can be produced for any candidate showing the whole trail.

The whole gate sits behind a feature flag so it can be switched off instantly if it ever misfires.

---

## 11. Source tracking

Source is captured in three levels so campaigns can be compared properly:

1. **Source type** — the high-level channel, e.g. Outbound Email, Referral, Web Form.
2. **Source name** — the specific source inside that channel, e.g. SmartLead.
3. **Source campaign** — the exact campaign name, e.g. "Houston Teachers – Apr 2026".

Plus a free-text **source notes** field for anything that does not fit the lists. The type and name options come from the `candidate_source_options` table, so the lists stay clean and consistent. When a candidate arrives from a SmartLead outreach campaign, the campaign name is filled in automatically.

Emails that arrive from an outreach campaign are marked **verified** and locked so nobody edits them by accident and causes a duplicate send. Emails typed by hand stay editable.

---

## 12. Adding candidates

**One at a time.** The blue "Add Candidate" button opens a short form: name, email, phone, city, state, source, tag, owner. The card appears in New Lead straight away.

**In bulk (CSV import).** The import wizard walks through four moves:

1. Upload the CSV (a template can be downloaded first).
2. The wizard matches your headers to our fields automatically, ignoring case, spaces, dashes, and underscores. First name, last name, and email are required.
3. A review screen shows each row with warnings — bad email format, duplicate email inside the file, duplicate against an existing candidate, unknown stage label.
4. Import. Every imported row is stamped with the same batch ID, so **"Undo this import"** can remove the whole batch in one click.

**Export.** The table view exports every candidate to CSV, including the three source levels, mailing address, partner fields, all five pillar ratings, the composite qualification score, days in stage, and the created date.

---

## 13. What is written to the audit trail

Nothing needs to be remembered by hand. The app records:

- Every stage move (who, from, to, when) — shown in the Activity tab.
- Every process checkbox toggle, naming the step, group, and item.
- Every process field edit, naming the field and the new value.
- Every lead-sheet save, showing which fields changed.
- Every committee vote with comment and timestamp.
- Every FDD compliance change, including override reason and approver.

---

## 14. Things to check when something looks wrong

| Symptom | Where to look |
|---|---|
| "FDD sent date required" but you entered a date | Make sure the date was entered in the Step 4 field or the Documents tab — both write to the same compliance record. |
| Composite score looks off | Check whether a pillar override is set; overrides beat raw star values. |
| Candidate will not move to Signing | Check stage history for Confirmation, then check the 16-day lock. |
| Card missing from the board | A filter is probably on — look for the red "Clear" button. |
| Import rejected rows | Reopen the wizard review screen; each rejected row shows its warning. |
