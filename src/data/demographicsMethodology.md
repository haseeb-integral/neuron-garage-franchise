# Demographics Methodology

How Neuron Garage uses demographic data to rank cities and score teachers. This is the canonical reference for the team — read this before changing any scoring input, importing any new vendor table, or explaining a score to Sam or Kaylie.

**Status:** canonical. Pairs with `TPD.md` (Third-Party Data Playbook) and `AGENTS.md` Rule 11.

---

## 1. The Core Idea

Demographics are **signals**, not scores.

A signal is a raw fact about a city or person: "812,000 elementary students," "median HH income $76,607," "12 years teaching K–3." A score is what *we* compute when we combine signals against a thesis about what makes a good franchise market or a good franchisee.

> **Vendors give us signals. We compute scores. Never the other way around.**

This applies identically to cities (City Search) and teachers (Teacher Search). The signal sets are different, but the discipline is the same.

---

## 2. City Demographics

### 2.1 The Universe
We rank the ~817 U.S. cities with population ≥ 50,000. The row universe comes from the Manus seed table (see `TPD.md` for how it was imported). Our scoring layer lives in `us_cities_scored`.

### 2.2 The Signal Categories
Every city demographic falls into exactly one of three buckets, which mirror our 3 weighted scoring categories:

**A. Market Size — "How big is the opportunity?"**
- `population` — total residents
- `children_5_12` — direct addressable population for an elementary-age franchise
- `public_elementary_enrollment` — public K–5 students (Manus's "direct market size signal")
- `public_elementary_count`, `school_district_count` — operational reach

**B. Pricing Power / Parent Profile — "Will parents pay our price?"**
- `median_household_income` — baseline ability to pay
- `college_degree_pct` — academic-family proxy, correlates with enrichment spend
- `dual_working_families_pct` — willingness-to-outsource signal
- `cost_of_living_index` — normalizes income against local costs
_Removed 2026-05-22: `avg_camp_price_per_hour`, `school_hosted_camp_count`, `summer_weather_index`, `avg_peak_summer_temperature`, `days_above_90f`, `summer_precip_days` — none of these belong to a live category (Demand / Competitive Landscape / TAM Teachers). DB columns preserved; UI no longer surfaces them._

### 2.5 How Signals Become a Score
Per AGENTS.md Rule 5:

```
metric_share        = sub_weight_i / Σ(enabled sub-weights) × 100
category_score      = Σ(metric_share × normalized_metric_value)
composite_score     = Σ(master_share × category_score)
```

Every "Show Formula" affordance in the UI exposes exactly this math (Rule 1). If a metric is missing for a city, it falls out of the denominator — it does NOT contribute a zero.

### 2.6 What We Refuse to Import
- Vendor-computed city scores or ranks. They can ride along as a *signal* but never as our composite.
- State-level numbers presented as city-level (e.g., Manus's "STEM %" and "metro income" are BLS/BEA state aggregates — imported as `null`, backfilled at correct geography).
- Anything redundant with what we already source live (Census ACS, BLS, BEA, FRED, NCES CCD).

---

## 3. Teacher Demographics (Fit Score Inputs)

### 3.1 The Universe
`teacher_prospects`. Rows come primarily from Apollo (active teachers with contactable email) plus Apify scrapes and CSV imports. Per `TPD.md`, vendor tables are the universe; our schema owns the scoring layer.

See `TEACHER_IDEAL_PROFILE.md` for the full franchisee profile and Apollo query templates.

### 3.2 The Signal Categories
Every teacher demographic falls into one of three buckets that feed Fit Score:

**A. Professional Fit — "Right kind of educator?"**
- `teacher_type` — `active` | `retired` | `camp_enrichment` (locked enum, see AGENTS.md)
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

---

## 4. Shared Principles (cities AND teachers)

### 4.1 Name-vs-Meaning (AGENTS.md Rule 10)
Before pointing any signal at a column, re-read the column name. If the new contents would mislead a future reader (e.g., loading all K–12 schools into `public_elementary_count`), the **rename ships in the same change**.

### 4.2 Signal Provenance
Every signal carries:
- `source` — `census` / `bls` / `bea` / `nces` / `apollo` / `apify` / `firecrawl` / `manus` / `pre-seeded`
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

Sam will reject anything that hides this. Rule 1, no exceptions.

---

## 5. Adding a New Demographic Signal

When a teammate (or a future you) wants to add a new signal — say, "let's score on number of children's hospitals per metro" — run this checklist:

1. **Which entity does it describe?** City or teacher. Pick one. Cross-entity signals live in a junction table, not on either entity.
2. **Which of the 3 categories does it feed?** If you can't pick one, it probably isn't a scoring signal — it's a filter or context column.
3. **What's the geography?** City, metro, county, ZIP, state. Mismatched geography is the #1 cause of bad scores. Recompute or reject.
4. **What's the source?** Live API we already wired, or a new vendor? If new vendor, run `TPD.md`.
5. **Name-vs-Meaning.** Pick a column name that survives the next reader. Include scope qualifiers (`public_`, `active_`, `verified_`).
6. **Default weight.** Sam sets this. Do not invent.
7. **Update this doc.** New signal → new bullet in the right section. Doc-sync per AGENTS.md Rule 9.

---

## 6. Anti-Patterns We Have Already Caught

- **Loading K–12 totals into `public_elementary_count`** (caught May 18 — origin of Rule 10).
- **Treating Manus state-level STEM % as a city signal** (caught May 21 — imported as null instead).
- **Hardcoded sample numbers leaking into the live ranked list** when a DB row existed but had no score (fixed in `cityScoringLiveData.ts:dedupeRankedMarkets` — live always wins over sample).
- **Vendor pre-computed "score" columns presented as our composite.** Refused at import per `TPD.md` §4.
- **Synthetic campaign_cache rows usable as push targets** (Teacher Search side — fixed via real-id filtering).

If you find a new one, add it here and tell Haseeb.

---

## 7. Cross-References

- `TPD.md` — how external enriched tables (Manus, Apollo, Apify) become signals
- `AGENTS.md` — Rules 1, 5, 9, 10, 11 all touch this doc
- `DATABASE_LAYER_SPEC.md` — column-level schema for `us_cities_scored` and `teacher_prospects`
- `TEACHER_IDEAL_PROFILE.md` — the thesis behind Fit Score
- `GLOSSARY.md` — Fit Score, Tier A, Non-registration state, Composite Score, Master/Sub Weight
