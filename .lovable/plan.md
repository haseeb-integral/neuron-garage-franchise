## Scope
UI-only refinement of `src/pages/CityScoring.tsx`. No backend, route, auth, or data changes. Match the attached mockup at ~1100px preview width.

## Changes (single file: `src/pages/CityScoring.tsx`)

### 1. Ranked Markets card (lines 402–458)
- Widen left column proportions: change main grid from `lg:grid-cols-[0.92fr_1.5fr_0.92fr]` to `lg:grid-cols-[1fr_1.5fr_0.85fr]` so the left card has more breathing room and the right column stays compact.
- Update row template to `grid-cols-[18px_22px_minmax(0,1fr)_56px_72px_24px]` for both header and rows so Score column has room for a wider mini-bar.
- Bump row vertical padding from `py-1.5` to `py-2` for cleaner spacing.
- Change Type pill to use `inline-block self-center` to avoid stretching.
- Increase mini score bar from `w-7 h-1` to `w-12 h-1.5` so it doesn't look squeezed.
- Rebuild pagination to mockup style (1, 2, 3, …, 10 with chevrons):
  ```tsx
  <div className="flex items-center gap-1">
    <button className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078]">‹</button>
    <button className="px-2 h-6 rounded bg-[#174be8] text-white">1</button>
    <button className="px-2 h-6 rounded border border-[#eef2f7]">2</button>
    <button className="px-2 h-6 rounded border border-[#eef2f7]">3</button>
    <span className="px-1 text-[#8794ab]">…</span>
    <button className="px-2 h-6 rounded border border-[#eef2f7]">10</button>
    <button className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078]">›</button>
  </div>
  ```
- Update result count to mockup-style copy:
  `Showing 1 to {Math.min(filtered.length, 25)} of 238 results` (kept dynamic page-size, total uses 238 to mirror mockup behavior).

### 2. Frisco detail card — action buttons (lines 555–568)
- Buttons row currently overflows because `View Full Details` is too wide for its track. Rebalance to `grid-cols-[1.55fr_0.78fr_1.05fr_1.1fr]`, add `min-w-0` to each button, drop icon size to 12, and reduce horizontal padding to `px-2`. This keeps all 4 buttons inside the card border at 1100px.

### 3. Key Market Signals — proper aligned mini-table (lines 538–552)
- Lift the row template to a fixed 4-col grid so every row aligns identically:
  ```tsx
  <div className="grid grid-cols-[16px_minmax(0,1.4fr)_auto_auto] items-center gap-x-2.5 text-[11px] py-0.5">
    <Icon size={13} className="text-[#3160ff]" />
    <span className="text-[#526078] truncate">{r.label}</span>
    <span className="font-semibold text-[#07142f] tabular-nums whitespace-nowrap text-right pr-1">{r.value}</span>
    <span className={`whitespace-nowrap text-right text-[10.5px] font-medium ${r.deltaClass}`}>{r.delta}</span>
  </div>
  ```
- Wrap rows in a parent `grid grid-cols-1 gap-y-2` for consistent vertical rhythm.

### 4. Nearby Markets — boxed score badges (lines 580–585)
- Replace the plain `<span>{m.score}</span>` with a small badge:
  ```tsx
  <span className="inline-flex items-center justify-center min-w-[28px] h-5 rounded-md bg-[#e6f7ef] text-[#0ea66e] text-[10.5px] font-bold px-1.5">
    {m.score}
  </span>
  ```

### 5. Market Snapshot — legend on right of map (lines 616–637)
- Restructure inside of card: wrap map + legend in `grid grid-cols-[1fr_auto] gap-3 items-center`. Map keeps its current styling (slightly narrower); legend becomes a vertical stack on the right with the 3 colored dots and labels (`text-[10.5px]`, `space-y-1.5`).

### 6. Bottom alignment of three columns
- Remove `self-start` from the right column wrapper (line 572) so the right stack stretches to align with the tallest sibling.
- Add a small bottom spacer/padding on the Ranked Markets card to bring its bottom edge close to the Frisco card.
- Net: at 1100px the three columns end on visually similar lines, matching mockup.

### 7. Preserved as-is
Top header, scoring weights, filter bar, three-column structure, Find Teachers behavior, Source Data card, Market Research Report card content, drawers, all data wiring, pagination logic (no state added — visual buttons are presentational, matching current behavior).

## Acceptance
- Ranked Markets rows breathe; score bars are wider; pagination shows `‹ 1 2 3 … 10 ›`; result text reads "Showing 1 to N of 238 results".
- All 4 Frisco buttons fit inside the card border at 1100px.
- Key Market Signals rows align cleanly across icon / label / value / delta.
- Nearby Markets scores appear as green boxed badges.
- Market Snapshot legend sits to the right of the map.
- Bottoms of the three main columns end on visually aligned lines.
- App compiles cleanly; no functional/backend changes.
