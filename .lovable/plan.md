## What's actually going on

**Blank MVS for Indianapolis, Philadelphia (and "—" Absorp)**
The composite MVS is `null` whenever any of the 6 sub-scores is `null`. Both cities have `Market Absorption = null` because their premium providers have **zero scraped weeks with a status** (sold_out / waitlist / open). Counts in the DB right now:

| City | Providers | Priced | Weeks rows |
|---|---|---|---|
| Indianapolis, IN | 81 | 13 | **0** |
| Philadelphia, PA | 88 | 17 | 9 (but none on premium providers) |
| Denver, CO | 3 | 3 | 1 → all subscores resolve to 0 → MVS = 0 |

So the table is behaving correctly given the data; the data is incomplete. Denver only has 3 providers total (Tier B seed, never had the full pipeline run).

**Tier A rollout** — confirmed: I have **not** run `mvs-run-pipeline` end-to-end for the 6 remaining Tier A cities. Boston is the only one with meaningful week coverage (43). The "LIVE" badge on a row only means discover-providers ran, not that weeks were extracted.

## Plan (3 turns)

**Turn 1 — Remove hyperlinks in Premium Providers table** (cosmetic, fast)
- `src/components/phase2-demo/LiveCityDeepDive.tsx`: render `p.name` as plain text (no `<a>`), drop the "source ↗" link next to Weeks count.
- Keep `website_url` / `source_listing_url` / `mvs_weeks.source_url` columns in the DB and continue populating them — just don't render the links. We can re-enable later by reverting this small block.

**Turn 2 — Run `mvs-run-pipeline` for Indianapolis + Philadelphia**
- These are the two with blank MVS that you can see in the screenshot. One pipeline run per city extracts weeks for their premium providers → Absorption resolves → MVS shows a number.
- Spot-check the resulting numbers; if either still comes back null, surface why (likely no premium tier classified yet).

**Turn 3 — Tier A rollout: NYC, Houston, Chicago, San Antonio, LA, then Boston calibration gate**
- One `mvs-run-pipeline` call per city in sequence.
- After all 5 + Boston, compare the 7-city score distribution; if Boston doesn't land in the top quartile, stop and report instead of silently moving on.
- Denver stays at 0 — it's Tier B and out of scope for this rollout.

## Out of scope (explicitly)
- PDF Market Brief, QA Queue page, ACS pull, `mvs-extract-weeks*` consolidation, `/mvs-preview` — separate plans, not touched here.
- Changing the rule that null sub-score → null MVS. Brett's "one calibrated number" rule means we don't fake a score when a pillar is missing.

## Files
- `src/components/phase2-demo/LiveCityDeepDive.tsx` (edit: remove two `<a>` wrappers in Premium Providers table)
- No schema changes, no edge function changes.
