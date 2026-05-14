# Perfect SOW coverage: registry-driven drawer + key alignment + counter fixes

Goal: drawer truthfully reports SOW coverage against the 46-metric registry, fetcher writes registry-canonical keys, scoring math and CSV export keep working unchanged, and every consumer reads the same key vocabulary.

This bundles **B + C + the related items** into one coherent change so we don't end up with two key vocabularies in the codebase.

## Phases (each is independently safe to ship)

```text
Phase 1  →  Frontend drawer (Option B)            [safe, reversible]
Phase 2  →  Fetcher key rename + alias retention  [safe, alias keeps old data readable]
Phase 3  →  Scoring + CSV alignment               [must ship together with Phase 2]
Phase 4  →  Cleanup (remove alias map, sweep)     [after one good refresh cycle]
```

---

## Phase 1 — Drawer is registry-driven

**File:** `src/components/city-scoring/MarketDetailDrawer.tsx`

- Iterate `METRICS_BY_CATEGORY[cat]` from `src/lib/sowMetricRegistry.ts` to render rows. **Every** registry metric renders, even with no DB row.
- Match DB row to registry by exact `signal_key`, falling back to a small inline alias map (kept in `src/lib/signalAliases.ts`, shared with Phase 3):

```text
children_5_12_count            ← children_population_proxy
income_100k_plus_pct           ← income_100k_plus_proxy
education_bachelors_plus_pct   ← education_bachelors_plus_proxy
dual_income_household_pct      ← dual_income_pct
young_family_growth_rate       ← young_families_growth_5yr
commute_sprawl_index           ← long_commute_pct
montessori_school_density      ← montessori_count
stem_robotics_maker_camp_count ← stem_enrichment_count
summer_camps_per_10k_children  ← competitor_count   (proxy)
```

- Per-row status (truthful): **Live** (DB row + non-empty + registry status `live`), **Proxy** (DB row + non-empty + registry status `proxy` OR alias-matched), **Missing** (no row or empty — render dimmed with registry `description` + "Not collected yet"), **Blocked** (registry status `blocked` — muted "Source unavailable").
- Move registry rows where `enabled: false` into a collapsed "Not in current scoring model" sub-list per category.
- Replace header counter with: `{live} live · {proxy} proxy · {missing} missing · {blocked} blocked of 46 SOW metrics` plus separate `+ {customCount} custom criteria`.
- Hide diagnostics (`data_readiness`, `bls_data_readiness`, `census_data_readiness`, `firecrawl_source_pages`, `education_labor_market_proxy`) from the metric view; surface them in a "Fetcher diagnostics" collapsible at the bottom. Kills "Other Signals."

**Risk:** low. Single file. Counter numbers will drop from "22 live / 0 missing" to roughly "13 live / 5 proxy / 27 missing / 1 blocked" — that's the point.

---

## Phase 2 — Fetcher writes registry-canonical keys

**Files:** `supabase/functions/fetch-city-market-data/index.ts`, `supabase/functions/fetch-city-market-data-sow/index.ts`, `supabase/functions/fetch-school-counts/index.ts`

Rename `signal_key` literals in the upsert payloads to the registry names per the alias map above. Examples:

```text
children_population_proxy        → children_5_12_count
income_100k_plus_proxy           → income_100k_plus_pct
education_bachelors_plus_proxy   → education_bachelors_plus_pct
dual_income_pct                  → dual_income_household_pct
young_families_growth_5yr        → young_family_growth_rate
long_commute_pct                 → commute_sprawl_index
montessori_count                 → montessori_school_density
stem_enrichment_count            → stem_robotics_maker_camp_count
```

