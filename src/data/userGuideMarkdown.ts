// Markdown source of the User's Guide.
// Rendered inline on /user-guide AND downloaded verbatim by the
// "Download Markdown" button on that page. Editing this constant updates
// both surfaces, so the page and the .md file can never drift.
//
// Voice: plain English, friendly, for non-technical staff (Kaylie, Sam,
// recruiting team). For the full technical spec, see /spec.

export const USER_GUIDE_MARKDOWN = `# Neuron Garage Franchise Development — User's Guide

> A friendly walkthrough of the Neuron Garage Franchise Acquisition System.
> **Guide version 1.4 · Updated May 31, 2026**
> Live URL: neuron-garage-franchise.lovable.app
> Need the full technical spec? Open the **Full Specification** page in the sidebar (it stays in lock-step with this guide).

---

## Who this is for

Three core users today: **Kaylie Reed** (founder), **Sam**, and the Neuron Garage team — including **Brett**, **Haseeb** (engineering), and the marketing / recruiting staff. This is an internal tool, not public-facing. Optimize for clarity over polish.

## What the tool does

It helps you do four things, in order:

1. **Pick the right city** to open a franchise next.
2. **Find the right teacher** in that city.
3. **Start a real conversation** by email.
4. **Walk them all the way to signing** as a franchisee.

Everything else (Dashboard, Neuron AI assistant, header bell, observability, in-app docs) exists to make those four jobs faster and harder to mess up.

---

## Four design principles you'll feel on every screen

1. **Always one screen ahead.** The Dashboard answers "what should I do next?" before you have to ask. Every page has a clear next step.
2. **Show the math.** Any score, any number — click "Show Formula" and see the inputs, weights, and calculation. No black boxes.
3. **AI helps, you decide.** We suggest who to contact, when to send, and what to write — but every decision stays in your hands.
4. **Built for three people.** Kaylie, Sam, and the team. Clunky-but-clear beats pretty-but-mysterious every time.

---

## The journey, end to end

| # | Step | Where it lives |
|---|---|---|
| 1 | Score a city | City Search |
| 2 | Find a teacher | Teacher Search |
| 3 | Start a conversation | Email Outreach |
| 4 | Walk them to signing | Candidate Pipeline |

From "we don't know that city" to "welcome to the family" — usually in a few weeks.

---

## Feature 1 — City Search

> **"Where should we open next?"**

Type a city, get a score out of 100. We look at the live SOW signals (12 metrics across 3 categories — Demand, Operator & Venue Supply, Competitive Opportunity) plus demographics, schools, incomes, and growth, and rank **817 U.S. cities** (population ≥ 50,000) so you spend your time on the right places.

### What you can do

- **Filter** by state, **Tier (A / B / C / D)**, or registration status (38 non-registration states are hard-coded).
- **Open any city** to see the full breakdown — every number, every source.
- **Compare up to 3 cities** side-by-side before you commit.
- **Adjust weighting sliders** if you care more about, say, school density than population. Master sliders auto-rebalance to 100%. Sub-metric weights are typed as relative importance and normalized on Apply.
- **City Notes** — leave a comment on any city; teammates see it on the same drawer.
- **Export Raw Signals** as XLSX for offline review.
- **Ask AI** any question about the city ("What's the K-6 teacher pool?", "How do schools compare to the state average?"). Answers obey our **3-tier Operator & Venue Supply rule** so the number you see on screen is the same number the AI quotes back to you.

### One calibrated number everywhere

This is Brett's rule, and it's enforced everywhere. The pillar and composite scores on:

- the City Search table,
- the **"Why this tier?"** popover,
- the selected-market right panel,
- the **Compare** modal,
- the XLSX **export**,

…all read from the **same recomputed helper**, never from stale stored values. If they ever disagree, it's a bug — tell Haseeb.

### Two numbers, same truth

You'll see both a **Total Score** (school-grade scale, e.g. 91) and a **Weighted Composite Index** (the raw engine number, e.g. 63). Order and tiers are identical — only the displayed number shifts. Both appear side-by-side in the "Why this tier?" popover, the city drawer, and the export.

### Pro tip

Click **"Show Formula"** on any score. You'll see exactly which inputs drove the number — no black boxes.

### Next step

Found a winner? Hit **"Find Teachers in this City"** to jump straight to Teacher Search, pre-filtered.

---

## Feature 1A — Market Validation

> **"Is this city a real premium enrichment market — not just good demographics on paper?"**

City Search ranks cities by demographics. Market Validation goes one level deeper: it looks at what families in that city are *actually paying for* right now (camps, classes, enrichment programs) and scores the city from **0–100**. Higher = stronger premium market.

### The 5 pillars (what we score)

| Pillar | Weight | Plain English |
|---|---|---|
| **Pricing Acceptance** | 27% | Are families here already paying $300–$700+ per week for camps? |
| **Scaled Operator** | 27% | Do trusted national brands (KidStrong, Code Ninjas, iD Tech…) already operate here? |
| **Market Balance** | 20% | Is the market underserved or already saturated? Sweet spot ≈ 350 kids ages 5–12 per premium provider. |
| **Enrichment Diversity** | 13% | How many *types* of enrichment exist (STEM, art, music, theater…)? |
| **Market Depth** | 13% | How many premium providers are in the city? (4 = thin, 40 = deep) |

These 5 numbers add up to one composite called the **MVS** (Market Validation Score).

> Market Absorption (sellout-rate) was retired in v1.1 — the data was too unreliable. The 5 remaining pillars were re-balanced to still sum to 100%.

### How to use the page

- **Shortlist table** — every city you scored shows its MVS, the 5 pillar scores, and a sources chip (e.g. "5/5 sources" means Sawyer, ActivityHero, Google Maps, Yelp, and Google Search all returned data).
- **Mark each city** Pursue / Hold / Drop. The decision saves automatically.
- **Run button** — refreshes the score. Smart cost rules:
  - If data is **0–90 days old** → uses saved data, no crawl (zero cost).
  - **91–120 days** → asks you "use saved or run fresh?".
  - **Over 120 days** → runs a fresh crawl.

  - **Force fresh** always overrides if you need brand-new data.
- **Click any city** to open the deep dive.

### Reading a deep-dive card

Each pillar card has 3 clear sections:

1. **Result** — one sentence in plain English (e.g. *"Premium pricing is the norm across providers here."*).
2. **Evidence** — the actual numbers (median price, provider counts, coverage ratio). Click any row to see the *exact providers, categories, or census rows* behind the number, each with a freshness pill and source.
3. **Trust** — how confident we are *for that pillar* (e.g. *"Medium confidence — 8 of 12 providers had readable prices"*).

Below that: a **weight slider** (preview only — shows how much the city's MVS would shift if you re-weighted this pillar), then collapsible *Formula* and *Sources* drawers.

### Status badges you'll see

- **Green "5/5 sources"** chip — all 5 data sources returned providers.
- **Amber "Score may be stale"** note under the composite score — the last crawl failed but saved data ≤ 120 days old is being used as a safe fallback. Hit Run again to retry.
- **Red "failed" pill** — saved data is > 120 days old and the latest crawl failed. Hover for the exact error.
- **Blue "Skipped — saved data"** badge — Run was clicked but data is ≤ 90 days old, so no credits were spent. Use *Force fresh* if you really want a new crawl.

### Market Brief PDF

From the deep dive, click **Export Market Brief** for a one-page PDF you can share with Brett, Kaylie, or a prospective franchisee. It includes the composite score, the 5 pillars, top providers, and the data sources used.

### What changed recently

- The 5-card layout (Result / Evidence / Trust) replaced the old formula-only cards.
- Per-pillar confidence replaced the old global "low confidence" badge.
- Freshness rules + soft-fail fallback keep Firecrawl spend predictable while keeping a score on the page even if a crawl fails.
- Firecrawl cap raised from 30 → 50 per run, with per-step sub-caps (discover ≤ 25, classify ≤ 15, extract ≤ 15) so no step can run away.

### Need the math?

Open **MVS Methodology** in the sidebar for the full formula, normalization ranges, premium-tier definition, and shared data stack.

---

## Feature 2 — Teacher Search

> **"Who in that city should we talk to?"**

We pull elementary teachers in your chosen city and score each one for fit. Years of experience, leadership roles, side hustles (DonorsChoose, Teachers Pay Teachers, tutoring), school quality, enrichment signals — all rolled into a single number you can sort by.

### What you can do

- **Filter** by city, fit score, tag, enrichment status, or teacher type (Active, Retired, Camp/Enrichment).
- **Open a teacher card** to see bio, school info, signals, and contact details.
- Use **Saved Lists** to group teachers across cities (e.g. "Texas shortlist").
- Use the **Bulk Action Bar** to bulk-tag, bulk-promote, or export a shortlist.
- The **Market Context Banner** at the top reminds you what tier the city is and why.
- The **Next Best Action Strip** suggests the single best move on this screen right now.
- Click **"Promote"** on a great fit and they land in the Candidate Pipeline as a New Lead.

### Pro tip

The **Outreach Intelligence** panel suggests the best time of day and channel to reach each teacher.

### Next step

Promote your favorites — then move them into **Email Outreach** to start the conversation.

---

## Feature 3 — Email Outreach

> **"How do we start the conversation?"**

Two pools, one screen. Use the **Viewing toggle** at the top of the page to flip between them:

- **Master Teacher DB** — every teacher we know about. Our owned recruiting asset, growing every time you import a CSV.
- **SmartLead** — the subset we've pushed into a live campaign.

### What you can do

- **Import any CSV** into the Master Pool. **Lovable AI figures out the column mapping for you** — no manual matching required.
- **Preview duplicates and verification quality** before a single row hits the database.
- **Push verified leads to a SmartLead campaign** with a live filter preview that tells you exactly how many will go.
- **Triage replies** in **seven colored buckets**: Interested, Meeting, Info, Soft No, Wrong Person, Not Interested, OOO. Green replies promote straight into the Candidate Pipeline.
- Every outbound email is **AI-personalized** using known teacher signals — no copy-paste blasts.

### Warm-up status — read this

SmartLead is in **mailbox WARM-UP** right now. The small numbers you see in the **SmartLead / Warm-Up** pill are internal staff and warm-up pool sends. **We are NOT emailing teachers yet.** The third pill, **Live Outreach**, stays disabled until warm-up completes.

### Transactional email (behind the scenes)

Separate from SmartLead, the system sends transactional emails (password resets, weekly data-health digest, unsubscribe handling). You don't manage these — they run on their own queue with bounce, suppression, and unsubscribe handling baked in. If you ever need to dig in, see the **Email Outreach Docs** in the sidebar.

### Next step

Got an interested reply? It promotes into the Candidate Pipeline automatically — just open the new card to start qualifying.

---

## Feature 4 — Candidate Pipeline

> **"Who's getting close to signing?"**

A Kanban board with **7 stages**: New Lead → Engaged → Qualified → Immersion → Confirmation → Signing → Disqualified. Drag a card to move someone forward. Open it to see their qualification scorecard, notes, homework, documents, and Selection Committee votes.

### What you can do

- See every candidate, every stage, every owner — at a glance.
- Open a card for a **six-criteria 1–5 qualification score**: capital, motivation, market knowledge, time commitment, leadership, culture fit.
- Track **days in stage** so nothing goes stale (green ≤3, amber 4–7, red 8+).
- Manage **Documents** in a dedicated tab (FDD, FA, Step 2/4 uploads, candidate compliance files).
- Cast **Selection Committee votes** during the Immersion stage (manual votes supported).
- Apply a **score override** with a written reason if your gut disagrees with the formula — every override is written to the **compliance audit log**.
- **Export Packet** — one click to bundle a candidate's score, notes, and key docs for a committee review.

### The hard gates (by design)

- A card **cannot drop into Signing** until it has passed **Confirmation**.
- The **16-day FDD gate** is enforced — a candidate cannot sign within 16 days of receiving the FDD. The gate appears in the Documents tab and blocks the stage move if the clock hasn't run.

### Card anatomy

| Element | Meaning |
|---|---|
| **Left stripe** | Days in stage. Green ≤3, amber 4–7, red 8+. |
| **Initials circle** | Candidate avatar (no score, no signal). |
| **"Qual" pill** | Composite of the 5 star-pillar ratings — Teaching, Leadership, Financial, Market Fit, Culture Fit. Hidden until at least one pillar is rated. |
| **Blue tag** | Short qualitative status ("Interested", "High Potential", "Follow-Up"). |
| **"Day N"** | Days in the current stage; resets on move. |
| **Small letter circle** | Owner — first initial of the assigned teammate. Hover for full name. |

The same legend is available on the Candidate Pipeline itself — click **"Card legend"** in the toolbar.

### Pro tip

Promoted the wrong teacher? Move the card to **Disqualified**. They stay in Teacher Search for future review.

### Next step

Once a card lands in **Signing**, the deal is closed. Time to celebrate.

---

## Neuron AI — the ⌘K assistant

Press **⌘K** (Mac) or **Ctrl+K** (Windows) on any screen and the global Neuron AI assistant opens. It knows the page you're on, the row you've selected, and can:

- Explain any score or formula in plain English.
- Answer "what should I do next?" questions.
- Pull facts from the Spec, this guide, and the live database.
- Suggest follow-up questions so you don't get stuck.

It is **not** for free-form world questions — it's a domain assistant. If you ask it about the weather, it'll politely steer you back to the four features.

---

## Notifications (header bell)

The **bell icon** in the top-right header surfaces real-time alerts:

- A new reply landed in Email Outreach.
- A candidate has gone stale in pipeline (8+ days in a stage).
- A SmartLead campaign hit warm-up milestones.
- Data-health rules tripped (Haseeb / Brett see these first).

Click the bell to read, mark-as-read, or jump straight to the source.

---

## Database Health & Observability

For **Haseeb and Brett** (manager / admin roles). Surfaces:

- Row counts and freshness across the core tables (cities, schools, teachers, candidates).
- Invariant rules — things that should always be true. Green / yellow / red status.
- Outlier checks on key scoring columns.
- A 30-day history per domain and an open / closed incident log.

If you're not Haseeb or Brett, you won't see this — that's intentional.

---

## In-app reference docs

The sidebar has the full set of reference docs. Use these when this guide isn't enough:

- **Full Specification** — the complete v1.4 product spec (technical).
- **Demographics Methodology** — how the City Search numbers are computed.
- **Email Outreach Docs** — SmartLead integration, transactional email infra, bounce / suppression handling.
- **Observability Guide** — how the data-health surface works.
- **SmartLead Spec** — full integration contract.

---

## Phase 2 — what's coming next

Source of truth: \`.lovable/phase-2/\`. The 9-item SOW (one line each):

| # | Item | What it adds |
|---|---|---|
| 1 | **Market Validation 1A** | Tier-1 stamp on every city using the latest SOW data. |
| 2 | **Site Analysis 1B** | Real estate / site fit overlay on top of city scores. |
| 3 | **Candidate Portal** | Self-serve portal for franchisee applicants. |
| 4 | **Candidate Pipeline 1.5** | Pipeline polish — better documents, scorecard upgrades. |
| 5 | **Teacher Search 1.5** | Faster filters, better fit-score model. |
| 6 | **SmartLead 1.5** | Live outreach unlock after warm-up. |
| 7 | **Mailboxes** | Per-recruiter inbox management. |
| 8 | **Video Training module** | Onboarding & training videos for new franchisees. |
| 9 | **Manus CSI app** | Standalone CSI scoring app (CSI v2 already uploaded). |

Onboarding (the 7-step franchisee launch program) is **parked** until the first signed franchisees come through.

---

## Quick answers

**Where do I start?**
The Dashboard. The orange Next Action card tells you the single most important next step — usually "Find Teachers in {city}" or "Reply to {candidate}".

**Can I trust the scores?**
Yes — and you can verify them. Every score has a "Show Formula" button. The "one calibrated number everywhere" rule means the same recomputed value appears on the table, the popover, the right panel, the compare modal, and the export. If something looks off, tell Haseeb or Brett.

**Why do I see two numbers — "Total Score" and "Weighted Composite Index"?**
Same truth, two scales. The Weighted Composite Index is the raw engine math used for sorting and Tier A–D. The Total Score is the same number on a school-grade scale (e.g. 91 vs 63). Order and tiers are identical — only the displayed number shifts.

**Are we emailing teachers yet?**
Not yet. SmartLead is in mailbox WARM-UP — sends are going to internal staff and a warm-up pool so our domains land in the inbox, not spam. The Live Outreach pill stays disabled until warm-up completes.

**What if I promote the wrong teacher?**
Move the card to **Disqualified** in the Candidate Pipeline. They stay in Teacher Search for future review.

**Who can see what I do?**
Everyone on the team sees the same data. There's no private view — that's intentional.

**Why can't I drop a card into Signing?**
Two gates. The **Confirmation gate** — Signing only opens after Confirmation passes. The **16-day FDD gate** — a candidate cannot sign within 16 days of receiving the FDD. Both are enforced; neither is a bug.

**What's the difference between Master Teacher DB and SmartLead?**
The Master Pool is everyone we know. SmartLead is the subset currently in a live campaign. Toggle between them at the top of Email Outreach.

**What happens after Signing?**
Phase 2 — onboarding. The code is parked while we focus on getting the first signed franchisees through the door.

**How do I find the spec for X?**
Open **Full Specification** in the sidebar. This guide is the plain-English layer; the spec is the technical truth.

---

## Stuck? Just ask.

This tool is built for the team — Kaylie, Sam, and the recruiting staff. If something feels clunky, slow, or wrong, tell **Brett** or **Haseeb**. We fix it forward, one change at a time.

Or press **⌘K** anywhere and ask the **Neuron AI** assistant.
`;
