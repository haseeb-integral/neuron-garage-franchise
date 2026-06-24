## Demo Data Cleanup — Remove Market Absorption Leftovers

### What we are changing and why
Market Absorption was removed from the live scoring model. But the demo (fake) data still has absorption fields, an absorption sub-score card, a sellout curve chart, and week-by-week provider statuses. This cleanup strips those leftovers so the demo matches the live 5-pillar model.

### What will NOT change (safety promises)
- Market Validation page still loads.
- Live cities still show live data (or last fetched data) — they never used demo absorption data.
- No city is removed from MV or SAS. The list of cities stays the same.
- The 5-card pillar model stays the only model shown.
- Build stays clean (no TypeScript errors, no broken imports).

### Pages and files that may be touched
- `src/data/phase2DemoData.ts` — remove `absorption` field from shortlist rows, remove `sampleWeeks` from provider roster, remove Market Absorption sub-score card from the San Antonio deep-dive.
- `src/components/phase2-demo/ShortlistTable.tsx` — remove absorption column if any references remain.
- `src/components/phase2-demo/` deep-dive components — remove the sellout curve chart and the Market Absorption sub-score card.
- `src/lib/mvsBrief/sampleBriefAdapter.ts` — stop passing absorption fields into the PDF brief.
- Any TypeScript types tied to the demo shape — trim the `absorption` and `sampleWeeks` properties so the build stays green.

### Phases (one Lovable turn each)

**Phase 1 — Trim the demo data file (1 turn)**
- Remove `absorption` number from every shortlist row.
- Remove `sampleWeeks` arrays from every demo provider.
- Remove the Market Absorption sub-score entry from the San Antonio deep-dive.
- Update the demo-data TypeScript types to match.

**Phase 2 — Remove absorption UI in demo components (1 turn)**
- Remove the Market Absorption sub-score card from the deep-dive panel.
- Remove the sellout curve chart and its container.
- Remove any week-by-week status table tied to `sampleWeeks`.
- Remove related help text and tooltips.

**Phase 3 — Clean the sample brief adapter (1 turn)**
- Stop reading `sampleWeeks` and `absorption` in `sampleBriefAdapter.ts`.
- Confirm the PDF brief still generates with the 5 pillars only.

**Phase 4 — Verify (1 turn)**
- Run typecheck and build.
- Load Market Validation page in preview.
- Confirm shortlist table renders, deep-dive opens, live cities still show data, no console errors.
- Confirm 5 pillar cards (Pricing Acceptance, Scaled Operator, Enrichment Diversity, Market Depth, Market Balance Index) are the only ones shown.

### Risks and what NOT to touch
- Do NOT touch `src/lib/mvs/computeMvs.ts` (live scoring) — it already excludes Market Absorption.
- Do NOT touch live data hooks (`useLiveMvs.ts`, `useLiveMarketDetail.ts`).
- Do NOT remove or rename any city in the demo list — only remove absorption-related fields on each city.
- Do NOT touch the Supabase schema or edge functions.
- Risk: a component may still read `row.absorption` after we delete it. Mitigation: typecheck catches this; Phase 4 verifies in preview.

### What you should test after Phase 4
- Open `/market-validation` — page loads, all cities still listed.
- Click into San Antonio deep-dive — only 5 pillar cards, no absorption card, no sellout chart.
- Click a live city — live data still shows.
- Open `/site-analysis` — cities still listed.
- Export PDF brief for San Antonio — opens and shows 5 pillars.

Waiting for your approval before I start Phase 1.
