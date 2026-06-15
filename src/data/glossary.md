# Glossary

A living glossary of terms used across the Neuron Garage Acquisition Platform — features, scores, data sources, operating concepts, and franchise vocabulary. Updated weekly as the product and SOW evolve.

---

## Data Sources & Tooling

### ACS — American Community Survey
US Census Bureau survey, 5-year vintage 2023 (data 2019–2023). Source for demographics: population, household income, dual-income families, educational attainment, children ages 5–12. Powers the Market Balance Index in Feature 1A and the Neighborhood Affluence + Family Density sub-scores in Feature 1B.

### Apify
Google Maps actor used by Manus to discover camp / enrichment providers in each shortlisted city.

### Firecrawl
Page fetching and screenshot capture. Feeds registration-page extraction for Market Absorption scoring.

### Gemini 2.0 Flash
LLM accessed via the Lovable AI Gateway. Used for structured extraction of camp week-level registration state (sold out, waitlist, open, etc.).

### NCES — National Center for Education Statistics
School enrollment and school-type data used by Feature 1B (School Profile and School Ecosystem sub-scores).

### Mapbox / HERE Maps
Drive-time isochrone APIs powering the 10-minute and 15-minute rings in Feature 1B.

### Manus
Heavy data-refinement pipeline tooling. Owns the scrape, extraction, refinement, and scoring layers. Up to four Manus apps planned (City Search, Competitive Landscape, Market Validation, CSI / Market Saturation).

---

## Features

### Feature 1A — Market Validation Engine
City-level composite score (MVS — Market Validation Score) computed from six sub-scores. Output is a ranked shortlist plus a branded 12-section PDF report per city.

### Feature 1B — Site Analysis Engine
Address-level Site Analysis Score (SAO) with side-by-side comparison of up to four candidate sites, 10/15-minute drive-time isochrones, and a branded per-site PDF report.

### MVS — Market Validation Score
The 1A composite (previously PEE / PCC). Weighted blend of Pricing Acceptance (0.20), Market Absorption (0.25), Scaled Operator (0.20), Enrichment Diversity (0.10), Market Depth (0.10), Market Balance Index (0.15).

### Site Analysis Score (SAO)
The 1B composite. 0–100 score combining School Profile, Neighborhood Affluence, Family Density, School Ecosystem, and Accessibility.

### Market Balance Index
1A sub-score (15% weight). Affluent Dual-Income Family Count ÷ Premium Provider Count. Bridges supply and demand without modeling provider capacity.

### Market Absorption
1A sub-score, dominant at 25% weight. Captures whether premium operators are actually selling out: Sellout Rate, Time-to-Sellout, and Year-over-Year Velocity.

---

## Operating Concepts

### Tier 1 / Tier 2 / Tier 3
Cost-tiered analysis envelope. Tier 1 runs on hundreds of cities at pennies per city (federal data). Tier 2 runs on the 25–50 shortlist at dollars per city. Tier 3 runs on-demand per site. Never run Tier 2 work on a Tier 1 universe.

### One Calibrated Number Everywhere
Brett's rule: every surface — table cells, row popovers, selected-market panel, compare modal, exports, PDFs — reads pillar and composite scores from the same recomputed helper, never from stale DB-stored values.

### Premium Provider
Camp tier classification. Price ≥ $400/week, enrichment-positioned (STEM, maker, robotics, coding, science, art, theater, music, academic enrichment), and not childcare-positioned. The six 1A sub-scores compute only on this tier.

### Confidence Gating
Any extracted data point with model confidence below 0.7 is routed to the internal human-QA review queue (page screenshot + LLM classification + four-button correction UI).

### Shortlist
The 25–50 cities promoted from Phase 1 City Search scoring into Feature 1A. The scope of Tier 2 work.

---

## Franchise & Acquisition Terms

### FDD — Franchise Disclosure Document
The legal disclosure document for franchise prospects. Source of truth for existing Neuron Garage location performance and the validation anchors used to calibrate Feature 1B.

### LeafSpring
The only labeled failure case in the validation anchor set (closed Austin location, 2023). The critical negative anchor for Feature 1B calibration — if the model can't score it below the successful Austin locations, the weights need rework.

### Candidate Pipeline (1.5)
Phase 2 item 3: upgrade to the franchise candidate pipeline and intake flow.

### SmartLead
Email outreach tooling. Subject of Phase 2 item 6 (SmartLead / Email Outreach 1.5).
