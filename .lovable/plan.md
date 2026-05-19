
## Ground truth (confirmed against the database)

Austin row in `us_cities_scored` (id `9241bf5b-…`):
- 8 pre-seeded scalar columns with real values + 1 derived (`children_5_12_pct`).
- 5 pre-seeded rows in `city_market_signals` keyed to the scored-city UUID (weather + PSS).
- 0 competitor rows on the scored UUID.
- 6 OLD job rows tied to legacy `cities.id` from May 12–13 (the discarded live-fetch system).
- 1 row in `custom_criteria` ("NEW DEMAND METRIC", weight = 0).
- Registry total = 46 metrics (36 enabled for scoring, 10 tracked-not-scored, 2 marked `blocked`).

## What the screenshot numbers really mean (and why each is wrong/misleading)

| Chip | What it actually is | What's wrong |
|---|---|---|
| **2 Live** | 2 weather rows in `city_market_signals` keyed to `us_cities_scored.id`, no explicit status flag → drawer assumes "live". | The 7 other metrics that ALSO have real backend values come from the seeded-fallback builder which always stamps `proxy` → "Estimated". So "Live vs Estimated" is meaningless — both are pre-seeded. |
| **7 Estimated** | 7 pre-seeded scalar columns with values. | They are not estimates, they are pre-seeded. |
| **35 Missing** | 46 − 9 with values − 2 blocked. Math correct. | "Missing" implies broken; reality is "no source wired yet" (Apify nationwide scrape, GreatSchools, BLS OEWS — all explicitly pending in OPEN_TASKS). |
| **2 Blocked** | The 2 `blocked`-status parent-mindset metrics. | Correct. |
| **1 Custom** | The saved custom Demand metric. | **Keep — show as-is per your decision.** |
| **"7/12 wired · 12 total · 1 custom"** | 7 demand rows with a value out of 12 enabled. | Math is right. Label is unclear and `12 total` mixes scored + non-scored. |
| **"Legacy audit exists from May 13, 9:29 PM…"** | Drawer is still reading `city_fetch_jobs` rows tied to OLD `cities.id`. | We discarded the legacy system. The drawer should never query `cities` or its jobs again. |
| **"Not refreshed yet"** | `latestJob.completed_at` is null because there's no canonical job row tied to the scored UUID. | Misleading: pre-seeded data has no "refresh" event. Label should describe the seed run, not a refresh job. |

There is also a real name-vs-meaning bug: the weather seeder writes `days_above_90f`, but the registry asks for `days_above_100f`, so that row will always show "Missing".

## What I will change

### 1. Drawer: kill all legacy reads ("Hide everywhere")
`src/components/city-scoring/MarketDetailDrawer.tsx`
- Delete the `cities` table lookup, `legacyJobRows` Promise, `legacyJob` state, and both "Legacy audit…" sentences.
- Drawer reads only `city_market_signals` and `city_fetch_jobs` keyed to `us_cities_scored.id`.

`src/pages/CityScoring.tsx` (~lines 926–955)
- In `loadLiveData`, remove the `cities` bridge and `evidenceIds = [scoredRow.id, legacyId]` fallback. Query only by `scoredRow.id`. Drop `legacy_city_id` on `cityRow`.

### 2. Replace the wrong "Live/Estimated/Missing/Blocked" chip model
Today the chip model conflates "where the row was stored" with "how the value was sourced". New chip row reflects what the data actually is:

```text
Pre-seeded value: 9   Tracked-not-scored: 0   Not seeded yet: 35   Source unavailable: 2   Custom: 1
                                                                                                  of 46 scoring metrics
```

Rules:
- **Pre-seeded value** = enabled registry metric with (a non-null `us_cities_scored` scalar) OR (a `city_market_signals` row on the scored UUID).
- **Tracked-not-scored with value** = `enabled=false` metrics that have a value.
- **Not seeded yet** = enabled metrics with no value and registry status ≠ `blocked`.
- **Source unavailable** = registry status = `blocked`.
- **Custom** = count of rows in `custom_criteria` for this user (kept visible regardless of weight — per your latest decision).
- Denominator stays at 46 (registry size). Custom metrics are shown as an additive chip, not folded into the denominator.

