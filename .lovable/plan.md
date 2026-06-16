# Fix Site Analysis PDF — copy bugs + proper formatting

Three concrete issues in `src/lib/sitePackPdf.ts`:

1. **Wrong "negative anchors" language on Trinity / St. Francis.** `recommendationsBullets()` and `verdictSentence()` use calibration-corpus phrasing ("Negative anchor profile", "Document negative anchors for calibration corpus") for every `Don't recommend` tier candidate. That language is reserved for LeafSpring (the actual negative calibration anchor).
2. **Winner badge renders as `&` / garbled glyph.** jsPDF's built-in Helvetica does not include `★` (U+2605). Same problem for `·`, `—`, `'` and `'` scattered through the file — they render as boxes or wrong chars.
3. **Layout is messy** — overlapping text in the exec-summary block, kv rows clipping when labels are long, comparison matrix columns overflowing on 3–4 candidates, no real table grid.

## Fixes

### A. Copy — tier-driven, not calibration-driven
In `recommendationsBullets()` (else branch) replace:
- `"Pass on this site. Document negative anchors for calibration corpus."` → `"Do not pursue. Composite is below the Recommend bar on Sam's weighting."`
- `"Re-direct search to addresses scoring >= 60 in the same MSA."` (keep, but use ASCII `>=`)

In `verdictSentence()` (else branch) replace:
- `"... Negative anchor profile - do not pursue without a re-anchor."` → `"... Below the Recommend threshold on Sam's 25/25/20/15/15 weighting; do not pursue."`

No "negative anchor" / "calibration corpus" wording anywhere a tier could land — that copy is gone from the file entirely. LeafSpring naturally lands in `Don't recommend` and gets the same generic tier-driven text as Trinity/St. Francis; no candidate gets calibration-jargon.

### B. Glyphs — ASCII-safe everywhere
jsPDF Helvetica is WinAnsi; non-Latin glyphs print as `&`/boxes. Sweep the file and replace:
- `★` → `*` (e.g. `"* Winner"`, `"  *"` next to winner names, `"*"` in comparison matrix)
- `·` (middle dot) → ` - ` or `|` in headers/section titles
- `—` (em dash) → `--`
- `'` `'` (curly quotes) → `'`
- `≥` → `>=`

Affected strings: cover header, `sectionTitle` separators, `verdictSentence`, `recommendationsBullets`, winner badge in exec summary (`"* Winner"`), cover-table winner mark, comparison-matrix winner row, footer chrome.

### C. Reformat with `jspdf-autotable` (free, MIT, official jsPDF companion)
Install `jspdf-autotable` and use it for the two places where manual `pdf.text` math overlaps today:

1. **Cover summary table** (currently hand-drawn columns at fixed x offsets that clip long school names) — replace with `autoTable({ head: [["Candidate","SAS","Tier","Decision"]], body: rows, ... })`. Auto column widths, no clipping.
2. **Per-candidate kv blocks** (School Profile, Affluence, Family Density, Ecosystem, Accessibility) — replace each `kv()` group with a small `autoTable` of `[label, value]` rows. Fixes long-value overflow and gives consistent striped rows.
3. **Final 4-up comparison matrix** — replace the hand-rolled `row()` grid with one `autoTable` whose columns = `["Metric", ...candidate names]`. autoTable handles 1–4 columns, wraps long names, draws proper borders, never overlaps.

Exec-summary header block (SAS score box + tier chip + verdict sentence) stays hand-drawn, but the verdict sentence will be clamped to `contentW - 130` (already is) and `ensureSpace` will be tightened so the next section never overlaps.

### D. Keep behavior unchanged
- No change to inputs/exports; `buildSitePackPdf(args)` signature identical.
- No change to pillar math, tier mapping, or what's marked as Winner.
- No change to `SiteAnalysis.tsx` wiring or map-fetch path.

## Files

- `src/lib/sitePackPdf.ts` — edits in `recommendationsBullets`, `verdictSentence`, glyph sweep, swap three sections to `autoTable`.
- `package.json` — add `jspdf-autotable`.

## Out of scope

- html2canvas/DOM-snapshot path (heavier, fonts inconsistent, breaks if cards aren't mounted) — not needed once glyphs are ASCII and autoTable handles layout.
- Re-weighting, threshold changes, new sections.
- Isochrone map fixes (separate track).

Approve to proceed.
