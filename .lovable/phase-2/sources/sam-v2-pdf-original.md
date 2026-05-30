# Document parsed from: neuron-garage-module1-enhancements-v2.pdf

## Page 1

# Neuron Garage Acquisition Platform

## Module 1 Enhancements — Feature 1A & Feature 1B

### Working Product Direction Summary for Integral Associates

**Version:** 2.0 (revised) **Updated:** May 2026 **Predecessor:** *Module 1 Feature 1 — City Search v1.0 (948 cities, 12 metrics across 3 categories)*

## Executive Summary

Version 1 successfully delivered a foundational City Search capability that ranks U.S. cities by demographic and structural fit. As we evaluated Version 1, we recognized that many of the original v1.0 concepts were either too difficult to collect reliably at scale or required enrichment costs that could not be justified across hundreds of cities.

The next phase of Module 1 narrows the question and improves the signal. We are building two new, distinct features that operate on a curated shortlist of 25–50 cities promoted out of v1.0:

*   **Feature 1A — Market Validation Engine** *Question:* “Is this a validated premium enrichment market with active, paying demand?”
*   **Feature 1B — Site Analysis Engine** *Question:* “How attractive is this specific school location?”

These are intentionally different questions, asked at different times in our funnel, and they are built as separate features.

## Product Philosophy

The biggest lesson from Version 1 is that complexity does not necessarily improve predictiveness. Our principles for Module 1 enhancements:

*   **Observable signals over theoretical signals.** Measure what providers and families actually do, not what demographics suggest they might do.
*   **Auditable data over difficult-to-verify data.** Every score traces to a source URL and a captured screenshot.
*   **Both supply and demand are measured.** v1.0 measured eligibility. Module 1.5 measures both who supplies premium enrichment in the market and whether that supply is selling out.
*   **Simplicity over complexity.** A system the team, future developers, and prospective franchisees can understand and trust.

## What We Are Not Trying To Do

Feature 1A is **not** attempting to predict whether a specific Neuron Garage location will succeed. Too many variables influence success — franchisee quality, sales ability, marketing execution, facility selection, customer experience, local partnerships, recruiting and staffing. A strong market can fail under weak execution; a strong operator can succeed in a mediocre market.

Conceptually:

$$ Success Probability \approx \underbrace{Market Validation}_{Feature 1A} \times \underbrace{Site Attractiveness}_{Feature 1B} \times \underbrace{Franchisee Quality \times Execution Quality}_{future modules} $$

Module 1 enhancements address the first two factors only.

## Page 2

## Module 1 Architecture

### Existing — City Search (v1.0)

*Reduces the universe to a manageable shortlist of high-opportunity candidates.* Typical output: top 20–50 markets for further evaluation. No changes in this scope.

### New — Feature 1A: Market Validation Engine

Determines whether a market demonstrates the behaviors, spending patterns, and ecosystem characteristics that have historically supported premium children’s enrichment businesses.

**Primary output:** branded PDF report shareable internally or with prospective franchise candidates.

**Primary composite:** Premium Enrichment Ecosystem Score (0–100), reflecting both supply maturity *and* observed absorption of that supply.

### New — Feature 1B: Site Analysis Engine

Evaluates a specific school location and surrounding neighborhood. Helps franchise candidates compare multiple potential host facilities.

**Primary output:** branded Site Opportunity Score with comparison view across multiple sites.

## Page 3

## FEATURE 1A — Market Validation Engine

The composite score is the weighted sum of six sub-scores. Each sub-score is normalized 0–100 across the shortlisted cities. All weights are sliders with “Show Formula” drawers per the v1.0 doctrine.

### Composite Formula

Premium Enrichment Ecosystem Score =
    0.20 × Pricing Acceptance Score
+ 0.25 × Market Absorption Score ← new, demand-side signal
+ 0.20 × Scaled Operator Score
+ 0.10 × Enrichment Diversity Score
+ 0.10 × Market Depth Score
+ 0.15 × Market Balance Index

