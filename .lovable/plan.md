## Plan

### 1. Make comparison fair by separating calibration from candidate comparison
- Move Trinity and LeafSpring out of the main comparison cards.
- Show them in a compact “Calibration anchors” section only, so they prove the model separation but do not occupy locked comparison slots.
- The main comparison area will start with editable/replaceable candidate slots, so the user can compare like-for-like candidates instead of being forced to compare Private elementary vs Daycare anchors.
- Keep Trinity/LeafSpring available as Live Engine presets if the user wants to run them manually.

### 2. Add direct replace flow for cards
- Add a clear “Replace slot” action for each comparison card/empty slot.
- When the Live Engine computes a result, let the user save it into a selected slot instead of only “add as new card”.
- Keep the max of 4 compared sites, but remove the feeling that the first two cards are locked forever.

### 3. Redesign the Live Site Analysis Engine UI
- Rework the engine into a cleaner two-column command panel: inputs on the left, result summary on the right.
- Move “Compute SAS” into an aligned action row so it no longer looks randomly placed.
- Show the computed SAS, sub-scores, and “Save/replace slot” controls in a polished result block.
- Rename the visible engine label from versioned/internal wording to a user-facing title like “Run site score”.

### 4. Fix decision wording and default state
- Rename “Brett’s decision” / “Brett/Sam’s verdict” to user-facing wording: “Decision”.
- Remove “Brett/Sam’s call” and “auto from score”.
- Do not show “Don’t recommend” as a selected decision unless the user actually selected it.
- Keep score-derived labels separate as “Score tier” or “Suggested tier”, not as a decision.
- Decision controls will default to “Not selected” and only change after the user clicks a verdict.

### 5. Clean up confusing methodology/page text
- Remove: “Weights client-locked per Sam brief v2.2 p.9; sub-signal weights Sam-pinned p.9–11.”
- Simplify the SAS formula panel so it states the formula without internal-client references.
- Remove or simplify wording that creates doubt, especially around “pending”, “Brett call”, and internal brief citations.

### 6. Improve maps so they communicate something useful
- Keep the static map approach, but make the map label clearer: “Drive-time coverage”.
- Make 10-minute and 15-minute polygon overlays visually stronger and add a tiny legend.
- If cached card results lack polygons because they were loaded from `site_analyses` without joining isochrones, either fetch the matching isochrone rows for cached results or show a clear pin-only fallback without saying “map unavailable”.
- Map should never show “Map preview unavailable” for normal scored cards; it should render polygons when available, otherwise a pin map.

### 7. Simplify Calibration evidence
- Replace “Δ vs Trinity” with “Gap from Trinity SAS” or remove the table entirely if it remains confusing.
- Stop showing “pending” rows from static calibration data when the live page already has current anchor results.
- Calculate the Trinity vs LeafSpring gap directly from the live anchor values shown on the page.
- Keep calibration evidence as a small confidence check, not a central workflow.

### 8. Align card layout
- Make all comparison cards use consistent top sections, score placement, action placement, and map/metric spacing.
- Prevent score pills, buttons, and text from shifting card headers out of alignment.
- Keep decision controls in a consistent location and avoid dense nested boxes.

### 9. Smoke test after implementation
- Verify the first two comparison slots are no longer locked by anchors.
- Run Trinity and LeafSpring presets and confirm their values remain explainable by their inputs.
- Add/replace at least two user candidates and confirm side-by-side comparison uses chosen inputs.
- Confirm decisions default to “Not selected”.
- Confirm maps render polygons when isochrones exist and pin-only fallback otherwise.
- Confirm no old labels remain: “Brett/Sam’s call”, “auto from score”, “Brett’s decision”, or the Sam brief weight sentence.