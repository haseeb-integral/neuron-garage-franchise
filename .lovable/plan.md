# Plan: Persistent UI State (Option B — Zustand + localStorage)

Per CLAUDE.md sprint mode ("one thing at a time"), I'll **build the pattern on City Search first**, validate it, then roll the same pattern to the other 3 pages in follow-up tasks.

## Step 1 — Add dependency
- `bun add zustand` (~1 KB, brings `persist` middleware).

## Step 2 — Create the store
New file: `src/stores/cityScoringStore.ts`
- One zustand store wrapped in `persist` middleware, key: `ng:city-scoring-v1`.
- Persists ONLY UI state (not server data, not transient flags):
  - `searchTerm`, `scoringModel`
  - `stateFilter`, `minPop`, `minScore`, `tierFilter`, `nonRegOnly`
  - `weights`, `appliedWeights`, `customCriteria`
  - `selectedId`, `selectedMarketKey`
  - `viewMode` (table/map), `page`
  - `compareMode`, `selectedForCompare`
- Does NOT persist: `liveCity`, `liveSignals`, `liveRankedMarkets`, `liveJob`, drawer/modal open flags, `refreshingMarket` (always start closed/idle on return).
- `version: 1` + `migrate` stub so we can evolve the schema safely.

## Step 3 — Wire into `CityScoring.tsx`
- Replace the relevant `useState` calls with `useCityScoringStore(s => s.x)` selectors and store setters.
- Initial values come from the store (already defaulted), so no behavior changes on first load.
- Drawer/modal `open` state stays as local `useState` (intentional — these always reopen closed).

## Step 4 — Verify
- Set filters + move sliders + open drawer + select a city → navigate away → return → all UI state preserved (drawer closes; that's intended).
- Hard refresh → still preserved (localStorage).
- Logout/login same browser → still preserved (per-browser, not per-user; acceptable for 3-user internal tool).

## Step 5 — Confirm before rollout
After City Search is verified in preview, I'll ask before applying the same pattern to:
- Teacher Prospects (filters, search, selected teacher)
- Candidate Pipeline (filters, selected candidate, active tab)
- Onboarding (selected franchisee, active step)

## Out of scope
- Cross-device sync (would need Supabase `user_preferences` table — overkill for 3 users).
- URL-based deep links.

## Risk: Low
- Store is additive; behavior is identical on first visit.
- If localStorage is corrupted, `persist` falls back to defaults.
- Easy undo: revert the file + delete the store.

## Effort: ~25 min for City Search.