The single most consequential change from v1 of this direction is the addition of **Market Absorption Score** as the dominant weight. Without it, every other score measures supply — providers, prices, categories. Markets where supply exists but doesn’t sell out look identical to markets where supply sells out by March. They are not the same market, and the score must tell us which is which.

### Score 1 — Pricing Acceptance Score

**Question:** Are families already paying Neuron Garage-level pricing?

#### Signals & Calculation

Replace the single $400+ threshold with three signals capturing the *shape* of the local price distribution:

<table>
    <tr>
        <th>Signal</th>
        <th>Formula</th>
    </tr>
    <tr>
        <td>Median premium price/week</td>
        <td>median of all premium provider weekly prices</td>
    </tr>
    <tr>
        <td>75th percentile premium price/week</td>
        <td>75th percentile of the same set (Neuron Garage’s positioning anchor)</td>
    </tr>
    <tr>
        <td>% of premium providers at $500+/week</td>
        <td>count(price ≥ $500) ÷ total premium providers</td>
    </tr>
</table>

#### Sub-score Calculation

Pricing Acceptance Score =
    0.40 × normalize(median price, range $300–$700)
+ 0.40 × normalize(75th percentile, range $400–$800)
+ 0.20 × (% at $500+)

Normalization is min-max against the typed range, capped 0–100. A market with median $550, 75th-percentile $625, and 60% of premium providers at $500+ produces a score around 75–85.

#### Rationale

Two markets with “80% of providers above $400” can have wildly different ability-to-pay profiles. One with median price $410 prices much differently than one with median $625. Distribution shape matters more than crossing a single threshold.

#### Data Sources

Provider websites, camp registration platforms (Sawyer, ActivityHero, CampBrain, CampMinder), camp directories, aggregator listings. Same data pull powers Market Absorption — collected once.

### Score 2 — Market Absorption Score (NEW)

## Page 4

**Question:** Are existing premium operators actually selling out?

This is the dominant demand-side signal in the model. A market where premium camps sell out in March is fundamentally different from one where they still have inventory in May, even if every other metric is identical.

## Signals

Three signals built from week-level registration state across the premium provider universe:

<table>
    <tr>
        <th>Signal</th>
        <th>Formula</th>
        <th>Available</th>
    </tr>
    <tr>
        <td>**Sellout Rate**</td>
        <td>(sold_out weeks + waitlist weeks) ÷ total weeks scraped</td>
        <td>Year 1</td>
    </tr>
    <tr>
        <td>**Time-to-Sellout**</td>
        <td>average (sellout date − registration open date) ÷ season length</td>
        <td>Year 1 if multi-scrape, else Year 2</td>
    </tr>
    <tr>
        <td>**Year-over-Year Velocity**</td>
        <td>% of weeks sold out at this scrape date vs. same date last year</td>
        <td>Year 2 onward</td>
    </tr>
</table>

## Sub-score Calculation

```text
Market Absorption Score =
    0.60 × normalize(Sellout Rate, range 0%–80%)
  + 0.25 × normalize(Time-to-Sellout, inverse — earlier = higher score)
  + 0.15 × normalize(YoY Velocity, range -20% to +30%)
```

In the first year of operation, only Sellout Rate is fully populated. The other two come online with subsequent scrapes. The score gracefully degrades — if only Sellout Rate is available, it carries the full weight.

## Data Collection Methodology

**Pipeline (5 stages):**

1. **Discovery** — Apify Google Maps actor identifies premium providers in each shortlisted city. (Same scrape as Pricing Acceptance.)

2. **Registration page identification** — Firecrawl sitemap + classifier prompt finds each provider’s registration listing page.

3. **Structured extraction** — Gemini 2.0 Flash via Lovable AI Gateway extracts week-by-week registration state into a strict JSON schema:

```json
{
  "camp_provider": "Galileo Frisco",
  "scrape_date": "2026-03-15",
  "weeks": [
    {
      "week_label": "Week 1: June 9-13",
      "theme": "Innovation Lab",
      "price": 549,
      "age_range": "5-7",
      "status": "sold_out",
      "status_evidence": "Red 'SOLD OUT' badge over week tile",
      "confidence": 0.95
    }
  ]
}
```

