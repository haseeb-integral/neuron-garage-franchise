# Make the "+" button on empty slot cards actually work

## What is broken now
The big **+** in each empty slot card is just a picture. It has no click. So users click it and nothing happens.

## What it should do (industry pattern from Zillow / Crexi / Placer compare tools)
Click **+** → small popover opens with two choices:
1. **Load from saved sites** — opens the existing Saved Sites drawer. User picks a snapshot → it fills this exact slot.
2. **Compute a new site** — page smooth-scrolls up to the **Live Site Analysis Engine** and focuses the address input. After the user computes and hits **Save to slot**, it fills the next empty slot (current behavior).

Both flows already exist in the code. We are just wiring the + to them.

## Pages / components / state affected
- `src/pages/SiteAnalysis.tsx` only.
  - `EmptySlot` component (lines ~742–763) — add props for the two actions, add a popover, wire the +.
  - The render call at line ~1675 — pass the two handlers and the slot index.
  - Add a `ref` on the Live Engine card wrapper so we can scroll to it.
  - Add an `id` or `ref` on the address input so we can focus it.
  - Re-use existing `setDrawerOpen(true)` / `SavedSitesDrawer` (already at line 1485). No new state needed for the drawer itself.

No other page, no API, no DB, no edge function, no scoring math, no saved-sites hook, no session-storage logic is touched.

## Phases

### Phase 1 — Wire the + button (1 turn)
- Add `onLoadFromSaved` and `onComputeNew` props to `EmptySlot`.
- Wrap the round + button in a shadcn `Popover` with two menu items.
- In `SiteAnalysis.tsx`, create a `liveEngineRef` and an `addressInputRef`.
- `onComputeNew` = scroll `liveEngineRef` into view (smooth, block: "start") + focus `addressInputRef`.
- `onLoadFromSaved` = `setDrawerOpen(true)` (the existing Saved Sites drawer).
- Pass both handlers into every `<EmptySlot />` at line 1675.

### Phase 2 — Smoke test (no code)
- Empty slot → click + → popover shows two items.
- Click **Load from saved** → drawer opens → pick a row → slot fills.
- Click **Compute a new site** → page scrolls up → address field is focused → compute → Save to slot fills the next empty slot.
- Existing flows (refresh persistence, remove card, tab-switch persistence) still work.

## Risks / what NOT to touch
- Do **not** change scoring, pillar recompute, signals hydration, saved-sites hook, session-storage logic, or the Saved Sites drawer itself.
- Do **not** add a new modal — re-use the existing drawer.
- Do **not** change the empty-slot copy text below the +, only make the + clickable and add the popover.

## Estimate
1 Lovable turn for Phase 1. Phase 2 is manual smoke test.

Approve and I will build Phase 1.
