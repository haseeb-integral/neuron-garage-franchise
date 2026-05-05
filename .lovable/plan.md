## Goals
1. Disable the first-visit guided tour (can be re-enabled later).
2. Fill the Ranked Markets card with 7–8 rows so it doesn't look empty next to the Frisco card, and use the requested footer + pagination format.

## Changes

### 1. Disable tour on signup / first visit
File: `src/components/AppLayout.tsx`
- Remove (or comment out) the `useEffect(() => { maybeStartTourOnFirstVisit(); }, [])` call so no auto-tour fires after signup or first load.
- Leave the manual `startTour()` button wiring and `src/lib/tour.ts` untouched so we can re-enable later by restoring one line.

### 2. Ranked Markets: show 8 rows + correct footer/pagination
File: `src/pages/CityScoring.tsx`
- Change the visible slice from `.slice(0, 5)` to `.slice(0, 8)` so 8 rows render at desktop width.
- Keep current row height/padding (no stretching) so the card grows naturally to better match the Frisco column height.
- Update footer text to: `Showing 1 to 8 of 238 results`.
- Update pagination markup to the compact form: `‹ 1 2 3 … 30 ›`
  - `‹` prev chevron
  - `1` active
  - `2`, `3` inactive
  - `…` ellipsis
  - `30` last page
  - `›` next chevron
- Pagination stays pinned at the bottom of the card (existing footer container).

## Out of scope
- No changes to Frisco detail card, Nearby Markets, Source Data, Report, or Market Snapshot.
- No backend, auth, Supabase, route, env, or secret changes.
- Tour code in `src/lib/tour.ts` is preserved as-is for future re-enable.