The <mark>status</mark> enum has five values: <mark>sold_out</mark>, <mark>waitlist</mark>, <mark>low_availability</mark>, <mark>open</mark>, <mark>unknown</mark>. Each extracted week carries a <mark>status_evidence</mark> field that grounds the classification in the visual cue on the page — this is the audit trail.

4. **Confidence gating + human QA** — Any week with confidence < 0.7 is routed to a simple internal review queue (page screenshot + LLM classification + four-button correction UI). Roughly 10–15 minutes per shortlisted city per scrape.

5. **Aggregation** — Week-level statuses roll up to provider-level and city-level absorption rates.

Signal types the extraction recognizes (all derived from real camp-website patterns):

## Page 5

<table>
    <tr>
        <th>Signal</th>
        <th>Example</th>
        <th>Confidence</th>
    </tr>
    <tr>
        <td>Explicit sellout language</td>
        <td>“SOLD OUT”, “Registration Closed”, “Full”</td>
        <td>High</td>
    </tr>
    <tr>
        <td>Waitlist language</td>
        <td>“Join Waitlist” replacing “Register” CTA</td>
        <td>High</td>
    </tr>
    <tr>
        <td>Scarcity language</td>
        <td>“Only 2 spots left”, “Last few spots”</td>
        <td>High but noisy</td>
    </tr>
    <tr>
        <td>Missing register button</td>
        <td>Week listed but CTA absent/disabled</td>
        <td>Medium</td>
    </tr>
    <tr>
        <td>Early-close evidence</td>
        <td>Weeks closed before published deadline</td>
        <td>Medium-high</td>
    </tr>
</table>

**Temporal cadence (this is what makes the score predictive):**

A single point-in-time scrape gives a snapshot. Five scrapes across registration season give a curve, and the curve is the actual predictive signal.

<table>
    <tr>
        <th>Scrape date</th>
        <th>What it tells us</th>
    </tr>
    <tr>
        <td>Mid-January</td>
        <td>Baseline (registration just opened). Sellouts here = exceptionally hot.</td>
    </tr>
    <tr>
        <td>Mid-February</td>
        <td>Early-bird response. Sellouts here = strong, sophisticated market.</td>
    </tr>
    <tr>
        <td>Mid-March</td>
        <td>Most diagnostic single snapshot.</td>
    </tr>
    <tr>
        <td>Mid-April</td>
        <td>Mainstream window.</td>
    </tr>
    <tr>
        <td>Mid-May</td>
        <td>Last-call. Markets still open here are weak.</td>
    </tr>
</table>

For initial validation in Year 1, a single mid-March scrape per shortlisted city is sufficient to prove the pipeline. Five-scrape cadence comes online in Year 2 for any city under active evaluation.

## Tooling Summary

<table>
    <tr>
        <th>Tool</th>
        <th>Role</th>
        <th>Status</th>
    </tr>
    <tr>
        <td>Apify Google Maps actor</td>
        <td>Provider discovery</td>
        <td>Already wired in v1.0</td>
    </tr>
    <tr>
        <td>Firecrawl</td>
        <td>Page fetching + screenshot capture</td>
        <td>Already wired in v1.0</td>
    </tr>
    <tr>
        <td>Gemini 2.0 Flash via Lovable AI Gateway</td>
        <td>Structured extraction</td>
        <td>Already wired in v1.0</td>
    </tr>
    <tr>
        <td>Supabase Postgres</td>
        <td>Week-level data store</td>
        <td>Already in stack</td>
    </tr>
    <tr>
        <td>Supabase Storage</td>
        <td>Raw HTML + screenshot archive</td>
        <td>Already in stack</td>
    </tr>
    <tr>
        <td>Inngest or Trigger.dev</td>
        <td>Background scrape scheduling</td>
        <td>New, ~$20–50/month</td>
    </tr>
    <tr>
        <td>Internal review UI</td>
        <td>Low-confidence QA queue</td>
        <td>New, ~3–5 days of work</td>
    </tr>
</table>

**Screenshot capture is non-negotiable.** Every registration page scrape stores a full-page screenshot in Supabase Storage with date + URL. This is the visual ground truth for any contested classification and the audit defense for any Market Brief claim.

