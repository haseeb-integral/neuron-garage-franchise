# Rewrite: Prompts & AI Workflows (Sam-first)

You're right on every count. The current doc is two stitched-together documents pointed at the wrong reader, Part A is a developer handoff in disguise, the collapsed `Show the actual system prompt` blocks render as ugly walls of monospace in-app, and Transcript C is the literal conversation we're having about this very document. Fix it by restructuring around Sam, not around the codebase.

## New structure (one page, Sam-first, top to bottom)

```text
HERO  →  Part 1 (Sam's Playground)  →  Part 2 (Talking to Lovable like Brett)  →  Part 3 (Appendix: AI surfaces, collapsed)
```

### Part 1 — Sam's Playground (NEW, opens the doc)

The thing the current doc is missing entirely. A short, confident list of *what Sam can do on his own, today, without calling anyone*. Written in second person, plain language.

Sections:
- **You can do these any time** — add notes to candidates, move candidates between stages, rename pipeline column labels, export the teacher list, ask the City Ask-AI anything about a city, use the natural-language filter on City Search, send/snooze items in Email Outreach (via the UI buttons), open any city detail panel, save a search.
- **You can ask Lovable for these** — small text changes, label renames, color tweaks on a badge, a new column in a table, a new filter chip, a fix to a display bug you can see.
- **Ask Brett or Haseeb first for these** — anything that touches scoring math, the tier cutoffs, the database schema, auth/login, the AI models themselves, or anything in Email Outreach that sends real emails.

Tone: encouraging. The current doc only lists what *not* to touch; this flips it.

### Part 2 — Talking to Lovable like Brett

Keep the existing B1 mindset, B2 Golden Rule, and B3 five worked examples — they're good. Two changes:

1. **All transcript examples use Brett.** Strip the current Transcript A (DocShell.tsx jargon), Transcript B (journey bar), and Transcript C (the circular "this document" one). Replace with 2 short, real Brett-style exchanges pulled from chat history — pick ones that show (a) Brett asking for a plan before a risky change, and (b) Brett describing a visible bug in plain words. No file paths, no component names in the body — if a transcript mentions one, paraphrase it ("the city detail panel" not "`CityDetailPanel.tsx`").
2. **Drop the "don't-touch" list from Part 2** — it now lives positively in Part 1's "Ask Brett or Haseeb first" section.

### Part 3 — Appendix: AI surfaces (for Brett & Haseeb)

Move the current Part A here, behind a clear divider and a one-line warning that says: *"This appendix is a reference for Brett and Haseeb. Sam — you can skip it."*

Also fix the formatting problems:
- **Kill the `Show the actual system prompt` collapsed code blocks in the body.** They render as ugly oversized monospace walls in the in-app doc viewer. Instead, each surface gets a 2-line plain-English summary plus a single link line: *"Verbatim prompt: see `supabase/functions/<name>/index.ts` on GitHub."* The GitHub markdown file already formats them nicely for anyone who wants the raw text; the in-app page doesn't need to duplicate that.
- Each surface row collapses to: **Name → Where you see it → What we tell it (3 bullets max, plain English) → Model → File**. No more, no less.
- Keep the 9 surfaces and the single Neuron AI footnote unchanged.

## What gets edited

- `docs/architecture/prompts-and-ai-workflows.md` — full rewrite with the new order and the formatting fixes above.
- No code or component changes. The page, route, and sidebar entry stay as they are.

## What does NOT change

- No prompts, models, knowledge files, or edge functions touched.
- Nashville score-mismatch fix stays parked, waiting on Brett.
- Neuron AI stays mentioned exactly once, as a footnote in the appendix.

## Transcript sourcing

Before writing Part 2, search chat history for 2 short Brett exchanges that fit (one "plan-before-build", one "I can see this bug, here's what's wrong"). If nothing clean turns up, write 2 Brett-voiced examples in the same style rather than reaching for Haseeb's transcripts.
