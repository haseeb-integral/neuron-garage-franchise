# City Search — End-to-End Fix (Implementation Plan)

[For Haseeb — implementation]

## Goal

Collapse to ONE ranked table sourced from `us_cities_scored`. Delete Table N + Top-10/Top-20 toggle. Rewire center panel, drawer, watchlist, compare, Show Formula. Fix Ask AI auth.

## Step 0 — Schema mapping (read-only, show before editing)

Read `us_cities_scored` columns and produce an old→new field map (e.g. `cities.median_income` → `us_cities_scored.median_household_income`, `cities.elementary_schools` → `public_elementary_count`, `cities.children_pct` → derived from `children_5_12 / population`, etc.). Post the table in chat. Wait for "go" before component edits.

## Step 1 — Fix Ask AI auth (smallest, isolated)

`src/components/city-scoring/AskAiBar.tsx` + invoke site:
- `await supabase.auth.getSession()`; if missing/expired call `refreshSession()`
- Pass explicit `Authorization: Bearer <token>` to `supabase.functions.invoke('ai-city-query', ...)`
- On 401, refresh once and retry; else show toast "Session expired — sign in again"

No edge function changes.

## Step 2 — Delete Table N

In `src/pages/CityScoring.tsx`:
- Remove `RankedMarketsList` import + render block (around line 58 / 2020)
- Remove Top-10/Top-20 (`TopN`) state, toggle UI, and the side-by-side preview
- Keep the single existing ranked table (`CityTable` / equivalent) as the only list

## Step 3 — Rewire data source `cities` → `us_cities_scored`

Files: `CityScoring.tsx`, `CityTable.tsx`, `MarketDetailDrawer.tsx`, `CityDetailDrawer.tsx`, `NearbyMarketsPanel.tsx`, `CompareModal.tsx`/`MarketCompareModal.tsx`, `SourceDataPanel.tsx`, `StatCards.tsx`, `MarketsMap.tsx`, `AddCityModal.tsx`, `MarketReportModal.tsx`, `src/lib/cityScoringLiveData.ts`.

- Selection key becomes `us_cities_scored.id`
- All `.from('cities')` reads replaced with `.from('us_cities_scored')` using mapped columns
- Center panel resolves selected row by `us_cities_scored.id` so clicks fill metrics, formulas, deltas

## Step 4 — Watchlist + Compare id alignment

`watchlist_items.city_id` will now reference `us_cities_scored.id`. No DB schema change (column is plain uuid, no FK). Update insert/select code paths and any compare selection set.

## Step 5 — Adopt A/B/C/D tier labels

In the surviving table + `TierBadge.tsx`: `A — Top`, `B — Strong`, `C — Watch`, `D — Pass`. Derive tier from `composite_score_default` thresholds (preserve current cutoffs).

## Step 6 — Show Formula modal

Pull inputs/weights from `us_cities_scored` score_* columns + the active scoring config. Display the same Σ(weight × normalized metric) breakdown using new column names.

## Step 7 — Cleanup

- Remove dead `from('cities')` calls and legacy helpers in `cityScoringLiveData.ts`
- Keep hidden live-fetch widgets code intact (out of scope)

## Step 8 — Doc-sync draft (Mode A)

After code lands, draft one-line summaries of updates needed in `PROJECT_CONTEXT.md`, `OPEN_TASKS.md`, `HOW_IT_WORKS.md`, `GLOSSARY.md`. Wait for explicit "go" before writing per AGENTS.md Rule 9.

## Risk + undo

Medium. Column name mismatches are the main hazard — mitigated by Step 0 mapping confirmation. Each component edit reversible via Lovable history. No destructive DB changes.

## Out of scope

SmartLead integration (waiting on Brett). Hidden live-fetch widgets. Scoring math changes.