## Cost Per City

* Apify Maps (shared with other scores): ~$0 marginal
* Firecrawl (~60 pages including registration sub-pages): $3–6
* Gemini Flash extraction: ~$0.10
* Storage + DB: negligible

**~$3–6 per scrape per city.** Five scrapes per active city per year = ~$15–30 per city per year. For a 25-city shortlist, the full Market Absorption pipeline runs $400–750/year. Human QA time adds 1–2 hours per scrape cycle across the full shortlist.

## Page 6

## Failure Modes To Plan For

<table>
    <tr>
        <th>Mode</th>
        <th>Handling</th>
    </tr>
    <tr>
        <td>Provider has no public registration page (email/phone only)</td>
        <td>Marked <mark>unknown</mark>. If &gt;20% of premium providers in a market, the city's score gets a low-confidence badge.</td>
    </tr>
    <tr>
        <td>Provider doesn't list weeks individually</td>
        <td>Treated as one observation per provider rather than per week. Coarser but still usable.</td>
    </tr>
    <tr>
        <td>Bot detection</td>
        <td>Firecrawl rotating proxies handle most. Chronic offenders fall back to manual screenshot during the review cycle.</td>
    </tr>
    <tr>
        <td>JS-heavy registration platforms (Sawyer, CampMinder)</td>
        <td>Firecrawl with JS render wait. Hit underlying APIs only as a v2 optimization if cost becomes an issue.</td>
    </tr>
</table>

## Score 3 — Scaled Operator Score

**Question:** Have sophisticated enrichment operators already validated this market?

### Why The Score Splits Into Two Numbers

In our first draft, all scaled-operator presence was treated equally. This collapses two important distinctions:

*   **Competitive overlap.** Steve  Steve & Kate's at $700/week is in Neuron Garage's lane. Code Ninjas' 1-week robotics intro is adjacent. Mad Science's after-school program is distant.

*   **Validation vs. saturation.** A market with 5 operators each running 4 sites isn't 5× as good as one with 5 operators each running 1 site. The first might be saturated; the second is validated but uncrowded.

### Signals & Tagging

Each scaled operator is tagged with two attributes during extraction:

<table>
    <tr>
        <th>Attribute</th>
        <th>Values</th>
    </tr>
    <tr>
        <td>Competitive overlap</td>
        <td><mark>direct</mark> (price + age + theme overlap with NG) / <mark>adjacent</mark> (partial overlap) / <mark>distant</mark> (different segment)</td>
    </tr>
    <tr>
        <td>Local site count</td>
        <td>integer (number of locations of this operator in the metro)</td>
    </tr>
</table>

### Sub-score Calculation

The score exposes two derived numbers — they often move in opposite directions, and that opposition is itself diagnostic.

```text
Operator Validation = count of distinct national operators present in market
                      (capped at 8 to avoid overweighting)

Direct Competitor Load = sum of site counts for operators tagged 'direct',
                         per 10,000 kids ages 5–12

Scaled Operator Score =
    0.65 × normalize(Operator Validation, range 0–8)
  + 0.35 × (100 − normalize(Direct Competitor Load, range 0–5 per 10k))
```

Higher validation count = better. Higher direct competitor load = worse. The score rewards markets that are validated but not yet crowded with direct competition.

### National Operator Watchlist

Starting list (extendable in the slider UI):

Galileo, Steve  Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan Learning summer programs, Mathnasium summer enrichment.

Each tagged with default overlap classification, editable per-city if local context warrants.

## Page 7

## Score 4 — Enrichment Diversity Score

**Question:** Do families in this market invest in a variety of enrichment experiences?

### Signal & Calculation

Category Count = number of distinct enrichment categories with ≥1 premium provider (eligible categories below)

Diversity Ratio = Category Count ÷ Premium Provider Count

Enrichment Diversity Score =
0.70 × normalize(Category Count, range 2–10)
+ 0.30 × normalize(Diversity Ratio, range 0.1–0.6)

