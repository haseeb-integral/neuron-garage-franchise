## Goal

Cut every live read and write of `city_market_signals` so the table becomes a true orphan. Until we drop it, no UI component, drawer, scoring path, edge function, or export touches it. Drop the table in a final cleanup step once the app is verified clean.

This is a **read/write severance plan**, not a redesign. All replacement data already exists on `us_cities_scored` and is already exposed through `buildSeededFallbackSignalsFromScored(...)`.

---

## Current usage (what we are cutting)

**Frontend reads (5):**
1. `src/pages/CityScoring.tsx:766` — composite override loader (reads `signal_key,value` for visible city ids)
2. `src/pages/CityScoring.tsx:954` — `loadLiveData` selects `*` for the open city → feeds `liveSignals` state
3. `src/pages/CityScoring.tsx:1090` — CSV export loader (reads `signal_key,value` per city)
4. `src/components/city-scoring/MarketDetailDrawer.tsx:295` — Live evidence in the drawer; merged with fallback
5. `src/components/city-scoring/MarketReportModal.tsx:163` — Market Report Modal evidence list
6. `src/components/city-scoring/MarketCompareModal.tsx:74` — Compare modal evidence
7. `src/lib/cityScoringLiveData.ts:410` — `getCitySourceData` — Source Data panel coverage rows

**Edge function writes (2):**
8. `supabase/functions/fetch-school-counts/index.ts:171` — upserts CCD school counts
9. `supabase/functions/seed-cities-weather/index.ts:136` — upserts weather metrics

Everything in `supabase/migrations/**` and `src/data/specMarkdown.ts` is historical / documentation and is fine to leave referencing the table by name.

---

## Replacement strategy (no new tables, no new APIs)

`buildSeededFallbackSignalsFromScored(scoredRow, childrenPct)` already synthesizes `LiveSignal[]` rows directly from `us_cities_scored` columns. Every consumer that currently does `(rows ?? fallback)` will simply become `fallback` — same shape, same `signal_key` set, same UI.

### Per-call-site change

| # | File | Change |
|---|---|---|
| 1 | `CityScoring.tsx` composite override loader | Drop the `signals` query. Build `sigByCity` from each visible `scoredRow` via `buildSeededFallbackSignalsFromScored`. |
| 2 | `CityScoring.tsx` `loadLiveData` | Replace the `*` query with `buildSeededFallbackSignalsFromScored(scoredRow)`. Cache + `setLiveSignals` unchanged. |
| 3 | `CityScoring.tsx` CSV export | Same as #1 — build per-city signal map from each scored row. |
| 4 | `MarketDetailDrawer.tsx` | Delete the query block. `setSignals(buildSeededFallbackSignals(market))`. Drop the merge logic. |
| 5 | `MarketReportModal.tsx` | Same — fallback becomes the sole source. |
| 6 | `MarketCompareModal.tsx` | Replace query with per-city `buildSeededFallbackSignalsFromScored(market.scoredRow)`. |
| 7 | `cityScoringLiveData.ts` `getCitySourceData` | Source Data panel will derive coverage from the scored row's `*_last_updated` columns (`census_last_updated`, `bls_last_updated`, `apify_last_updated`, `firecrawl_last_updated`, etc.). Drop the `city_market_signals` query entirely. Row count column becomes the count of seeded signals for that source from the fallback signal list. |
| 8 | `fetch-school-counts/index.ts` | Stop the `city_market_signals` upsert. The function already writes the same numbers to `us_cities_scored` columns (`public_elementary_count`, `public_elementary_teacher_count`, `public_elementary_enrollment`) — verify and keep only that path. |
| 9 | `seed-cities-weather/index.ts` | Stop the `city_market_signals` upsert. Weather metrics already land in `us_cities_scored` columns (`summer_precip_days`, `days_above_90f`, `avg_peak_summer_temperature`, `summer_weather_index`) — verify and keep only that path. |

No scoring math changes. The TAM "Show Formula" drawer already uses `buildSeededFallbackSignalsFromScored` after the last fix.

---

## Verification before dropping the table

After the code change, run a grep to prove zero live references:

```
rg "city_market_signals" src/ supabase/functions/
```

Expected: empty (or comments only). Then manually click through:

- City Search list (composite recompute works, sliders move scores)
- Open any city → Market Detail Drawer → Live values / Show Formula
- Open Market Report modal
- Compare 2 cities modal
- Export CSV
- Source Data panel still shows per-source freshness

If all green, proceed to the drop migration.

---

## Drop migration (last step, only after the user says "go drop")

```sql
DROP TABLE IF EXISTS public.city_market_signals CASCADE;
```

This is gated. Will be a separate single-statement migration so it can be reviewed and reverted independently of the code changes.

---

## Risk and rollback

- **Risk:** Low. Replacement helper already exists and is in use today; we are removing one read path and replacing with another that the same components already use as a fallback.
- **Rollback:** Revert the 7 frontend / 2 edge function edits. No schema change in the severance step. The drop is a separate, later migration.

---

## Doc-sync (draft only, not written until user says "go docs")

- `PROJECT_CONTEXT.md` — remove `city_market_signals` from the live tables list; note severance + future drop.
- `HOW_IT_WORKS.md` — replace "evidence rows come from `city_market_signals`" with "evidence rows come from `us_cities_scored` via `buildSeededFallbackSignalsFromScored`".
- `APIS.md` — remove the `city_market_signals` write destinations from `fetch-school-counts` and `seed-cities-weather`.
- `OPEN_TASKS.md` — close "Drop legacy `city_market_signals`" once the drop migration ships.
- `GLOSSARY.md` — mark `city_market_signals` as deprecated → removed.
- Per Rule 11 / Name-vs-Meaning: nothing to rename; the table goes away entirely.

---

## Order of execution (when you approve)

1. Sever 7 frontend reads (one PR-equivalent change).
2. Sever 2 edge-function writes; redeploy auto.
3. Run the verification grep + click-through.
4. Report back to you with confirmation + console screenshots if anything unexpected.
5. Wait for your explicit "drop it" → ship the `DROP TABLE` migration.
6. Wait for your "go docs" → update the 5 docs.