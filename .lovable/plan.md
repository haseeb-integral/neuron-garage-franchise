# MVS Market Brief → Beautiful Web Page + Print-to-PDF

## Why we're changing approach

Today the brief is generated with `@react-pdf/renderer` (`src/lib/mvsBrief/MvsBriefDocument.tsx`, 756 lines). That library renders PDF-only — there is no web view, layout primitives are limited (no CSS grid, no web fonts unless registered, no SVG charts unless hand-built), which is exactly why the output looks utilitarian.

Sam & Brett want the opposite shape: **a real branded web page** at a URL, that anyone can open, scroll, share — and when you hit Cmd-P / "Save as PDF" it prints to a pixel-perfect branded PDF. One source, two surfaces.

## What the research says (Reddit / SO / web consensus)

Three viable paths, ranked:

1. **HTML + print CSS + Paged.js polyfill** — current best-in-class for "web page that prints beautifully." Paged.js (https://pagedjs.org) is the open-source polyfill for the W3C `@page` / Paged Media spec. Used by O'Reilly, MIT Press, Hugo Print. Gives you: real page numbers, running headers/footers, page breaks before/after sections, footnotes, TOC with auto page refs, bleed, crop marks. Works with any HTML/Tailwind. User prints via browser → gorgeous PDF. No server.
2. **react-to-print + handcrafted print CSS** — simpler, no Paged.js. Good if we don't need running headers/footers or a TOC with page numbers. Lighter dep.
3. **Puppeteer/Playwright server-side PDF** — best fidelity but needs an edge function with Chromium (heavy, slow cold starts on Supabase). Overkill unless we need automated email delivery.

Reddit r/webdev + multiple SO threads (`html-to-pdf-converter`, `paged.js page numbers`, `react print css`) consistently land on Paged.js when the requirement is "designer-quality printed output from HTML." `html2pdf.js` and `jsPDF` are explicitly **not** recommended — they rasterize or have poor typography.

**Recommendation: Path 1 (Paged.js).** It's the only option that gives us a real web page AND a print-quality branded PDF from the same source, with zero server cost.

## Scope of this build

### New route + page
- `src/pages/MarketBrief.tsx` at route `/market-brief/:citySlug`
- Reads the same live data the current PDF reads (`useLiveMvs` + `computeMvs` bundle) — single source of truth, no recomputation
- Renders all 12 sections as a real responsive web page using existing Tailwind tokens + Neuron Garage brand (navy `#07142f`, blue `#174be8`, logo)
- "Print / Save as PDF" button at top-right triggers `window.print()`

### Branded print stylesheet
- New `src/styles/market-brief-print.css` loaded only on this route
- `@page { size: Letter; margin: 0.6in; @top-left { content: element(brandHeader) }; @bottom-right { content: "Page " counter(page) " of " counter(pages) } }`
- Page-break rules so sections don't split awkwardly
- Web fonts embedded for print (Inter + a display serif for headlines — current PDF only has Helvetica)
- Cover page with full-bleed brand color, logo, city name, composite score hero, generated-on date
- Running header on every page after cover: small logo + city + section name
- Footer: page X of Y + Neuron Garage URL

### Paged.js wiring
- `bun add pagedjs`
- Loaded lazily only when user clicks "Save as PDF" (so normal web view isn't paginated)
- Polyfill rewrites the live DOM into paginated pages, then we call `window.print()`
- Falls back gracefully (raw browser print) if Paged.js fails

### Charts / visuals (the "gorgeous" part)
- Pillar score bars: SVG, gradient fills, brand colors
- Composite score: large radial/donut SVG on cover
- Week QA table: clean rules, alternating row tint, status pills
- Provider list: card grid with score chips
- Use Recharts (already in deps) for the trend / comparison visuals — Recharts SVG prints crisply

### Replace, don't dual-maintain
- Delete `src/lib/mvsBrief/MvsBriefDocument.tsx` and `sampleBriefAdapter.ts`
- Remove `renderMvsBriefPdfBlob` calls in `LiveCityDeepDive.tsx` and `MarketValidation.tsx`
- Replace both "Export PDF" buttons with "Open Market Brief" that opens `/market-brief/<slug>` in a new tab
- Keep weights/slider state: pass via query string (`?w=infra:0.3,demand:0.2,...`) so the brief reflects the current slider position
- Can remove `@react-pdf/renderer` dep if no other surface uses it (verify SitePackDocument first — it does, so keep the dep for now)

## Build phases (estimate: 3 focused turns)

**Turn A — Scaffold the web page**
- New route, new page component, brand cover, all 12 sections rendered with live data, fully responsive web styling. No print CSS yet. Wire up the two buttons to open the new route.

**Turn B — Print CSS + Paged.js**
- Add `pagedjs` dep, print stylesheet, page breaks, running header/footer, page numbers, cover page bleed, font embedding. "Save as PDF" button triggers paginated print.

**Turn C — Polish + visuals + cleanup**
- SVG charts (radial composite, pillar bars), Recharts visuals where applicable, status pills, typography pass. Delete old `MvsBriefDocument.tsx` + adapter. Manual QA pass (web view + printed PDF side-by-side on Boston).

## What I'd like you to confirm before I build

1. **Brand direction for the cover** — go with the existing navy/blue Neuron Garage palette and add a display serif (e.g. Fraunces or Instrument Serif) for headlines? Or stay sans-only?
2. **Page size** — US Letter (default) or A4?
3. **Replace vs keep old PDF** — OK to delete the `@react-pdf/renderer` brief entirely once the new one works? (Sitepack still uses the lib, so the dep stays.)
4. **Route auth** — `/market-brief/:slug` behind the same auth as the rest of the app? (Yes by default.)
