# Haseeb → Brett Changelog

A plain-English running log of every change Haseeb (with Lovable AI) makes to this app. Newest first. Read top-to-bottom to catch up.

Format per entry:
- **What** — what changed for the user
- **Why** — what prompted it
- **Touches** — files changed (skim only if you care)
- **Risk** — Low / Medium / High and what could break
- **Revert** — how to undo if it turns out wrong

---

## 2026-05-25 — Ask AI: stop showing internal scoring keys to the user

**What.** When the user asked "lean toward TAM Teachers", the AI's reasoning bubble was writing things like *"increase franchiseeSupply, decrease competitiveLandscape"* — leaking raw internal category keys. Now the prose always reads *"increase TAM Teachers, decrease Competitive Opportunity"* — matching every other surface in the app.

**Why.** Haseeb caught it on a City Search screenshot. The retired category names had been renamed everywhere in the UI (Brett's May 22–24 work) but the `ai-city-query` edge function never got the memo.

**Touches.** Only `supabase/functions/ai-city-query/index.ts`. No frontend changes. No database changes. No scoring math changes. The internal JSON tool-call fields (`absoluteWeights.franchiseeSupply` etc.) still use the original keys — those are the contract the rest of the app reads.

**Risk.** Low. Pure relabeling of model output. If the post-process regex misses an edge case the user sees the old key — that's the same bug, not a regression.

**Revert.** Revert that one file.

---

## 2026-05-25 — City Search: clearer empty state when filters return 0 markets

**What.** After Ask AI applies a filter like `tier: A` plus new weights, sometimes 0 markets matched the combined filter even though the Weighting Preview ribbon showed there were Tier A cities. The ranked list said nothing — just looked broken. Now you get a clear inline message: *"0 markets match your filters. Tier: A · State: TX. Clear filters."* with a one-click "Clear filters" button.

**Why.** Haseeb screenshot showed Weighting Preview saying *Tier A: 5* while the table said *0 markets found*. Mismatch was confusing. (Root cause: filters from a prior turn or AI-set state stayed active across re-rank. Not auto-cleared on purpose — auto-changing the user's filters is worse than showing the issue.)

**Touches.** `src/components/city-scoring/RankedMarketsList.tsx`, `src/pages/CityScoring.tsx`.

**Risk.** Low. Display-only.

**Revert.** Revert those two files.

---

## 2026-05-25 — Dashboard: removed "need enrichment" hint

**What.** Removed the *"161,199 need enrichment"* line on the Dashboard's teacher tile. Those teachers are fine; they don't need enrichment.

**Why.** Haseeb correction — already discussed and agreed earlier.

**Touches.** `src/pages/Index.tsx`.

**Risk.** Zero. Cosmetic.

---

## Deferred (decided not to change yet)

- **`_ARCHIVED_DO_NOT_USE/` folder** — Audited: no code in `src/` or `supabase/` imports from it. Only `README.md` mentions it. Safe to delete, but Haseeb chose to defer.
- **Global "Ask AI" everywhere** — Currently lives only on City Search. Haseeb wants a proposal comparing HubSpot-style command bars vs. info-only chat before deciding.
- **Top-bar search → AI** — Today it's a plain name lookup (candidates / teachers / cities). Not AI. No change yet.
