# Lovable Prompt: STEM Camp Franchise City Selection App

## What to Say to Lovable

Copy and paste the following prompt into Lovable. Attach both files when prompted:
- `competitive-landscape-2026-05-21.csv`
- `CompetitiveLandscapeIntelligence_Methodology&DataDocumentation.md`

---

## THE PROMPT

---

I am building a **city selection intelligence tool** for a STEM summer camp franchise called **Neuron Garage**. The franchise offers weekly STEM enrichment camps for children entering Kindergarten through 6th grade (ages 5–12). The goal of this app is to help franchise decision-makers identify the best U.S. cities to open a new camp location based on competitive saturation, market demand, and demographic fit.

I am attaching two files:

1. **`competitive-landscape-2026-05-21.csv`** — A dataset of 817 U.S. cities with competitive landscape intelligence pre-calculated for each city.
2. **`CompetitiveLandscapeIntelligence_Methodology&DataDocumentation.md`** — The full methodology document explaining how every number in the CSV was calculated, what each column means, and how to interpret the data.

**Please read the methodology document carefully before building anything.** It is the authoritative reference for this entire app.

---

### About the Dataset

The CSV contains **817 U.S. cities** with the following columns:

| Column | Description |
|---|---|
| `ID` | Internal city ID |
| `City` | City name |
| `State` | Full state name |
| `State Abbr` | Two-letter state abbreviation |
| `Population` | Total city population |
| `School Districts` | Number of school districts in the city |
| `Elementary Schools` | Number of K–6 elementary schools |
| `Elementary Enrollment` | Total K–6 student enrollment (primary market size proxy) |
| `Median HH Income` | Median household income (demand multiplier) |
| `College %` | Percentage of adults with a college degree |
| `STEM %` | Percentage of jobs that are STEM-related |
| `COL Index` | Cost of living index (100 = national average) |
| `Metro Income` | Regional metro area median income |
| `National Brand Count (Weighted)` | Weighted count of national camp brand locations (STEM brands × 2.0, other brands × 1.0) |
| `Local Provider Estimate` | Estimated number of local camp providers (schools, YMCAs, nonprofits, churches, athletic leagues) — modeled as 0.3% of elementary enrollment (× 0.003, V2.0 corrected from 0.15) |
| `Demand Adjusted Market` | Elementary Enrollment × (Median HH Income / $65,000) — the income-adjusted demand for paid camps |
| `CSI Score` | **Competitive Saturation Index** — the primary ranking metric. LOWER = more opportunity. HIGHER = more competition. |
| `Saturation Category` | One of: `very_high_opportunity`, `high_opportunity`, `moderate`, `competitive`, `saturated` |
| `Brand Detail` | Pipe-delimited list of which national brands are present and how many locations each has, e.g. `Code Ninjas(3)|KinderCare(12)` |
| `Confidence` | Data confidence level: `high`, `medium`, or `low` |
| `Last Updated` | ISO timestamp of last data refresh |

---

### The CSI Formula (Critical — Build This Into the App)

The **Competitive Saturation Index (CSI)** is the core metric. Here is the exact formula:

```
CSI = Total_Weighted_Supply / Demand_Adjusted_Market

Total_Weighted_Supply =
    (STEM_Brand_Locations × 2.0) +
    (Other_Brand_Locations × 1.0) +
    Local_Provider_Estimate

Demand_Adjusted_Market =
    Elementary_Enrollment × (Median_HH_Income / 65000)

Local_Provider_Estimate =
    Elementary_Enrollment × 0.003
```

**Lower CSI = less competition = higher opportunity for a new franchise.**

The 9 STEM brands (Code Ninjas, Snapology, Engineering For Kids, Bricks 4 Kidz, iD Tech, Camp Invention, Mad Science, Galileo Learning, Challenge Island) are weighted at **2.0×** because they are direct competitors. The 6 general enrichment brands (Young Chefs Academy, Primrose Schools, Goddard School, KinderCare, i9 Sports, Wiz Kids Camps) are weighted at **1.0×**.

