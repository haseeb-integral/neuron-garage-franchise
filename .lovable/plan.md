## Goal

You're sending Brett **one file**, not three. Two tasks:

1. **Rename** the Open Decisions supplement so it's obvious what it is.
2. **Rewrite** the Vision v1 doc at true Grade-8 (executive non-technical) language, keeping the blue colored headings and good formatting. This replaces the v1 you already sent (you'll unsend that one).

After this, v1.1 becomes obsolete — we'll keep it on disk but you ignore it.

---

## Task 1 — Rename Open Decisions doc

Copy existing files to the new name. No content changes.

- `Neuron-Garage-Phase-2-Open-Decisions-v5-supplement.docx` → `Neuron-Garage-Features-1A-1B-Open-Decisions-v1.docx`
- Same for the `.pdf`

Old files stay on disk (so nothing breaks) but the new name is what you download and send.

---

## Task 2 — Rewrite Vision v1 at Grade-8

Create **`Neuron-Garage-Features-1A-1B-Vision-v2.docx`** (and `.pdf`).

### What stays from v1
- Blue colored headings (same `#174be8` brand blue used in the app)
- Section structure: Intro → Feature 1A → Feature 1B → How they connect → What's still open
- Depth (it stays detailed — Brett liked v1's depth)
- The two "decision-capture surface" callouts that v1.1 added (so we don't lose that improvement)

### What changes — language rewrite rules
- **Replace every jargon term** with a plain phrase, used consistently:
  - *isochrone* → "drive-time circle (10 or 15 minutes by car)"
  - *calibration gate* → "sanity check"
  - *PEE Score / composite score* → "the one number" or "the city's score"
  - *sub-score / pillar* → "one of the six things we measure"
  - *sellout curve* → "how fast camps fill up"
  - *premium enrichment ecosystem* → "the local market for paid kids' activities"
  - *Tier 1/2/3 cost envelope* → "small / mid / big city budget"
  - *Market Balance Index / CSI* → "how crowded the market already is"
  - *anchor markets / external proxy* → "the markets we already know are good"
- **Sentence length**: max ~20 words. Break long sentences.
- **No nested clauses**. One idea per sentence.
- **Define on first use**, then use the plain phrase forever after.
- **Open with one paragraph** that a non-technical executive could read in 30 seconds and know what the two features do and why they exist.
- **End each feature section** with a 3-line "what success looks like" box in plain English.
- **Keep the TBD markers** v1.1 introduced (tier labels, calibration margin, weights) but phrase them as "Brett still needs to decide X" — and point to the Open Decisions doc.

### Format
- US Letter, 1" margins, Arial body (Calibri also fine)
- H1 / H2 in brand blue `#174be8`, bold
- Body 11pt, line spacing 1.15
- Page numbers in footer
- Title page with version + date

### Out of scope
- No new content or new features. Same scope as v1.
- No re-numbering, no diagram rewrites.
- We don't touch v1 or v1.1 — they stay on disk.

---

## Deliverables

Three files in `/mnt/documents/`:

1. `Neuron-Garage-Features-1A-1B-Open-Decisions-v1.docx` + `.pdf` (renamed copy)
2. `Neuron-Garage-Features-1A-1B-Vision-v2.docx` + `.pdf` (Grade-8 rewrite)

After build, I'll convert each page to an image and visually verify nothing is broken, then post `<presentation-artifact>` tags so you can download.

**You send Brett:** the two new files. You unsend the old v1.

No code changes. No app changes. Pure document work.
