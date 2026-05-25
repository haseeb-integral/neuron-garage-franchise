# Verify the "0 teachers" fix on the MARKETS rail

## What I checked

DB has the rows (per-city aggregates):

- Chicago — 25,006 total / 1,185 enriched
- Indianapolis — 13,583 / 228
- Detroit — 10,468 / 0
- Philadelphia — 6,525 / 266
- Grand Rapids — 6,040 / 0
- … etc.

So data is not the problem. The remaining risk is in the new query itself.

## Concern with the current fix

`CitySearchRail.tsx` uses:

```ts
.select("*", { count: "planned", head: true })
```

`count: "planned"` returns the **Postgres planner's row estimate** from `pg_class` / filtered query plan — not a real count. For a filter like `.eq("city", name)` on `teacher_prospects`, the planner estimate can be:

- significantly off from the true count, or
- `null` / `0` when planner stats are stale or the predicate isn't well-covered by statistics.

That means tiles could still show wrong numbers (including 0) for some cities even though the DB has rows — the exact symptom we're trying to fix. The "no rows starved by 5k cap" bug is gone, but a different inaccuracy can replace it.

## Proposed change

Switch both HEAD queries from `count: "planned"` to `count: "exact"`:

```ts
.select("*", { count: "exact", head: true })
```

`exact` still uses `head: true` (no row payload — just a `COUNT(*)` against the filtered query), is index-backed on `city`, and returns the true number every time. Cost for 8 cities × 2 queries is negligible.

No other files change. No schema change.

## How to verify after the change

1. Load `/teacher-prospects` with no filter — every tile should show the same totals as the DB aggregates above (Chicago 25,006, Philadelphia 6,525, Detroit 10,468, etc.).
2. Apply a single-city filter (e.g. Philadelphia) — banner and tile must match.
3. Confirm no tile shows `0 teachers` for a city that genuinely has rows.

## Technical notes

- File touched: `src/components/teacher-prospects/CitySearchRail.tsx` (lines 124–145 only).
- Behavior of the rest of the component (candidate selection, sort, outreach overlay) is unchanged.
- `count: "exact"` on a `head: true` request does not transfer rows; only the count header is returned.
