## Goal

Make `/auth` and `/` (Dashboard) visually match the approved mockups when viewed in Chrome at 100% zoom on an ~1100px-wide preview, with minimal vertical scrolling and no "magnified" feel. Layout/density only — no backend, auth logic, or routing changes.

## Root causes (confirmed from code)

1. **Auth screen feels magnified**
   - `Auth.tsx` uses `text-4xl xl:text-5xl` headline, `text-3xl` card title, `h-12 text-base` inputs, `h-12 text-base` Sign In button, large `Mail/Lock` icons (`h-5 w-5`), `py-6` card padding, and a tall illustration block (`min-h-[330px]`) — combined this overflows 779px height and looks oversized.
   - The mockup uses noticeably smaller type: ~28px headline, ~22px card title, ~40px inputs.

2. **Dashboard requires scrolling at 1100px**
   - The KPI grid only goes 4-up at `xl` (≥1280px). At 1100px viewport with 220px sidebar (≈880px content), it falls back to `sm:grid-cols-2` → 2×2 KPIs, doubling vertical height.
   - The 3-column middle row also only activates at `xl`, so at 1100px Pipeline / Recent Activity / Next Best Actions stack vertically.
   - Net effect: ~4 stacked bands instead of the mockup's 4 horizontal bands.

3. **Breakpoint mismatch overall** — the layout was tuned for ≥1280px content width, but the actual content area at 1100px viewport is ~880px.

## Plan

### A. Lower the breakpoints so the dashboard is horizontal at 1100px
File: `src/pages/Index.tsx`
- KPI row: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` → `grid-cols-2 lg:grid-cols-4` (always 2-up on mobile, 4-up from `lg` 1024px).
- Middle 3-column row: `xl:grid-cols-[1.05fr_1fr_1.12fr]` → `lg:grid-cols-[1.05fr_1fr_1.12fr]`.
- Insights row: `lg:grid-cols-5` stays, but add `md:grid-cols-3` fallback.
- Tighten KPI card: `p-4` → `p-3`, icon box `h-14 w-14` → `h-11 w-11`, icon size 26 → 22, value `text-2xl` → `text-xl`, top margin `mt-4` → `mt-3`.
- Tighten section cards: `p-4` → `p-3`, inner `space-y-2.5` → `space-y-1.5`, pipeline bar `h-3` → `h-2.5`, row gap `mb-3` → `mb-2`.
- Vertical rhythm: outer `space-y-4` → `space-y-3`.

### B. Compact Auth screen to match mockup
File: `src/pages/Auth.tsx`
- Headline: `text-4xl xl:text-5xl` → `text-3xl xl:text-[34px]`, subtitle `text-lg` → `text-base`.
- Card title: `text-3xl` → `text-2xl`; description `text-base` → `text-sm`.
- Card padding: `pt-6 pb-6` → `pt-5 pb-5`, side `px-7 sm:px-9` → `px-6 sm:px-7`.
- Inputs: `h-12 text-base` → `h-10 text-sm`, icons `h-5 w-5` → `h-4 w-4`, icon offset `left-4` → `left-3`, input `pl-12` → `pl-10`.
- Sign In button: `h-12 text-base` → `h-10 text-sm`.
- Form spacing: `space-y-4` → `space-y-3`, label/input gap `space-y-1.5` → `space-y-1`.
- Left illustration block: `min-h-[330px]` → `min-h-[260px]`, header logo `h-12 w-12` → `h-10 w-10`, brand text `text-2xl` → `text-xl`, vertical padding `py-6` → `py-5`.
- "or continue with" divider margin `my-5` → `my-4`; provider buttons height ~36px.
- "Create Account" footer card: tighten padding so the whole right column fits ~720px tall.

### C. Verify
Use the browser tools to load `/auth` at 1100×779 and `/` at 1100×779 (after sign-in). Confirm:
- Auth: both columns fit without page scroll; headline/inputs match mockup proportions.
- Dashboard: KPI row is 4-up; Pipeline / Recent Activity / Next Best Actions are side-by-side; Insights row visible after only a small scroll (mockup is also slightly taller than viewport — full no-scroll is not realistic without removing the Insights band).

## Out of scope (not touched)

Supabase, RLS, edge functions, auth logic, routes, env vars, sidebar/journey-bar structure, global search, other pages (CityScoring / Pipeline / Onboarding / Team / Prospects keep current density from previous pass).

## Honest expectation

The Dashboard mockup itself is ~960px tall at the rendered width — even perfectly compacted, the Insights band will sit just below the fold at 779px and need a tiny scroll. Going further would require either dropping a section or shrinking type below readable sizes, which I do not recommend without your sign-off.
