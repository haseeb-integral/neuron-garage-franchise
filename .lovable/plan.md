## Phase A1–A5 — City → Teacher connection

**Status:** DB migration already executed (table `teacher_saved_lists` is live with per-user RLS). The plan below is the code-only remainder. Hit **Implement plan** to run it.

### A1 — Fix `?city`/`?state` plumbing
- `src/components/city-scoring/CityDetailDrawer.tsx` — pass `state` alongside `city` in the navigate URL (currently dropped).

### A2 — Market context banner
- New `src/components/teacher-prospects/MarketContextBanner.tsx`:
  - When `?city=` is present, queries `us_cities_scored` once for `composite_score_default`, tier band, population
  - Shows: `← City Search` button · `📍 Bethesda, MD · Tier A · Composite 98` · `47 teachers · 12 email-ready · 3 in outreach` · `Clear ×`
  - Clear removes `?city`/`?state` from URL and resets `cityFilter` to `"All"`

### A3 — Heading reflects active filter
- `src/pages/TeacherProspects.tsx`:
  - When `cityFilter !== "All"`, page title becomes `Teachers in {city}, {state}`; otherwise stays `Teacher Search`
  - Subtitle counters re-scoped (already filter-aware via `teacher_prospects_stats` RPC — verified)

### A4 — Adaptive columns
- `src/components/teacher-prospects/TeacherTable.tsx`:
  - Add optional `hideCityColumn?: boolean` prop
  - When true, hide the `City` column (redundant when filtered to one city)
- `TeacherProspects.tsx` passes `hideCityColumn={cityFilter && cityFilter !== "All"}`

### A5 — Saved teacher lists UI
- New `src/components/teacher-prospects/SavedListsMenu.tsx`:
  - Dropdown next to filter bar: lists user's saved views, `+ Save current view` (modal: name + optional notes), per-row delete
  - Saves `{ cityFilter, sourceFilter, search, hideInOutreach }` as `filters` jsonb
  - Restoring a list applies all filters + updates URL `?city=`
- Wired into `TeacherProspects.tsx` header action row

### Naming check (AGENTS Rule 10)
- New table `teacher_saved_lists` ≠ existing `saved_searches` (which stores City Search scoring weights only). Keeping them separate preserves both names' meaning.

### Doc-sync (Mode A — drafted after implementation, awaits explicit "go")
- `PROJECT_CONTEXT.md`: add `teacher_saved_lists` table row + `MarketContextBanner` / `SavedListsMenu` components
- `HOW_IT_WORKS.md`: upgrade "Favoriting a city → Teacher Search defaults to that city" to fully accurate (banner + heading + cleared filters)
- `OPEN_TASKS.md`: mark A1–A5 done; add Phase B items (multi-city URL, Fit Score column, "Add all visible to outreach")
- `GLOSSARY.md`: add "Market context banner", "Saved teacher list"

### Risk: low across all five. No changes to scoring math, teacher data, or Email Outreach.