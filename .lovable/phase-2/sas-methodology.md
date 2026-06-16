# SAS Methodology — Site Analysis Score (Feature 1B)

**Status:** v0.3 engine live · weights client-locked · calibration gate qualitative
**Last updated:** 2026-06-16
**Owner:** Lovable (engine) + Brett (client decisions)
**Source of truth for weights & gate:** Sam's brief v2 (`.lovable/phase-2/sources/neuron-garage-module1-enhancements-v2.pdf`) and Brett's SOW v2.2 (`.lovable/phase-2/phase-2-sow.md`)

---

## 1. Pillar weights — **client-pinned, do not modify without Brett approval**

Per Sam's brief v2 p.9 ("Composite Formula"):

```
Site Opportunity Score =
  0.25 × School Profile Score
+ 0.25 × Neighborhood Affluence Score
+ 0.20 × Family Density Score
+ 0.15 × School Ecosystem Score
+ 0.15 × Accessibility Score
```

| Pillar | Weight | Source |
|---|---|---|
| School Profile | 0.25 | Sam brief v2 p.9 |
| Neighborhood Affluence | 0.25 | Sam brief v2 p.9 |
| Family Density | 0.20 | Sam brief v2 p.9 |
| School Ecosystem | 0.15 | Sam brief v2 p.9 |
| Accessibility | 0.15 | Sam brief v2 p.9 |

These are **client numbers**. Sam also wrote (brief v2 p.12): *"if not, the weights need rework before broad rollout"* — meaning any rework is a **Brett/Sam decision**, not a Lovable decision. Lovable will not reweight unilaterally.

### Sub-signal weights inside pillars

Also pinned by Sam (brief v2 p.9–11):

- **Affluence** — 60% × 10-min isochrone composite + 40% × 15-min isochrone composite (the only hard-coded ratio in the brief)
- **School Profile** — 0.50 × school_type_factor + 0.25 × enrollment_norm + 0.25 × tuition_norm
- **school_type_factor** values, enrollment normalization range (150–800), and other per-pillar normalization ranges are all pinned by Sam and may not be retuned without client approval.

---

## 2. Calibration gate — **qualitative, per Sam brief v2 p.12**

> *"The test: does Feature 1B score the LeafSpring site materially lower than the Trinity site? If not, the weights need rework before broad rollout."*

| Property | Value |
|---|---|
| Anchor pair | Trinity Christian Academy (positive) vs LeafSpring (closed-site negative) |
| Pass criterion | **Trinity ranks materially higher than LeafSpring** (qualitative) |
| Numeric threshold | **None specified by the client.** Any numeric gate (≥X point gap) is a judgment call reserved for Brett. |

### Retraction of prior Lovable-invented gate

Earlier versions of the Lovable status text and `CalibrationGateBanner` UI enforced a **"gap ≥ 20"** pass bar. **That threshold was invented by Lovable and is not in either client document.** It has been retracted from documentation as of 2026-06-16. The banner's hard-coded `>= 20` check remains in the UI pending Brett's decision on whether to (a) accept the qualitative criterion as-is, (b) ratify a numeric threshold, or (c) revise the anchor set.

---

## 3. Current calibration result (v0.3, live engine)

| Site | Composite SAS | Rank |
|---|---|---|
| Trinity Christian Academy | **63.32** | 1 ✓ |
| LeafSpring | 45.96 | 2 |
| **Gap** | **+17.36 pt** | Trinity higher |

**Per Sam's qualitative criterion:** Trinity ranks materially higher than LeafSpring → **gate plausibly satisfied, pending Brett confirmation.**
**Per Lovable's retracted ≥20 gate:** would fail by 2.64 pt — **but this gate is not in the client docs and no longer applies.**

---

## 4. Decision options open to Brett

Lovable will not change weights or the anchor set without explicit approval. Three doc-compliant paths:

1. **Accept v0.3 as calibrated** — Sam's pillar weights intact, Trinity ranked higher by 17.36 pt, qualitative criterion met. Lock and move on.
2. **Add a second anchor pair** — Sam explicitly endorses this on p.12 (e.g. Galileo or Steve & Kate's flagship as a second positive control). Stress-tests the score without touching weights.
3. **Authorize weight rework** — only Brett/Sam can. Must specify which pillar moves and by how much; any change is a client decision per brief v2 p.12.

---

## 5. Engine versioning

- `sas-v0.1` — initial implementation, stale normalization ranges
- `sas-v0.2` — Overpass / Mapbox / ACS wiring fixes (2026-06-16 AM)
- `sas-v0.3` — **current** — fixed three calibration bugs (sparse sampling, popReachable15 under-count, saturated ecosystem ranges); Trinity 63.32 / LeafSpring 45.96

No weight changes have ever been made in any version. All version-to-version movement comes from input-data fidelity fixes.

---

## 6. Change log for this document

- **2026-06-16** — Document created. Codifies Sam's pinned weights, retracts Lovable-invented ≥20 gate, restores Sam's qualitative "materially lower" criterion as the sole pass test, documents v0.3 live numbers. See `.lovable/phase-2/CHANGELOG.md` entry of same date for full context.
