# System Architecture Overview — plan

## Goal
One place where Brett (non-technical) or a future developer can read and understand the whole Neuron Garage system: what AI we use, where data comes from, how it flows screen-to-screen, and what guardrails keep it safe. Today this knowledge is scattered across edge-function TS files (`appKnowledge.ts`, `aiAssistantKB.ts`), per-feature spec pages (SmartLead, Observability), and code comments. Nothing consolidates it.

## Deliverable
1. **`docs/architecture/system-overview.md`** — single markdown file, version-controlled, two-tier structure (Brett-readable top, developer deep-dive bottom).
2. **`/architecture` in-app page** — renders the same markdown using the existing `DocShell` + `react-markdown` pattern (matches SmartLead Spec, Observability Spec).
3. **Sidebar entry** — add under the "Methodology & Docs" collapsible group in `AppSidebar.tsx`.

## Document structure

**Part A — Overview (Brett-readable, ~1 page)**
1. *What this app is* — 2 paragraphs, plain English.
2. *The four screens & how they hand off* — City Search → Teacher Search → Email Outreach → Candidate Pipeline, with the "promote" handoff points called out.
3. *AI models in use* — table: model · where it's called · what it does · why this model.
   - Gemini 2.5 Pro/Flash, Gemini 2.5 Flash Image (Nano Banana), GPT-5 family — pulled from the supported-models list and actual usage in `supabase/functions/*` (ask, neuron-ai, observability-ai, teacher-search-ai, city-analyst, csv-suggest-mapping, users-guide-ai).
4. *Data sources & integrations* — table: source · status (🟢 live / 🟡 pending key / 🔴 stub) · what it feeds.
   - Census ACS, BLS, BEA, FRED, NCES CCD, Apollo, Apify, SmartLead, Resend, GreatSchools, DonorsChoose, Firecrawl, Google Trends.
5. *Data-flow diagram* — one Mermaid diagram showing external sources → Lovable Cloud DB → 4 screens → outbound (SmartLead/Resend).
6. *Guardrails (the rules pinned on the fridge)* — consolidated bullet list: scoring math is Sam's, no deletes without confirm-confirm, RLS scopes all writes to `auth.uid()`, Signing stage gated by Confirmation, SmartLead uses NEGATIVE track booleans, AI cannot change auth/roles/RLS, AI cannot invent data.

**Part B — Developer deep-dive**
7. *Stack & hosting* — React + TS + Vite, Lovable Cloud (Supabase), email/password auth only, deployed at neuron-garage-franchise.lovable.app.
8. *Repo map* — short tree pointing to `src/pages`, `src/components/<feature>`, `src/hooks`, `supabase/functions`, `supabase/migrations`, `docs/`.
9. *Edge function inventory* — table: function name · purpose · triggers · key secrets used. Sourced from `supabase/functions/` directory listing.
10. *Database surface* — high-level entity list (cities, teacher_prospects, candidates, smartlead_campaigns, email_threads, user_roles, watchlists, saved_searches) with one-line purpose each. No schema dump — point to `src/integrations/supabase/types.ts` as canonical.
11. *AI assistant architecture* — how Neuron AI (`NeuronAiProvider` + `neuron-ai` edge function) is grounded by `appKnowledge.ts` + `SCREEN_KNOWLEDGE`, what tools it can call (query_cities, explain_city, apply_screen_state, change_candidate_stage, etc.).
12. *Realtime paths* — SmartLead webhook → `smartlead-webhook` edge fn → DB insert → Supabase realtime → inbox UI.
13. *Observability subsystem* — pointer to existing `/observability-spec` and `/observability-guide` so we don't duplicate.
14. *Security model* — RLS-first, `user_roles` table + `has_role()` security-definer function, no client-side admin checks, secrets only in edge-function env.
15. *How to extend safely* — short checklist for new contributors (read this doc → read the relevant per-feature spec → check `appKnowledge.ts` hard limits → write migration with GRANTs → add RLS).

## Source-of-truth rule
Content is **derived from existing files**, not invented:
- AI models & guardrails → `supabase/functions/_shared/appKnowledge.ts`, `aiAssistantKB.ts`
- Edge functions → directory listing of `supabase/functions/`
- Integrations status → cross-ref with `fetch_secrets` (live vs pending) and existing notes
- Screens → existing per-page components in `src/pages/`

## Files to create / edit
- **create** `docs/architecture/system-overview.md`
- **create** `src/data/systemOverview.md` (raw import for the page — symlink-style copy; or import directly from `docs/architecture/` if Vite raw import allows the path. Will use whichever pattern matches existing `smartleadSpec.md` setup.)
- **create** `src/pages/SystemOverview.tsx` (mirrors `SmartLeadSpec.tsx` / `ObservabilitySpec.tsx`)
- **edit** `src/App.tsx` — add `/architecture` route
- **edit** `src/components/AppSidebar.tsx` — add entry under "Methodology & Docs" group with a fitting icon (e.g. `Network` or `LayoutGrid`)

## Out of scope
- No code refactor.
- No new edge functions.
- Not duplicating SmartLead/Observability specs — link to them.
- Not touching the AI assistant knowledge files (they stay AI-only; the new doc is human-facing).
- Google Doc / connector mirroring — still parked on Brett's call.

## After merge — what I'll tell you to relay
- New doc lives at `docs/architecture/system-overview.md` (repo) and `/architecture` in-app (sidebar → Methodology & Docs).
- Brett can read either surface; both are the same content.
- Update protocol: edit the markdown file, the in-app page reflects on next deploy.
