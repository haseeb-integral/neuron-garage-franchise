# Phase 6.1 — MVS Brief PDF (Austin)

Answer to your library question: **yes** — the Site Analysis branded PDF (`src/lib/sitePack/SitePackDocument.tsx`) uses `@react-pdf/renderer` v4.5.1, already in `package.json`. We'll use the same library for the MVS brief — same patterns, same fonts, no new dependency, no edge function or headless Chrome needed.

## Decisions locked in

- **Library:** `@react-pdf/renderer` (client-side render, downloaded as Blob).
- **Audience:** Internal — Brett & Haseeb. Dense, numbers-forward, minimal narrative.
- **Branding:** `src/assets/neuron-garage-logo.png` on cover + page header.
- **Scope:** Austin only (the one `mvs_data_source='live'` city). Tier B cities still 404 — button disabled until their flag flips.
- **Page size:** US Letter portrait (matches internal docs convention).
- **Source-of-truth rule:** every number reads from `useLiveMvs(cityName)` → `computeMvs(...)` — same helper the table row, deep-dive panel, and Show Formula drawer use. Zero new fetches, zero DB-stored composites.

## Turn 6.1 — Generate + download

**Files (new):**
- `src/lib/mvsBrief/MvsBriefDocument.tsx` — React-PDF document component. Internal-style: tight margins (0.5in), 9–10pt body, mono for numbers, gray rule lines, no decorative gradients. Header strip on every page: NG logo left, "MVS Brief — {city} — {ISO date}" right.
- `src/lib/mvsBrief/sections.tsx` — one component per SOW section, each accepts the live MVS payload + computed scores.
- `src/lib/mvsBrief/downloadMvsBrief.tsx` — wraps `@react-pdf/renderer` `pdf().toBlob()` + `saveAs`-style anchor click. Returns Promise so the button can show spinner.

**Files (edited):**
- `src/components/phase2-demo/LiveCityDeepDive.tsx` — add "Download MVS Brief (PDF)" button in the title row, right of "Show Formula". Only shown when `mvs_data_source='live'`. Disabled while generating; toast on success/error.

**12 SOW sections (order, mirroring on-screen MVS):**
1. Cover — city, composite score, tier, run date, data freshness (week_start range).
2. Executive Summary — composite, 5 pillar scores, top 2 strengths / top 2 risks (rule-based from pillar deltas).
3. Demand pillar — providers count, avg weekly bookings, growth %, contributing weeks. Source: `mvs_weeks` rollup.
4. Affluence pillar — median HH income, % HH >$150k, source citation.
5. Density pillar — population per sq mi, child population %, source citation.
6. Competition pillar — competitor count within radius, saturation index, source citation.
7. Schools pillar — qualifying schools count, avg rating, source citation.
8. Pillar weights — current slider values + composite formula.
9. Data lineage — each `mvs_pipeline_runs` step that fed this brief (timestamp, row counts, source URLs from Firecrawl).
10. Confidence notes — any `LowConfidenceBadge` triggers, missing-data flags.
11. Methodology footnote — link to `/mvs-methodology`, weights version, helper version.
12. Appendix — raw per-week table (provider × week × bookings) for the live window.

Every numeric cell carries a superscript footnote pointing to its source in section 9 (data lineage).

**Performance target:** Austin in <30s. React-PDF on client averages 2–5s for ~12 pages of text+tables; logo PNG is the only image — well within budget.

**Out of scope this turn:**
- Screenshot capture of the on-screen detail panel (Sam's brief mentions it as optional appendix; defer to 6.2 if Brett wants it).
- Tier B cities (Phase 7).
- Email delivery / storage upload (download-only for now).

## Technical notes

- `@react-pdf/renderer` ships standard fonts (Helvetica/Times/Courier) without registration. For dense internal docs we'll use Helvetica body + Courier for numeric columns. No web-font registration → no flicker, no missing-glyph boxes.
- Logo: import `neuron-garage-logo.png` directly and pass to `<Image src={logo} />`. React-PDF accepts the imported asset URL.
- Tables: reuse the `<View>` flex-row pattern already established in `SitePackDocument.tsx`. No new abstractions.
- Save-as: `pdf(<MvsBriefDocument …/>).toBlob()` → object URL → anchor click → revoke. Same pattern as `SitePackDocument`.

## Verification

- Click "Download MVS Brief" on Austin deep dive → PDF downloads.
- Open PDF: cover composite matches the on-screen composite to 2 decimals.
- Drag a weight slider on the page, re-download → composite changes accordingly (proves recompute path, not stale DB).
- Build passes; no new deps.

## Open questions (non-blocking — defaults stated)

- **Sliders in PDF?** Defaulting to "show current weight values as numeric column in section 8." If you want a tiny bar-chart per pillar, say so and I'll add it.
- **Footnote style?** Defaulting to superscript-number + "Sources" list on the last content page. Alt: inline parenthetical citations. Confirm or leave default.
- **Filename?** Defaulting to `mvs-brief-austin-2026-06-17.pdf`. Confirm.

If those defaults are fine, approve and I'll build turn 6.1 in one shot.
