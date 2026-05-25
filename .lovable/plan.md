
# Database Health — Tiers 1, 2, 3

Build a manager-only `/db-health` page that is the single URL you send Sam to answer "is everything working?" Plus a global footer debug widget on every page.

## Tier 1 — Status & Structure (ship first)

**Route:** `/db-health`, gated to managers via existing `useRole`/`has_role`. Non-managers get a 403 card.

**Top status row:** one pill per domain — green / yellow / red — computed from the rules below. Click a pill to scroll to its section.

**Domain cards** (one per data area):
- `us_cities_scored` — row count, % with non-null `composite_score`, oldest `scored_at`, min/max/avg composite, count missing any of the 46 signal columns
- `teachers` — row count, % with verified email, % with `fit_score`, last insert
- Reference tables (`us_cities_geo`, `cost_of_living`, `crime_stats`, etc.) — row counts and last update
- Edge functions — last invocation, last error (pulled from `function_edge_logs` via an edge function wrapper)
- Seeding/import runs — most recent row from existing run-log table if present

**Every metric has:**
- The raw SQL string in a collapsible "Show query" block
- A "Run now" button that re-fetches just that metric
- Timestamp of last fetch + a manual "Refresh all" at top

**Thresholds (encoded once in `src/lib/dbHealth/thresholds.ts`):**
- Green: row count > expected_min AND no nulls in required columns AND data freshness < 7d
- Yellow: one threshold missed
- Red: zero rows OR query errored OR required column 100% null

**Global footer debug widget** (`<DbDebugFooter />` mounted in `AppLayout`, manager+ only):
- Shows last 5 queries made by the current page: table, row count, ms, error
- Implemented via a tiny `queryLogger` wrapper around `supabase.from(...).select(...)` calls — opt-in; we wire it into the high-value hooks (`useLiveRankedMarkets`, teacher list, etc.) not every call
- Collapsed by default, fixed bottom-right, click to expand

## Tier 2 — Accuracy Tab

Second tab on `/db-health`:

**Invariants panel.** Rules table `db_health_rules` (name, sql, expected_result, severity). Each rule runs on demand; pass/fail badge + actual vs expected. Seed with 6 starter rules:
1. Every `us_cities_scored` row has `composite_score BETWEEN 0 AND 100`
2. Every scored city joins to `us_cities_geo` by `geoid`
3. No duplicate `(city, state)` in `us_cities_scored`
4. `population` matches between `us_cities_geo` and `us_cities_scored` (within 1%)
5. `cost_of_living_index` not null for any city with `composite_score > 0`
6. `teachers.email` is unique and lowercase

**Sample inspector.** "Pick random city" button → shows the city + all 46 raw signal columns + computed composite via `buildMarketView` (Rule 12 compliant). One-click "compare to top-10 average".

**Outlier flags.** Top 10 cities >3σ from national mean on each major signal; flag for review.

**Cross-source reconciliation.** Side-by-side: stored value vs source-of-truth value, with diff %.

## Tier 3 — Alerts & History

- New table `db_health_history` (timestamp, domain, metric, value, status). Populated by a `pg_cron` job every 6h running an edge function `db-health-snapshot`.
- Sparklines on each domain card showing 30-day history.
- "Notify me" button per rule → inserts into `db_health_subscriptions`. When a snapshot flips green→red, edge function `db-health-alert` sends an email via Resend to subscribers (uses existing Resend secret if present; otherwise we add the secret).
- "Incidents" tab listing past red events with start/end timestamps.

## Technical Details

**Files added:**
- `src/pages/DbHealth.tsx` — page shell, tabs, route
- `src/components/dbHealth/StatusRow.tsx`
- `src/components/dbHealth/DomainCard.tsx` — metric row + Show-query + Run-now
- `src/components/dbHealth/AccuracyTab.tsx`
- `src/components/dbHealth/AlertsTab.tsx`
- `src/components/dbHealth/DbDebugFooter.tsx`
- `src/lib/dbHealth/thresholds.ts` — single source of truth for green/yellow/red
- `src/lib/dbHealth/queries.ts` — exported `{ name, sql, run() }` objects so the UI can show + execute
- `src/lib/dbHealth/queryLogger.ts` — thin wrapper feeding `DbDebugFooter`
- `src/hooks/dbHealth/useDomainMetrics.ts` — React Query per domain

**Files edited:**
- `src/App.tsx` — add `/db-health` route inside the manager-only guard
- `src/components/AppLayout.tsx` — mount `<DbDebugFooter />` for managers
- `src/lib/cityScoringLiveData.ts` and the teacher hook — wire `queryLogger` in

**Database changes (Tier 2 + 3):**
- `db_health_rules` (name text pk, sql text, expected jsonb, severity text)
- `db_health_history` (id, ts timestamptz, domain text, metric text, value jsonb, status text)
- `db_health_subscriptions` (id, user_id, rule_name, channel)
- RLS: read = manager via `has_role(auth.uid(),'manager')`; write same
- Seed 6 starter rules
- Edge functions: `db-health-snapshot`, `db-health-alert`
- `pg_cron` schedule (Tier 3)

**Routing & data access pattern:**
- All metric queries go through Supabase RPC functions (`SECURITY DEFINER`, manager-only) rather than raw SELECTs from the client. This keeps RLS intact and lets us show the exact SQL the server ran.

**Rule 12 compliance:** Sample inspector and any UI showing composite uses `buildMarketView` from `@/lib/marketView`. No direct `.compositeScore` access.

## Order of work

1. Tier 1 page + footer widget + thresholds + 4 domain cards (no DB migration needed)
2. Migration: `db_health_rules` + seed + `accuracy_*` RPC functions → Accuracy tab
3. Migration: `db_health_history` + `db_health_subscriptions` + cron + edge functions → Alerts tab

I will pause for approval after each tier so you can show Sam Tier 1 before we commit to Tier 2/3 effort.

## Contingency

- Every change is additive (new route, new components, new tables). Nothing existing is modified except `App.tsx` (1 route) and `AppLayout.tsx` (1 mount).
- If anything misbehaves, revert the last History entry — `/db-health` and the footer disappear, app keeps working.
- Migrations are pure CREATE statements; safe to drop if needed.

