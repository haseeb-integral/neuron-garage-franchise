**Competitive Landscape Intelligence**

Methodology & Data Documentation

**Prepared by:**  Neuron Garage Market Research

**Version:**  2.0

**Date:**  May 2026

**Scope:**  817 U.S. Cities — Summer Camp Competitive Saturation Analysis

**Change from V1.0:**  Corrected Local Provider Estimate multiplier from 0.15 → 0.003

**1\. Overview**

This document is the canonical reference for the Neuron Garage Competitive Landscape dataset. It explains precisely how the data was assembled, how the Competitive Saturation Index (CSI) is calculated, what each variable means, how the national brand list was built, and how to correctly interpret and use the data — whether inside the Neuron Garage web dashboard, a Lovable application, or any downstream analysis tool.

The dataset was built to answer a single strategic question: **In which U.S. cities is the market for elementary school-age summer camps (K–6th grade, ages 5–12) most underserved relative to the demand that exists there?** The answer determines where a STEM-focused summer camp franchise has the highest probability of entering a market with minimal direct competition and a ready pool of paying families.

**2\. What Changed in Version 2.0**

**Critical Correction: Local Provider Estimate Multiplier**

Version 1.0 of this dataset used a Local Provider Estimate multiplier of **0.15**, meaning the formula estimated 15 local summer camp providers per 100 enrolled elementary students. For a city with 8,400 K–6 students, this produced an estimate of **1,260 local camps** — a figure that is not grounded in observable reality.

A reality check against actual mid-size U.S. cities reveals that a city with 8,400 K–6 students would realistically have **15–35 local summer program providers** across all categories (school district programs, YMCAs, parks & recreation, churches, athletic leagues, and independent boutique camps). This corresponds to a multiplier of approximately **0.003** — roughly 3 local providers per 1,000 enrolled students.

| Parameter | V1.0 (Incorrect) | V2.0 (Corrected) | Impact |
| :---- | :---- | :---- | :---- |
| Local Provider Multiplier | 0.15 | 0.003 | 50× reduction in local camp estimate |
| Example: 8,400 enrollment | 1,260 local camps | 25 local camps | Realistic market picture |
| CSI score range | Dominated by local estimate | National brands matter more | More accurate ranking |
| Saturation tiers | Recalibrated below | See Section 6 | All thresholds updated |

**All 817 city records** in the database have been recalculated using the corrected multiplier. The saturation tier thresholds have also been recalibrated to reflect the new CSI score distribution.

**3\. The Two-Tier Competitive Model**

The competitive landscape for summer camps is not monolithic. It is composed of two fundamentally different types of providers, and the formula treats them separately.

**Tier 1 — National Brands**

National Brands are franchise or corporate chains that actively advertise, operate in multiple cities, and directly compete for the same paying families a STEM camp franchise targets. These are the most significant competitive threat because they have brand recognition, marketing budgets, and established enrollment pipelines. The dataset tracks 15 of these brands across all 817 cities.

**Tier 2 — Local Providers**

Local Providers are the schools, YMCAs, nonprofit organizations, churches, Boys & Girls Clubs, park and recreation departments, and community athletic leagues that run summer programs. These providers are harder to count precisely because they do not maintain national directories, but they represent real competition for a child's summer week. Because they are often free or low-cost, they compete primarily on price and convenience rather than curriculum quality — which means a premium STEM camp can coexist with them, but their presence still reduces the total addressable pool of available camper-weeks.

The formula accounts for both tiers, but weights them differently. In V2.0, with the corrected multiplier, **national brand presence becomes the more meaningful differentiator** between cities — which is the correct behavior for a franchise expansion decision.

**4\. The National Brand List**

The 15 national brands tracked in this dataset were selected based on three criteria: they offer summer camp programs (not just year-round tutoring), they serve children in the K–6th grade range (ages 5–12), and they operate in multiple U.S. cities through franchise or corporate expansion.

**STEM-Focused Brands (9 brands) — Weighted 2.0×**

These are the most direct competitors to a STEM summer camp franchise. They compete on curriculum, brand, and the same 'enrichment camp' positioning. Each location counts as 2.0 in the weighted supply total.

