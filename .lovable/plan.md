# Phase 11.5 — small polish (last trust phase)

Skipping 11.4 (peer benchmark). Two tiny UI changes only.

## What changes

### 1. "What-if" weight delta when you drag a slider
Right now when you drag a weight slider on a card, the score recalculates but you don't see the *effect* clearly.

**Add:** a small line under the big MVS number that appears only when a slider is moved away from default, like:
> *MVS would move from 64.2 → 67.8 with these weights*

This uses two values that are already computed in memory. No backend, no extra fetch.

### 2. Per-row trust dot in the Premium Providers table
Right now every row in the table looks the same. New user cannot tell which rows are clean vs. flagged.

**Add:** a small colored dot at the start of each provider row:
- 🟢 **Green** — has a readable price AND a category
- 🟡 **Yellow** — missing one (no price, or no category)
- 🔴 **Red** — provider is in the QA queue (needs human fix)

A small legend under the table explains the dots.

## What I will NOT touch

- Scoring math, weights defaults, `computeMvs`, `useLiveMvs`.
- Firecrawl, Supabase, edge functions, pipeline.
- Market Absorption / weekly absorption (stay removed).
- The premium providers table structure (only adds one column for the dot).

## Effort and risk

- 1 turn.
- UI only. Risk: very low.

## After this phase

Phase 11 is complete. The 5 cards will have:
- Plain-English meaning chip ✅ (11.1)
- Pillar-specific confidence sentence ✅ (11.1 fix)
- Per-input freshness pill ✅ (11.1)
- Known limitations panel ✅ (11.2)
- Click-a-number proof popovers ✅ (11.3)
- Live what-if delta on slider drag ✅ (11.5)
- Per-row trust dots in providers table ✅ (11.5)

Peer benchmark (11.4) stays parked for a separate dedicated phase.

Approve to build now?