---

### App Features to Build

Please build a **city selection intelligence dashboard** with the following features:

**1. City Rankings Table**
- Display all 817 cities in a sortable, searchable, paginated table
- Default sort: CSI Score ascending (lowest CSI = highest opportunity at the top)
- Columns to show: City, State, CSI Score, Saturation Category (color-coded badge), Elementary Enrollment, Median HH Income, National Brand Count, which brands are present
- Allow filtering by: State, Saturation Category, minimum/maximum CSI range, minimum Elementary Enrollment, minimum Median HH Income
- Allow sorting by any column

**2. City Detail View**
- When a user clicks a city, show a full detail panel or page
- Display all data fields for that city
- Show a breakdown of which specific national brands are present and how many locations
- Show the CSI calculation broken down step by step (supply side, demand side, final score)
- Show the saturation category with a plain-English interpretation of what it means for franchise entry

**3. Top Opportunity Dashboard**
- A summary view showing:
  - Top 20 highest-opportunity cities (lowest CSI)
  - Top 10 cities by state (one winner per state)
  - Distribution chart: how many cities fall in each saturation category
  - Average CSI by state (state-level heatmap or ranked list)

**4. Comparison Tool**
- Allow users to select 2–5 cities and compare them side by side
- Show all key metrics in a comparison table
- Highlight which city wins on each metric

**5. Filters & Saved Searches**
- Allow users to filter by: state, saturation category, minimum population, minimum enrollment, income range, STEM % threshold
- Allow saving a filter set as a named "search profile" (e.g., "High Income STEM Markets")

**6. Data Transparency**
- Include a "Methodology" page or modal that displays the full content of the attached methodology document
- Make it clear to users that the CSI is a V2.0 model and the national brand counts are directional estimates as of May 2026

**7. Export**
- Allow users to export filtered results as a CSV

---

### Design Direction

- Clean, data-forward design — this is an intelligence tool, not a marketing site
- Use a dark navy or deep blue primary color with yellow/gold accents (brand colors of Neuron Garage)
- Typography should be sharp and precise — this is used by business decision-makers
- Saturation category badges should be color-coded: green for opportunity, yellow for moderate, orange for competitive, red for saturated
- The CSI score should be visually prominent — it is the most important number on the page

---

### Important Notes for Lovable

- **The CSI Score is pre-calculated** in the CSV. You do not need to recalculate it on import — just display it. However, if a user edits the `National Brand Count` or `Local Provider Estimate` for a city, the app should recalculate the CSI in real time using the formula above.
- **The `Brand Detail` column** is pipe-delimited with the format `BrandName(count)|BrandName(count)`. Parse this to show individual brand presence.
- **The `Saturation Category` column** uses underscore-separated values: `very_high_opportunity`, `high_opportunity`, `moderate`, `competitive`, `saturated`. Display these as human-readable labels with color badges.
- **Lower CSI always means more opportunity.** Make sure all UI language and sorting reflects this — do not accidentally reverse the ranking.
- **The dataset is a living document.** The app should allow admins to update brand counts and local provider estimates per city, and the CSI should recalculate automatically on save.

---

### Context: What Is Neuron Garage?

Neuron Garage is a STEM summer camp franchise for children entering Kindergarten through 6th grade. The camp runs weekly sessions during the summer. Younger campers (K–2nd grade) are in the **Tinkerers** program focused on curiosity and creativity. Older campers (3rd–6th grade) are in the **Mechanics** program focused on strategy and problem-solving.

The franchise is evaluating 817 U.S. cities for potential expansion. This app is the primary tool for that evaluation. The most important question for every city is: **"How much competition exists for the summer week budget of K–6 families, and how large and wealthy is the market?"** The CSI answers that question in a single number.

---

*Data prepared by Neuron Garage Market Research, May 2026. Methodology version 2.0.*
