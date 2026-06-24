## The problem

On a pillar card (e.g. Pricing Acceptance), two pills sit side by side:

- Green: **"Strong data coverage"** → about data quality
- Red: **"Weak premium pricing"** → about the market result (score = 21.6 / 100)

Both are correct, but they look like they disagree. The user wants the card to make it obvious that one is about **data** and one is about the **market**, and to also explain *why* the "Weak" label appears.

## What we will change (UI only, no math)

### 1. Rename the green/amber/red data pill (in `LiveCitySourcePanels.tsx`, `ConfidenceStamp`)

| Today | New |
|---|---|
| "Strong data coverage" | **"Data: strong"** |
| "Partial data coverage" | **"Data: partial"** |
| "Limited data coverage" | **"Data: limited"** |

The tooltip wording stays as-is.

### 2. Rename the market band pill so it's clearly about the market (in `LiveCityDeepDive.tsx`, `PILLAR_BAND_SUFFIX`)

| Today | New |
|---|---|
| "Weak premium pricing" | **"Market: weak premium pricing"** |
| "Mixed premium pricing" | **"Market: mixed premium pricing"** |
| "Strong premium pricing" | **"Market: strong premium pricing"** |
| "Very strong premium pricing" | **"Market: very strong premium pricing"** |
| "Weak operator validation" | **"Market: weak operator validation"** |
| …same for mid/strong/top | …same prefix |

For Market Balance, Enrichment Diversity, and Market Depth, add the same `Market: ` prefix to their band labels so all market pills read the same way.

### 3. Move the data pill away from the market pill

In the pillar card header (`LiveCityDeepDive.tsx`, around line 561–589), pull `<ConfidenceStamp />` out of the top row and place it on the **"High confidence — Based on 14 of 19 providers…"** line instead, so:

- Top row = title + weight % + **market pill** (Weak / Mixed / Strong)
- Confidence line = "High confidence — Based on 14 of 19 providers…" + **data pill** (Data: strong)

This visually groups each pill with the thing it actually describes.

### 4. Add a one-line "why" under the market pill

Right under the market band pill, add a short plain-English sentence that explains the band, e.g. for Pricing Acceptance:

> *Why: median weekly price is $437.50 and only 14% of providers are at $500+/wk, so the score is 21.6 / 100 (≤ 39 = weak).*

The sentence is built from the same `input` object already on the card (`medianPrice`, `pctAtLeast500`, score, band threshold). One helper `bandWhyFor(meta.key, score, input)` returns the sentence. Different sentence per pillar:

- **Pricing Acceptance** → median price, % ≥ $500/wk, score, threshold
- **Scaled Operator Validation** → national operators count, score, threshold
- **Enrichment Diversity** → categories represented, diversity ratio, score, threshold
- **Market Depth** → premium provider count, score, threshold
- **Direct Competition** → competitors per 10k kids, score, threshold
- **Market Balance** → coverage ratio, band cutoff (350 / 200 / 100)

If a needed input is null, we skip the sentence (no broken text).

## Files touched

- `src/components/phase2-demo/LiveCitySourcePanels.tsx` — rename pill labels in `ConfidenceStamp`.
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — rename band labels, move `<ConfidenceStamp />` to the confidence line, add `bandWhyFor` helper and render its sentence under the market pill.

No changes to scoring math, no changes to data, no DB / edge function changes. Sliders, weights, formulas, exports, compare modal, score popovers — all untouched.

## Risks

- Wider pill labels ("Market: weak premium pricing") may wrap on narrow screens. The pill is already inside a `flex-wrap` row, so it will wrap cleanly.
- The "why" sentence adds ~1 line of height per pillar card. Card `minHeight` is already 260; should still fit.
- Nothing else in the app reads these pill label strings (verified — they are inline JSX, no exports).

## Phases

**Phase 1 (1 turn):**
- Rename data pill labels (`ConfidenceStamp`).
- Rename market band labels (`PILLAR_BAND_SUFFIX` + Market Balance / Diversity / Depth labels) with `Market: ` prefix.
- Move `<ConfidenceStamp />` from the top row down to the confidence line.

**Phase 2 (1 turn):**
- Add `bandWhyFor(key, score, input, coverageRatio)` helper.
- Render the one-line "why" sentence right under the market pill.

## What to test after

Open any city → Pricing Acceptance card. You should see:

- Top row: title • weight % • **Market: weak premium pricing**
- Next line: small "Why: median $437.50, 14% at $500+/wk, score 21.6 ≤ 39 = weak"
- Confidence line: "High confidence — Based on 14 of 19 providers…" • **Data: strong**

Repeat across other pillar cards to confirm each has its own "why" sentence and no card is broken when an input is missing.
