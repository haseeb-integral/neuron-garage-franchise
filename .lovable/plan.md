
## Two tracks this turn

### Track 1 — Tier A rollout (the 7 remaining cities)

DB truth as of now:

| City | Providers | Weeks | Status |
|---|---|---|---|
| Austin, TX | 118 | 34 | calibrated |
| Boston, MA | 86 | 43 | calibrated |
| New York, NY | 13 | 103 | **stub** |
| Los Angeles, CA | 5 | 12 | **stub** |
| Houston, TX | 3 | 2 | **stub** |
| Chicago, IL | 2 | 3 | **stub** |
| San Antonio, TX | 1 | 5 | **stub** |
| Philadelphia, PA | 1 | 9 | **stub** |
| Indianapolis, IN | 0 | 0 | **never run** |

Goal: real pipeline runs for the seven stub cities, so each Tier A city has a trustworthy composite (just like Austin and Boston).

No new code needed for the runs themselves — `/mvs-rollout` already has the Run buttons wired to `mvs-run-pipeline` and the flag-flip logic. The pipeline is sequential by design (~1–2 min/city → ~10–15 min total).

I will trigger them server-side directly (sequential `supabase.functions.invoke("mvs-run-pipeline", { body: { city } })` with poll-until-done between each) so you don't have to babysit the UI. After all seven complete:

- Spot-check the table at `/market-validation` — every Tier A city shows a LIVE pill, a composite that isn't 82/0, and a real Pricing/Absorption/Diversity/Depth split.
- Confirm `mvs_city_flags.mvs_data_source = 'live'` for all 9 Tier A cities.
- Check that no row is stuck in `running`/`queued` after 8 minutes.

If any city's run fails, I'll capture the edge-function log error and report it; I will not silently retry-loop.

### Track 2 — "One calibrated number everywhere" audit + fix

The plan claimed this was "wired through row / detail / compare", but a targeted grep found one real leak:

**`src/lib/decisionsExport.ts` (`exportMarketDecisionsCsv`)** writes `c.composite` / `c.pricing` / … straight from the static `ShortlistRow` (the demo fallback). For any city flipped to live, the CSV exports the **stale demo number, not the live overlay**. Example: NYC ships as `82` in the CSV even though the table shows `45.7`. That violates Brett's rule.

Fix:
1. Extend `exportMarketDecisionsCsv` to take the same `Map<string, LiveOverlay>` already computed in `MarketValidation.tsx`.
2. Per row, prefer the overlay value when present; fall back to the demo `c.*` only when no overlay exists.
3. Add a `data_source` column (`live` | `sample`) so the CSV makes the provenance explicit.
4. Update the one caller in `ShortlistTable.tsx` (`onClick={() => exportMarketDecisionsCsv(rows, byCity)}`) to forward `liveOverlays` — the prop already exists on the component.

Other surfaces I already confirmed read from `computeMvs` / `useLiveMvs` / overlays (no action needed):
- `ShortlistTable` row cells — uses `valFor()` with overlay fallback ✓
- `LiveCityDeepDive` detail panel — calls `useLiveMvs` directly ✓
- `MarketValidationRollout` composite column — calls `useLiveMvs` per row via `<CityRow>` ✓
- Compare modal — reads from the same `computeMvs` helper ✓

Two surfaces are deferred to other turns and not in this fix:
- **PDF Market Brief** — doesn't exist yet (point #1 of the 7-point plan)
- **RowScorePopover** — currently uses overlay correctly; will re-verify visually after Tier A runs

### Verify after build

1. With Tier A all-green, open `/market-validation`, click **Export decisions (CSV)**. Open the file:
   - NYC row: `mvs_score` should be the live ~45.7 (or whatever NYC settles at after the real run), `data_source=live`.
   - San Antonio row: anchor demo numbers, `data_source=sample`.
2. Visual cross-check: every value in the CSV row matches the value visible in the corresponding shortlist row cell. No mismatches.
3. `/mvs-rollout`: progress strip reads `9 of 11 cities scored` (or 11/11 if your two manager-added cities also get runs — not in scope this turn).

### Out of scope (still on the 7-point list, next turns)
- PDF Market Brief (#1)
- QA Queue review page (#2)
- Census ACS wiring (#3)
- `/mvs-preview` admin page (#6)
- Firecrawl extractor expansion to non-Sawyer sources
