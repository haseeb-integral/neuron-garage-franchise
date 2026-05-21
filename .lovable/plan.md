## Confirmed decisions
- **Keep** TAM Teachers sub-weights at **20 / 25 / 15 / 15 / 25** (locked 2026-05-21 by Brett + Haseeb).
- **Keep** the existing Step 1 / Step 2 / Step 3 recipe blocks — do **not** hide them.
- **Add** a new two-line "Show Formula" panel **above** the recipe (category formula + overall city formula).
- **Add** a one-line provenance note showing who locked the TAM defaults and when.
- **Kill** the "server fallback" wording for TAM Teachers — replace with honest, specific states.

## Plan (frontend-only, one file)

### Step 1 — Two-line "Show Formula" panel (new, on top)
In `SubMetricWeightsDrawer.tsx`, insert a new `<FormulaLine />` block **above** the existing "How {city} got its {category} score" section. Two lines only:

```text
Category formula  (TAM Teachers — Denver)
  (Schools 72 × 20%) + (Teachers 88 × 25%) + (Private+Charter 64 × 15%)
+ (Enrollment 70 × 15%) + (Salary×COL 80 × 25%)  =  76.4

Overall city formula  (Denver)
  Demand 81 × 40%  +  TAM 76 × 30%  +  CSI 88 × 30%  =  82.5
```

- Inputs come from `previewRecompute.contributions` (already computed).
- Overall line uses the same Demand/TAM/CSI scores the center panel shows.
- Pure read-only display. No new data sources.

### Step 2 — Provenance line at the top of the TAM Teachers drawer
One small line, TAM Teachers only:

> *Default weights locked 2026-05-21 by Brett + Haseeb: 20 / 25 / 15 / 15 / 25. Edit below and click Apply.*

Other categories get a generic version ("Default weights from the scoring registry — edit below and click Apply.").

### Step 3 — Kill "server fallback" wording (TAM Teachers + everywhere)
Replace the yellow "All metrics unavailable — using the server's stored … as a fallback" box with one of these honest states:
- All sub-weights = 0 → **"All sub-weights are set to 0. Move at least one slider above 0 to compute a live score."**
- All metric values null for this city → **"This city is missing raw data for: {list of metric labels}. Last stored score: {n}."**
- Otherwise → the box does not render at all (the formula speaks for itself).

Also remove the `(server fallback)` suffix on the Live Values table footer (line 561).

### Step 4 — Keep Step 1/2/3 recipe + Live Values table
No changes to those sections. They stay exactly where they are, below the new two-line panel.

### Step 5 — Sanity check (no DB writes)
Spot-check 3 cities (Denver, Austin, one small-pop city): the new "Category formula" line result must match `score_tam_teachers` in `us_cities_scored` within ±1 point, and the "Overall city formula" must match `composite_score_default` within ±1 point. If anything drifts, we stop and report before merging.

## What we are NOT touching
- The math (40/30/30 master, 20/25/15/15/25 TAM sub).
- Database, edge functions, scoring engine.
- Any other drawer feature.

## Technical notes
- Files touched: `src/components/city-scoring/SubMetricWeightsDrawer.tsx` only.
- Zero migrations, zero edge-function changes, zero store changes.

**Approve and I'll ship steps 1–5 in one pass.**