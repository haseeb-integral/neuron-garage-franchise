## Plan: Add Project Glossary

Create `.lovable/phase-2/GLOSSARY.md` (lives with other Phase 2 docs, easy to update weekly) with ~18 high-value terms covering Phase 2 features, scoring concepts, data sources, and franchise/acquisition terms.

### File location
`.lovable/phase-2/GLOSSARY.md` — co-located with `phase-2-sow.md` and `phase-2-status.md`.

### Terms to include (alphabetical, one-line definitions)

**Data sources & tooling**
- **ACS** — American Community Survey, US Census Bureau. 5-year vintage 2023 (data 2019–2023) used for demographics: population, income, dual-income families, education, kids 5–12. Powers Market Balance Index (1A) and Neighborhood Affluence + Family Density (1B).
- **Apify** — Google Maps actor used by Manus to discover camp/enrichment providers per city.
- **Firecrawl** — Page fetching + screenshot capture; feeds registration-page extraction.
- **Gemini 2.0 Flash** — LLM (via Lovable AI Gateway) for structured extraction of camp week-level registration state.
- **NCES** — National Center for Education Statistics; school enrollment + type data for Feature 1B.
- **Mapbox / HERE Maps** — Drive-time isochrone APIs for Feature 1B (10/15-min).
- **Manus** — Heavy data-refinement pipeline tooling. Owns scrapes, extraction, scoring. Up to 4 Manus apps planned.

**Features**
- **Feature 1A — Market Validation Engine** — City-level composite (PEE Score) over 6 sub-scores; output is ranked shortlist + branded 12-section PDF.
- **Feature 1B — Site Analysis Engine** — Address-level Site Opportunity Score, up to 4-site compare, 10/15-min isochrones, branded per-site PDF.
- **PEE Score** — Premium Enrichment Ecosystem Score; 1A composite (temporary name, likely to change).
- **Site Opportunity Score** — 0–100 composite for Feature 1B.
- **Market Balance Index** — 1A sub-score (15% weight): Affluent Dual-Income Family Count ÷ Premium Provider Count.
- **Market Absorption** — 1A sub-score (25%, dominant): sellout rate + time-to-sellout + YoY velocity.

**Operating concepts**
- **Tier 1 / Tier 2 / Tier 3** — Cost-tiered analysis: Tier 1 = hundreds of cities, pennies/city (federal data); Tier 2 = 25–50 shortlist, dollars/city; Tier 3 = on-demand per site.
- **One calibrated number everywhere** — Brett's rule: all surfaces read pillar + composite scores from the same recomputed helper, never from stale DB-stored values.
- **Premium Provider** — Camp tier: price ≥ $400/week, enrichment-positioned (STEM/maker/robotics/coding/science/art/theater/music/academic), not childcare. The 6 sub-scores compute only on this tier.
- **Confidence gating** — Extractions with confidence < 0.7 route to internal human-QA review queue.

**Franchise / acquisition terms**
- **FDD** — Franchise Disclosure Document; source of truth for existing Neuron Garage location performance + validation anchors (Trinity, Wayside, St. Francis, LeafSpring).
- **LeafSpring** — Only labeled failure case in the validation set; the critical negative anchor for Feature 1B calibration.
- **Candidate Pipeline (1.5)** — Phase 2 item 3: pipeline upgrade for franchise candidates.
- **SmartLead** — Email outreach tool for Phase 2 item 6.
- **Shortlist** — The 25–50 cities promoted from Phase 1 city search into Feature 1A scoring.

### Header
Short preamble: "Living glossary for Neuron Garage Acquisition Platform. Updated weekly. Add new terms as they appear in chat or SOW."

### CHANGELOG entry
Append one line to `.lovable/phase-2/CHANGELOG.md`: today's date, Brett, "added GLOSSARY.md (initial ~18 terms covering Phase 2 features, scoring, data sources, franchise)."

### Out of scope
- No code changes.
- No edits to `phase-2-sow.md` or `phase-2-status.md`.
- Not adding the glossary to a Core memory rule (you said weekly updates — file-only is enough).