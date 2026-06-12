## v5 — Standalone Word doc: Two Manus-App Decisions for Brett

A **new, separate** Word doc (not an extension of v4). Single purpose: lay out the two open Manus-app decisions clearly so Brett can sign off. No timeline tables, no Phase 2 scope dump — just the two decisions, side by side, in plain English, with Lovable's recommendation on each.

### File output
- `/mnt/documents/Neuron-Garage-Manus-App-Decisions-v5.docx`
- `/mnt/documents/Neuron-Garage-Manus-App-Decisions-v5.pdf` (PDF render for QA + sharing)
- Page-by-page image QA before delivery

### Doc structure

**Title:** Manus App Decisions — Market Saturation & Market Absorption
**Subtitle:** Prepared for Brett · v5 · June 2026

**Intro paragraph (3–4 lines):** Plain English framing — there are two separate Manus-app decisions on the table. People keep mixing them up because both touch "competition." This doc separates them, explains each in plain English, and gives Lovable's recommendation on each.

**Quick disambiguation box** (light grey shaded paragraph):
- **Market Saturation** = how many premium camp providers already exist in a city (supply density). Already live in the app as CSI.
- **Market Absorption** = whether those camps are selling out, waitlisting, or have open seats (demand pressure). Currently a demo mockup only.
- These are different questions. They need different decisions.

---

### Decision 1 — Market Saturation / CSI (Sam's "4th Manus app")

**What it is (plain English):**
Sam's v2 PDF proposes a stand-alone 4th Manus app that calculates a Competitive Saturation Index per city. But our app already has CSI fully built and wired into City Scoring — Manus already feeds it. Sam's v2 PDF also has a "Market Balance Index" inside Feature 1A that does essentially the same thing on the 25–50 city shortlist.

**The decision:**
Build CSI as a new stand-alone Manus app, OR keep using the existing CSI pipeline and fold the 1A "Market Balance Index" into it?

**Lovable's recommendation:**
**Do not build a new Manus app.** The existing CSI already covers this. Inside Feature 1A, the "Market Balance Index" should read from the existing CSI data (re-banded for the shortlist), not be a separate score with its own pipeline. One source of truth, no duplicate work, no extra Manus cost.

**Why:** Saturation changes slowly. The existing CSI runs a few times per year and covers all 817 cities. A second Manus app for the same signal adds cost and confusion with zero new information.

---

### Decision 2 — Market Absorption (new, demo-only today)

**What it is (plain English):**
Market Absorption tracks whether premium camps in a city are sold out, waitlisted, or have open spots. It's the strongest demand signal in Sam's v2 PDF (25% of the 1A score). Today it only exists as a visual mockup with fake data on the new Market Validation page.

**The decision:**
Should Market Absorption be its own stand-alone Manus app, OR folded into the existing CSI Manus pipeline as a second output?

**Lovable's recommendation:**
**Keep it as a separate Manus job, but not a separate "app" with its own UI** — just a second scheduled pipeline inside the existing Manus workspace that outputs a clean CSV. Lovable imports that CSV and displays it inside the existing Market Validation feature. No new app on our side, no new Manus product.

**Why:**
- Different cadence — absorption refreshes ~5x/year per shortlisted city (registration cycle); saturation refreshes 2–3x/year for all cities. Different schedules = cleaner as separate pipelines.
- Different scope — absorption only runs on the 25–50 city shortlist; saturation runs on all 817. Mixing them inflates Manus cost.
- Same display pattern as CSI today — CSV drop into Lovable, no new transport plumbing needed.

**How data flows (one short paragraph + simple list):**
Manus owns the heavy lifting (Firecrawl scrapes registration pages, Gemini Flash reads "SOLD OUT / Waitlist / Open", human QA on low-confidence pages, score computed). Manus drops a CSV. Lovable ingests on a schedule and displays inside Market Validation. Same proven pattern as CSI.

Transfer options, cheapest → richest:
1. CSV drop (recommended — matches CSI today)
2. Shared Drive/Sheet pulled by scheduled job
3. Webhook push to a Lovable Cloud edge function

---

### Summary box at the bottom (compact 2-row table)

| Decision | Lovable's recommendation |
|---|---|
| Market Saturation / CSI | Do NOT build a 4th Manus app. Use existing CSI everywhere, including inside 1A's Market Balance Index. |
| Market Absorption | Separate Manus pipeline (not separate app). CSV drop to Lovable. Display inside existing Market Validation feature. |

### Styling
- Same brand styling as v4 (Arial, US Letter, 1" margins, light grey table borders, light blue header shading, ShadingType.CLEAR).
- "Lovable's recommendation" subheadings in primary blue (`#174BE8`) to distinguish from problem statements.
- Disambiguation box: light grey background paragraph block with a left border accent.

### Out of scope
- No changes to v4.
- No code, route, Supabase, or `.lovable/phase-2/` edits.
- No new questions for Brett added to the doc — this is recommendation-only.
- No timeline/weekly progress tables — that lives in v4.
