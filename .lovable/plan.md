## What to change

Edit `src/pages/SiteAnalysis.tsx` around lines 218–234.

### Current behavior
- If you have set a verdict, the live-engine card shows your colored verdict pill (e.g., Strong / High / Medium / Low) with a "Your decision" tooltip.
- If you have not set a verdict, it falls back to a small outlined pill that says **"Suggested: <tier>"** with the tooltip **"Score-based tier suggestion. Confirm below to make it your decision."**

### New behavior
- Keep the user verdict pill exactly as it is.
- Remove the fallback "Suggested: <tier>" pill entirely.
- When no verdict is set, the pill area is empty; the composite score number remains.

### Why
Per Sam's direction, Site Analysis should not present the score as a recommendation or decision. Removing the "Suggested" hint removes the last piece of recommendation language from the live engine card.

### Verification
- Read the updated lines to confirm only the `userPill` branch remains.
- Run the build to make sure there are no TypeScript or syntax errors.