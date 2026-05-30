# Phase 2 SOW + Execution Plan — write, store, and export

## What gets created

### In the repo
1. **`.lovable/phase-2/phase-2-sow.md`** — overwrite the current stub. Full 8-item SOW. Items 1–2 merged from real source material; items 3–8 are explicit "TBD — Brett to fill" stubs with the section structure pre-built.
2. **`.lovable/phase-2/phase-2-execution-plan.md`** — new file. Sequenced build plan for Lovable (and Manus where called out).

### As downloadable artifacts (in chat)
3. `/mnt/documents/Neuron-Garage-Phase-2-SOW.pdf`
4. `/mnt/documents/Neuron-Garage-Phase-2-SOW.docx`
5. `/mnt/documents/Neuron-Garage-Phase-2-Execution-Plan.pdf`
6. `/mnt/documents/Neuron-Garage-Phase-2-Execution-Plan.docx`

All four are byte-for-byte the same content as the two markdown files in the repo — exported, not re-summarized.

### Housekeeping
- `phase-2-status.md` — leave as-is (it already covers all 8 items).
- `CHANGELOG.md` — one line logging the SOW + execution plan + 4 exports.
- README map — add `phase-2-execution-plan.md` to the folder tree.

## How I build the content (in build mode)

### Step 1 — Read sources end-to-end, no shortcuts
- `document--parse_document` on `neuron-garage-module1-enhancements-v2.pdf` — all 12 sections, all formulas verbatim.
- `code--view` the full `transcript Sam meeting May 29.txt`.
- `code--view` the full `brett-5-point-sketch.md`.

Three sources, read in full. No re-using my old typed summaries.

### Step 2 — Write `phase-2-sow.md`

Structure per item (all 8):
- Name + version (1.0 or 1.5)
- Question it answers
- Primary output
- Owner split: Manus vs Lovable
- Inputs / data sources
- Composite formula or success criteria
- Cost envelope
- Acceptance criteria
- Out of scope

Items 1 (Market Validation 1A) and 2 (Site Analysis 1B) — every sub-score, weight, formula, data source, cadence, and dollar number from the PDF, **including the `+` signs that got dropped before**. Validation plan (internal anchors + Bay Area / Seattle Eastside / North Dallas / NoVA / Boston external proxies) included.

Items 3–8 — section skeleton present, with each subsection filled by either:
- a real bullet from the transcript / 5-point sketch if it exists, or
- `**TBD — Brett to fill.**` if it doesn't.

No invented detail. No bluffing.

Plus a top-level section pulled from the transcript: operating mode (architecture-first, Manus = data refinement / Lovable = display, 4 weeks + 2 weeks grace, build starts only when Google Doc is locked).

### Step 3 — Write `phase-2-execution-plan.md`

Different doc, different purpose. Structure:
- **Sequencing** — week-by-week (W1 architecture lock, W2–4 build, W5–6 grace). Which items can run in parallel, which block which.
- **Per-ticket breakdown** for items 1 + 2 only (the ones with real specs): ticket title, files/components likely touched, data sources, acceptance criteria, owner (Manus / Lovable), rough estimate.
- **Items 3–8** — listed with status `blocked: awaiting Brett spec`. No fake tickets.
- **Cross-cutting** — Brett's "one calibrated number everywhere" rule, isochrone library decision (Mapbox vs HERE), human-QA queue UI location, PDF report generator stack.
- **Risks** — explicit list (e.g. Firecrawl rate limits, Census ACS gaps, isochrone cost at scale).

### Step 4 — Export to PDF + DOCX

For each of the two markdown files:
- DOCX via `pandoc` (one command, preserves headings, tables, lists).
- PDF via `pandoc` → LibreOffice (the docx skill's `run_libreoffice.py`), or `pandoc --pdf-engine=...`. I'll pick whichever produces cleaner output on first try and iterate.

**QA gate (mandatory):** convert each PDF to images with `pdftoppm`, view every page, check for clipped tables, broken formulas (especially the `+` signs), overflowing cells, missing pages. Fix and re-export until clean. Same QA for DOCX → render to PDF → image-check.

### Step 5 — Deliver

`<presentation-artifact>` tags for all 4 files so you can download from chat.

## What I will NOT do

- Invent specs for items 3–8. Stubs only.
- Re-type the PDF into markdown again. PDF is parsed live each time.
- Update `phase-2-status.md` — already accurate.
- Touch any app code (`src/`, `supabase/`). This turn is docs only.

## What I need from you

Nothing — once you approve this plan and switch to build mode, I'll execute the whole thing in one go.
