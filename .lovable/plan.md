# Make Saved Sites and Export Site Report (PDF) buttons more prominent

## What we are changing
The two buttons on the SAS page top-right (`Saved Sites` and `Export Site Report (PDF)`) look small and faded right now. The screenshot you sent shows the look you want: bigger pill buttons, blue outline, blue bold text, blue icons, and the count badge in a solid blue pill.

We will restyle ONLY those two buttons to match.

## Pages / components affected
- `src/pages/SiteAnalysis.tsx` only, lines ~1568–1627. No new files, no logic change, no other button touched.

## Visual changes (both buttons)
- Border: solid 1.5px blue (`BLUE`) instead of light grey `BORDER`.
- Text: blue (`BLUE`), bold, size bumped from `text-[11px]` to `text-[13px]`.
- Icon: blue, size bumped from 12px to 14–16px.
- Padding: bumped from `px-2.5 py-1.5` to `px-3.5 py-2` for a bigger pill.
- Rounded corners: bumped from `rounded-md` to `rounded-lg`.
- Background: stays white.
- Hover: light blue tint (`#eef4ff`).

## Saved Sites count badge
- Today it sits in a soft blue pill with blue text.
- Change to solid blue background (`BLUE`) with white text, like the `5` in your screenshot.

## Export split-button (the chevron part)
- Keep it joined to the main Export button (same group).
- Match the new bigger size and blue outline so the whole pill reads as one prominent control.

## What NOT to touch
- The Normalize inputs button next to them.
- Any logic: click handlers, drawer open, export flow, dropdown menu items.
- The empty-slot + popover we just shipped.
- Spacing of the surrounding card.

## Phases
- **Phase 1 (1 turn):** Restyle the two buttons + the count badge + the chevron split.
- **Phase 2 (no code):** You eyeball it in preview and confirm.

## Risks
- Very low. Pure style change, no state or logic touched. Existing click flows keep working.

Approve and I will ship Phase 1.
