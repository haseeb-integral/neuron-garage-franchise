## Goal
Make the `/city-scoring` screen match the attached mockups much more closely at the current preview width, with special focus on:
- Ranked Markets spacing and pagination density
- Frisco detail card button fit
- Key Market Signals column alignment and overflow
- Equal visual height between the left and adjacent columns

## Root cause
The current problems come from a few layout decisions inside `src/pages/CityScoring.tsx`:

1. **Ranked Markets is trying to show too much vertical content**
   - The card currently renders all filtered rows, plus a large footer (`Showing 1 to 25...` and `...10` pagination).
   - That makes the left card taller than intended and forces tighter row spacing to compensate.
   - The row grid also gives the Market, Type, Score, and Tier columns very little breathing room, so the content feels cramped compared with the mockup.

2. **The Frisco action row uses rigid grid tracks with `whitespace-nowrap` buttons**
   - The four buttons are placed in fixed fractional columns.
   - At ~1091px viewport width, the button labels plus icons plus padding exceed the available width.
   - Because the labels are forced onto one line, the longest button (`Find Teachers in This Market`) pushes against the card border instead of shrinking gracefully.

3. **Key Market Signals is overflowing because its grid is over-constrained**
   - The current row template gives the label, value, and delta columns competing width demands.
   - The value and delta are both effectively protected from wrapping, while the label is still too narrow.
   - On this viewport, the total minimum width of those columns is larger than the space available, so text alignment breaks and content presses toward the card edge.

4. **The current implementation solved some issues visually but not structurally**
   - Earlier tweaks adjusted padding and column widths, but the underlying composition is still too rigid for this viewport.
   - The mockup works because it is more selective about how much content is shown and allocates clearer column roles inside each mini-table.

## Plan

### 1. Rebuild the Ranked Markets card to match the mockup density
Update the left card so it behaves like a compact summary panel rather than a full long list.

Changes:
- Show only the first **5 ranked markets** in the visible card instead of the full list.
- Update footer copy to **`Showing 1 to 5 of X results`**.
- Simplify pagination to the compact format the user asked for, without forcing a `10` button.
- Widen the Market and Score breathing room so columns feel separated like the mockup.
- Increase horizontal spacing between columns and slightly soften row density so the card no longer looks stacked/crammed.
- Keep the visual style from the mockup: checkbox, rank, two-line market label, type pill, score number + green bar, tier circle.

Result:
- Left card height comes down and aligns better with the center/right column height.
- The row layout looks calmer and closer to the screenshot.

### 2. Make the Frisco header/action area fit cleanly within the card
Refactor the action buttons row so it no longer depends on rigid fixed fractions that fail at this width.

Changes:
- Replace the current 4-track rigid grid with a more forgiving layout designed for the exact labels in the mockup.
- Give the primary CTA slightly more width priority than the secondary buttons.
- Reduce internal horizontal padding where needed.
- Keep icon sizing small and consistent.
- Ensure no button text crosses the card border.

Result:
- `Find Teachers in This Market` stays fully inside the card.
- `View Full Details` no longer slips or crowds the edge.

### 3. Rebuild Key Market Signals as a proper 4-column mini-table
Instead of squeezing text into a nearly equalized grid, give each part of the row a clear job.

Target structure:
- Column 1: icon
- Column 2: label
- Column 3: metric value
- Column 4: delta / note

Changes:
- Increase the available width for the label column.
- Keep value and delta aligned consistently across all rows.
- Remove the overflow pressure by using a row structure closer to the mockup, with better column ratios and controlled text behavior.
- Match the mockup’s clearer spacing, font sizing, and row rhythm.
- Ensure labels remain readable and not clipped.

Result:
- The section reads like a clean data table.
- No text pushes outside the card border.
- Rows align visually from top to bottom like the mockup.

### 4. Fine-tune the Frisco detail card spacing to match the screenshot
After the structural fixes above, adjust spacing details so the card feels closer to the reference.

Changes:
- Slightly rebalance the gauge/info area spacing.
- Keep the Market Summary width and line breaks close to the mockup.
- Adjust divider spacing between Category Scores and Key Market Signals.
- Make sure the lower action row sits with enough breathing room below the content.

### 5. QA against the user’s two attached mockups
After implementation, verify specifically at the current preview width that:
- Ranked Markets shows only 5 items in the visible card
- Footer reads `Showing 1 to 5 of X results`
- Left card height is much closer to adjacent column height
- Ranked Markets columns are no longer squeezed together
- `Find Teachers in This Market` fits fully inside the button/card
- Key Market Signals stays inside the card with clean alignment
- The visual spacing matches the screenshots much more closely

## Technical notes
- File to update: `src/pages/CityScoring.tsx`
- No backend, auth, route, or data-model changes
- This is a UI/layout refactor only
- Main code change is to replace overly rigid grid track definitions with width allocations that match the mockup and current viewport constraints