# Demographics Methodology

How Neuron Garage uses demographic data to rank cities and score teachers. This is the canonical reference for the team — read this before changing any scoring input, importing any new vendor table, or explaining a score to Kaylie or Brett.

---

## 1. The Core Idea

Demographics are **signals**, not scores.

A signal is a raw fact about a city or person: "812,000 elementary students," "median HH income $76,607," "12 years teaching K–3." A score is what *we* compute when we combine signals against a thesis about what makes a good franchise market or a good franchisee.

> **Vendors give us signals. We compute scores. Never the other way around.**

This applies identically to cities (City Search) and teachers (Teacher Search). The signal sets are different, but the discipline is the same.

---

## 2. City Demographics

### 2.1 The Universe
We rank the ~817 U.S. cities with population ≥ 50,000. The universe is seeded once from a third-party demographics export; our scoring layer lives in the `us_cities_scored` table.

### 2.2 The Signal Categories
Every city demographic falls into exactly one of three buckets, which mirror our 3 weighted scoring categories:

**A. Market Size — "How big is the opportunity?"**
- `population` — total residents
- `children_5_12` — direct addressable population for an elementary-age franchise
- `public_elementary_enrollment` — public K–5 students (direct market-size signal)
- `public_elementary_count`, `school_district_count` — operational reach

**B. Pricing Power / Parent Profile — "Will parents pay our price?"**
- `median_household_income` — baseline ability to pay
- `college_degree_pct` — academic-family proxy, correlates with enrichment spend
- `dual_working_families_pct` — willingness-to-outsource signal
- `cost_of_living_index` — normalizes income against local costs

**C. Competitive Landscape — "Who's already there?"**
- STEM-brand location counts (weighted 2.0×)
- General enrichment / camp brand counts (weighted 1.0×)
- Local provider estimate (modeled from enrollment)

See **CSI Methodology** in the sidebar for the full Competitive Saturation Index formula.

> Removed 2026-05-22: `avg_camp_price_per_hour`, `school_hosted_camp_count`, `summer_weather_index`, `avg_peak_summer_temperature`, `days_above_90f`, `summer_precip_days` — none of these belong to a live category. DB columns preserved; UI no longer surfaces them.

### 2.3 How Signals Become a Score
```
metric_share    = sub_weight_i / Σ(enabled sub-weights) × 100
category_score  = Σ(metric_share × normalized_metric_value)
composite_score = Σ(master_share × category_score)
```

Every "Show Formula" affordance in the UI exposes exactly this math. If a metric is missing for a city, it falls out of the denominator — it does **not** contribute a zero.

### 2.4 One Composite Per City Per Render
Every composite score, tier badge, and formatted score string rendered to the user is minted by a single `MarketView` source (`src/lib/marketView.ts`). Components never compute, never re-derive, and never round composite scores inside JSX. A dev-mode drift detector throws a red console error if the same `(cityId, weightsHash)` ever mints two different composites in one render pass. This rule exists because we previously shipped a bug where one table cell showed `88` and a gauge above it showed `23` for the same city — two formulas, one label.

### 2.5 What We Refuse to Import
- Vendor-computed city scores or ranks. They can ride along as a *signal* but never as our composite.
- State-level numbers presented as city-level (e.g., BLS "STEM %" and BEA "metro income" aggregates imported as `null`, then backfilled at the correct geography).
- Anything redundant with what we already source live (Census ACS, BLS, BEA, FRED, NCES CCD).

---

## 3. Teacher Demographics (Fit Score Inputs)

### 3.1 The Universe
The `teacher_prospects` table. Rows come primarily from Apollo (active teachers with contactable email) plus Apify scrapes and CSV imports. Vendor exports are the row universe — our schema owns the scoring layer.

### 3.2 The Signal Categories
Every teacher demographic falls into one of three buckets that feed Fit Score:

**A. Professional Fit — "Right kind of educator?"**
- `teacher_type` — `active` | `retired` | `camp_enrichment` (locked enum; do not extend without a meeting decision)
- `grade_levels`, `subjects_taught` — K–6 elementary alignment
- `years_experience` — pattern recognition, classroom credibility
- `current_role`, `school_type` — public / private / charter

**B. Entrepreneurial Signal — "Could they run a franchise?"**
- Side projects, secondary income roles (DonorsChoose activity, tutoring sites)
- Leadership titles (dept head, grade chair, principal)
- Continuing education, certifications beyond baseline
- Geographic mobility / recent moves

**C. Reachability & Local Fit — "Can we contact them, and do they live where we need them?"**
- `email`, `verification_status` (`valid` / `catch_all` / `invalid` / `unknown`)
- `city`, `state` — must match a Tier A/B target market
- Phone, LinkedIn, last-active signals
- `enrichment_provider`, `enrichment_cost_cents` — provenance

### 3.3 Fit Score
Fit Score (1–100) is computed by *our* engine over the three category signals. Vendor scores from Apollo or any future provider never become Fit Score directly — they are inputs only.