The category count rewards breadth; the diversity ratio penalizes markets that are deep-but-narrow (10 robotics camps and nothing else doesn’t actually demonstrate broad enrichment spending).

### Eligible Categories

STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship.

## Score 5 — Market Depth Score

**Question:** How large is the premium enrichment ecosystem?

### Signal & Calculation

Premium Provider Count = count of distinct premium enrichment providers in market

Market Depth Score = normalize(Premium Provider Count, range 4–40)

A market with 40 premium providers behaves differently from one with 4. Simple, auditable, and largely captured by other scores — hence the modest 10% weight.

## Diagnostic — Market Balance Index

**Question:** Is there still room in this market?

### Signal & Calculation

Coverage Ratio = Affluent Dual-Income Family Count ÷ Premium Provider Count
(families defined as: dual-income, HH income ≥ $150k, kids ages 5–12)

Market Balance Index = normalize(Coverage Ratio, range 50–500)

≥ 350 → Underserved
200–349 → Balanced
100–199 → Competitive
< 100 → Saturated

This is the supply-demand bridge that doesn’t require capacity modeling.

## Premium Provider Definition

### Two-Stage Approach (Revised)

Rather than excluding non-premium camps entirely from data collection, we collect the **full** camp universe in each

## Page 8

shortlisted city and classify each provider:

<table>
    <tr>
        <th>Tier</th>
        <th>Definition</th>
    </tr>
    <tr>
        <td>**Premium**</td>
        <td>Price ≥ $400/week AND (STEM/maker/robotics/coding/science/art/theater/music/academic enrichment) AND not childcare-positioned</td>
    </tr>
    <tr>
        <td>**Mid**</td>
        <td>$250–$399/week, enrichment-positioned</td>
    </tr>
    <tr>
        <td>**Budget**</td>
        <td>&lt; $250/week OR community/parks-and-rec/YMCA-positioned</td>
    </tr>
    <tr>
        <td>**Community**</td>
        <td>Faith-based, scholarship-driven, or municipally subsidized</td>
    </tr>
</table>

**The six sub-scores in Feature 1A are computed only from the Premium tier.** But the full dataset is captured for:
* Pricing-ladder context in the Market Brief (where premium sits relative to mid/budget)
* A “Premium share of total camp inventory” diagnostic metric (premium count ÷ all camps)
* Investigation when a market scores anomalously

The marginal cost of collecting and classifying mid/budget providers is ~$5–10 per city in additional LLM extraction. Worth it for the context.

## Included Categories (Premium)
STEM camps, Robotics camps, Coding camps, Science camps, Maker programs, Art camps, Theater camps, Music camps, Academic enrichment programs, Debate programs, Chess programs, Entrepreneurship programs.

## Excluded From Premium Tier (but still collected)
Childcare camps, general day camps, YMCA-style camps, parks-and-recreation camps, summer daycare programs, faith-based camps.

## Feature 1A Report Requirements
Branded PDF deliverable:
1. **Executive Summary** — composite score, tier, single-sentence verdict
2. **Premium Enrichment Ecosystem Score** breakdown with Show Formula
3. **Market Absorption Analysis** — sellout rates, time-to-sellout curve (when available), week-level evidence table
4. **Pricing Analysis** — distribution chart, median + 75th percentile, comparison to Neuron Garage target pricing
5. **Scaled Operator Analysis** — operator list with overlap classifications and site counts
6. **Enrichment Diversity Analysis** — category breakdown
7. **Market Depth Analysis** — provider count vs. peer cities
8. **Market Balance Index** — supply/demand context
9. **Market Strengths**
10. **Market Risks**
11. **SWOT Summary**
12. **Methodology Appendix** — scrape dates, sample sizes, confidence levels, evidence URL index

## Page 9

# FEATURE 1B — Site Analysis Engine

## Purpose

Evaluate a specific school location and surrounding neighborhood. Help franchise candidates compare multiple potential host facilities.

## Inputs

**Required:** School Name, School Address **Optional:** School Type, Enrollment

## Primary Output

Site Opportunity Score (0–100) with comparison view across multiple candidate sites.

## Composite Formula

