## Goal

Bring the Full Specification page (`/spec`) and its downloadable `Neuron-Garage-Spec.md` (sourced from `src/data/specMarkdown.ts`) fully up to date so every feature in the app today is reflected accurately. Spec was last stamped **v1.3 · May 21, 2026** — the codebase has moved ~1,400 commits since then.

## Sources I will reconcile against (in priority order)

1. **The actual codebase** — source of truth. I'll skim `src/pages/`, `src/components/`, `src/lib/`, `supabase/functions/`, `src/integrations/supabase/types.ts`, and `featureFlags.ts` so every claim in the spec matches what ships.
2. `CHANGELOG_HASEEB.md` (through May 25) — feature intent + design decisions.
3. `.lovable/plan.md`, `.lovable/Notifications — Header Bell Plan.md`, `.lovable/phase-2/*` — locked decisions and Phase 2 scope.
4. Recent git log (May 21 → May 31) — to catch anything not in the changelog.

I will **not** invent details. If a section is uncertain after reading code, I'll mark it `TBD — Brett to confirm` rather than guess.

## What changes in the spec (section-by-section)

**Header block**
- Bump to **v1.4 · May 31, 2026**.
- Add a one-line "What's new since v1.3" pointer to the new §18 Recent Changes.

**§1 Overview**
- Update city count (817, not 948/960) and reflect that `city_market_signals` was severed May 21 and live evidence is now synthesized from `us_cities_scored` columns.
- Clarify Phase 2 scope (Market Validation, Site Analysis, Candidate portal, Mailboxes, Video Training, Manus CSI app) and point to the locked phase-2 cabinet.

**§4 Navigation & Layout**
- Add **Header bell / NotificationsPopover** (header bell plan).
- Add the **Neuron AI** global assistant button + `⌘K` panel.

**§5 Dashboard**
- Drop the retired "need enrichment" line.
- Note any new tiles or summary changes.

**§6 City Search**
- Update metric registry description from `src/lib/sowMetricRegistry.ts` (canonicalized 12-metric Key Market Signals whitelist used by `MarketDetailDrawer`).
- Document the new MarketDetailDrawer hero summary + per-pillar coverage, Manus-upload sibling-row banner, `CityNotesEditor`, Export Raw Signals (CSV).
- Document Ask AI: 3-tier TAM intent rule, sub-metric boosts, session context, "Searched" header, "What changed" weight diff, "never invent a state" rule, default-open reasoning.
- Document the **"one calibrated number everywhere"** rule (every surface reads pillar + composite from the same recomputed helper).
- Document the empty-state for filtered 0-results.

**§7 Teacher Search**
- Reflect actual scoring/filters that ship today; add anything new in the panel (Market Context Banner, Next Best Action Strip, Saved Lists, Bulk Action Bar) that isn't already described.

**§8 Email Outreach**
- Mostly already current (v1.2/v1.3 wizard, push, reply triage). Light pass to verify scope-switcher state, `SMARTLEAD_PHASE` flag, and any new analytics or queue states.
- Add **Transactional email infrastructure** (`send-transactional-email`, `process-email-queue`, `weekly-data-health-digest`, `handle-email-suppression`, `handle-email-unsubscribe`).

**§9 Candidate Pipeline**
- Add the **Documents tab** (FF_DOCUMENTS), **manual votes** (FF_MANUAL_VOTES), **score override** (FF_SCORE_OVERRIDE), **compliance audit log** (FF_COMPLIANCE), **16-day FDD hard-block** (FF_FDD_GATE), **Step 2/4 uploads** (FF_STEP2_UPLOADS / FF_STEP4_UPLOADS), **Export Packet** button.
- Document the Feature Flag registry as the on/off switch surface.

**§10 Authentication**
- Add `/reset-password` flow.

**New §X — Neuron AI (global)**
- ⌘K assistant: factual answers, navigation + apply state, cheap write actions with Confirm preview, ambiguity prompt, `ai_action_log` write trail.
- Knowledge brain at `supabase/functions/_shared/appKnowledge.ts`.
- Co-exists with City Search Ask AI bar for ~2 weeks then collapses.

**New §X — Notifications (header bell)**
- Per the Notifications header-bell plan.

**New §X — Database Health & Observability**
- `/db-health` page, accuracy/alerts tabs, friendly errors, query logger, weekly digest.

**New §X — User Guide & in-app docs**
- `/user-guide`, `/handover`, `/system-overview`, `/apis-and-data-sources`, `/prompts-and-ai-workflows`, `/guardrails`, `/email-outreach-docs`, `/observability-spec`, `/observability-guide`, `/scoring-method`, `/methodology`, `/demographics-methodology`, `/smartlead-spec` — list what's there so the spec is honest about the in-app reference surface.

**§13 Data Model**
- Cross-check every listed table against `src/integrations/supabase/types.ts`. Add anything missing (e.g. `ai_action_log`, notification tables if present, observability/data-health tables, city notes table, transactional email tables, audit-log tables). Mark `city_market_signals` as severed.
- Correct city-count numbers.

**§15 Backend & Edge Functions**
- Add: `ai-city-query` updates, `ask`, `ask-city`, `city-analyst`, `csv-suggest-mapping`, `neuron-ai`, `neuron-ai-confirm`, `observability-ai`, `teacher-search-ai`, `users-guide-ai`, `recompute-city-derived`, `backfill-census-gaps`, `seed-cities-weather`, `weekly-data-health-digest`, `send-transactional-email`, `preview-transactional-email`, `process-email-queue`, `handle-email-suppression`, `handle-email-unsubscribe`, `teacher-prospects-dedupe-count`, `deepgram-tts`, `enrich-school-staff`, `smartlead-push-leads`, `smartlead-proxy`, `smartlead-webhook`.

**§16 Third-Party APIs**
- Add **Deepgram TTS** and any other secrets newly present in `secrets`/edge-function code.

**§17 Future Work**
- Replace with current snapshot of open Tier-1/Tier-2 items + the Phase 2 9-item SOW summary (one line each), pointing at `.lovable/phase-2/phase-2-sow.md` as the source of truth.

**New final §18 — Recent Changes (v1.3 → v1.4)**
- Tight bullet list summarizing the biggest deltas so a reader who knew v1.3 can skim what's new without diffing the whole doc.

## Files I will touch

- `src/data/specMarkdown.ts` — the only edit. The Spec page renders this constant and the **Download Markdown** button writes the same string to disk, so updating this single file refreshes both surfaces.
- `src/pages/Spec.tsx` — only if the version label is hardcoded outside the markdown (I'll check; expected: no edit).
- `CHANGELOG_HASEEB.md` — append one entry noting the spec refresh.

## What I will NOT do

- No app behavior changes, no schema changes, no edge-function changes.
- No Phase 2 SOW edits (locked).
- No new pages, no UI redesign of `/spec` itself.
- Won't touch `phase-2-sow.md` / `phase-2-execution-plan.md` / `phase-2-plan-plain-english.md`.

## Risk

**Low.** Documentation-only. Worst case: a wording inaccuracy that we fix in a follow-up edit. I'll favor "TBD — Brett to confirm" over guessing whenever the code is ambiguous.

## Deliverable

A single updated `src/data/specMarkdown.ts` so that:
- `/spec` renders the v1.4 spec inline.
- The **Download Markdown** button downloads `Neuron-Garage-Spec.md` at v1.4.

No separate PDF/DOCX export this turn unless you ask for one.
