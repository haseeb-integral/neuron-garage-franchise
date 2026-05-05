## Density & Layout Polish Pass

Goal: make the app feel right at Chrome 100% on a ~1100px viewport. No redesign — only spacing, wrapper, and heading-size adjustments. No backend, auth, routes, or functionality touched.

### 1. Add consistent page wrapper

Introduce a single max-width container on each main page so content doesn't stretch edge-to-edge on wide monitors and stays comfortable on 1100px.

Wrapper class: `max-w-[1280px] mx-auto w-full`

Apply to the top-level `<div>` of:
- `src/pages/Index.tsx` (Dashboard)
- `src/pages/CityScoring.tsx` — merge into existing full-bleed wrapper
- `src/pages/TeacherProspects.tsx`
- `src/pages/CandidatePipeline.tsx` — merge into existing full-bleed wrapper
- `src/pages/Onboarding.tsx`
- `src/pages/TeamMembers.tsx` — already has `max-w-6xl`; bump to `max-w-[1280px]` for consistency and reduce `p-6` → `p-5`

For CityScoring + CandidatePipeline (which use a negative-margin full-bleed gray background), keep the gray bleed but wrap the inner content in `max-w-[1280px] mx-auto`.

### 2. Heading size reduction (one step down where oversized)

- `src/components/PageHeader.tsx` h1: `text-2xl md:text-[28px]` → `text-xl md:text-2xl`
- `src/pages/Index.tsx` line 89 stat values: `text-3xl` → `text-2xl`
- `src/pages/Index.tsx` line 153 trend value: `text-2xl` → `text-xl`
- `src/pages/Onboarding.tsx` line 273 KPI: `text-2xl` → `text-xl`

### 3. Padding / gap tightening

- `src/pages/TeamMembers.tsx`: outer `p-6` → `p-5`, `space-y-6` → `space-y-4`
- `src/pages/Index.tsx`: audit stat cards / sections — reduce any `p-6` to `p-5`, `gap-6`/`space-y-6` → `gap-4`/`space-y-4`
- `src/pages/Onboarding.tsx`, `src/pages/TeacherProspects.tsx`, `src/pages/CityScoring.tsx`: same treatment for top-level containers (`p-6` → `p-5`, large `gap-6` → `gap-4`)
- `src/components/AppLayout.tsx`: keep current `p-3 md:px-5 md:py-3 lg:px-6 lg:py-3` — already tight, no change

### 4. Soften card chrome

For cards/sections that currently use heavy `border` + `shadow-md`/`shadow-lg`:
- borders: switch to `border-[#eef2f7]` (faint) where currently `border-[#dee2e6]` or darker
- shadows: drop `shadow-md`/`shadow-lg` to `shadow-sm` or remove on small inline cards

Scope: only obvious offenders found in Dashboard, City Scoring, Teacher Prospects, Onboarding stat/section cards. Do not touch Kanban cards (already tuned) or modal/drawer chrome.

### 5. Verification

After edits, open the live preview at 1100px via the browser tool, take screenshots of:
- `/` Dashboard
- `/city-scoring`
- `/teacher-prospects`
- `/candidate-pipeline`
- `/onboarding`
- `/settings/team`

Confirm: no horizontal scroll, content visually centered on wide viewports, headings proportionate to 15px base, no broken layouts. Iterate if anything looks off.

### Out of scope (not touched)

Supabase, auth/login/signup/reset, routes, env, secrets, edge functions, RLS, GlobalSearch, sidebar structure, journey bar, Dashboard content design, Kanban card internals.
