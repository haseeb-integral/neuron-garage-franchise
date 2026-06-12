# Site Analysis (1B) — decision-capture fixes

## What you're seeing (the bug)

The pill under the score (e.g. "Recommend" green) is **derived from the numeric threshold**, not from Brett's click. `SiteAnalysis.tsx` line 221–226 reads `tierBadge(site.composite)` — the score band. The "BRETT'S DECISION" row at the bottom (Recommend / Worth a look / Don't recommend) writes to a different state (`site_analysis_decisions.verdict` via `useSiteDecisions`). So they're disconnected: clicking "Worth a look" updates the bottom row but the top pill keeps showing the score-band label.

## What 1B actually exists for (SOW Item 2 + transcript)

Two jobs, in order:

1. **Calibration gate** — every run must pass "LeafSpring scores materially lower than Trinity." If it doesn't, the weights are wrong. This is the most important sentence in the SOW for 1B (line 344, 509).
2. **Pick one site to commit to** — score up to 4 candidate addresses, capture per-site verdict + notes, mark one **Winner**, and export a branded PDF decision pack to send to the landlord/candidate (SOW lines 369–438).

The current page shows the scores fine, but it doesn't *land the decision*: the top pill ignores Brett's call, there's no explicit calibration-gate pass/fail, no winner summary banner, and adding a real candidate site in the demo is disabled so Brett can't even simulate the workflow he'd use in production.

## Fix — 5 focused changes

### 1. Top pill = Brett's verdict (with score-band fallback)
- Pill under the big score reads `decision.verdict` if set, otherwise falls back to the score band.
- Add a small "auto" / "Brett's call" tag next to the pill so it's obvious which one is showing.
- Update pill color/label live when Brett clicks a verdict button below — single source of truth.

### 2. Calibration gate banner at top of compare grid
- New strip above the cards: **"Calibration gate: ✓ PASS — LeafSpring (41) is 45 points below Trinity (86)"** in green, or **✗ FAIL** in red if gap < 20.
- Computes from the two anchor cards in the compared set. Hidden when neither Trinity nor LeafSpring is present.
- Mirrors the locked SOW gate so Brett sees the most important test result without scrolling.

### 3. Winner summary banner
- When Brett marks one card as Winner, show a banner above the grid: **"★ Winner: Trinity Episcopal — Site Opportunity 86 · Brett's verdict: Worth a look"**.
- Empty-state copy when no winner: "Pick a winner to enable the decision pack."
- "Export decision pack" button enables only when a winner is selected (currently always enabled).

### 4. Enable "Add candidate site" in demo
- The two empty slot buttons currently say "Disabled in demo." Wire them to a small modal that takes school name + address + optional school type/enrollment and inserts a sample-scored card into the local compare list (still demo data — score is generated client-side from a stub, flagged SAMPLE). Lets Brett actually walk the decision flow end-to-end.

### 5. Notes show in summary + export, not just on each card
- Add a "Decision summary" panel under the grid: per-site row with verdict pill, score, winner star, and the note Brett wrote. Read-only, sourced from the same `useSiteDecisions` state.
- This is what gets exported in the decision pack PDF (already wired in `decisionsExport.ts` — confirm notes for non-winner sites flow through).

## Out of scope
- No formula, weight, threshold, or calibration-margin changes — those are Open Decisions in the v5 supplement, Brett's call.
- No real isochrones / Mapbox / HERE — still placeholder maps until Week 3.
- No DB schema changes — `site_analysis_decisions` already has everything we need.

## Files touched
- `src/pages/SiteAnalysis.tsx` — pill wiring, calibration banner, winner banner, summary panel, enable add-site modal.
- `src/components/phase2-demo/SiteDecisionControls.tsx` — emit verdict change so parent pill updates (already does via the hook; verify subscription path).
- `src/components/phase2-demo/AddCandidateSiteModal.tsx` *(new)* — small form + client-side stub score.
- `src/lib/decisionsExport.ts` — verify notes for non-winner sites are included; add winner-required guard.
- `.lovable/phase-2/CHANGELOG.md` — one-line entry.

After the fixes, the page will answer "what is Brett deciding here?" at a glance: **does the calibration gate hold, which of the up-to-4 sites wins, and what's the verdict + note that goes to the landlord.**
