# Fix City Search: real signals, real refresh time, real pagination

## Your 4 issues — root cause for each

**1. "Some cities show only 6 key signals, Frisco shows 8+"**
Not a UI bug, not a fetch bug. It's the actual database state.

- `src/pages/CityScoring.tsx` line 635 caps the center panel at `slice(0, 8)` signals — that's the max.
- The reason most cities show fewer (or 6 hardcoded ones) is they have **0 signals in the DB**. Verified:
  - Frisco / Plano / Austin / Prosper / The Woodlands → 46 signals each
  - Ashburn → 19 signals (partial old fetch)
  - Every other city in the table → **0 signals** (never refreshed)
- When `liveSignals.length === 0`, line 652 falls back to `fallbackSigRows` — a **hardcoded list of 6 fake values** ("19,842 children", "$245/week", "1:475 teacher density", etc.). That's why every un-refreshed city shows the exact same 6 numbers.

**2. "Frisco shows 'May 8 refresh' badge — I refreshed many times today"**
The badge reads `liveCity.last_scraped_at`. DB confirms Frisco's `last_scraped_at = 2026-05-08 14:10:54`. Recent refreshes today (May 12/13) wrote to **Austin / Prosper / The Woodlands**, not Frisco. So the badge is technically correct — but it's misleading because:
- The "Refresh This Market" button in the drawer may not be writing `last_scraped_at` back to the `cities` row for the city you actually clicked refresh on, OR
- The refresh you triggered ran against a different city than Frisco.

We need to verify the SOW edge function updates `cities.last_scraped_at` for the target city on every successful run, and that the page-level `liveCity` object re-reads it after refresh (the `marketRefreshVersion` already exists but `liveCity` may not be re-fetched).

**3. "Pagination shows 238 results, page 2/3 do nothing"**
Confirmed mock. `src/pages/CityScoring.tsx` lines 972–983 are **hardcoded JSX buttons** with no `onClick`, no state, no slicing. The `Showing 1 to {Math.min(filtered.length, 8)} of 238` is literally the string `238` typed in. The list above it already renders all `filtered` markets via `.slice(0, 8)` only.

**4. "Refresh dates wrong / what shows after logout"**
Refresh state is **not** stored in localStorage — it comes from `cities.last_scraped_at` and `city_fetch_jobs` in the DB. So after logout/login the badge will correctly show whatever the DB has. The "wrong" feeling is from issue #2 (Frisco was never refreshed today) plus the fallback fakery in #1.

---

## Plan

### Fix A — Kill the fake 6-signal fallback (issue #1)
- Delete `fallbackSigRows` (lines 644–651) and the `sigRows = liveSigRows.length > 0 ? … : fallbackSigRows` branch.
- When `liveSignals.length === 0`, render an empty state in the Key Market Signals box:
  > "No live signals yet for this market. Click **Refresh This Market** to fetch."
  with a small Refresh button that triggers the same flow as the drawer button.
- Keep the 8-row cap + "View all signals" link for cities that DO have data.

### Fix B — Real pagination on Ranked Markets (issue #3)
- Replace lines 972–983 with state-driven pagination:
  - `const [page, setPage] = useState(1); const PAGE_SIZE = 8;`
  - Slice `filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)` for rendering.
  - `total = filtered.length`, `totalPages = Math.ceil(total / PAGE_SIZE)`.
  - Render real prev/next + numeric buttons (with ellipsis when `totalPages > 5`).
  - Reset `page` to 1 whenever filters change.
- Caption becomes `Showing {start} to {end} of {total} results` — no more `238`.

### Fix C — Honest refresh badge + post-refresh re-read (issue #2 + #4)
- After a successful refresh of city X, force a fresh `cities` row read for city X (not just signals/scores) so `liveCity.last_scraped_at` updates immediately. Add this to `reloadSelectedMarketView`.
- Verify `fetch-city-market-data-sow` edge function does `update cities set last_scraped_at = now() where id = :cityId` at the end of a successful run — if not, add it (this is the only backend touch, and it's a single line).
- Badge label: change to `Live data: {relative time}` (e.g. "Live data refreshed 2 min ago") with the absolute timestamp on hover, so stale data (May 8) reads as "5 days ago" — visually obvious instead of a friendly green pill.
- If `last_scraped_at` is null → show neutral grey badge "No live data yet" instead of hiding.

### Fix D — Drop the hardcoded "Market Summary" sentence
Line 1047 is one hardcoded sentence shown for every city ("Affluent, rapidly growing suburb…"). Either hide it when there's no per-city summary in the DB, or render `selected.summary ?? "—"`. Recommend: hide entirely until we have a real field. (Tiny but it's part of "get rid of mock".)

---

## Files touched
- `src/pages/CityScoring.tsx` — remove `fallbackSigRows`, real pagination, empty-state for signals, drop hardcoded summary, refresh-badge wording, re-read `cities` row after refresh.
- `supabase/functions/fetch-city-market-data-sow/index.ts` — confirm/add `last_scraped_at = now()` write on success (only if missing).

## Out of scope (defer)
- Backfilling signals for the ~30 un-refreshed cities (that's a data job — user must click Refresh per city, or we add a "Refresh all visible" later).
- Discoverability / new-city search combobox (separate PR).
- Removing remaining `sampleCities` imports — only the user-visible mock symptoms in this PR.

Approve and I'll implement A → B → D → C in that order (smallest blast radius first).
