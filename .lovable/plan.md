
## Goal

Change Step 9 (Google AI Overview via Apify) prices so they count in the MVS score right away. No human review gate. Keep those rows visually marked with a light yellow background and add a filter above the table to isolate them.

## What changes (plain English)

1. **Scoring rule flip**
   - Today: `useLiveMvs` nulls out `price_min`/`price_max` when `price_needs_review = true`, so AI Overview prices are skipped in the score.
   - New: keep the prices as-is. AI Overview prices count in median, percentile, and pct-at-least math the same as any other price.

2. **New crawls**
   - `mvs-discover-providers` will stop setting `price_needs_review = true` for AI Overview rows. It will still tag `platform = 'google_ai_overview'` and store the snippet + source URL as proof. That tag is how we know to tint the row.

3. **Backfill existing rows**
   - One-time UPDATE: set `price_needs_review = false` on every row where it is currently `true`. After this, scores across all cities recompute using those prices automatically (React Query invalidation on next load).

4. **Row color**
   - In Provider Evidence table and the "All competitors" table (`CityCompetitors.tsx`), rows where `platform = 'google_ai_overview'` get a very light yellow background (`#fffbea` style). No amber "Needs review" chip anymore — replace with a small neutral "AI Overview" label so people still know the source.

5. **Filter control above the table**
   - Add a dropdown (or checkbox) above Provider Evidence with options: All sources / Only AI Overview / Hide AI Overview. Same control added to `CityCompetitors.tsx`. Default = All sources.

6. **Verify / Edit / Reject**
   - Keep the Verify + Edit + Reject buttons working. If someone edits or rejects an AI Overview row later, the score updates as it does today. AI Overview price is "final unless someone edits."

## Files touched

- `src/lib/mvs/useLiveMvs.ts` — remove the `needsReview` null-out block.
- `supabase/functions/mvs-discover-providers/index.ts` — stop writing `price_needs_review = true` for AI Overview inserts.
- Data update (one-time): `UPDATE mvs_providers SET price_needs_review = false WHERE price_needs_review = true;`
- `src/pages/ProviderEvidence.tsx` (+ any sub-component that renders the row / the amber chip) — row tint, replace chip with neutral label, add filter dropdown.
- `src/pages/CityCompetitors.tsx` — row tint + filter dropdown.
- Possibly `src/lib/mvs/useProviderEvidence.ts` if row-shape needs `platform` surfaced.

## What is NOT touched

- Score math in `computeMvs.ts` — unchanged.
- Verify / Edit / Reject logic in `verifyProvider.ts` — unchanged.
- Amber "Possible brand price" (`price_derived_from_brand`) badge — that is a different flag, stays as-is.
- Other pages, sidebar, sidebar counts, MVS QA Queue.

## Phases and turns

- **Phase 1 (1 turn)** — Backend: flip scoring rule in `useLiveMvs`, remove `price_needs_review = true` write in `mvs-discover-providers`, run the one-time UPDATE to flip existing rows.
- **Phase 2 (1 turn)** — UI: light-yellow tint + neutral "AI Overview" label + filter dropdown in Provider Evidence and CityCompetitors.

Total: **2 turns**.

## Risks

- MVS scores for cities that have AI Overview prices will change on next load — some may go up or down. Expected and desired.
- Anyone mid-review of an AI Overview row will see it as "counting" already; the Verify button still works if they want to explicitly bless it.

## Testing after each phase

- Phase 1: open a city that has AI Overview rows, confirm the score number changes vs. before, confirm no console errors.
- Phase 2: confirm AI Overview rows are light yellow, filter dropdown shows/hides them, other rows look normal.

Approve and I will start with Phase 1.
