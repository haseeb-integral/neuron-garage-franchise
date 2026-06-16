## What's broken

1. **Two LeafSpring cards.** The 4-card row shows `LeafSpring School at Cedar Park` (44.37) AND `LeafSpring Plano — closed 2023` (45.96). The Plano row is the **retracted** placeholder anchor — per Feature1BStatus, Cedar Park replaced it. It's still showing because a `site_analyses` row for the Plano address survives in the DB and the page hydrates the 4 slots from the user's most-recent ready rows.

2. **`Suggested: Don't recommend` badge overlaps the address text.** My last edit added `<br />` inside an `inline-flex` span, but `<br />` is ignored inside an inline-flex container, so the badge still renders as one long line and visually overflows the 110px score column onto the title/address column to its left.

## Fix plan

### A) Stop LeafSpring Plano from showing — restore Wayside Eden Park instead

The user's earlier lineup (per `LiveEngineCard.tsx` PRESETS + Feature1BStatus) is:
Trinity Episcopal · LeafSpring Cedar Park (negative anchor) · Wayside Eden Park · St. Francis.

Steps:
1. **Delete the Plano row** from `public.site_analyses` (single `DELETE WHERE address = '7000 Preston Rd, Plano, TX 75024'`) so hydration stops surfacing it.
2. **Hide retracted anchors from hydration** as a guard: in `src/pages/SiteAnalysis.tsx`, when fetching the recent rows, filter out any address whose `school_name` matches `/plano|closed 2023/i` AND is not Cedar Park. Single line in the existing `.not(...)` / `.filter(...)` chain.
3. **Seed Wayside Eden Park** so the 4th slot is populated on next load: insert a `site_analyses` row for `6215 Menchaca Rd, Austin, TX 78745` (Wayside Schools — Eden Park Academy, `private_elementary` / `k5_k6` / 400) by reusing the Live Engine compute path — the simplest way is to add Wayside to the default slot scaffold in `SiteAnalysis.tsx` so the next render kicks off `runSlot(..., { preferCache: true })` for it (it will hit cache if previously run, else compute once).

(No schema or weight changes; pillar/composite math is untouched.)

### B) Fix the badge overlap (real fix this time)

In `src/pages/SiteAnalysis.tsx` `CandidateCard` header (the `Suggested: …` span around line 209-216):

- Switch the badge wrapper from `inline-flex` to a plain `inline-block` element so the `<br />` actually breaks the line, OR drop the `<br />` and rely on natural wrapping with `white-space: normal` + `word-break: break-word` (no `whitespace-nowrap`).
- Keep `max-width: 100%` of its 110px parent column, `text-align: center`, `leading-tight`, `text-[9px]`.
- For very long tiers ("Don't recommend"), the badge will then render on 2 short lines fully inside the 110px column with no overflow over the title/address.
- Same treatment for the user-decision `userPill` so the two badge states stay visually consistent.
- Sanity-check by viewing the preview at the current 986px viewport — the 4-card row gets ~240px per card, so the right column must stay tight; do not widen it beyond 110px.

### Technical notes (devs only)

- `site_analyses` is the cache + history table; hydration query lives in `SiteAnalysis.tsx` (around the `.from("site_analyses")` call near the `useEffect` that seeds `slots`).
- The DELETE in step A1 is a one-shot data fix; the filter in A2 is the durable guard.
- No edge function or `compute-sas` changes are required.

### Files touched
- `src/pages/SiteAnalysis.tsx` (hydration filter, default slot scaffold, badge markup)
- One Supabase data change: `DELETE FROM public.site_analyses WHERE address = '7000 Preston Rd, Plano, TX 75024'`

### Out of scope
- Reweighting, threshold changes, or any pillar math changes (per Brett's locked weights).
- Any change to `LiveEngineCard.tsx` presets — the Plano preset was already removed; this is purely a stale DB row.