### 3.4 Identity / Pipeline Columns (not scored)
`first_name`, `last_name`, `import_batch_id`, `dedupe_key`, `status` (master pool ↔ SmartLead state), `last_pushed_at`, `smartlead_lead_id`. Pipeline state lives here, not in vendor tables.

The Teacher Search push flow uses both the internal `teacher_prospects.id` and the SmartLead `smartlead_lead_id` separately — they are not interchangeable, and the UI now enforces this distinction end-to-end.

---

## 4. Shared Principles (cities AND teachers)

### 4.1 Name-vs-Meaning
Before pointing any signal at a column, re-read the column name. If the new contents would mislead a future reader (e.g., loading all K–12 schools into `public_elementary_count`), the **rename ships in the same change** — not as a follow-up task. The same rule applies to scope words like *elementary*, *active*, *verified*, *public*, *primary*: if you stop honoring the qualifier, the qualifier must leave the name. Origin: a near-miss where `public_elementary_count` was about to be populated with all K–12 schools.

### 4.2 Signal Provenance
Every signal carries:
- `source` — `census` / `bls` / `bea` / `nces` / `apollo` / `apify` / `firecrawl` / `pre-seeded`
- `source_url` when applicable
- `updated_at`

Provenance is visible in the UI's Source Data panel. If a user can't see where a number came from, the panel is broken — fix the panel, don't hide the number.

### 4.3 Recompute, Don't Trust
For any vendor signal at the wrong geography or staleness, import as `null` and backfill from our own pipeline. Examples:
- State-level BLS percentages presented as city-level → recompute from BLS at MSA
- Vendor "median income" that's actually metro-level when we need city-level → recompute from ACS
- Cached Apollo title strings older than 6 months → re-enrich

### 4.4 Missing Data ≠ Zero
A null signal falls out of the weighted denominator. It never silently contributes a zero. The UI shows `—` so the user can tell what's missing vs. what's actually low.

### 4.5 The "Show Formula" Contract
Every score, sub-score, and ranked list must surface a "Show Formula" affordance that lists:
1. Which signals fed the number
2. Each signal's weight (master share × sub share)
3. The normalized value used
4. The arithmetic

No exceptions. If you can't explain it, it doesn't ship.

### 4.6 Failed Fetches Get A Retry Button, Not A Blank Screen
Data-heavy surfaces (City Search ranked markets, Teacher Prospects, Candidate Pipeline) use a shared `QueryErrorState` component that renders a friendly error card with a Retry button when a backend query fails. A failure never silently degrades to an empty list.

---

## 5. Adding a New Demographic Signal

When a teammate (or a future you) wants to add a new signal — say, "let's score on number of children's hospitals per metro" — run this checklist:

1. **Which entity does it describe?** City or teacher. Pick one. Cross-entity signals live in a junction table, not on either entity.
2. **Which of the 3 categories does it feed?** If you can't pick one, it probably isn't a scoring signal — it's a filter or context column.
3. **What's the geography?** City, metro, county, ZIP, state. Mismatched geography is the #1 cause of bad scores. Recompute or reject.
4. **What's the source?** Live API we already wired, or a new vendor? New vendors get a Universe Audit + Column Triage + Name-vs-Meaning check + idempotent upsert + a separate re-score pass. No `TRUNCATE`, no parallel vendor tables, no vendor scores in our composite.
5. **Name-vs-Meaning.** Pick a column name that survives the next reader. Include scope qualifiers (`public_`, `active_`, `verified_`).
6. **Default weight.** Brett or Kaylie sets this. Do not invent.
7. **Update this doc.** New signal → new bullet in the right section.

---

## 6. Anti-Patterns We Have Already Caught

- **Loading K–12 totals into `public_elementary_count`** — caught before shipping; origin of the Name-vs-Meaning rule.
- **Treating vendor state-level STEM % as a city signal** — imported as null instead, backfilled from the right geography.
- **Hardcoded sample numbers leaking into the live ranked list** when a DB row existed but had no score — fixed in `cityScoringLiveData.ts:dedupeRankedMarkets` (live always wins over sample).
- **Vendor pre-computed "score" columns presented as our composite** — refused at import.
- **Synthetic `campaign_cache` rows usable as push targets** on the Teacher Search side — fixed via real-id filtering and the dual-ID separation in §3.4.
- **One city, two different scores in one render** — fixed by routing every composite through the single `MarketView` source (§2.4).
- **Silent cache layer (`pageCache`) masking stale data** — deleted; the app now relies on TanStack Query as the single cache.

If you find a new one, add it here and tell Haseeb or Brett.

---

## 7. Where This Lives In The App

- **City Search** — the ranked markets table, city detail drawer, and weight sliders all consume the rules above. Click "Show Formula" on any composite score to see §2.3 applied to that city.
- **Teacher Search** — Fit Score badges, filters, and the prospect detail panel apply §3 directly.
- **CSI Methodology** (sidebar) — the full Competitive Saturation Index formula referenced in §2.2.C.
