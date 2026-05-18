# City Search — End-to-End Audit & Fix Plan

## Plain-English summary (for Brett + Haseeb)

Right now the City Search page is showing **two tables stacked on top of each other**:

1. **The original ranked table** — connected to the legacy `cities` source. Has the good stuff: click a row → center panel fills in, "Show Formula", Save to Watchlist, Compare, suburb expansion, tier labels.
2. **"Table N" (the Top-10 / Top-20 list)** — connected to the new pre-seeded `us_cities_scored` database layer. Looks ugly (oversized unaligned fonts), and when you click a row **nothing happens** in the center panel because the center panel is still wired to the *old* table's data source.

That's the root cause of every symptom you described:
- Two tables = confusing
- Top-10 / Top-20 toggle is pointless because the table is already sorted
- Clicking Table N rows = dead clicks (center panel can't find the city in the old data source)
- Tier labels in Table N (A-Top, B-Strong…) are the *good* ones we want to keep
- "Ask AI" still 401s because the edge function call doesn't wait for a fresh session token

**The fix is to delete Table N, keep ONE table, and rewire everything (center panel, drawer, watchlist, formula, compare, Ask AI) to the new `us_cities_scored` pre-seeded database layer.** Old `cities` references get removed.

---

## What changes

### 1. Remove Table N entirely
- Delete the Top-10 / Top-20 toggle and the Table N component
- Delete the "Top N swap" side-by-side preview (was a temporary comparison)
- Keep **one** ranked table as the primary view

### 2. Adopt the good bits from Table N into the surviving table
- Tier label format: `A — Top`, `B — Strong`, `C — Watch`, `D — Pass` (from Table N)
- Keep original table's: row click → center panel, Save to Watchlist, Compare checkbox, Suburb expand, Show Formula

### 3. Rewire data source: `cities` → `us_cities_scored`
Files that currently read from the old `cities` table and need to point at `us_cities_scored`:
- `src/pages/CityScoring.tsx` — main page state + row selection
- `src/components/city-scoring/MarketDetailDrawer.tsx` — right-side drawer
- `src/components/city-scoring/NearbyMarketsPanel.tsx` — suburb / nearby logic
- Center metrics panel — currently can't resolve `city_id` from new rows
- Watchlist insert/read — needs to store the `us_cities_scored.id`, not legacy id
- Compare modal — same id alignment
- "Show Formula" modal — pull inputs/weights from `us_cities_scored` columns

### 4. Fix "Ask AI is not authenticated"
- `ai-city-query` edge function call must:
  - `await supabase.auth.getSession()` and refresh if expired before calling
  - Pass the bearer token explicitly in `Authorization` header
  - On 401, retry once after `supabase.auth.refreshSession()`
- Add a user-visible "Session expired — sign in again" toast instead of a silent fail

### 5. Cleanup
- Remove any remaining `from('cities')` queries in City Search code paths
- Remove dead helpers in `src/lib/cityScoringLiveData.ts` that referenced the legacy source
- Keep live API widgets hidden (already done), code preserved

---

## Why one table, not two

The Top-10 / Top-20 toggle in Table N was redundant because the main table is already sorted by composite score — the top N are just the first N rows. A separate widget for "the first 10 rows of the table directly below it" adds no information and doubles the maintenance surface. One sorted, filterable, clickable table is the right primitive.

---

## Files touched (technical)

- `src/pages/CityScoring.tsx` — remove Table N + toggle, single table, rewire selection state to `us_cities_scored.id`
- `src/components/city-scoring/CityScoringTable.tsx` (or equivalent) — adopt A/B/C/D tier labels
- `src/components/city-scoring/MarketDetailDrawer.tsx` — query `us_cities_scored` by id
- `src/components/city-scoring/NearbyMarketsPanel.tsx` — same
- `src/components/city-scoring/ShowFormulaModal.tsx` — pull from new schema columns
- Watchlist + Compare components — update foreign key target
- `src/lib/cityScoringLiveData.ts` — remove dead legacy helpers
- `supabase/functions/ai-city-query/index.ts` — none (server unchanged); client call site gets the auth fix
- Client AI call site (likely in `CityScoring.tsx` or an `AskAI` component) — session-aware invoke

No database migrations needed — `us_cities_scored` already exists and is seeded.

---

## Risk + undo

- **Risk:** Medium. Multiple components rewired in one pass. If a column name in `us_cities_scored` doesn't match what the old drawer expected, that field shows blank until mapped.
- **Mitigation:** Before writing, I'll read the actual `us_cities_scored` schema and write a column-mapping table (old field → new field) and confirm with you before editing components.
- **Undo:** Each component edit is reversible via Lovable history. No destructive DB changes.

---

## Order of execution (if approved)

1. Read `us_cities_scored` schema and write the old→new field mapping (show you before editing)
2. Fix Ask AI auth (smallest, isolated, unblocks Brett's testing)
3. Delete Table N + Top-N toggle
4. Rewire center panel + drawer to `us_cities_scored`
5. Rewire watchlist + compare + formula modal
6. Adopt A/B/C/D tier labels in surviving table
7. Remove dead legacy `cities` queries
8. Doc sync draft for `PROJECT_CONTEXT.md` + `OPEN_TASKS.md` (per AGENTS.md Rule 9 — wait for your "go" before writing docs)

---

## Note on chat preservation

Noted — when Brett asks something I'll keep that thread distinct from your implementation thread so you can scroll back to either independently. I can't physically split the chat UI, but I'll **label every reply** with `[For Brett]` or `[For Haseeb — implementation]` so you can visually separate them.

Reply **"go"** to implement, or tell me which step to drop/reorder.