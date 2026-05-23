# Documentation Audit — Findings & Update Plan

I audited the six docs reachable from the left sidebar against the work shipped in the last 24 hours and against your "no references to archived MD files" rule.

## Audit Summary

| Doc (sidebar) | File | Refs archived MDs? | Stale vs. last 24h? | Verdict |
|---|---|---|---|---|
| User's Guide | `src/pages/UserGuide.tsx` | No | No | ✅ Leave as-is |
| SmartLead API Spec | `src/data/smartleadSpec.md` | No | No | ✅ Leave as-is |
| Outreach Guide | `src/data/emailOutreachDocs.md` | No | No | ✅ Leave as-is |
| Demographics Method | `src/data/demographicsMethodology.md` | **Yes — heavy** | Partial | 🔴 Rewrite |
| CSI Methodology | `src/pages/Methodology.tsx` | No | No | ✅ Leave as-is |
| Full Specification | `src/pages/Spec.tsx` | No | **Yes — heavy** | 🔴 Rewrite sections |

The other two `.tsx` doc shells (`SmartLeadSpec.tsx`, `EmailOutreachDocs.tsx`, `DemographicsMethodology.tsx`) just render the `.md` files via `?raw` — no content lives in them.

## Findings In Detail

### 🔴 1. Demographics Method — `src/data/demographicsMethodology.md`
**Archived MD references (your hard rule):**
- L5: "Pairs with `TPD.md` … and `AGENTS.md` Rule 11."
- L24: "see `TPD.md` for how it was imported"
- L42: "Per AGENTS.md Rule 5"
- L63: "Per `TPD.md`, vendor tables are the universe"
- L66: "See `TEACHER_IDEAL_PROFILE.md`"
- L72: "(locked enum, see AGENTS.md)"
- L98: "Name-vs-Meaning (AGENTS.md Rule 10)"
- L139: "Doc-sync per AGENTS.md Rule 9"
- L156–161: full "Cross-References" block listing `TPD.md`, `AGENTS.md`, `DATABASE_LAYER_SPEC.md`, `TEACHER_IDEAL_PROFILE.md`, `GLOSSARY.md`

**Structural bug:** numbering jumps 2.2 → 2.5 (sections 2.3, 2.4 are missing).

**Stale vs. recent work:** doesn't mention the single-source `MarketView` rule (every composite mints from `src/lib/marketView.ts`) that we hardened in the last 24 hours.

### 🔴 2. Full Specification — `src/pages/Spec.tsx`
No archived-MD references, but the content describes an old prototype, not the live product:
- **L113–114, L122–127:** "high-fidelity, fully clickable prototype using mock data — no backend writes are persisted", "No real authentication, persistence", "No live data feeds (Census, Yelp, LinkedIn, ZoomInfo) — all data is mocked". All four are now false: Lovable Cloud is wired, email/password auth is live, Census/BLS/BEA/FRED/NCES/Apollo/SmartLead are all wired.
- **L46–58 TOC + L173–181 Routes:** missing `/email-outreach`, `/users-guide`, `/smartlead-spec`, `/email-outreach-docs`, `/demographics-methodology`, `/methodology`. Sidebar item list is also wrong (5 items now: Dashboard, City Search, Teacher Search, Email Outreach, Candidate Pipeline — no Onboarding).
- **L302–327:** Onboarding described as live; per User's Guide it is parked for Phase 2.
- **L361–373 Data Model:** "All data lives in `src/data/*.ts`. State changes … do not survive a page reload." False — primary source of truth is Lovable Cloud Postgres.
- **L376–387 Tech Stack:** missing Lovable Cloud / Supabase, TanStack Query usage, Playwright E2E, GitHub Actions CI.
- **L389–399 Future Work:** lists already-shipped items (Lovable Cloud, Census/Apollo, AI assists) as future.
- **No mention** of last-24h hardening: `MarketView` single-composite rule (Rule 12), `QueryErrorState` retry pattern, Teacher dual-ID fix, removal of `pageCache`, Playwright E2E suite, CI pipeline.

### ✅ Everything else
- **User's Guide** — accurate, no archived refs, correctly notes SmartLead warm-up and Phase 2 onboarding parking.
- **SmartLead API Spec** + **Outreach Guide** — current, technically accurate, no archived refs.
- **CSI Methodology** — self-contained formula doc, no archived refs, still correct.

## Update Plan

### Step 1 — Rewrite `src/data/demographicsMethodology.md`
- Strip every reference to `TPD.md`, `AGENTS.md`, `TEACHER_IDEAL_PROFILE.md`, `DATABASE_LAYER_SPEC.md`, `GLOSSARY.md`, `MAY*_MEETING_NOTES`, and the "Rule N" shorthand.
- Inline any rule still in force (Show-Formula contract, name-vs-meaning, signals-not-scores, single MarketView composite) as first-class prose in this doc, not as cross-refs.
- Fix the 2.3/2.4 numbering gap (renumber cleanly).
- Replace the "Cross-References" section with a short "Where this lives in the app" pointer (City Search, Teacher Search, Show Formula buttons).
- Add a brief note that all composite scores in the UI are minted by a single `MarketView` source so a city can never display two different scores in one render.

### Step 2 — Rewrite the stale sections of `src/pages/Spec.tsx`
Targeted edits only, keep the page structure / TOC / styling:
- **§1 Overview:** drop "prototype / mocked / no persistence" language; describe the live product on Lovable Cloud.
- **§4 Navigation & Routes:** update sidebar to the real 5 items + Docs group; update route list to match `AppSidebar.tsx`.
- **§8 Candidate Pipeline:** keep the 7 stages, drop the Signing→Onboarding handoff section (mark Onboarding as parked for Phase 2).
- **§9 Onboarding:** collapse to a one-paragraph "Parked for Phase 2" note.
- **§12 Data Model:** replace "mock data in `src/data/*.ts`" with the real backend (Lovable Cloud Postgres, named tables: `us_cities_scored`, `teacher_prospects`, `candidates`, `smartlead_events`, `prospect_batches`, `prospects_staging`, `campaign_cache`).
- **§13 Tech Stack:** add Lovable Cloud (Postgres + Auth + Edge Functions + Realtime), TanStack Query, Playwright E2E, GitHub Actions CI (lint + typecheck + test + build on every PR).
- **§14 Future Work:** prune already-shipped items; keep only what's actually next (GreatSchools API key, live teacher outreach after warm-up, Phase 2 Onboarding).
- **Add a new §15 "Reliability & Correctness Guarantees"** documenting the last-24h hardening: single `MarketView` composite source, `QueryErrorState` retry component on data-heavy surfaces, Teacher dual-ID push correctness, Playwright smoke coverage of City Search / Teacher Prospects / Candidate Pipeline, CI gate on PRs.

### Step 3 — No-op confirmation
Confirm the other four docs need no edits (User's Guide, SmartLead Spec, Outreach Guide, CSI Methodology).

## Risk
Low. Pure documentation. No code paths, no schema, no runtime behavior touched.

Approve and I'll execute Steps 1 + 2 in a single pass.
