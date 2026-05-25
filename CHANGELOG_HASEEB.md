# Haseeb → Brett Changelog

A plain-English running log of every change Haseeb (with Lovable AI) makes to this app. Newest first. Read top-to-bottom to catch up.

Format per entry:
- **What** — what changed for the user
- **Why** — what prompted it
- **Touches** — files changed (skim only if you care)
- **Risk** — Low / Medium / High and what could break
- **Revert** — how to undo if it turns out wrong

---

## 2026-05-25 — Ask AI on City Search: 3-tier TAM intent rule + real session context + smarter sub-metric boosts

**What.** Three connected fixes after Haseeb caught Ask AI rotating to 60% TAM on a within-set question ("which Tier A markets are good for TAM Teachers"):

1. **3-tier intent rule (locked in the system prompt).**
   - Tier 1 — *"which of these markets are good for TAM"* / *"of these"* / *"among the ones I'm seeing"* → **NO master-weight change**. AI just nudges teacher-supply sub-metrics +8 to +12 so the strongest TAM markets float up inside the existing filtered set. NEVER goes above 50% on the named pillar.
   - Tier 2 — *"rank by TAM"* / *"focus on"* / *"lean toward"* → TAM ~55-60%, others reduced but all > 0.
   - Tier 3 — *"only TAM"* / *"100% TAM"* / *"purely"* / *"ignore the rest"* → TAM 100%, others 0%.
   - When in doubt, the model is told to pick Tier 1. Over-rotating distorts the entire ranking.

2. **Ask AI now gets the real session state.** Every request sends the current applied filters (state/tier/min score), the current pillar weights, visible vs total market count, and watchlist size. The AI was flying blind before — it couldn't tell the difference between "of these markets" and "of all markets" because it didn't know what "these" was.

3. **Sub-metric boosts are now applied.** The edge function was already returning `subMetricBoosts: [{ key, delta, pillar, label }]`, but the frontend ignored them. Now they're added to the per-pillar sub-weights and re-normalized so the pillar still sums to 100. This is what makes Tier 1 ("just float the good TAM markets up") actually work — without it the AI had no fine-grained lever and was forced to use master weights for everything.

4. **Reasoning panel opens by default** on the AI answer card. Haseeb's rule: AI never hides its reasoning.

5. **AI prompt now requires the reasoning to be transparent about what it did NOT change**, not just what it did.

**Why.** Haseeb's verbatim feedback: *"in this query you tell me honestly what is height weiht can be done to TAM as per query. the resoning and weight are fucked as per query."* Same query produced the same bad behavior after the prior round of fixes because the underlying intent classifier didn't exist — only the labeling was fixed.

**Touches.** `supabase/functions/ai-city-query/index.ts` (prompt rewrite), `src/hooks/citySearch/useAskAi.ts` (sends session), `src/pages/CityScoring.tsx` (syncs session ref + applies subMetricBoosts), `src/components/city-scoring/AiAnswerCard.tsx` (reasoning open, boost chips, fixed "Competition" label to "Competitive Opportunity"), `src/components/city-scoring/RankedMarketsList.tsx` (already had 0-rows empty state from prior round).

**Approved by.** Plan written + presented to Haseeb. Haseeb confirmed the 3-tier rule. Brett — please flag if any tier should be tuned differently.

**Risk.** Medium. The prompt is the only behavior change for already-deployed users; scoring math + slider math are untouched. If the AI starts misclassifying intent, the user can always say "rank by TAM" explicitly to force Tier 2. Sub-metric boost application is additive to existing sliders and re-normalized so each pillar still sums to 100 — same invariant as the manual Sub-Metric Weights drawer.

**Revert.** Roll back the 5 files above; redeploy `ai-city-query` from git history.

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
