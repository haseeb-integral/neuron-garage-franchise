# Feature 1A — Market Validation Engine v1.0 Spec

> **Source of truth.** Locked v1.0 scope, naming, and design decisions for the Market Validation Engine. The [Feature 1A Lovable Build Plan](./feature-1a-build-plan.md) executes against this spec turn-by-turn. The [MVS Methodology page](/mvs-methodology) holds the math.

---

## 1. Scope (what v1.0 IS)

- **One score per shortlisted city: the MVS** (Market Validation Score). Replaces earlier names PEE and PCC.
- **6 sub-scores**, weight-blended into a single composite. Each normalized 0–100 across the shortlist (comparative, not national).
- **Composite formula** (locked):

  ```
  MVS = 0.20 × Pricing Acceptance
      + 0.25 × Market Absorption        ← dominant, demand-side
      + 0.20 × Scaled Operator
      + 0.10 × Enrichment Diversity
      + 0.10 × Market Depth
      + 0.15 × Market Balance           ← inside the composite
  ```

- **Sawyer-only data source** for v1.0. No ActivityHero, no Apify Google Maps. Adding additional platforms is a v1.1 decision.
- **Single mid-March scrape per city** in Year 1 — populates Sellout Rate only. Time-to-Sellout and YoY Velocity return null with a `year_2_signal` flag.
- **Manual trigger.** A manager-only "Run Pipeline" button per city. No scheduler in v1.0.
- **7 Tier A cities + Austin calibration.** Live rollout target: NYC, Houston, Chicago, Boston, San Antonio, Philadelphia, LA. Austin is the calibration city built first end-to-end.
- **Tier B cities (14) stay on sample data** behind the `mvs_data_source` per-city flag until v1.1.

## 2. Scope (what v1.0 is NOT)

Explicitly excluded — do not build, do not propose:

- ActivityHero, CampMinder, CampBrain, or any non-Sawyer platform.
- Apify Google Maps actor (deferred to v1.1 — Sawyer is sufficient for Austin + 7 Tier A).
- Inngest / Trigger.dev scheduling. Manual trigger only.
- Time-to-Sellout and YoY Velocity as scored inputs (Year 2).
- Scaled Operator "Years in City" sub-component.
- Moving Market Balance outside the composite.
- Tier B pipeline runs.
- Across-shortlist normalization changes.

## 3. Naming

- The canonical composite name is **MVS** (Market Validation Score).
- Previous names PEE (Premium Enrichment Ecosystem Score) and PCC (Per City Composite) are deprecated and must not appear in new code, tables, UI, or docs.
- Database namespace: `mvs_*` tables, `mvs-*` edge functions, `MVS_*` env flags.

## 4. Premium Provider Definition (tier classification)

The discovery pass collects the **full** kids-activity universe for each city. Tier is assigned at ingest by `mvs-classify-tier`.

| Tier      | Definition                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Premium   | Price ≥ $400/week AND STEM / maker / robotics / coding / science / art / theater / music / academic enrichment AND not childcare-positioned |
| Mid       | $250–$399/week, enrichment-positioned                                                                                                       |
| Budget    | < $250/week OR community / parks-and-rec / YMCA-positioned                                                                                  |
| Community | Faith-based, scholarship-driven, or municipally subsidized                                                                                  |

**Only Premium-tier providers flow into the six sub-scores.** Mid / Budget / Community are retained for audit and future analysis.

## 5. Audit & confidence

- **Screenshot capture is non-negotiable.** Every registration-page scrape archives a full-page screenshot with date + URL in Supabase Storage bucket `mvs-screenshots`. This is the audit defense for any Market Brief claim.
- **Confidence < 0.7 on week extraction** → row written to `mvs_qa_queue` for human review.
- **City low-confidence badge.** If more than 20% of a city's Premium providers have no public registration page, the city is flagged `low_confidence_badge=true` on `mvs_city_flags` and the UI surfaces it.

## 6. Operating doctrine (carries to every turn)

- **One calibrated number everywhere.** All MVS / sub-score math lives in **one helper** (`src/lib/mvs/computeMvs.ts`). Table row, detail panel, compare modal, PDF all read from it. No DB-stored composites.
- **Demo path stays alive.** `phase2DemoData.ts` is the default; the `mvs_data_source` per-city flag gates live vs sample. Cutover to live is per-city, reversible in one SQL statement.
- **Kill switch.** `MVS_PIPELINE_ENABLED` env secret (default `false`) gates every edge function.
- **Atomic & reversible turns.** Each turn in the Build Plan ships one concern with an explicit unwind.
- **No edits outside the MVS surface area.** `mvs_*` tables, `mvs-*` functions, `src/lib/mvs/*`, `src/pages/MarketValidation*`, `src/components/phase2-demo/*`. No edits to City Search, Teacher Search, Site Analysis, Candidate Pipeline, SmartLead, or shared `us_cities_scored`.

## 7. Calibration gate (Phase 7)

Boston MA must land in the top quartile of the 8-city live set (Austin + 7 Tier A). If not, halt the rollout and review weights before any client-facing demo.

## 8. Five open questions — all answered **yes** in chat

> Reconstructed from the locked decisions above. If the exact original wording matters, paste it from chat and I'll replace this section verbatim.

1. **Sawyer-only for v1.0, defer ActivityHero / Apify to v1.1?** → Yes.
2. **Keep the canonical name "MVS" (drop PEE and PCC)?** → Yes.
3. **Six sub-scores per the methodology, Market Balance inside the composite at 15%?** → Yes.
4. **Manual trigger only in v1.0 (no scheduler)?** → Yes.
5. **Roll out to 7 Tier A cities after Austin calibration, Tier B remains on sample data until v1.1?** → Yes.

## 9. Source-of-truth pointers

- **This spec** — the v1.0 scope and decisions (you are here).
- **[Feature 1A Lovable Build Plan](./feature-1a-build-plan.md)** — Phase 0–7, fixed turns, gates, unwinds. Re-read the exact turn text before building.
- **[MVS Methodology page](/mvs-methodology)** — the 6 sub-score formulas, weights, data sources, premium tier definition.

---

_Last updated as part of Phase 2 sign-off. Any change to weights, sub-scores, naming, or excluded scope requires updating this file and the methodology page in the same turn._
