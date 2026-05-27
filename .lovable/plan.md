Scope: Issue 1 only. Nashville stays parked until this ships. **Parked Fixes page dropped** — Brett didn't ask for it.

## What I'll do

### 1. Sidebar regrouping (`src/components/AppSidebar.tsx`)
- Move **Credentials & Handover** out of `utilityNavItems` and into `docsNavItems` at the top of the Methodology & Docs group.
- Final order in Methodology & Docs:
  1. Credentials & Handover
  2. System Architecture
  3. Prompts & AI Workflows
  4. **APIs & Data Sources** *(new)*
  5. Scoring Method
  6. CSI Methodology
  7. Demographics Method
  8. Observability Guide
  9. Observability Spec
  10. Outreach Guide
  11. SmartLead API Spec
  12. Full Specification

### 2. New page — APIs & Data Sources
- New content file `docs/architecture/apis-and-data-sources.md` covering every external API the app talks to:
  - **Firecrawl** — website crawling for enrichment. *Also used by the three Manus apps* (Brett's call-out).
  - **Apify** — web scraping for teacher prospects.
  - **SmartLead** — cold email sending + webhooks.
  - **Deepgram** — TTS in the AI assistant.
  - **Lovable AI Gateway** — all in-app AI (Gemini / GPT-5 family).
  - **Resend** — transactional email.
  - **Census / BLS / BEA** — government data for city scoring.
  - **OpenWeather** — city weather seed (verify wired before listing).
  - For each: what it does, which screens depend on it, where the key lives (vault name only, never a value), free vs paid, who owns the account today.
- New page `src/pages/ApisAndDataSources.tsx` using the same `DocShell` + `?raw` markdown pattern as `SystemOverview.tsx`.
- Route `/docs/apis` wired in `src/App.tsx`.

### 3. Sweep repo-path references out of user-visible docs
- `docs/architecture/system-overview.md` — replace mentions of `.lovable/plan.md`, `.lovable/parked-fixes.md`, `src/data/observabilityGuide.md`, `src/data/observabilitySpec.md`, `docs/handover/accounts.md` with sidebar page names or remove if internal-only.
- `src/data/specMarkdown.ts` — remove the dangling `TEACHER_IDEAL_PROFILE.md`, `APIS.md`, `OPEN_TASKS.md` references. The APIs paragraph points readers to the new APIs & Data Sources sidebar page; the other two get inlined briefly or dropped.

## Files I WILL touch
- `src/components/AppSidebar.tsx` (regroup + 1 new entry)
- `src/App.tsx` (1 new route)
- new `src/pages/ApisAndDataSources.tsx`
- new `docs/architecture/apis-and-data-sources.md`
- `docs/architecture/system-overview.md` (strip repo-path mentions)
- `src/data/specMarkdown.ts` (strip 3 missing-file references)

## Files I will NOT touch
- Any scoring/data/hook/store/edge function code
- `src/integrations/supabase/*`
- Anything Nashville-related (Issue 2 stays parked)
- Tests, migrations, backend config, auth, RLS, secrets

## Risk
Low. Pure presentation/docs work. Reversible with a one-commit revert.

Greenlight and I'll switch to build mode.