# Site Analysis 1B — Real engine everywhere

Goal: every number on `/site-analysis` comes from the live `compute-sas` engine. No demo numbers, no fake "PASS" banner, no dead inputs.

## What the page will look like after

```text
┌───────────────────────────────────────────────────────────────┐
│ Site Analysis  ·  Phase 2 · Feature 1B                        │
│ Demo Preview banner (kept)                                    │
├───────────────────────────────────────────────────────────────┤
│ Live Site Analysis Engine (v0.1)            ENGINE LIVE       │
│ Quick test chips · School / Address / Type / Grade            │
│ [ Compute SAS ]                                               │
│ SAS: <live number>   + 5 pillar tiles                         │
├───────────────────────────────────────────────────────────────┤
│ Formula strip (kept, no "Austin metro" wording):              │
│ SAO = 0.25·Profile + 0.25·Affluence + 0.20·Density            │
│     + 0.15·Ecosystem + 0.15·Accessibility                     │
│ Thresholds: ≥75 Recommend · 60–74 Worth a look · <60 Don't    │
├───────────────────────────────────────────────────────────────┤
│ Calibration gate: <PASS/FAIL from REAL Trinity vs LeafSpring> │
│   Trinity Christian Academy (Addison, TX): <live score>       │
│   LeafSpring Plano (closed 2023):          <live score>       │
│   Gap: <delta> pts  (gate requires ≥20)                       │
├───────────────────────────────────────────────────────────────┤
│ Compare candidates (up to 4)                                  │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│ │ Card 1    │ │ Card 2    │ │ + Add     │ │ + Add     │       │
│ │ name+addr │ │ name+addr │ │ candidate │ │ candidate │       │
│ │ [Analyze] │ │ [Analyze] │ │           │ │           │       │
│ │ SAS 86    │ │ SAS 41    │ │           │ │           │       │
│ │ pillars   │ │ pillars   │ │           │ │           │       │
│ │ Recommend │ │ Don't rec │ │           │ │           │       │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
├───────────────────────────────────────────────────────────────┤
│ Decision summary table  (reads real card scores)              │
└───────────────────────────────────────────────────────────────┘
```

Removed entirely:
- "Analyze a site — Inputs not wired" box
- "Side-by-side compare — Austin metro" heading + the demo intro paragraph
- Fake green "Calibration gate: ✅ PASS" banner (replaced by real one)
- "SAMPLE" / "DEMO ONLY" tags
- Hardcoded Trinity Westlake + LeafSpring sample card content

Kept:
- The SAO formula line + thresholds (now under the engine, no "Austin metro")
- Decision points checklist
- 4 card slots + Recommend / Worth-a-look / Don't-recommend buttons + notes + Winner star
- Decision summary table at bottom
- Export decision pack button

## What changes in code

### 1. New shared hook `useSiteScore(input)`  (`src/hooks/useSiteScore.ts`)
- Wraps the same `supabase.functions.invoke("compute-sas", …)` + polling logic currently inside `LiveEngineCard`.
- Returns `{ status: 'idle' | 'loading' | 'ready' | 'error', result, error, run(input) }`.
- `result` shape matches `recomputeSiteScores()` input, so `siteComposite(result)` works directly.
- `LiveEngineCard` refactored to consume this hook (no behavior change for that card).

### 2. Replace demo cards with real candidate cards (`src/pages/SiteAnalysis.tsx`)
- New `CandidateCard` component: name input, address input, school type, grade band, "Analyze" button.
- On Analyze → calls `useSiteScore`. While loading: spinner. On ready: shows SAS headline + 5 pillar bars (recomputed via existing `recomputeSiteScores`).
- Local state: `candidates: CandidateCardState[]` (max 4). Two are pre-seeded:
  - Trinity Christian Academy, 4131 Spring Valley Rd, Addison TX 75001, K-6, private elementary
  - LeafSpring at Plano (closed 2023), 6304 Communications Pkwy, Plano TX 75024, PK-K, private elementary
- "+ Add candidate" pushes a new empty card (up to 4). Empty slot beyond that hidden.
- Decision buttons (Recommend / Worth-a-look / Don't-recommend / Mark winner / note) keep current behavior, now keyed off card id.
- Auto-run engine for the two pre-seeded cards on first mount so the page loads useful data without a click.

### 3. Real `CalibrationGateBanner`
- Reads the two pre-seeded candidates' live scores.
- Trinity score, LeafSpring score, gap; PASS if `trinity − leafspring ≥ 20`, else FAIL.
- While either is still loading, banner shows "Computing calibration…" not green PASS.

### 4. `DecisionSummary` table
- Rows come from `candidates` state, scores from `siteComposite(card.result)`.
- Verdict + winner + note columns read from card state.

### 5. Cleanup
- Remove `AnalyzeSiteCard` markup + state (the dead "Inputs not wired" box).
- Remove `Side-by-side compare — Austin metro` heading and the Austin-metro paragraph; keep formula + thresholds block under engine.
- Demo Trinity/LeafSpring objects in `src/data/phase2DemoData.ts` shrink to just `{ name, address, schoolType, gradeBand }` seed data — no hardcoded pillar values. Anything no longer referenced gets deleted.
- Export (`decisionsExport.ts`) reads from the same live `candidates` state.

### 6. Status / changelog
- Append entry to `.lovable/phase-2/CHANGELOG.md`.
- Update `.lovable/phase-2/phase-2-status.md` row 2 to "live cards + real calibration gate shipped; calibration still failing pending model signal (Brett)".

## Out of scope
- Fixing the underlying calibration failure (Trinity 51.1 vs LeafSpring 55.4) — needs a model-signal change, waiting on Brett.
- Persisting candidates across reloads (in-memory only this turn).
- Mapbox map tile rendering inside each card (kept as the existing circle placeholder).
- Any change to `compute-sas` edge function itself.

## How you'll test
1. Hard-refresh `/site-analysis`.
2. Wait ~5–10 s — Trinity card and LeafSpring card auto-fill with **the same numbers as the Live Engine** for those addresses.
3. Calibration gate banner shows the **real** Trinity vs LeafSpring numbers and PASS/FAIL based on real gap. (Will say FAIL today — that's correct.)
4. Click "+ Add candidate", type any school + address, hit Analyze — card fills with live engine output.
5. Click Recommend/Worth-a-look/Don't-recommend on any card; Decision summary table updates with real score + verdict.
6. Click Export decision pack — exported HTML shows live numbers.
