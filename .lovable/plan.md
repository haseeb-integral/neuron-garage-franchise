# City Search Rewire — Execution (Steps 3-7)

[For Haseeb — implementation]

Locked decisions from your Q&A:
- **Q1 market_type buckets:** Urban ≥ 3000/km², Suburb 500–3000, Rural < 500 (derived from `population_density`)
- **Q2 tier cutoffs:** A ≥ 80, B ≥ 65, C ≥ 50, D < 50 (from `composite_score_default`)
- **Q3 Add City:** hide the button (keep code in place; seed-on-demand edge function deferred)
- **Q4 Watchlist:** repoint `watchlist_items.city_id` to `us_cities_scored.id`; wipe existing rows on cutover (you have ~0 saved)

## Steps

### Step 3 — Rewire data source (`cities` → `us_cities_scored`)

Replace `.from('cities')` reads + column references in:
- `src/pages/CityScoring.tsx` (lines 776, 893 + selection state keyed on `us_cities_scored.id`)
- `src/lib/cityScoringLiveData.ts` (lines 123, 357, 375 — main loader + helpers)
- `src/components/city-scoring/MarketDetailDrawer.tsx` (line 202 detail fetch)
- `src/components/city-scoring/MarketsMap.tsx` (line 59 map pins)
- `src/components/city-scoring/MarketReportModal.tsx` (line 125 report fetch)

Column map applied per row read:
```
city_name        → city
state_name       → state (full)
state_abbr       → state code
population, latitude, longitude, metro_area → same
median_household_income           → median_income
children_5_12 / population * 100  → children_pct
public_elementary_count           → elementary_schools
summer_camp_count                 → competitor_count
composite_score_default           → composite_score
score_demand / score_pricing_power / score_competitive /
score_franchise_supply / score_ease_of_operation /
score_parent_mindset              → 6 category scores
!is_registration_state            → is_non_registration
scored_at                         → last_scraped_at
```

Derived client-side:
- `tier` = `score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D'`
- `market_type` from `population_density`: `>=3000 Urban`, `>=500 Suburb`, else `Rural`

### Step 4 — Watchlist + Compare id alignment

- Insert/select `watchlist_items.city_id` using `us_cities_scored.id`
- Migration: `DELETE FROM watchlist_items` (wipe stale legacy ids) — one-time
- Compare modal selection set keyed on new id

### Step 5 — Tier labels A/B/C/D

`TierBadge.tsx` + table render: `A — Top`, `B — Strong`, `C — Watch`, `D — Pass`.

### Step 6 — Show Formula modal

Pull from new `score_*` columns + active scoring config; same Σ(weight × normalized) breakdown.

### Step 7 — Cleanup + hide Add City

- Remove dead `from('cities')` calls + legacy helpers in `cityScoringLiveData.ts`
- Hide "Add City" button in `CityScoring.tsx` (comment out trigger; modal code stays)
- `AddCityModal.tsx` left untouched for future seed-on-demand wiring

### Step 8 — Brett-friendly Telegram message

Plain-English baby-step message you can copy/paste to Brett on how to grab the GreatSchools API free trial key. Posted at end of this turn (no code change).

### Step 9 — Doc-sync draft (Mode A)

One-line draft summaries for `PROJECT_CONTEXT.md`, `OPEN_TASKS.md`, `HOW_IT_WORKS.md`, `GLOSSARY.md` — wait for "go" before writing per AGENTS.md Rule 9.

## Risk + undo

Medium. Column mismatches mitigated by the map above. Reversible via Lovable history. One destructive op: `DELETE FROM watchlist_items` (you confirmed OK).

## Out of scope

SmartLead (waiting on Brett). Hidden live-fetch widgets. Scoring math changes. Add City seed-on-demand function.
