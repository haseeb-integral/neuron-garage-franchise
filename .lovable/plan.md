# Update MVS Methodology — Add Old vs New Crawler Section

## What changes
Add one new section to `src/pages/MVSMethodology.tsx` (the page already linked in the left sidebar under Methodology → MVS Methodology). No new routes, no sidebar edits.

## Where it goes
Insert as **Section 5: "Crawler Evolution — Old (3 steps) vs New (8 steps)"**, right before the current "Shared Data & Tooling Stack" section. Renumber the two sections after it (Shared Stack → 6, Important Notes → 7).

## What the new section contains
Three blocks, in plain grade-6 English:

1. **Short intro paragraph** — "Before June 26, 2026 the crawler used a strict 3-step flow. It missed prices whenever the camp's own website hid the number behind a login wall. The new 8-step flow adds a Google catch-up search and reads marketplace listings (Sawyer, ActivityHero, Yelp). Coverage on Columbus jumped from 53 to 207 priced camps (23% → 91%)."

2. **Side-by-side table** — two columns: "Old crawler (3 steps)" and "New crawler (8 steps)" listing each step in one short sentence. Old: (1) Google Maps lookup, (2) Scrape camp's own site, (3) Strict rule — $ must be in markdown or give up. New: (1) Google Maps, (2) Scrape camp's site, (3) NEW catch-up Google search in plain English, (4) NEW read marketplace listings, (5) NEW relaxed source rule (any trusted source counts), (6) NEW $50–$5,000 sanity guard, (7) Save with clickable proof link, (8) Classify tier (Premium/Mid/Budget/Community).

3. **Worked example callout** — "Steve & Kate's Camp, Austin TX" walk-through: old crawler returned null (login wall); new crawler found $2,190/week on an ActivityHero listing, passed the $50–$5k guard, saved with the clickable ActivityHero URL, and classified as Premium (Austin median ≈ $400/week).

## Files touched
- `src/pages/MVSMethodology.tsx` — insert the new section, bump section numbers on the two that follow.

That's it. One file, presentation-only.

## Risks
None — pure copy/markup addition on a docs page. No data, no edge functions, no scoring logic touched.

## Turns
1 turn.

## Test after build
Open `/mvs-methodology` and confirm the new "Section 5 — Crawler Evolution" appears between Tier Definitions and Shared Data & Tooling Stack, with the table and Steve & Kate's example rendering correctly.
