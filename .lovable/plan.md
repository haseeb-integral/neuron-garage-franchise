
## Goal

In the city detail drawer, show a live "Public elementary schools" row sourced from `city_market_signals` (`signal_key = 'public_elementary_count'`) for the selected city, with enrollment in parens and an "NCES CCD 2022" source label. Wire the existing per-city Refresh button to also call `fetch-school-counts` with `{ cityIds: [<id>] }` so the user doesn't have to wait on the full backfill.

## Changes

### 1. `src/pages/CityScoring.tsx` — drawer signal rendering

- Add `public_elementary_count` to `SIGNAL_ICONS` (use `GraduationCap`) and to the front of `SIGNAL_DISPLAY_PRIORITY` (just after the demographic block, before competitor count).
- Build a derived row from `liveSignals` for the elementary card:
  - Find `count = signals.find(s => s.signal_key === 'public_elementary_count')`
  - Find `enrollment = signals.find(s => s.signal_key === 'public_elementary_enrollment')`
  - If `count` exists → render value as `"{count} schools · {enrollment.toLocaleString()} enrolled"` and a small "NCES CCD 2022" footnote/tooltip.
  - If `count` missing → fall back to existing "Not available yet" empty state (currently this just means the row doesn't render; we'll keep that behavior).
- Drop `public_elementary_enrollment` from the standalone signal grid so it doesn't appear twice (it's folded into the count row).

### 2. `src/pages/CityScoring.tsx` — `handleRefreshData`

After the existing live-market + SOW refresh resolves successfully (around line 1066, where `setMarketRefreshVersion` is bumped), fire-and-await:

```ts
await supabase.functions.invoke("fetch-school-counts", {
  body: { cityIds: [cityId] },
});
```

- Wrap in try/catch — a school-fetch failure must NOT fail the whole refresh; just `console.warn` and `toast.warning("School data refresh failed; other data updated.")`.
- Bump `marketRefreshVersion` again after success so `SourceDataPanel` and the signal rows re-read.

### 3. No schema changes

`city_market_signals` already has the unique constraint and the rows are written by the deployed edge function. No migration needed.

### 4. Verification

- Open a city we know has data (Frisco, Plano, Austin, Ashburn) → drawer should show e.g. "35 schools · 22,950 enrolled" with "NCES CCD 2022" label.
- Open Summerlin NV / Town and Country MO → row stays hidden (matches existing "missing" behavior).
- Click Refresh on a city → network tab shows `fetch-school-counts` POST with `cityIds: [...]`; row updates after toast.

## Risks

- **Low.** All wiring is read-side + one extra non-blocking edge call. Worst case the school call fails and the rest of the refresh still works.

## Out of scope (confirm if you want it)

- A separate "Refresh school data" standalone button.
- Showing private/charter counts (that's the GreatSchools task, blocked on Brett's API key).
- Renaming the source label to "2024" — the upstream data is genuinely the 2022–23 school year; I'll use "NCES CCD 2022".