### 3. Replace "Refresh Summary" block with "Seed Coverage"
Overview tab:
- Heading "Refresh Summary" → **"Seed Coverage"**.
- Replace the 6-tile grid with: Pre-seeded value, Tracked-not-scored with value, Not seeded yet, Source unavailable, Custom metrics, Total scoring metrics (46), Last seeded at (= `us_cities_scored.scored_at`).
- Remove the confusing "Live / Estimated / Manual / Blocked / Missing / Registry metrics with value / …" tiles.

### 4. Replace "Not refreshed yet" with seed timestamp
Top blue panel:
- "Latest canonical refresh: …" → **"Last seeded: {us_cities_scored.scored_at formatted}"**; "Seed pending" if null.
- Remove the duplicated "Austin currently has X of 46 registry metrics…" sentence.

### 5. Disabled / non-scored metrics → separate collapsed section
- In each category card, render `enabled === true` rows by default.
- Below them, a collapsible: **"Tracked, not used in scoring ({N})"** that lists disabled rows.
- Category header counter changes from `7/12 wired · 12 total · 1 custom` to:
  - **"{N_with_value} of {N_enabled} scoring metrics have a value"** — plain English, no "wired".
  - Collapsible carries `+{N_tracked_not_scored} tracked-only metrics · {N_custom} custom`.

### 6. Per-row status badge cleanup
- Replace per-row `Live / Estimated / Missing / Blocked` pills with:
  - **Pre-seeded** (value present) · **Not seeded** (value null) · **Source unavailable** (registry says blocked).
  - Keep the "✓ Counts" / "Info only" pill (already honest).
- Stop showing the "Missing" pill when the registry says blocked.

### 7. Custom metrics — keep all of them visible (revised)
- **Do not filter by weight.** The saved Demand custom metric (weight 0 included) renders in the Demand card as before.
- Add a clarifying micro-label next to any custom row whose `weight === 0`: **"(weight 0 — not contributing to score yet)"**. This keeps audit transparency without hiding the row.
- The Custom chip in the top counts shows the total custom metric count for the user.

### 8. Fix `days_above_90f` vs `days_above_100f` name-vs-meaning bug
Per AGENTS.md rule #10 — the seeded value is 90°F days, not 100°F days.
- Rename the registry entry from `days_above_100f` → `days_above_90f` in `src/lib/sowMetricRegistry.ts` AND `supabase/functions/_shared/scoring.ts`. Update label to "Number of 90°+ Days".
- Austin's already-seeded value lights up immediately; one false "Missing" disappears.
- Not recomputing weather. Separate decision.

## Files I will edit

```text
src/components/city-scoring/MarketDetailDrawer.tsx   (counts, labels, sections, legacy removal, custom row caveat)
src/pages/CityScoring.tsx                            (kill legacy bridge in loadLiveData)
src/lib/sowMetricRegistry.ts                         (rename days_above_100f → days_above_90f)
supabase/functions/_shared/scoring.ts                (matching rename — name-vs-meaning)
```

No DB migration. No edge deploy. No new APIs. No change to scoring math or registry membership.

## Out of scope

- Scoring math (Sam-only).
- Backfilling new metric data (`OPEN_TASKS` B7/B9/B10a).
- Deleting legacy `cities` / `city_fetch_jobs` rows at the DB layer — UI just stops reading them. Cleanup remains `OPEN_TASKS B5`.

## Doc-sync (Mode A — will draft after approval, will NOT write without your "go")

- `PROJECT_CONTEXT.md` — drawer is now pre-seed-only, no legacy reads.
- `HOW_IT_WORKS.md` — "Refresh Summary" → "Seed Coverage" language.
- `GLOSSARY.md` — add "Pre-seeded / Not seeded yet / Tracked-not-scored / Source unavailable"; deprecate the old Live/Estimated/Missing labels.
- `OPEN_TASKS.md` — flag B5 (drop legacy `cities` table) as higher priority.

You'll see one-line summaries before any doc file is written.

## Expected Austin numbers AFTER the fix (sanity check)

- Top chips: **Pre-seeded 9 · Tracked-not-scored 0 · Not seeded yet 35 · Source unavailable 2 · Custom 1 · of 46 scoring metrics**.
- Top text: **"Last seeded: May 18, 2:54 PM"**. No "Legacy audit…" text.
- Demand card header: **"7 of 12 scoring metrics have a value · +1 custom"**. Custom Demand row visible with "(weight 0 — not contributing to score yet)" caveat. After step 8 ships, the `days_above_90f` row also lights up → "8 of 12".
- Each metric row shows **Pre-seeded** + value, **Not seeded** + "No backend value for Austin yet", or **Source unavailable**.