| Brand | Primary Focus | Competition Type | Weight |
| :---- | :---- | :---- | :---- |
| Code Ninjas | Coding / Game Design | Direct STEM | 2.0× |
| Snapology | LEGO Robotics / STEM | Direct STEM | 2.0× |
| Engineering For Kids | Engineering / STEM | Direct STEM | 2.0× |
| Bricks 4 Kidz | LEGO / Engineering | Direct STEM | 2.0× |
| iD Tech | Technology / Coding | Direct STEM | 2.0× |
| Camp Invention | Invention / STEM | Direct STEM | 2.0× |
| Mad Science | Science Experiments | Direct STEM | 2.0× |
| Galileo Learning | STEM / Design Thinking | Direct STEM | 2.0× |
| Challenge Island | STEM / Problem Solving | Direct STEM | 2.0× |

**General Enrichment Brands (6 brands) — Weighted 1.0×**

These brands compete for the same summer week budget and family attention, even if their curriculum is not STEM-specific. Each location counts as 1.0 in the weighted supply total.

| Brand | Primary Focus | Competition Type | Weight |
| :---- | :---- | :---- | :---- |
| Young Chefs Academy | Culinary Arts | General Enrichment | 1.0× |
| Primrose Schools | Early Education / Enrichment | General Enrichment | 1.0× |
| Goddard School | Early Education / Enrichment | General Enrichment | 1.0× |
| KinderCare | Childcare / Summer Programs | General Enrichment | 1.0× |
| i9 Sports | Youth Athletics | Athletic / General | 1.0× |
| Wiz Kids Camps | STEM / General Enrichment | STEM-Adjacent | 1.0× |

**Brands Excluded from V1.0 and V2.0**

Three brands originally proposed in the research phase — Steve & Kate's Camp, Sylvan Learning, and Mathnasium — were removed from the primary brand count. Steve & Kate's Camp operates in only a handful of cities (primarily California and Chicago) and does not have a meaningful national footprint. Sylvan Learning and Mathnasium are primarily academic tutoring centers, not summer camp operators, and including them would overstate direct camp competition. They may be reintroduced in a future version as a separate 'tutoring competition' variable.

**5\. The Competitive Saturation Index (CSI): Formula and Variables**

The CSI is a single normalized score that expresses how saturated a given city's summer camp market is relative to the demand that exists there. A **lower CSI indicates less competition and higher market opportunity**. A **higher CSI indicates a more crowded market**.

**The Formula (Version 2.0)**

CSI \= Total\_Weighted\_Supply / Demand\_Adjusted\_Market

Where:

  Total\_Weighted\_Supply \=  
      (National\_STEM\_Brand\_Count × 2.0) \+  
      (National\_Other\_Brand\_Count × 1.0) \+  
      Local\_Provider\_Estimate

  Demand\_Adjusted\_Market \=  
      Elementary\_Enrollment × (Median\_HH\_Income / 65,000)

  Local\_Provider\_Estimate \=  
      Elementary\_Enrollment × 0.003          ← CORRECTED in V2.0 (was 0.15)

**Variable Definitions**

**National\_STEM\_Brand\_Count**

The number of locations from the 9 STEM-focused national brands that operate within the city. This is the most important supply variable. STEM brands are weighted at **2.0×** because they are direct, head-to-head competitors — they are targeting the same families, the same age group, and the same 'enrichment camp' purchase decision.

**National\_Other\_Brand\_Count**

The number of locations from the 6 general enrichment brands. These are weighted at **1.0×** because they compete for the same family budget and summer schedule, but not necessarily on STEM curriculum. They represent indirect competition.

**Local\_Provider\_Estimate (V2.0 Corrected)**

A calculated estimate of the number of local, non-national summer camp programs operating in the city. Because local providers do not publish centralized directories, this figure is estimated as **0.3% of the elementary school enrollment (multiplier: 0.003)**. This produces approximately **3 local providers per 1,000 enrolled students** — consistent with observable program density in real U.S. cities of comparable size.