Keep `competitor_count` as-is (it's a count, not the registry's `summer_camps_per_10k_children` rate; we'll surface it as the proxy via alias in the drawer until a true rate calculation is added).

Also: stop writing diagnostics into `city_market_signals`. Move `data_readiness`, `bls_data_readiness`, `census_data_readiness`, `firecrawl_source_pages` into `city_fetch_jobs.response_summary` JSON instead. Drawer reads them from there for the "Fetcher diagnostics" panel.

**Backfill:** no migration needed. After deploy, the next refresh of any city writes the new keys (upsert by `(city_id, signal_key)`). Existing old-key rows stay until a one-shot SQL cleanup (Phase 4). The Phase 1 alias map keeps the drawer correct in the meantime.

**Risk:** low if Phase 3 ships in the same release; medium otherwise (scoring would silently drift). Ship 2 + 3 together.

---

## Phase 3 — Scoring + CSV alignment

**Files:** `supabase/functions/_shared/scoring.ts`, `src/lib/clientSubWeightScoring.ts`, `src/lib/cityScoringLiveData.ts`, `src/pages/CityScoring.tsx` (CSV builder)

- Update the `normalize` `switch` cases in `scoring.ts` to use the new canonical keys (`children_5_12_count`, `dual_income_household_pct`, `commute_sprawl_index`, etc.). Keep ranges and direction unchanged — only the key names move.
- Same key updates in `clientSubWeightScoring.ts` so the live recompute uses the same vocabulary.
- Same in `cityScoringLiveData.ts` for any value-by-key lookups.
- Toolbar `buildCsvDownload` (the existing "Export CSV") gets the renamed keys automatically because it reads from city rows / category scores; verify columns are unchanged in output. Drawer "Export Raw Signals" already reads whatever keys exist — no change needed.

**Verification before ship:**
1. Pick one city (Frisco TX). Snapshot its `composite_score` and 6 category scores from the DB.
2. Apply Phases 2 + 3, redeploy edge functions, trigger a refresh for Frisco.
3. Confirm composite + category scores match the snapshot within ±1 (rounding). If they drift, the rename map is wrong — revert.

**Risk:** medium. This is the only phase that can change a number on the page. Mitigated by the snapshot test above.

---

## Phase 4 — Cleanup (separate ship, after 1 good refresh cycle)

- Delete the Phase 1 alias map from `signalAliases.ts` and the drawer.
- One-shot SQL to remove orphaned old-key rows: `DELETE FROM city_market_signals WHERE signal_key IN ('children_population_proxy', 'income_100k_plus_proxy', ...)` — only the keys we renamed. Run via the insert tool, not a migration (data op, not schema).
- Codebase sweep with `rg` for any remaining old-key string literals.

**Risk:** none if Phases 1–3 are stable for a few days.

---

## Out of scope (genuinely)

- Adding new fetchers for the ~24 still-missing SOW metrics. Drawer will honestly show them as "Not collected yet" — that's the correct UX until a fetcher exists.
- The "Refresh school data" / per-city refresh button — still a separate task as previously agreed.
- `city_market_signals` schema changes — none needed; we're only renaming `signal_key` values.
- Overview tab, Compare modal, AI Market Report — untouched.
- Custom criteria flow — untouched.

## Files touched (full list)

- `src/lib/signalAliases.ts` *(new)* — single source of truth for old-key → new-key map, shared by drawer (Phase 1) and any future migrations.
- `src/components/city-scoring/MarketDetailDrawer.tsx` — Phase 1 rewrite of Data Sources tab + counter.
- `supabase/functions/fetch-city-market-data/index.ts` — Phase 2 key rename + diagnostics moved out.
- `supabase/functions/fetch-city-market-data-sow/index.ts` — Phase 2 key rename.
- `supabase/functions/fetch-school-counts/index.ts` — Phase 2 (verify keys; `public_elementary_count` already matches what the drawer placeholder will read).
- `supabase/functions/_shared/scoring.ts` — Phase 3 normalize switch cases.
- `src/lib/clientSubWeightScoring.ts` — Phase 3 key updates.
- `src/lib/cityScoringLiveData.ts` — Phase 3 key updates.

## Verify end-to-end

1. **Drawer (Frisco TX):** Data Sources shows 6 sections, all 46 metrics. Counter reads e.g. `13 live · 5 proxy · 27 missing · 1 blocked of 46 SOW metrics`. No "Other Signals" bucket. "Fetcher diagnostics" collapsible at bottom.
2. **Refresh Frisco:** new rows arrive with canonical keys (spot check `children_5_12_count` exists, `children_population_proxy` no longer written).
3. **Composite score for Frisco:** unchanged within ±1 vs. pre-rename snapshot.
4. **Toolbar Export CSV:** column set + values unchanged.
5. **Drawer Export Raw Signals:** CSV now contains the renamed keys.
