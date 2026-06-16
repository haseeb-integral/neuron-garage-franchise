# Remove SAS title + formula text from the Site Analysis box

Delete the `<h2>Site Analysis Score (SAS)</h2>` and the `SAS = 0.25 × …` paragraph from `src/pages/SiteAnalysis.tsx` (currently lines 1067–1073).

Keep:
- The Normalize inputs button (stays on the left).
- The Export decision pack (PDF) button (stays on the right).
- The Score tiers row beneath.

The `flex justify-between` layout still works: left column becomes just the Normalize button, right column keeps the Export button. No other files touched. PDF generation unaffected.

Approve to proceed.
