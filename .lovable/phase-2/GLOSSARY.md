# Neuron Garage Acquisition Platform — Glossary

> Living glossary. Updated weekly. Add new terms as they show up in chat or in the SOW.
> One-line definitions only — link out to `phase-2-sow.md` for full detail.

## Data sources & tooling

- **ACS** — American Community Survey, US Census Bureau. 5-year vintage 2023 (data 2019–2023). Demographics: population, income, dual-income families, education, kids 5–12. Powers Market Balance Index (1A) and Neighborhood Affluence + Family Density (1B).
- **Apify** — Google Maps actor used by Manus to discover camp / enrichment providers per city.
- **Firecrawl** — Page fetching + screenshot capture; feeds registration-page extraction.
- **Gemini 2.0 Flash** — LLM (via Lovable AI Gateway) for structured extraction of camp week-level registration state.
- **NCES** — National Center for Education Statistics; school enrollment + type data for Feature 1B.
- **Mapbox / HERE Maps** — Drive-time isochrone APIs for Feature 1B (10/15-minute rings).
- **Manus** — Heavy data-refinement pipeline. Owns scrapes, extraction, scoring. Up to 4 Manus apps planned.

## Features

- **Feature 1A — Market Validation Engine** — City-level composite (PCC) over 6 sub-scores; output is ranked shortlist + branded 12-section PDF.
- **Feature 1B — Site Analysis Engine** — Address-level Site Opportunity Score, up to 4-site compare, 10/15-min isochrones, branded per-site PDF.
- **PCC — Per City Composite score** — The 1A composite.
- **Site Opportunity Score** — 0–100 composite for Feature 1B.
- **Market Balance Index** — 1A sub-score (15% weight): Affluent Dual-Income Family Count ÷ Premium Provider Count.
- **Market Absorption** — 1A sub-score (25%, dominant): sellout rate + time-to-sellout + YoY velocity.

## Operating concepts

- **Tier 1 / Tier 2 / Tier 3** — Cost-tiered analysis: Tier 1 = hundreds of cities, pennies/city (federal data); Tier 2 = 25–50 shortlist, dollars/city; Tier 3 = on-demand per site.
- **One calibrated number everywhere** — Brett's rule: every surface reads pillar + composite scores from the same recomputed helper, never from stale DB-stored values.
- **Premium Provider** — Camp tier: price ≥ $400/week, enrichment-positioned (STEM/maker/robotics/coding/science/art/theater/music/academic), not childcare. The 6 sub-scores compute only on this tier.
- **Confidence gating** — Extractions with confidence < 0.7 route to the internal human-QA review queue.

## Franchise / acquisition terms

- **FDD** — Franchise Disclosure Document; source of truth for existing Neuron Garage location performance + validation anchors.
- **LeafSpring** — Only labeled failure case in the validation set; the critical negative anchor for Feature 1B calibration.
- **Candidate Pipeline (1.5)** — Phase 2 item 3: pipeline upgrade for franchise candidates.
- **SmartLead** — Email outreach tool for Phase 2 item 6.
- **Shortlist** — The 25–50 cities promoted from Phase 1 city search into Feature 1A scoring.