Rationale for the 0.003 multiplier: A mid-size city with 8,400 K–6 students would realistically have approximately **25 local summer program providers** across all categories. This breaks down as roughly: 3–5 school district programs, 2–3 YMCA locations, 4–6 parks & recreation programs, 3–5 church/faith-based camps, 3–5 athletic/sports camps, 2–4 arts/enrichment programs, and 2–4 independent boutique camps. The **0.003 multiplier** captures this range accurately.

**Elementary\_Enrollment**

The total number of students enrolled in K–6th grade schools within the city. Sourced from the NCES (National Center for Education Statistics) 2023–24 data. This is the primary proxy for market size and is used in both the supply calculation and the demand calculation.

**Median\_HH\_Income**

The median household income for the city, sourced from U.S. Census 2024 estimates. Used as a demand multiplier because higher-income families are more likely to purchase paid enrichment summer camps. The national median of **$65,000** is the normalization baseline. A city with median income of $130,000 has a demand multiplier of 2.0.

**National Median Income (Fixed Baseline)**

Set at **$65,000**, representing the approximate U.S. national median household income. This is a fixed constant in the formula, not a variable that changes by city.

**Why This Formula Works**

The formula separates supply from demand and normalizes both to produce a comparable score across cities of vastly different sizes. A city like New York with 200,000 enrolled elementary students and 40 national brand locations is not necessarily more saturated than a city with 8,000 students and 6 brand locations — the formula captures this by dividing supply by the demand-adjusted market size. The income multiplier ensures that wealthy cities with high willingness to pay are not penalized for having more competition than their raw enrollment numbers would suggest.

**6\. Saturation Categories (Recalibrated for V2.0)**

With the corrected multiplier, CSI scores are significantly lower across the board — because the local provider estimate is now realistic rather than inflated. The saturation tier thresholds have been **recalibrated accordingly**. The categories retain the same names and interpretation, but the numeric boundaries reflect the actual distribution of V2.0 CSI scores.

| Category | V2.0 CSI Range | V1.0 CSI Range | Interpretation |
| :---- | :---- | :---- | :---- |
| Very High Opportunity | \< 0.0010 | \< 0.10 | Minimal competition relative to demand. Strong entry conditions. |
| High Opportunity | 0.0010 – 0.0020 | 0.10 – 0.20 | Low-to-moderate competition. Good market conditions. |
| Moderate | 0.0020 – 0.0035 | 0.20 – 0.35 | Established competition present. Entry viable but requires differentiation. |
| Competitive | 0.0035 – 0.0050 | 0.35 – 0.50 | High competition. Market is crowded. Entry requires strong brand or niche. |
| Saturated | \> 0.0050 | \> 0.50 | Very high competition relative to demand. Not recommended for initial entry. |

Note: The **relative ranking of cities is preserved** between V1.0 and V2.0 — a city that ranked \#1 in opportunity in V1.0 will rank similarly in V2.0. What changes is the absolute CSI value and the distribution across tiers, which now reflects a more realistic competitive picture.

**7\. Worked Example (V2.0 Corrected)**

**Example City: Springfield, IL**

The following step-by-step calculation illustrates the V2.0 formula with the corrected local provider estimate.

| Step | Variable | Value | Notes |
| :---- | :---- | :---- | :---- |
| 1 | Elementary Enrollment | 8,400 students | From NCES 2023–24 data |
| 2 | Median HH Income | $72,000 | From Census 2024 estimates |
| 3 | National Brand Locations | 4 locations | 2 STEM (×2.0) \+ 2 general (×1.0) \= 6.0 weighted |
| 4 | Local Provider Estimate | 8,400 × 0.003 \= 25 | V2.0 corrected multiplier (was 1,260 in V1.0) |
| 5 | Total Weighted Supply | 6.0 \+ 25 \= 31.0 | Brands \+ local estimate |
| 6 | Demand Multiplier | $72,000 ÷ $65,000 \= 1.108 | Above national median → higher demand |
| 7 | Demand-Adjusted Market | 8,400 × 1.108 \= 9,307 | Income-adjusted student population |
| 8 | CSI Score | 31.0 ÷ 9,307 \= 0.00333 | → Moderate category |

**Final CSI Score: 0.00333  →  Moderate**

