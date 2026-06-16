# Port Site Analysis PDF (Feature 1B) to @react-pdf/renderer

Replace the jsPDF + jspdf-autotable engine for Feature 1B with `@react-pdf/renderer`. Same 10 sections, same 4-up comparison, same map images, same inputs — better typography, real page-break handling, no more glyph garbling, no more overlapping text.

Market Validation PDF (`marketReportPdf.ts`) is out of scope and stays on jsPDF.

## Dependencies

Add `@react-pdf/renderer` (~400KB gz, MIT, browser-only, no backend).

## New file: `src/lib/sitePack/SitePackDocument.tsx`

A typed React component tree that renders the report. Exports:

- `SitePackDocument` — the `<Document>` component, props = same `BuildSitePackArgs` shape used today.
- `renderSitePackPdfBlob(args): Promise<Blob>` — convenience wrapper around `pdf(<SitePackDocument {...args}/>).toBlob()`.

Inside the file:

- `Font.register` Inter from Google Fonts CDN (Regular 400, Medium 500, SemiBold 600, Bold 700, Italic 400i). One font, used everywhere — kills the "fonts not uniform" complaint.
- Reuse the existing pure helpers from `sitePackPdf.ts` (`verdictSentence`, `strengthsBullets`, `risksBullets`, `opportunitiesBullets`, `recommendationsBullets`, `fmtMoney`/`fmtPct`/`fmtCount`/`fmtMi`, tier color mapping, `VERDICT_LABEL`). Move them to `src/lib/sitePack/copy.ts` so both this component and any future surface can import them.
- Component tree:
    - `<CoverPage candidates today />` — title, subtitle, weighting line, summary `<Table>` of all candidates (Candidate | SAS | Tier | Decision | Winner). Tier cell colored by tier; Winner cell shows `★` (real Unicode — Inter has it).
    - `<CandidateDetail candidate />` rendered once per candidate, `wrap` enabled so long content reflows cleanly:
        - Section 1 Executive Summary — score card (SAS number + tier chip + WINNER badge if marked) and verdict sentence in a flex row.
        - Section 2 School Profile — `<KvTable>` (4 rows).
        - Section 3 Neighborhood Affluence — `<KvTable>` (4 rows) + `<Image src={mapPngDataUrl}/>` if present, with a caption.
        - Section 4 Family Density — `<KvTable>` (3 rows).
        - Section 5 School Ecosystem — `<KvTable>` (3 rows).
        - Section 6 Accessibility — `<KvTable>` (3 rows).
        - Section 7 Strengths — `<BulletList>`.
        - Section 8 Risks — `<BulletList>`.
        - Section 9 Opportunities — `<BulletList>`.
        - Section 10 Recommendations — `<BulletList>`.
        - Each section title uses `wrap={false}` with its first paragraph so headers never orphan.
    - `<ComparisonPage cols />` — 4-up matrix as a `<Table>` with header row of school names and one row per metric (Address, SAS, Tier, all 5 pillars, Decision, Winner). Tier row cells colored by tier.
- Shared primitives in same file: `<SectionTitle n label/>`, `<KvTable rows/>`, `<BulletList items/>`, `<Table head body columnStyles/>`, `<Chrome page header/>` (header line + page footer via `<Text render={({pageNumber, totalPages}) => ...}/>`).
- Styles via `StyleSheet.create` — single semantic palette (navy/blue/muted/soft/line/green/amber/red/white) matching the current PDF's brand colors.

## Edits

**`src/pages/SiteAnalysis.tsx`** — `handleExport`:
- Drop the `buildSitePackPdf` import and `pdf.save(...)` call.
- Import `renderSitePackPdfBlob` from the new file.
- Keep the parallel `fetchMapPng` step exactly as today.
- `const blob = await renderSitePackPdfBlob({ candidates, generatedAt: new Date() });`
- Trigger download with a hidden `<a download={filename} href={URL.createObjectURL(blob)}>` click, revoke the object URL after. (Same UX as `pdf.save`.)
- "Generating PDF…" toast + `Loader2` spinner stay.

**Copy fixes carry over from current file** (already shipped, but moved to `copy.ts`):
- Don't-Recommend tier text is generic and tier-driven, no "negative anchor" / "calibration corpus" wording on Trinity / St. Francis.
- Winner badge text reads `★ Winner` (Inter renders ★ correctly — no more `&` glitch).

## Delete

- `src/lib/sitePackPdf.ts` — replaced by the new file. (`fetchMapPng` moves to `src/lib/sitePack/fetchMapPng.ts`, imported by both the new doc and `SiteAnalysis.tsx`.)

## Out of scope

- Market Validation PDF (`marketReportPdf.ts`) — untouched.
- Pillar math, tier thresholds, signal sources, isochrone fetch logic — untouched.
- LLM-generated narrative — bullets stay deterministic.
- New sections beyond the 10 already required.

## QA before declaring done

Generate the PDF with 1, 2, and 4 candidates and verify:
1. No section title gets orphaned at the bottom of a page.
2. Winner badge reads `★ Winner` (real star, not `&` or a box).
3. Trinity / St. Francis Recommendations contain no "negative anchor" or "calibration corpus" language.
4. 4-up comparison matrix fits one page, no clipped column.
5. Map image renders inside the affluence section, not stretched.
6. Inter font is used throughout (no Helvetica fallback flashes).

Approve to proceed.
