# Responsive UI fixes (3 spots)

## 1. CityTopBar — notification + user avatar overflowing right edge

File: `src/components/city-scoring/CityTopBar.tsx`

Today everything sits in a single non-wrapping flex row: search → Export Source Data → Market Report → Bell → Avatar. At narrow viewports the bell + Haseeb avatar get pushed past the viewport edge (visible in screenshots 1 & 2).

Change:
- Wrap the row with `flex-wrap` and give the search `min-w-0 flex-1`.
- Group bell + avatar in their own `ml-auto` cluster so they always anchor to the right and stay together.
- On `< md`, hide the avatar's name+role text (already conditional) and let action buttons collapse to icon-only via `<span className="hidden sm:inline">` on labels.
- Keep Market Report visible at all widths but allow it to drop to a second line via `flex-wrap` rather than overflow.

Mirror the same `ml-auto` grouping in `src/components/PageHeader.tsx` for the Teacher Search header so bell + avatar always sit hard-right and don't get squeezed by the Market Report / Saved Lists action cluster.

## 2. City Scoring → Scoring Weights header row messed up on mobile

File: `src/components/city-scoring/CityWeightsPanel.tsx` (lines 97–131)

The right-side control cluster (`Total Weight`, `Reset to Default`, `Save Search`, `Apply Weights`) is `flex-wrap` with mixed text + buttons of different heights, producing the cramped layout in the user's screenshot.

Change:
- On mobile: stack into two clean rows — row 1 = "Total Weight: 100% • Reset to Default" (text/link), row 2 = Save Search + Apply Weights as equal-width buttons (`flex-1`).
- Use `grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3` for the buttons so they're full-width on phones, inline on desktop.
- Move `PreviewBadge` under the Total Weight line on mobile (it's currently inline and adds horizontal pressure).
- Keep desktop layout identical.

## 3. Teacher Search → Actions cards squished

Files: `src/pages/TeacherProspects.tsx` (line 415), `src/components/teacher-prospects/NextBestActionStrip.tsx` (line 125)

`NextBestActionStrip` sits in the right column of a 2-col grid (`md:grid-cols-2`), and inside it uses `md:grid-cols-2 lg:grid-cols-4` — so each card ends up ~120px wide, making "Export current view" wrap into a vertical word column (visible in screenshot 3).

Change:
- In `TeacherProspects.tsx`: change the wrapping grid from `md:grid-cols-2` to `lg:grid-cols-2` so Funnel + Actions stack on tablets and only sit side-by-side at `lg+`, giving cards real width.
- In `NextBestActionStrip.tsx`: change inner grid from `md:grid-cols-2 lg:grid-cols-4` to `sm:grid-cols-2 xl:grid-cols-4`. At `lg` (when sharing a row with Funnel) it renders 2 columns of comfortably-sized cards; on full-width mobile/tablet it also goes 2-col cleanly.
- Allow card titles to wrap naturally (`leading-tight`) instead of being forced into ultra-narrow columns.

## Out of scope
No logic, data, or backend changes. Pure layout/Tailwind class adjustments.
