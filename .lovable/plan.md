# SAS PDF — match the MVS brief behavior

You're right: today the SAS button uses `react-pdf` to build a binary PDF and pop it in a new tab, which still triggers a download. The MVS brief works very differently and looks much better — it's a real **HTML page** (`/market-brief?...`) with a dark navy gradient cover, big serif city name, donut, and print CSS. The user opens it in a new tab and uses Cmd/Ctrl + P → Save as PDF when they want a file. Nothing downloads automatically.

We'll do the same for SAS.

## What changes

### 1. New route: `/sas-brief`
- New page: `src/pages/SiteBrief.tsx`.
- Lazy-loaded in `src/App.tsx` (mirrors `MarketBrief`).
- Reuses the existing print CSS: `src/styles/market-brief-print.css` (already global, defines `.mb-doc`, `.mb-page--cover`, navy gradient, etc.). Same fonts, same colors, same cover treatment as MVS.

### 2. SAS Brief layout (same brand as MVS)

**Cover page** (dark navy gradient, exact same look as the screenshot you sent):
- Top bar: white logo + "NEURON GARAGE" left, "CONFIDENTIAL · INTERNAL" right.
- Eyebrow: "SITE ANALYSIS REPORT" (replaces "MARKET VALIDATION BRIEF").
- Big serif title: top-ranked candidate's school name (Fraunces, 84pt) — same typography as the MVS "Boston" wordmark.
- Italic sub-line: candidate address (replaces the MVS "MA" state line).
- Body paragraph: "A live, recomputed look at premium daycare/school site fit at {school} — school profile, neighborhood affluence, family density, ecosystem, and accessibility. Every number on every page is pulled from the same scoring helper that drives the on-screen SAS cards."
- 4 stat columns: Generated · Candidates · Top SAS · Confidence (band of top candidate, colored).
- Big donut on the right showing the top candidate's SAS composite (same `CompositeDonut` SVG component, ported into this file or shared).
- Bottom strip: "SAS · v2.2 · 25/25/20/15/15 weighting" left, page label right.

**Per-candidate sections** (one section per candidate, page-break between them via `.mb-page`):
- Section header: candidate name (serif), address (muted).
- Exec card: SAS composite (big), confidence chip in band color, verdict sentence.
- 5 pillar bars (same `PillarBar` style as MVS — colored gradient by score band): School Profile / Affluence / Family Density / Ecosystem / Accessibility, each showing weight and "contributes X pts".
- KV blocks for signals (HHI 10/15-min, % > $150K, children 5–12, pop, ecosystem counts, road/highway distance) — same compact KV style.
- Embedded isochrone map (when the slot has the static-map URL — same data we already pass into the react-pdf version). Falls back to a muted "map unavailable" line.
- Strengths / Risks / Opportunities / Summary bullets — green / red / amber / blue tints.

**Comparison page** (last section): same side-by-side table we already have, but in the brief's lighter style (soft headers, colored confidence cells).

**Footer chrome** on every page: "Neuron Garage · SAS Report · {date}" left, page number right (same `.mb-no-print` floating toolbar with "Print / Save as PDF" button).

### 3. Button on Site Analysis page

File: `src/pages/SiteAnalysis.tsx` (around lines 860–910 — current `handleExportPdf`).

- Stop calling `renderSitePackPdfBlob`.
- Build the same `SitePackCandidate[]` payload (school name, address, type, grade band, enrollment, pillars, composite, tierLabel, signals, decision, mapPngDataUrl) — using the same `recomputeSiteScores` helper.
- Stash it on `sessionStorage` under a short random key (`nrg-sas-brief-{uuid}`).
- `window.open(`/sas-brief?key=${key}`, "_blank", "noopener,noreferrer")`.
- No download, no fallback download — exactly like MVS.
- Toast: "SAS brief opened in a new tab — use Cmd/Ctrl + P to save as PDF".
- Button label stays "Export PDF" (or rename to "Open SAS Brief" — your call; default keeps "Export PDF" so the UI doesn't shift).

Why sessionStorage and not URL params: the SAS payload includes pillar scores, full ACS/ecosystem/accessibility signal blobs, the user's verdict, and a base64 isochrone PNG per candidate — too large for a URL. sessionStorage is per-tab and goes away when the user closes the tab.

### 4. Brief reads back the payload

`SiteBrief.tsx`:
- `useSearchParams()` → `key`.
- Read `sessionStorage.getItem(key)`, JSON.parse, render.
- If missing/invalid: show a friendly empty state with a "Back to Site Analysis" link (mirrors MVS empty state).
- Sets `document.title` to "SAS Brief — {top candidate name}".

### 5. Cleanup of the old react-pdf path

`src/lib/sitePack/SitePackDocument.tsx` and `renderSitePackPdfBlob` become unused. We will:
- Leave the file in place (deleting touches imports across copy.ts and tests). Just stop calling it.
- Remove the `renderSitePackPdfBlob` import from `SiteAnalysis.tsx`.

If you want the file deleted later, that's a one-line follow-up.

## Out of scope

- Watch List save button — next turn after this lands.
- Methodology / Docs sidebar text.

## Verification

- Click "Export PDF" on Site Analysis → a new tab opens at `/sas-brief?key=...`.
- Cover matches the MVS screenshot's brand (dark navy gradient, Fraunces serif, donut, stat columns, "CONFIDENTIAL · INTERNAL" tag).
- No automatic download. Browser only saves a file when the user hits Cmd/Ctrl + P → Save as PDF.
- All numbers match the SAS page (`recomputeSiteScores`).
- Per-candidate sections show pillar bars, KV blocks, isochrone map, colored bullets.
- Final page is the side-by-side comparison.
- Closing the tab clears the sessionStorage key (best-effort `beforeunload`).
