# Fix /site-analysis: one input surface, read-only cards, one set of numbers

## What you saw and why

Looking at your screenshot, four symptoms — all from one architectural mistake I made last turn:

| Symptom | Root cause |
|---|---|
| Trinity card shows "Edge Function returned a non-2xx status code" | Trinity auto-ran on mount with `4131 Spring Valley Rd, Addison, TX 75001` and the engine errored. Need to read the function logs and fix the underlying call. Either way, the card shouldn't be auto-running its own request. |
| LeafSpring card shows **43.52** but Live Engine shows **55.8** for the same school | They were different inputs. Card auto-ran with `schoolType=daycare, gradeBand=other` (the historically correct anchor — LeafSpring was a daycare). You typed `Private elementary, K-5/K-6` into the Live Engine. Two inputs → two scores. Engine is consistent; the UI lets you run it twice with different inputs and surfaces both. |
| Whole page computes "everything" when you only ran LeafSpring | Trinity + LeafSpring cards auto-run on mount, independently of the Live Engine. Three independent engine calls per page load. |
| Each card duplicates the input form (name, address, school type, grade band, enrollment) | I built cards as independent forms. They should be display-only — the Live Engine is the one and only input surface. |
| Card titles truncate to "Trinity C…" / "Leaf…" | I used `truncate` instead of wrapping. |

## Fix — single input surface, read-only cards

```text
┌─ Live Site Analysis Engine ──────────────────────────────┐
│  School name * [_____________] Address * [_____________] │
│  School type ▾ Enrollment      Grade band ▾   [Compute]  │
│  Quick test: Trinity · LeafSpring · Highland · Cherry…   │
│  SAS: 55.8  …pillars…                                    │
│                                          [Save to slot ▾]│  ← NEW button
└──────────────────────────────────────────────────────────┘

┌─ Trinity Christian Academy [Positive anchor] ─── 51.1 ┐  ┌─ LeafSpring … (closed 2023) ─── 43.52 ┐  ┌─ + Add slot ─┐  ┌─ + Add slot ─┐
│  4131 Spring Valley Rd, Addison, TX                   │  │  7000 Preston Rd, Plano, TX           │  │              │  │              │
│  Private elementary · K-5/K-6 · enrollment —          │  │  Daycare · Other · enrollment 540     │  │              │  │              │
│                                                       │  │                                       │  │              │  │              │
│  [summary line]   [drive-time]   [6 tiles]            │  │  [summary] [drive-time] [6 tiles]     │  │              │  │              │
│  [pillar bars] [Show all formulas] [Brett's decision] │  │  [pillars] [formulas] [decision]      │  │              │  │              │
│  [↻ Re-run]                                  [✕ Remove]│  │                                      │  │              │  │              │
└───────────────────────────────────────────────────────┘  └───────────────────────────────────────┘  └──────────────┘  └──────────────┘
```

### Behavior changes

1. **Cards are read-only.** Remove the input form inside each card (name, address, school type, grade band, enrollment, Analyze button). Cards display the name (full, no truncate, wraps to 2 lines), address, inputs-used as a small caption row, score badge, summary, drive-time, 6 tiles, pillar bars, formula toggle, Brett's decision, Re-run, Remove.

2. **Live Engine is the only input surface.** When you click Compute SAS in the Live Engine and the result lands, a new "Save to slot ▾" button appears next to the SAS number, with options: "New slot", "Replace Trinity anchor" (only enabled if you confirm), "Replace LeafSpring anchor" (same), "Cancel". Picking a slot writes that exact engine result into the card. No re-computation, no second call — the card stores the result object the engine returned.

3. **Trinity + LeafSpring anchors are pre-seeded with canonical, frozen inputs and auto-compute once on first page load.** Inputs locked to:
   - Trinity: `Private elementary, K-5/K-6, 4131 Spring Valley Rd, Addison, TX 75001`
   - LeafSpring: `Daycare, Other, 7000 Preston Rd, Plano, TX 75024` (matches the SOW's "negative anchor — closed daycare")
   The anchors do not pull their inputs from whatever's typed in the Live Engine. That guarantees the calibration delta is reproducible across sessions.

4. **One canonical "number" per surface.** The card stores the engine `result` object verbatim. Pillars, composite, summary line, tiles all read from that object via `recomputeSiteScores`. The Live Engine and the card show the same numbers whenever they're showing the same input.

5. **Trinity 4131 Spring Valley Rd 500 error** — investigate before this ships. Action: pull `compute-sas` logs filtered to that address, identify whether it's Mapbox geocode, ACS sampling, or the Urban Institute call that's failing, and either fix the upstream call or render a clear inline error on the card (e.g. "Mapbox geocode returned no result — try a different address format"). The card UI should never show the raw "non-2xx status code" string to Brett.

6. **Title truncation gone.** Card title wraps to 2 lines, `title` attr keeps full string for hover.

7. **No auto-recompute on input edits.** Removing the input form removes the chain. The only triggers are: anchor first-mount (twice total per session, once each), explicit Re-run on a card, or saving a fresh Live Engine result into a slot.

## Files touched

1. **`src/pages/SiteAnalysis.tsx`** — rewrite `CandidateCard` as a display-only component that takes a `result` prop (no `useSiteScore` inside). Anchors get a small `useAnchorScore` wrapper that calls `useSiteScore` once with frozen inputs and passes the result down. Title wraps. Add a `candidates: Array<{ slot: 'trinity' | 'leafspring' | 'extra'; input: …; result: SiteScoreResult | null }>` state at the page level.

2. **`src/components/site-analysis/LiveEngineCard.tsx`** — add a "Save to slot ▾" dropdown that appears once a result is computed. Lifts the last result up via a new `onSaveToSlot(input, result)` callback.

3. **Edge function diagnosis only** (`supabase/functions/compute-sas/index.ts`) — read logs filtered to the Trinity address, decide whether the fix is in the geocode/ACS path or just clearer error surfacing in the UI. No engine rewrite — at most a try/catch + structured error message.

## Out of scope

- Persistence across reloads (still TODO on the checklist).
- Recalibrating LeafSpring vs Trinity weights (waiting on Brett).
- Real Mapbox tiles (schematic stays).

## Status logging

- Append to `.lovable/phase-2/CHANGELOG.md`.
- Update `Feature1BStatus`: tick "One input surface — cards are display-only" and "Card titles wrap", keep calibration item red.

## Test plan

1. Hard-refresh `/site-analysis`. Trinity + LeafSpring anchors compute once each (2 calls only, not 3). Both cards show full title.
2. Type a third school in the Live Engine, click Compute SAS, click "Save to slot ▾ → New slot". Slot 3 fills with the exact same SAS the Live Engine just showed. No second engine call.
3. Cards have no input fields. Re-run and Remove buttons work. Brett's decision pill works.
4. If Trinity 500s, the card shows a clear human-readable error, not "non-2xx status code", and Brett can still see LeafSpring's result.

Approve and I'll build it.
