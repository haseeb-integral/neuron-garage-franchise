Fix the card action buttons so they are always one clean row.

Plan:
1. Change the action area from two rows to one row.
2. Put Save, Re-run, Replace, and Remove in the same horizontal line.
3. Keep the buttons the same height, same padding, same font size, and same gap.
4. Align the full row to the right side of each card.
5. Use `flex-nowrap` and `whitespace-nowrap` so one button does not drop below the others on normal card widths.
6. Keep Remove visually quieter with muted text, but do not place it on a second line.

Technical detail:
- Update only `src/pages/SiteAnalysis.tsx` in the action button block around the current Save/Re-run/Replace/Remove layout.
- Replace the nested two-row wrapper with one `flex flex-nowrap items-center justify-end gap-1.5` wrapper.