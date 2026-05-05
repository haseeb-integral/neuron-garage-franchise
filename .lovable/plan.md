## Root cause

In `src/pages/CityScoring.tsx` line 572, the right insights wrapper uses:

```tsx
<div className="col-span-12 lg:col-span-3 space-y-3">
```

But the parent grid (line 400) is a custom 3-track template: `lg:grid-cols-[0.94fr_1.6fr_0.72fr]`. The leftover Tailwind `col-span-12` / `lg:col-span-3` classes force the wrapper to span more columns than exist, so CSS Grid creates implicit extra columns and pushes the right column onto a new row — making Nearby Markets / Source Data / Report / Map stack full-width below.

Fix is small: drop those col-span classes so the wrapper occupies the natural 3rd track. No other layout rewrite needed.

## Changes (single file: `src/pages/CityScoring.tsx`)

### 1. Right column wrapper — line 572
Replace:
```tsx
<div className="col-span-12 lg:col-span-3 space-y-3">
```
with:
```tsx
<div className="min-w-0 space-y-3 self-start">
```

This puts Nearby Markets, Source Data, Market Research Report, and Market Snapshot in the 3rd grid track beside the Frisco detail panel, exactly like the mockup. Frisco panel content is untouched.

### 2. Slightly rebalance the 3 tracks for ~1100px width — line 400
Change `lg:grid-cols-[0.94fr_1.6fr_0.72fr]` to `lg:grid-cols-[0.92fr_1.5fr_0.92fr]` so the right column has enough room for readable Source Data / Nearby Markets text and isn't squeezed.

### 3. Key Market Signals — stop truncation (line 543)
Current grid `[16px_minmax(0,1fr)_80px_126px]` with `truncate` cuts labels to "C…", "H…" once the panel narrows. Replace with a tighter, no-truncate row:

```tsx
<div ... className="grid grid-cols-[14px_minmax(0,1fr)_auto_auto] items-center gap-x-2 text-[10.5px]">
  <Icon size={13} className="text-[#3160ff] flex-shrink-0" />
  <span className="text-[#526078] leading-tight">{r.label}</span>
  <span className="font-semibold text-[#07142f] whitespace-nowrap">{r.value}</span>
  <span className={`whitespace-nowrap text-right font-medium ${r.deltaClass}`}>{r.delta}</span>
</div>
```

Removes `truncate`, lets label wrap if needed, sizes value/delta to content. Slightly smaller font (10.5px) to keep one line on most rows.

### 4. Source Data — 2 columns (line 595)
Change `grid-cols-1` to `grid-cols-2 gap-x-3 gap-y-1` so the 8 sources display in two clean columns like the mockup.

### 5. Ranked Markets — Compare button placement & tighter rows
- The Compare button is already top-right (line 408) — keep.
- Reduce row vertical padding from `py-2` to `py-1.5` (line 428) so the list is more compact and the card aligns to top of the row.
- Add `self-start` to the Ranked Markets card wrapper (line 402) so it doesn't stretch to the tallest sibling.

### 6. Market Research Report — compact preview (lines 608–614)
Keep the current compact form. Change the full-width solid blue button to an outlined button to match mockup ("Generate PDF Report" outlined, not a heavy CTA):
```tsx
<Button variant="outline" className="w-full h-8 border-[#dbe4f2] text-[#2250eb] text-[11px] font-medium" ...>
  Generate PDF Report
</Button>
```

### 7. Market Snapshot — keep current compact map placeholder
Already small and matches mockup. No change beyond it now sitting in the right column naturally.

## Out of scope (do not touch)
- Top header, scoring weights, filter row, Add Criteria, Find Teachers behavior
- Backend, auth, Supabase, routes, env, RLS, edge functions

## Acceptance
- At ~1100px preview width, Ranked Markets / Frisco detail / right insight column appear on a single row.
- Right column shows Nearby Markets, Source Data (2 cols), Market Research Report (outlined button), Market Snapshot — stacked.
- Key Market Signals labels are fully readable (no "C…" truncation).
- Frisco panel internals unchanged.
- Page is noticeably shorter / less scrolling.
