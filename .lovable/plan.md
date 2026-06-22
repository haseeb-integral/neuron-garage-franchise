Add a new **Section 8** to the SAS Methodology page that documents the Site Analysis UI workflow features built today.

What to add:
- **Saved Sites Drawer** — a tabbed drawer (My Sites / Team Sites) that stores and displays candidate host-school sites across sessions. Each saved card shows the site name, address, SAS composite score, and the five pillar scores.
- **Site Metadata** — every saved site records who saved it (full name or email), the exact save timestamp, and the last re-scored timestamp (shown only if a re-run happened after the initial save).
- **Action Buttons** — four actions on every saved site card, aligned in a single horizontal row:
  - **Save** — toggle bookmark status
  - **Re-run** — re-execute the live SAS engine with updated inputs and refresh the displayed scores
  - **Replace** — swap the candidate site for a new one while keeping the same slot
  - **Remove** — delete the saved site from the drawer
- **Live Engine Re-run** — when Re-run is clicked, the card re-fetches from the `compute-sas` edge function, recalculates all five pillars + composite via the same `recomputeSiteScores` helper used on first evaluation, and updates the card in place. This guarantees "one calibrated number everywhere" — the same helper powers the initial scoring, the re-run, and every surface that displays the score.
- **Alignment & UX** — all action buttons are in a single `flex-nowrap` row with consistent height, padding, and font size. Remove is visually quieter (muted text) but stays on the same line as the other three buttons.

Where: insert after Section 7 (Important Notes) as Section 8, with the same `SectionTitle` component styling.

What not to change: no edits to Sections 1–7, the formula, weights, or calibration data.