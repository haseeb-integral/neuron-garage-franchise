## Fix 1 — Sidebar scrolls

In `src/components/AppSidebar.tsx`:

- Keep the header block (logo + collapse button) as-is, pinned at the top.
- Wrap the **two nav sections + the divider between them** in a single container:
  `<div className="flex-1 min-h-0 overflow-y-auto pb-12"> ... </div>`
- `flex-1 min-h-0` lets it take the remaining height inside the `h-screen` flex column without overflowing the viewport.
- `overflow-y-auto` enables the scroll.
- `pb-12` leaves clearance so the floating DB Debug pill (after fix 2 it moves to bottom-right, but extra clearance is still good) doesn't cover the last item.
- No changes to item lists, icons, collapsed-mode logic, or tooltips.

## Fix 2 — Move DB Debug out of the sidebar's space

In `src/components/dbHealth/DbDebugFooter.tsx`:

- Change the outer wrapper from `fixed bottom-3 left-3` to `fixed bottom-3 right-3` so it sits in the main content area, not on top of the sidebar.
- Make the collapsed state more compact: when `!open`, render it as a small pill (rounded-full, smaller padding) instead of a full card. When opened, it expands back into the existing card with the list. This way at idle it's a tiny dot+label and not visually heavy.
- All behavior preserved: manager-only gate, persisted open state in `localStorage`, log subscription, link to `/db-health`, Clear button.
- Note for the user: "0 calls" simply means this page doesn't log any tracked DB queries — that's normal, not a bug.

## Files touched

- `src/components/AppSidebar.tsx` — wrap nav in scrollable container.
- `src/components/dbHealth/DbDebugFooter.tsx` — reposition to bottom-right + slimmer collapsed pill.

## Out of scope

- Removing DB Debug (it's intentional manager-only tooling).
- Reordering or trimming sidebar items.
- Any change to routes or data.