# Fix System Architecture Overview rendering

## Diagnosis
The page at `/architecture` renders the hero, headings, lists, blockquote and ASCII code block correctly, but **every markdown table collapses into a single paragraph of `|` pipes** (visible in screenshot: AI models table, Data sources table). Root cause: `react-markdown` does not parse GitHub-flavored markdown (GFM) tables by default. The `SmartLeadSpec` and `ObservabilitySpec` pages have the same renderer but no tables in their source, which is why they look fine.

Secondary issue: the `Companion docs:` line and the `**Last updated:** ... **Owner:** ...` line are crammed on one wrapped line — needs explicit line breaks.

## Fix

1. **Add `remark-gfm` plugin** to `src/pages/SystemOverview.tsx` so tables (and strikethrough, task lists, autolinks) render correctly:
   ```tsx
   import remarkGfm from "remark-gfm";
   <ReactMarkdown remarkPlugins={[remarkGfm]}>{DOCS}</ReactMarkdown>
   ```
   Also apply the same one-line change to `SmartLeadSpec.tsx`, `ObservabilitySpec.tsx`, `ObservabilityGuide.tsx`, `EmailOutreachDocs.tsx`, `DemographicsMethodology.tsx`, `UserGuide.tsx`, `Methodology.tsx`, `ScoringMethod.tsx` (every doc page that uses ReactMarkdown), so future tables don't break.

2. **Tighten `docs/architecture/system-overview.md`** for readability:
   - Convert the squashed `**Audience:** ... **Last updated:** ... **Owner:** ...` block into a proper bullet list.
   - Split the `Companion docs:` line into its own line.
   - Replace the ASCII handoff arrow diagram in Section 2 with a clean numbered list (the table beneath it already conveys the same info).
   - Replace the ASCII data-flow diagram in Section 5 with a Mermaid `graph TD` (renders natively in the prose now that GFM is on — actually Mermaid still needs a renderer; keep as `code` block but redraw the ASCII so it doesn't bleed sideways at this width).
   - Replace the ASCII repo-map tree (Section 8) with a clean indented list (the current `├──` characters render OK in `<pre>` but several get garbled in narrow viewports).

3. **No dependency install needed** if `remark-gfm` is not already in `package.json` — `bun add remark-gfm`.

## Files
- **edit** `src/pages/SystemOverview.tsx` — add remark-gfm
- **edit** 7 other DocShell pages — same one-line plugin add (defensive)
- **edit** `docs/architecture/system-overview.md` — header bullets, drop ASCII arrow diagram, cleaner repo tree
- **add dep** `remark-gfm` (if missing)

## Out of scope
- No Mermaid renderer wiring (overkill for one diagram; keep ASCII in `<pre>`).
- No design-token changes to `DocShell`.

## Verify
- Reload `/architecture`, scroll past Section 3 — tables must render as proper grid with header row, alternating rows, borders (per existing `docProseClass` table styles).
- Spot-check `/smartlead-spec` and `/observability-spec` still render correctly.