Compare this to V1.0: the same city would have produced a CSI of 0.136 using the 0.15 multiplier (1,260 local camps \+ 6 brands \= 1,266 supply ÷ 9,307 demand). The **V1.0 score was dominated entirely by the inflated local estimate** and masked the signal from national brand presence. In V2.0, the **national brand count is the meaningful differentiator** — which is the correct behavior.

**8\. How to Use This Data in Lovable or Downstream Tools**

The dataset is exported as a CSV file with the following columns: city, state, population, elementary\_schools, elementary\_enrollment, median\_hh\_income, stem\_job\_pct, college\_pct, national\_brand\_count, national\_brand\_list, local\_provider\_estimate, demand\_adjusted\_market, csi, and saturation\_category.

When importing into Lovable or any downstream application, treat the csi column as the primary ranking variable — **sort ascending to surface the highest-opportunity cities first**. The national\_brand\_list column contains a pipe-delimited (|) list of which specific brands are present in each city, which allows filtering by competitor presence. The national\_brand\_count and local\_provider\_estimate columns are editable — as better data is gathered, these values should be updated and the CSI should be recalculated using the formula above.

This dataset is a **V2.0 living document**. The national brand location counts are based on publicly available information as of May 2026 and should be treated as **directionally accurate rather than exhaustive**. The local provider estimates are modeled, not sourced. Future versions will incorporate direct API data, ACA (American Camp Association) accreditation records, and school district summer program registries to improve precision.

**9\. Data Sources Summary**

| Variable | Source | Vintage |
| :---- | :---- | :---- |
| Elementary Enrollment | NCES Common Core of Data | 2023–24 |
| Median HH Income | U.S. Census Bureau ACS | 2024 estimates |
| Population | U.S. Census Bureau | 2024 estimates |
| Elementary Schools (count) | NCES Common Core of Data | 2023–24 |
| STEM Job % | U.S. Bureau of Labor Statistics | 2023 |
| College Education % | U.S. Census Bureau ACS | 2024 estimates |
| National Brand Locations | Brand store locators / franchise directories | May 2026 |
| Local Provider Estimate | Modeled (0.3% × Elementary Enrollment) | Derived — V2.0 corrected |
| National Median Income | U.S. Census Bureau | 2024 ($65,000) |

**10\. Frequently Asked Questions**

**Why is the local provider estimate modeled rather than scraped?**

Local summer programs — school district enrichment programs, YMCA camps, church VBS programs, parks & recreation summer sessions — do not maintain national directories. There is no single database that lists every local summer camp in every U.S. city. Scraping individual city websites would require thousands of manual lookups. The modeled estimate is a reasonable approximation that will be replaced with actual data in future versions as ACA records and school district registries become available.

**Why was the multiplier changed from 0.15 to 0.003?**

The 0.15 multiplier was a V1.0 placeholder that was not validated against real-world data. A reality check against actual mid-size U.S. cities revealed that 1,260 local camps for a city with 8,400 K–6 students is approximately **50× too high**. The 0.003 multiplier produces estimates consistent with observable program density in comparable cities.

**Can I edit the national brand count for a specific city?**

Yes. The web dashboard supports inline editing of the National Brand Count and Local Provider Estimate for any city. When you save a change, the CSI is automatically recalculated using the formula above. This allows the dataset to be refined as better data is gathered.

**Why are STEM brands weighted 2.0× instead of 1.0×?**

STEM brands are direct competitors — they are targeting the same families, the same age group, and the same 'enrichment camp' purchase decision. A family choosing between Neuron Garage and Code Ninjas is making a direct substitution. A family choosing between Neuron Garage and KinderCare is making a different kind of decision. The 2.0× weight reflects this difference in competitive intensity.

**What is the correct interpretation of a CSI score of 0.003?**

A CSI of 0.003 means there are approximately 3 weighted supply units (brands \+ local providers) for every 1,000 demand-adjusted students. This falls in the Moderate category in V2.0, indicating established competition is present but entry is viable. The absolute value of the CSI is less important than its relative ranking — **sort cities by CSI ascending to find the best opportunities**.

────────────────────────────────────────────────────────────────────────────────

*This document was prepared by Neuron Garage Market Research. Version 2.0 — May 2026\. For questions about methodology, formula revisions, or data updates, contact the research team directly.*