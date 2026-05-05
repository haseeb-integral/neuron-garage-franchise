## Issues confirmed against the mockups

1. **Card borders are too dark/heavy.** All cards use `border: 1px solid #d8e2ef` (a fairly saturated blue-grey). The mockup uses a near-invisible hairline (~`#eef2f7` / `#edf1f7`).
2. **Login screen footer is messy.** Current footer wraps "© 2026 …", "Privacy Policy", "Terms of Service" as plain spans separated by "•" bullets. In the mockup they're on a single right-aligned row with comfortable spacing, no bullets, and Privacy/Terms are link-styled. The top border line is also too dark and the padding is uneven vs the mockup.
3. **Sidebar active state mismatch.** Active item is `#0757ff` with a heavy `boxShadow` (`0 8px 18px rgba(7,87,255,0.14)`) and weight jumps from 500 → 700. The mockup uses a flat blue pill (`#174be8`), no glow/shadow, same font weight as inactive items, slightly smaller text.
4. **Dashboard background:** confirmed white (`AppLayout` wraps everything in `bg-white`). No change needed; will note this in the response.

## Changes (layout/visual only — no logic touched)

### A. Soften all card borders globally on the affected pages
Replace `border: "1px solid #d8e2ef"` (and Tailwind `border-[#d8e2ef]`) with a lighter token `#eef2f7` on these files where cards/sections are styled inline:
- `src/pages/Index.tsx` (KPI cards, Pipeline, Recent Activity, Next Best Actions, Insights)
- `src/pages/Auth.tsx` (main card + "Create Account" card + footer top border + provider buttons)
- `src/pages/CityScoring.tsx`, `src/pages/TeacherProspects.tsx`, `src/pages/CandidatePipeline.tsx`, `src/pages/Onboarding.tsx`, `src/pages/TeamMembers.tsx` — same swap on outer card containers only.
- `src/components/PageHeader.tsx` button border (`#d8e2ef` → `#e4eaf2`).

Keep border width at 1px (already slim). Just lighten the colour.

### B. Login footer (`src/pages/Auth.tsx` lines 404–416)
Rewrite to match mockup:
- Top border: `border-[#dbe3ee]` → `border-[#eef2f7]`.
- Layout: `flex items-center justify-between` (no `flex-col` on small screens beyond `sm:`), padding `pt-3` → `pt-4`, font `text-xs` → `text-[12px]` with `text-[#65748c]`.
- Right cluster: replace `•` separator spans with three plain spans separated by left margin (`gap-5`); render "Privacy Policy" and "Terms of Service" as `<a>` styled with `hover:text-[#174be8]`.
- Remove the shield icon prefix duplication if needed; mockup keeps the shield on the left.

### C. Sidebar active state (`src/components/AppSidebar.tsx`)
In `renderLink`:
- `backgroundColor: active ? "#174be8" : "transparent"` (was `#0757ff`).
- Remove the `boxShadow` for active.
- `fontWeight: 600` for active (was 700); inactive stays 500.
- `fontSize: 13` (unchanged).
- Reduce icon strokeWidth difference: `strokeWidth={active ? 2 : 1.8}`.

### D. Verification
After changes, capture `/auth` and `/` at 1100×779 and compare against the two uploaded mockups.

## Out of scope
Supabase, auth logic, routes, sidebar structure, journey bar, dashboard content, global search.
