# City Search Methodology

How Neuron Garage ranks U.S. cities for franchise development. This is the canonical reference — read this before changing any weight, importing any new signal, or explaining a city score to Brett, Haseeb, or Sam.

---

## 1. The Core Idea

City Search answers one question: **"Which U.S. cities are the best next markets for a Neuron Garage franchise?"**

We do this by combining public data (Census, NCES, our own crawls) into a single **Composite Score (0–100)** per city, then bucketing cities into tiers (A / B / C / D). The score is a weighted blend of three pillars that reflect what actually makes a market work for us.

> **One calibrated number everywhere.** Every surface — table rows, the score popover, the selected-market panel, compare modal, exports — reads pillar and composite scores from the same recomputed helper (`src/lib/recomputedPillars.ts`). We never show stale DB-stored scores.

---

## 2. The Universe

- **~817 U.S. cities** with population ≥ 50,000.
- Seeded once from a third-party demographics export into `us_cities_scored`.
- Refreshed on a schedule for public signals (Census ACS, NCES) and on-demand for competitive signals (crawls).
- Cities below the population floor are excluded — too small to support the model.

---

## 3. The Three Pillars

Every city score is built from three pillars. Each pillar is 0–100. The Composite Score is a weighted average.

### A. Market Size — "How big is the opportunity?"
How many kids, how many families, how much reach.

Key signals:
- `population` — total residents
- `children_5_12` — direct addressable population (elementary age)
- `public_elementary_enrollment` — K–5 students in public schools
- `public_elementary_count` — number of public K–5 schools
- `private_elementary_count` — number of private K–5 schools (NCES PSS)
- `school_district_count` — operational reach

### B. Pricing Power — "Will parents pay our price?"
Can the local parent base afford and value our program.

Key signals:
- `median_household_income` — baseline ability to pay
- `affluent_families_pct` — share of households at franchise price point
- `college_degree_pct` — academic-family proxy (correlates with enrichment spend)
- `dual_working_families_pct` — willingness-to-outsource signal
- `cost_of_living_index` — normalizes income against local costs

### C. Competitive Landscape — "Who's already there?"
How crowded the market is with direct and adjacent competitors.

Key signals:
- STEM-brand location counts (Code Ninjas, Mathnasium, Kumon, etc.) — weighted higher for direct competitors
- Adjacent enrichment brands (tutoring, robotics)
- Distance to nearest competitor

More competitors → lower pillar score. Zero competitors is not automatically best — it can also mean the market has been tried and failed.

---

## 4. The Formula

```
Composite Score = (Market Size × w_market)
                + (Pricing Power × w_pricing)
                + (Competitive × w_competitive)
```

- Default weights are set in `src/hooks/useScoringConfig.ts` and shown in the UI weight sliders.
- Weights always sum to 100%.
- Each pillar is normalized 0–100 before weighting so the blend is apples-to-apples.
- Users can adjust weights live; every dependent surface recomputes from the same helper.

### Tiers

| Tier | Composite Score | Meaning |
|------|-----------------|---------|
| A | 80–100 | Strong candidate — advance to Market Validation |
| B | 65–79 | Good candidate — worth deeper look |
| C | 50–64 | Marginal — needs a specific reason to pursue |
| D | 0–49 | Skip |

Tier thresholds live in `src/lib/cityTiers.ts`.

---

## 5. Missing Data Handling

- If a pillar is missing **any critical signal**, the pillar is flagged and the composite is marked **low-confidence** in the UI (badge on the row).
- We never silently substitute zero for missing data — a zero would look like "worst possible" and unfairly rank the city.
- Missing signals show as "—" in the UI, not "0".
- Backfill jobs (`backfill-census-gaps`, `backfill-affluent-families`, `backfill-public-schools`) fill gaps on a schedule.

---

## 6. What We Refuse to Import

We only import signals we can source, refresh, and defend. We say **no** to:

- Vendor "scores" or "indexes" that we can't reproduce from raw signals.
- Any signal without a documented source and refresh cadence.
- Composite fields from third parties — we compute our own composite from raw signals only.

> **Vendors give us signals. We compute scores. Never the other way around.**

---

## 7. Sources

| Signal group | Source | Refresh |
|--------------|--------|---------|
| Population, income, education, dual-income | U.S. Census ACS 5-year | Annual |
| Public schools, enrollment, districts | NCES CCD | Annual |
| Private elementary schools | NCES Private School Universe (PSS) | Biennial |
| Charter schools | NCES CCD (`is_charter = true`) | Annual |
| STEM / enrichment competitors | Our own crawls + Manus batches | On-demand |
| Cost of living | Third-party COL index | Annual |

---

## 8. Related Docs

- [City Search Spec](/city-search-spec) — full engineering specification
- [City Search Guide](/city-search-guide) — end-user walkthrough
- [Scoring Method](/scoring-method) — pillar math and weight config internals
- [Demographics Methodology](/demographics-methodology) — how demographic signals are chosen and validated
- [MVS Methodology](/mvs-methodology) — what happens *after* a city passes City Search
- [Glossary](/glossary) — every term used above

---

*Last reviewed: July 2026. Owner: Brett / Sam / Haseeb (any approver).*
