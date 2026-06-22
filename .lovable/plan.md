# Polished SAS PDF + open-in-new-tab

Two pieces. Same data the SAS page already shows — just a prettier, fully branded layout with a proper SAS cover, and the button opens a new tab instead of force-downloading.

## What data goes in (same as the SAS page)

The PDF already pulls from the same recompute helper as the SAS page (`recomputeSiteScores`). No new data sources, no stored DB values. Per candidate it includes:

- School name, address, type, grade band, enrollment.
- SAS composite + confidence band (Strong / High / Medium / Low).
- 5 pillar sub-scores: School Profile (25%), Affluence (25%), Family Density (20%), Ecosystem (15%), Accessibility (15%).
- Signals: median HHI 10/15 min, %>$150K, children 5–12, total pop, nearby elementary/private schools, nearby student pop, road/highway distance.
- Drive-time isochrone map (10-min + 15-min rings) when available.
- Strengths / Risks / Opportunities / Summary & Next Steps bullets.
- User's saved verdict + notes from the Watch / Decisions table.

Cover page lists every candidate. Final page is the side-by-side comparison (up to 4). All numbers come from the same calibrated helper as the on-screen cards — "one calibrated number everywhere".

## 1. Open PDF in a new browser tab

File: `src/pages/SiteAnalysis.tsx` (around lines 894–904).

- Build the blob from `renderSitePackPdfBlob(...)` as today.
- `URL.createObjectURL(blob)` → `window.open(url, "_blank", "noopener,noreferrer")`.
- If popup is blocked (returns `null`), fall back to current download flow.
- Revoke object URL after ~60s so the new tab has time to load.
- Toast: "SAS PDF opened in a new tab".

The browser's built-in PDF viewer gives Download, Print, and zoom for free.

## 2. Gorgeous, branded PDF with a proper SAS cover

File: `src/lib/sitePack/SitePackDocument.tsx`. Visual-only changes, no scoring or copy logic touched.

### Brand kit (already in app)
- Logo: `src/assets/neuron-garage-logo.png`.
- Palette: navy `#07142f`, brand blue `#174be8`, soft `#f7faff`, line `#e5eaf2`, tier colors green/amber/red.
- Font: Helvetica (built-in, never fails to render). Display weight 700, body 400.

### SAS Cover Page (full redesign — this is the new "SAS PDF cover")
- Top brand strip: navy band, Neuron Garage logo left, "Neuron Garage" wordmark right in white, generated-date pill.
- **Big "SAS" badge** top-left under the strip — the three letters in brand blue with a small caption underneath: "Site Analysis Score".
- Hero title: "Site Analysis Report" in display weight, with a thin brand-blue rule under it.
- Sub-line: "Prepared {today} · {N} candidate sites analyzed".
- **SAS scale legend** (small horizontal bar under sub-line): shows the 4 confidence bands with thresholds — Strong ≥75 (green) · High 60–74 (blue) · Medium 45–59 (amber) · Low <45 (red). Matches the SAS Methodology page.
- Headline card (centered, soft-blue background, rounded): top candidate's name, big SAS number, confidence band chip in band color, one-line verdict sentence.
- Candidates table: lighter header (soft-blue bg, navy text), zebra rows, right-aligned numbers, colored confidence chips.
- Footer strip on cover: italic "SAS weighting: 25 / 25 / 20 / 15 / 15 across School Profile · Affluence · Family Density · Ecosystem · Accessibility · v2.2".

### Per-candidate pages (polish, not redesign)
- Add a small logo + candidate name bar at the top of the first candidate page (instead of plain text title).
- Section bands get a left accent rule in brand blue and slightly bolder labels.
- Executive summary card: bigger SAS number, colored confidence chip, clearer verdict block.
- KV tables: labels in muted, values in navy 600, zebra rows, tighter rule lines.
- Pillar mini-bars: under each pillar's section title, a thin horizontal bar (0–100) in brand blue with the value tick — matches the on-screen pillar bars.
- Isochrone map: rounded corners, caption in italic muted, bordered frame.
- Strengths / Risks / Opportunities: colored bullet dots (green / red / amber).

### Comparison page (polish)
- Same data, lighter header, zebra rows, colored confidence cells.
- Keeps the existing footnote: "All pillar and composite scores read from `recomputeSiteScores`."

### Page chrome (every page)
- Fixed top header: tiny logo left, candidate or report name center, "SAS Report" tag right. Thin rule under it.
- Fixed footer: "Neuron Garage · SAS Report · {today}" left, "Page X of Y" right.

No new dependencies. `@react-pdf/renderer` already supports `<Image>` from imported PNGs.

## Out of scope (next turn)

- Watch List save button — runs right after this lands.
- MVS PDF cover — same treatment could apply later, not asked for now.

## Verification

- TypeScript build passes.
- Click "Export PDF" on Site Analysis → new tab opens with the report.
- Cover shows logo, brand strip, big "SAS" badge, scale legend, headline card, polished table.
- Per-candidate pages: logo header, pillar mini-bars, colored bullets, framed map.
- Comparison page reads cleanly with colored confidence cells.
- Popup blocker case: falls back to download with toast.
- All numbers match what the SAS page shows on screen (same `recomputeSiteScores`).
