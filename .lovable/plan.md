

## Issue: Inconsistent white gap on Teacher Prospects vs City Scoring

The user sees a white strip between the dark sidebar and the grey content area on Teacher Prospects, but City Scoring sits flush against the sidebar with no white gap.

### Root cause

`AppLayout.tsx` sets the `<main>` background to `#ffffff` with `padding: 32`. That white padding is what shows around any page whose content doesn't fill edge-to-edge.

- **City Scoring page**: its outermost wrapper uses `bg-[#f2f4f6]` with negative margins (or full-bleed) so the grey background covers the white padding — no gap visible.
- **Teacher Prospects page**: its outer wrapper does NOT extend to the edges. The `main`'s 32px white padding shows through on the left and top, creating the visible white strip.

### Fix

Update `src/pages/TeacherProspects.tsx` so its root wrapper matches the City Scoring pattern — full-bleed grey background that covers the entire main area edge-to-edge, then apply internal padding inside that wrapper.

Specifically:
1. Wrap the page in a container with `bg-[#f2f4f6]` that uses negative margin (`-m-8`) to cancel the parent `main`'s 32px padding, then apply its own internal padding (`p-8`).
2. Match exactly what `CityScoring.tsx` does so both pages render identically against the sidebar.

### File to edit

- `src/pages/TeacherProspects.tsx` — adjust outer wrapper classes only. No other components or data change.

### Verification

After the change, navigate to Teacher Prospects and confirm:
- No white strip between sidebar and grey content
- No white strip above the "Teacher Prospects" header
- Layout matches City Scoring exactly

