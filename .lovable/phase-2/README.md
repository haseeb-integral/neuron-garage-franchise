# Phase 2 — Source of Truth

This folder is the **single source of truth** for Phase 2 of the Neuron Garage Acquisition Platform. Chat memory dies between sessions. This folder does not.

## Rules of engagement (read before doing anything)

1. **Every new chat must start by reading `phase-2-sow.md` and `phase-2-status.md`.** Do not infer state from uploads or memory. If the user re-uploads a source, point them at the file in `sources/` instead.
2. **`sources/` is frozen input.** Brett's sketch, Sam's transcript, Sam's v2 PDF — these are what the SOW gets built from. Don't edit them. Add new sources as new files.
3. **`phase-2-sow.md` is the contract.** Once merged, this is what we build against. Chat-level edits don't count until they land in this file.
4. **`phase-2-status.md` is the living checklist.** Update it whenever an item moves: `not-started → in-progress → shipped`. Always stamp date + who updated.
5. **`CHANGELOG.md` gets one line per edit** to any file in this folder. Date, who, what, why. No exceptions — this is how Brett and Haseeb stay in sync across sessions.

## Folder map

```
.lovable/phase-2/
├── README.md                                              ← this file
├── sources/
│   ├── brett-5-point-sketch.md                            ← Brett's Phase 2 rough notes (1.5 = upgrade, 1.0 = new)
│   ├── neuron-garage-module1-enhancements-v2.pdf          ← Sam's v2 PDF (ORIGINAL — parse on demand)
│   ├── transcript Sam meeting May 29.txt                  ← original transcript, verbatim
│   ├── summary-neuron-garage-module1-enhancements-v2.md   ← AI summary of the PDF (secondary)
│   └── summary-transcript Sam meeting May 29.md           ← AI summary of the transcript (secondary)
├── phase-2-sow.md                                         ← merged SOW (THE CONTRACT — locked once Brett signs off)
├── phase-2-execution-plan.md                              ← build plan for Lovable (sequencing, tickets, owners)
├── phase-2-status.md                                      ← living checklist of Phase 2 items
└── CHANGELOG.md                                           ← every edit, one line
```

**Rule:** Never re-type a PDF or transcript into markdown. Keep the binary / raw text and parse on demand. Any `summary-*.md` is AI-derived and is secondary to its source — for exact formulas, numbers, or wording, always go to the original.

## Who can approve

Brett and Haseeb. Sam is not a gate. The chat cannot distinguish between Brett and Haseeb — when approval matters, the human must say which hat they're wearing.
