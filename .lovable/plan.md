## Fixes for Site Analysis page

### 1. Live Engine card — formula + button placement (`LiveEngineCard.tsx`)
- Move the **Compute SAS** button out of the field grid into a dedicated **footer bar** below all inputs, full-width left side showing the SAS formula as an `fx:` chip, right side a **large primary button** (`px-6 py-2.5`, `text-[14px]`, min-width 180px).
- Footer layout:
  ```
  ┌──────────────────────────────────────────────────────────┐
  │ fx  SAS = 0.25·SchoolProfile + 0.25·Affluence +          │
  │     0.20·FamilyDensity + 0.15·Ecosystem + 0.15·Access    │
  │                                          [ Compute SAS ] │
  └──────────────────────────────────────────────────────────┘
  ```
- Grid becomes 5 equal columns for the inputs (no button cell); footer is a separate flex row with `border-t pt-3 mt-3`.

### 2. Card header alignment (`SiteAnalysis.tsx` → `CandidateCard`)
The long school title ("LeafSpring School at Cedar Park — closed 2023 (negative anchor)") wraps vertically because the right column (score + suggested-pill) is too wide and squeezes the title to ~80px. Fix:
- Constrain right column to `w-[88px]` with score on top, pill below, both `text-right`.
- Title gets `flex-1 min-w-0`, `line-clamp-2` (max 2 lines, ellipsis) with full text in `title` tooltip.
- Standardize: address `line-clamp-2`, type/grade/enrollment line `line-clamp-1`.
- Add a fixed-height **header block** (`min-h-[110px]`) so all 4 cards align regardless of title length.

### 3. Card-row alignment (maps + tiles on same line across cards)
Add fixed min-heights to each card region so siblings line up:
- Header: `min-h-[110px]`
- Action row (Re-run/Replace/Remove): fixed height `h-8`
- Summary line: `min-h-[36px]` (2 lines reserved)
- Map: already `h-[180px]` in `IsochroneMap` — verify and lock
- Metric tiles: `min-h-[120px]`
- Sub-scores: rest of card
- Decision controls: pinned to bottom with `mt-auto`

The outer card already uses `flex flex-col minHeight: 540` — bump to `560` and ensure children use the fixed heights above.

### 4. Normalize all 4 cards to Daycare / Other / enrollment 150 and recompute
Add a one-shot **"Normalize inputs for fair comparison"** button in the SAS formula bar (top of results section). It:
- Iterates every slot, sets `schoolType="daycare"`, `gradeBand="other"`, `enrollment="150"`.
- Calls `runSlot(id, { preferCache: true })` for each (uses cache when an exact-input row exists; otherwise hits `compute-sas`).
- Disables itself while any slot is loading.

Then I will **smoke-test in the build** by running the page, hitting Normalize, and confirming the four scores recompute against the same inputs.

### 5. Export decision pack — why it's greyed
`canExport = winner && composite != null`. It greys out because no winner is marked. **Fix the UX confusion**, not the gate:
- Keep the gate (must pick a winner to export — intentional).
- Add a clearer disabled tooltip already present + a small inline hint next to the button: *"Mark a winner on any card to enable"*.
- When `canExport=false`, also show an arrow/callout pointing at the `★ Mark winner` row in the decision controls, so the user knows what to click.

### Files touched
- `src/components/site-analysis/LiveEngineCard.tsx` — footer bar with fx formula + bigger button
- `src/pages/SiteAnalysis.tsx` — CandidateCard header/heights, Normalize button, export hint

### Smoke test (after build)
- Capture screenshot of `/site-analysis`, confirm: (a) formula visible inside Live Engine, (b) button no longer crammed against grade band, (c) all card titles fit on 1–2 lines, (d) maps & tile rows align across cards, (e) clicking Normalize swaps all 4 to Daycare/Other/150 and recomputes scores, (f) Export tooltip explains the winner requirement.
