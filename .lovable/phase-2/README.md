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
├── README.md                       ← this file
├── sources/
│   ├── brett-5-point-sketch.md     ← Brett's Phase 2 rough notes (1.5 = upgrade, 1.0 = new)
│   ├── sam-transcript-may-29.md    ← plain-English breakdown of the call
│   ├── sam-transcript-may-29.txt   ← original transcript, verbatim
│   ├── sam-v2-pdf-summary.md       ← plain-English breakdown of Sam's v2 PDF
│   └── sam-v2-pdf-original.md      ← full text extraction of the PDF
├── phase-2-sow.md                  ← merged SOW (NOT YET WRITTEN — see file)
├── phase-2-status.md               ← living checklist of Phase 2 items
└── CHANGELOG.md                    ← every edit, one line
```

## Who can approve

Brett and Haseeb. Sam is not a gate. The chat cannot distinguish between Brett and Haseeb — when approval matters, the human must say which hat they're wearing.