```text
Site Opportunity Score =
    0.25 × School Profile Score
  + 0.25 × Neighborhood Affluence Score
  + 0.20 × Family Density Score
  + 0.15 × School Ecosystem Score
  + 0.15 × Accessibility Score
```

## Score 1 — School Profile Score

**Signals:** School Type, Grade Levels Served, School Enrollment

```text
School Profile Score =
    0.50 × school_type_factor
        (Private elementary = 100,
         Public elementary  = 70,
         Charter elementary = 75,
         Montessori         = 85,
         Other K-8          = 50,
         Other              = 30)
  + 0.25 × normalize(Enrollment, range 150–800)
  + 0.25 × grade_alignment_factor
        (K-5 or K-6   = 100,
         K-8          = 80,
         Pre-K through 5 = 95,
         Other        = 50)
```

**Rationale:** All three operating Neuron Garage locations in the FDD are at private elementary schools. School type carries the strongest weight because the FDD evidence is consistent on this point.

## Score 2 — Neighborhood Affluence Score

**Analysis radius:** 10-minute and 15-minute drive time isochrones.

**Signals:** Median household income, % households above $150k, % dual-income households — measured at census-tract level within each isochrone.

```text
Neighborhood Affluence Score =
    0.40 × normalize(Median HHI 10min, range $80k–$200k)
  + 0.35 × normalize(% HH above $150k, range 10%–50%)
  + 0.25 × normalize(% Dual-Income HH, range 40%–80%)
```

The 10-minute isochrone is weighted 60% and the 15-minute weighted 40% in the underlying normalization, because closer families are materially more likely to enroll.

## Page 10

**Data sources:** Census ACS (already in stack via v1.0), with drive-time isochrones from Mapbox or HERE Maps API.

## Score 3 — Family Density Score

**Signals:** Families with children ages 5–12, total children ages 5–12, within 10-min and 15-min drive time.

```text
Family Density Score =
    0.50 × normalize(Children 5–12 within 10min, range 1,000–15,000)
 + 0.30 × normalize(Children 5–12 within 15min, range 3,000–40,000)
 + 0.20 × normalize(Families with kids 5–12 within 10min, range 500–8,000)
```

## Score 4 — School Ecosystem Score

**Signals:** Elementary school count, private school count, nearby student population — within 15-minute drive.

```text
School Ecosystem Score =
    0.40 × normalize(Elementary school count, range 3–25)
 + 0.30 × normalize(Private school count, range 1–10)
 + 0.30 × normalize(Total nearby student pop, range 2,000–25,000)
```

More nearby schools = more channels to reach families with promotional partnerships.

## Score 5 — Accessibility Score

**Signals:** Distance to major road, distance to highway, drive-time reach population.

```text
Accessibility Score =
    0.30 × accessibility_factor(distance to major road)
        (< 0.5 mi = 100, 0.5–1 mi = 80, 1–2 mi = 60, > 2 mi = 30)
 + 0.30 × accessibility_factor(distance to highway)
        (< 2 mi = 100, 2–4 mi = 80, 4–7 mi = 50, > 7 mi = 30)
 + 0.40 × normalize(Population reachable within 15min, range 50k–500k)
```

## Feature 1B Report Requirements

Branded PDF deliverable per site:

1. Executive Summary — Site Opportunity Score, recommendation, one-sentence verdict

2. School Profile Analysis

3. Neighborhood Affluence Analysis (with isochrone maps)

4. Family Density Analysis

5. School Ecosystem Analysis

6. Accessibility Analysis

7. Strengths

8. Risks

9. Opportunities

0. Recommendations

Side-by-side comparison view supports up to 4 candidate sites.

## Page 11

## Cost-Control Strategy (Reaffirmed)

<table>
  <thead>
    <tr>
      <th>Tier</th>
      <th>Module</th>
      <th>Run on</th>
      <th>Cost envelope</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Tier 1</b></td>
      <td>City Search (v1.0)</td>
      <td>Hundreds of cities</td>
      <td>Inexpensive federal data, pennies per city</td>
    </tr>
