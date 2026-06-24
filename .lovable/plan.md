## Fix: Show full stamp text on candidate cards

### Problem
The input stamp under each card name (e.g. "Daycare · Other · enroll 150 · run Jun 23") is cut off with ellipsis because the `<p>` tag has the `truncate` Tailwind class applied.

### Change
Remove `truncate` from line 378 in `src/pages/SiteAnalysis.tsx`. The text will then wrap to a second line instead of being hidden.

### What will look different
- The stamp line under each school name will show the full text.
- If the line is long, it may wrap to two lines instead of ending in "…".

### Risk
Very low — one CSS class removal. No data, logic, or other pages affected.

### Testing
Check any card with a long stamp. The full text should be readable.