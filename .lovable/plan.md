## Problem

Two pagination patterns feel cramped and substandard:

1. **Ranked Markets table (CityScoring.tsx ~L2221)** — pagination strip is jammed into a narrow left column, controls are 6px tall, page-number buttons are tiny, "Showing 1 to 8 of 10" is squeezed against page chips. Looks broken when only 10 rows exist (8 visible + page "2" with 2 rows = bad page-size).
2. **Spreadsheet view (CitySpreadsheetView.tsx L355–364)** — page-size dropdown caps at 100/page while dataset is 817 cities → user must click through 9 pages. No "All" or higher tiers.

## Industry-standard pagination (what Linear, Airtable, GitHub, Stripe, Notion, Material UI, Ant Design do)

Researched conventions:
- **Page-size options:** 25 / 50 / 100 / 200 (Airtable, Stripe). For ≤2000 rows, also offer **"All"** (GitHub, Linear). Never cap below ~25% of total.
- **Pagination bar layout:** full-width strip with **3 zones**: left = result count ("Showing 1–50 of 817"), center = page nav, right = page-size selector + jump-to-page (optional). Material UI `TablePagination`, Ant Design `Pagination`, shadcn `Pagination` all follow this.
- **Hit targets:** 28–32px tall buttons, not 24px. WCAG min 24×24, comfortable is 32.
- **Page-number chips:** show first, last, current ±2, with ellipses (already done, just too small).
- **First / Last buttons:** include `«` and `»` when totalPages > 7 (GitHub, Linear).
- **Compact mode:** when container is narrow, collapse to `‹ Page X of Y ›` + size selector (Stripe mobile, Material UI compact).

## Plan

### A. Ranked Markets pagination (CityScoring.tsx)

Replace the cramped strip (L2221–2249) with a full-width pagination bar that spans the **entire bottom of the 3-column grid** (left column + center detail card), not just the narrow ranked-markets column. Take the freed horizontal space.

Layout:
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Showing 1–8 of 10 markets   « ‹  [1] 2  › »    Rows: [10 ▼]              │
└──────────────────────────────────────────────────────────────────────────┘
```

Specifics:
- Move the pagination bar OUT of the ranked-markets card (`min-w-0 rounded-lg bg-white...`) and into a new full-width row directly under the 3-column grid. The list itself stays in the left column; only the controls span wide.
- Button height: 28px (`h-7`), page-chip width: 28px min, font 12px.
- Add `«` First and `»` Last buttons (visible when totalPages > 5).
- Add a small **Rows per page** selector on the right: `5 / 10 / 20 / 50`. Current implicit page size for ranked-markets list looks like 8 — confirm and make it user-controlled (default 10).
- Use semantic muted-foreground for the count, primary tint for active page (already uses `#174be8`).
- Reuse the same `Pagination` primitive from `src/components/ui/pagination.tsx` if present; otherwise inline with consistent shadcn-style classes.

### B. Spreadsheet view page-size dropdown (CitySpreadsheetView.tsx L355–364)

Expand options to match dataset scale:
```
25 / page
50 / page
100 / page
200 / page
500 / page
All (817)   ← label shows live total
```

- Dynamically compute the "All" label as `All (${total.toLocaleString()})`.
- When "All" is selected, set `pageSize = total` and hide the page-nav buttons (keep only the "Showing X of X" count).
- Warn-free: 817 rows in one DOM render is fine; table already uses `min-w-[1600px]` with horizontal scroll, no virtualization needed.

### C. Spreadsheet view bottom pagination bar (L488–506)

Already 3-zone, but tighten:
- Bump button height from `h-7` to `h-8` for parity with toolbar.
- Replace "First / Prev / Next / Last" text buttons with icon buttons (`«`, `‹`, `›`, `»`) + visible numbered page chips (current ± 2 with ellipses), matching Ranked Markets for consistency.
- Add the rows-per-page selector here too (mirror top), so users don't have to scroll up.

### D. No business-logic changes

Only presentation. No scoring math, no data layer, no schema touched. Rule 7 (layout locked) refers to the left sidebar — pagination bars inside pages are fair game.

## Files to change

- `src/pages/CityScoring.tsx` — restructure pagination region around L2221–2249, possibly hoist out of the ranked-markets card.
- `src/components/city-scoring/CitySpreadsheetView.tsx` — expand page-size options (L355–364), polish bottom bar (L488–506), add rows-per-page on bottom bar.

## Out of scope

- Virtualization (`react-window`) — not needed at 817 rows.
- Server-side pagination — already client-side, dataset is small.
- Sticky pagination bar on scroll — can be a follow-up if requested.

## Doc-sync (after implementation, on your "go docs")

Note in `OPEN_TASKS.md` that pagination UX was standardized across CityScoring + Spreadsheet to Airtable/Linear conventions, with page-size up to "All" in spreadsheet.
