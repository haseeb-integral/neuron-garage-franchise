# Market Validation — Methodology Audit & Plain-English Explanation

## Part 1 — Is the methodology doc up to date?

I read the methodology page (`MVSMethodology.tsx`), the user guide (`userGuideMarkdown.ts`), and the real code (scoring math, pipeline, freshness rules, card UI).

**Good news:** The big things match. The 5 pillar weights, the math formulas, the score bands, and the fact that Market Absorption is removed — all correct.

**Bad news:** 9 things are stale or missing. The user guide is worse — it has no Market Validation section at all (just a 1-line placeholder).

### What's wrong in the methodology doc

| # | Note in the doc says… | Reality in the code… |
|---|---|---|
| 1 | Each run is "capped at 25 providers" | Total cap is now **50**, with sub-caps 25 / 15 / 15 for discover / classify / extract |
| 2 | Year 1 does a mid-March scrape; Year 2 will run 5 scrapes (Jan–May) via Inngest/Trigger.dev | The whole weekly-scrape pipeline (`mvs-extract-weeks`) is **retired**. No cadence, no Inngest |
| 3 | "Every registration-page scrape archives a screenshot" | Registration-page scrape is retired; this note is misleading |
| 4 | Nothing about freshness | **0–30 day skip / 31–60 day prompt / >60 day fresh** rule is fully shipped |
| 5 | Nothing about soft-fail | `done_stale` status + `fallback_data_date` fallback is fully shipped (keeps a score visible when a fresh crawl fails) |
| 6 | "Low-confidence badge fires when >20% of providers have no registration page" | That trigger is **retired**. We now show **per-pillar confidence** (different reason per card) |
| 7 | Cards described as formula + sources list | Cards are now **Result → Evidence → Trust → Weight preview**, with click-through proof popovers and freshness pills |
| 8 | Lists 12 eligible enrichment categories | Code recognises **19** (extra: dance, language, sports, swim, gymnastics, cooking, outdoor) |
| 9 | "QA queue threshold is confidence < 0.7 on week rows" | Week rows are no longer written. This describes the retired system |

### What's wrong in the user guide

- Market Validation has **no section**. Only a stale 1-line entry in a Phase 2 table.
- Users have no written guide for: the shortlist table, the scoring console, Run / Force-fresh buttons, freshness rules, the deep-dive cards, or the Market Brief PDF.

---

## Part 2 — How the methodology actually works (plain English)

### What it does
Market Validation scores a city from **0 to 100** to tell us how good it is for opening a new Neuron Garage. Higher = better market.

### The 5 pillars (and how much each one matters)
Think of it like a recipe. Each pillar is one ingredient.

| Pillar | Weight | What it asks |
|---|---|---|
| **Pricing Acceptance** | 27% | Do families here already pay premium ($300–$700+) for camps? |
| **Scaled Operator** | 27% | Do big trusted brands (KidStrong, Code Ninjas, etc.) already operate here? If yes, parents trust the category |
| **Market Balance** | 20% | Is the market underserved or saturated? We want enough demand vs supply |
| **Enrichment Diversity** | 13% | How many *types* of enrichment exist (STEM, art, music…)? More types = healthier market |
| **Market Depth** | 13% | How many premium providers exist? More depth = real spend |

These 5 numbers add up to a **0–100 composite score** called MVS.

### How each pillar is calculated (simple version)
- **Pricing**: Look at weekly camp prices. Score the median, the 75th percentile, and the % at $500+. Higher prices → higher score.
- **Scaled Operator**: Count how many big national brands are in the city. More = better. Subtract a small penalty if direct competitors (Snapology etc.) are too crowded.
- **Market Balance**: Coverage ratio = kids 5–12 ÷ premium providers. Sweet spot ≈ 350 kids per provider (underserved). <100 = saturated.
- **Enrichment Diversity**: Count distinct enrichment categories. 2 categories = weak; 10 = strong.
- **Market Depth**: Count premium providers (4 = weak, 40 = strong).

### Where the numbers come from
A pipeline runs per city (~1–2 minutes). Steps:
1. **Discover** providers from 5 sources (Sawyer, ActivityHero, Google Maps, Yelp, Google Search) — capped at 25 calls
2. **Classify** each provider into a category and tier — capped at 15
3. **Enrich** pricing & website info — capped at 15
4. (Retired) Weekly absorption scrape
5. Recompute the 5 pillar scores and the MVS

### Cost guardrails
- Firecrawl cap: **50 calls per run** total (was 30)
- Sub-caps stop any one step running away
- **30-day skip**: if a city was scored in the last 30 days, the next Run uses the saved data and burns zero credits
- **31–60 days**: app asks you "use saved or run fresh?"
- **>60 days**: runs a fresh crawl
- **Force fresh** button always overrides

### When a crawl fails
- If saved data ≤ 60 days exists → status becomes `done_stale`, score stays visible, amber banner explains
- If saved data > 60 days → `failed_no_data`, red pill, hover shows the real error

### Trust signals on every card
- **Result line** — plain English (e.g. "Weak premium pricing")
- **Evidence rows** — the actual numbers, each clickable to see source data
- **Trust block** — per-pillar confidence + reason ("8 of 12 providers had readable prices")
- **Weight slider** — preview only, shows live "Contributes X of 100"

---

## Part 3 — Proposed fix plan

Bring the docs in line with the code. UI/copy only, no math changes.

### Phase A — Update Methodology page (`MVSMethodology.tsx`) — 1 turn
Edit Notes 1–5 and Section 5 to reflect reality:
1. Firecrawl cap: 50 total + sub-caps 25/15/15
2. Mark the 5-scrape cadence and Inngest/Trigger.dev row as **retired with Market Absorption**
3. Remove the registration-page screenshot line
4. Add a new note: **Freshness rules (0–30 skip, 31–60 prompt, >60 fresh, Force fresh override)**
5. Add a new note: **Soft-fail fallback** (`done_stale`, `fallback_data_date`, `failed_no_data`)
6. Rewrite the confidence note → per-pillar confidence (drop no-reg-page trigger)
7. Update Section 3 / Section 6 to describe the **Result / Evidence / Trust** card layout + proof popovers
8. Expand the eligible-category list from 12 → 19 (add dance, language, sports, swim, gymnastics, cooking, outdoor)
9. Replace the "QA queue confidence < 0.7 on week rows" line with the current QA reality (retired)

### Phase B — Add Market Validation section to User Guide (`userGuideMarkdown.ts`) — 1 turn
Write a plain-English section covering:
- What MVS is (1 paragraph)
- How to use the shortlist table (mark Pursue / Hold / Drop, export CSV)
- How to run or skip a crawl (Run button, freshness badge, Force fresh)
- How to read a deep-dive card (Result / Evidence / Trust)
- How to read the chips (sources hit, stale-score amber note, failure tooltip)
- How to open the Market Brief PDF

### Phase C — Optional cleanup — only if you want
- Hide `weekCount` in the deep-dive (legacy from absorption pillar)
- Confirm `mvs-classify-tier` classifier uses the same 19-category list as the scorer

### Risks
- Doc-only changes — zero scoring math touched
- No DB writes, no edge function changes
- Safe to ship one phase at a time

**Stop here for approval. Tell me which phase to start with (A, B, or both).**
