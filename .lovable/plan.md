# Clean `.lovable/phase-2/sources/` — originals + clearly-named summaries

## Final state of `sources/` after this runs

```
sources/
├── brett-5-point-sketch.md                                        ← your notes (untouched)
├── neuron-garage-module1-enhancements-v2.pdf                      ← your original PDF
├── transcript Sam meeting May 29.txt                              ← your original transcript
├── summary-neuron-garage-module1-enhancements-v2.md               ← renamed from sam-v2-pdf-summary.md
└── summary-transcript Sam meeting May 29.md                       ← renamed from sam-transcript-may-29.md
```

## Actions

1. **Delete** `sources/sam-v2-pdf-original.md` — my re-typed PDF, proven corrupt (missing `+` in Pricing Acceptance formula). PDF is the only source of truth for formulas.
2. **Delete** `sources/sam-transcript-may-29.txt` — my earlier duplicate of the transcript. Your `transcript Sam meeting May 29.txt` stays.
3. **Rename** `sources/sam-v2-pdf-summary.md` → `sources/summary-neuron-garage-module1-enhancements-v2.md`. Add a one-line header: *"AI summary of the PDF of the same name. For exact formulas/numbers, parse the PDF directly."*
4. **Rename** `sources/sam-transcript-may-29.md` → `sources/summary-transcript Sam meeting May 29.md`. Add a one-line header: *"AI summary of the transcript of the same name. For exact wording, read the .txt."*
5. **Update `README.md`** folder map to match the final state above. Add rule: *"Never re-type a PDF or transcript into markdown. Keep the binary/raw text; parse on demand. Any `summary-*.md` is AI-derived and secondary to its source."*
6. **Log in `CHANGELOG.md`** — one line: deleted corrupt re-typed PDF + duplicate transcript; renamed AI summaries to `summary-<originalname>` for clarity.

No other files in the repo are touched. Ready to switch to build mode on your approval.