<tr>
      <td><b>Tier 2</b></td>
      <td>Market Validation Engine (1A)</td>
      <td>Shortlist of 25–50 cities</td>
      <td>$30–80 per city per scrape; $400–750/year for absorption cadence on a 25-city shortlist</td>
    </tr>
<tr>
      <td><b>Tier 3</b></td>
      <td>Site Analysis Engine (1B)</td>
      <td>On-demand per site</td>
      <td>Low volume, isochrones and ACS lookups are cheap</td>
    </tr>
  </tbody>
</table>

## Page 12

# Validation Plan

Before broad rollout, the framework is tested against historical Neuron Garage location performance — both successes and the one closure.

<table>
  <thead>
    <tr>
      <th>Location</th>
      <th>Market</th>
      <th>Site</th>
      <th>Outcome</th>
      <th>Validation use</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Trinity (Westlake)</td>
      <td>Austin</td>
      <td>Trinity Episcopal</td>
      <td>Strong &amp; growing<br>(101 campers/wk in 2025)</td>
      <td>Positive anchor</td>
    </tr>
<tr>
      <td>Wayside (Eden Park)</td>
      <td>Austin</td>
      <td>Wayside: Eden Park Academy</td>
      <td>Successful (63 campers/wk in 2025 after relocation)</td>
      <td>Positive anchor</td>
    </tr>
<tr>
      <td>St. Francis</td>
      <td>Austin</td>
      <td>St. Francis School</td>
      <td>Operating</td>
      <td>Positive anchor</td>
    </tr>
<tr>
      <td>Magellan → St. Francis</td>
      <td>Austin</td>
      <td>Relocated 2025</td>
      <td>Enrollment fell 65→50 on relocation</td>
      <td>Site-sensitivity test</td>
    </tr>
<tr>
      <td><b>LeafSpring (2023)</b></td>
      <td><b>Austin</b></td>
      <td><b>Daycare facility, far from customer base</b></td>
      <td><b>Closed after 27 avg campers/wk</b></td>
      <td><b>Negative anchor — critical</b></td>
    </tr>
<tr>
      <td>Telluride</td>
      <td>Telluride</td>
      <td>—</td>
      <td>Operating</td>
      <td>Positive anchor in a small market</td>
    </tr>
  </tbody>
</table>

**LeafSpring is the most important data point in the validation set.** It is the only labeled failure case, and the FDD narrative attributes the failure to commute distance from the established customer base — exactly what a properly tuned Feature 1B should detect. The test: does Feature 1B score the LeafSpring site materially lower than the Trinity site? If not, the weights need rework before broad rollout.

## External Validation Candidates (Year 1)

In addition to internal anchors, score 5–10 metros where Galileo, Steve & Kate’s, or comparable premium STEM operators have flagship multi-site presence for 5+ years (e.g., Bay Area suburbs, Seattle Eastside, North Dallas, Northern Virginia, Boston metro). These are proxy successes for “premium STEM camps work here.” If Feature 1A scores them in the top quartile of our shortlist, the model is directionally calibrated. Costs nothing additional once the engine is built.

## Page 13

## Key Goal

The objective is not to predict success. The objective is to provide a practical, evidence-based framework that helps Neuron Garage identify attractive markets and attractive facility locations — while remaining simple, explainable, auditable, and cost-effective to maintain.

Module 1.5 graduates the system from “demographic eligibility” (v1.0) to “observed market behavior” (Feature 1A) + “observed site-level fit” (Feature 1B). The Market Absorption Score, in particular, gives us our first true demand-side signal — what families in a market actually do, not what their demographic profile suggests they might do.

*End of revised direction document. Comments and edits welcome inline before this is converted into a formal SOW addendum.*


### Extracted images (23):
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_1.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_10.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_11.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_11_table_1_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_12.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_12_table_1_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_13.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_3.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_3_table_1_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_4.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_4_table_1_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_5.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_5_table_1_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_5_table_2_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_5_table_3_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_6.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_6_table_1_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_6_table_2_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_7.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_8.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_8_table_1_v2.jpg`
- `parsed-documents://20260530-230806-437417/neuron-garage-module1-enhancements-v2.pdf/images/page_9.jpg`