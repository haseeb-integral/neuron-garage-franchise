
# Plan — Build 1A/1B decision-capture redesign + append "Open Decisions" to v5

Three deliverables, in this order. No preview-first round — building straight through per your direction.

## 1. Append "Open Decisions" section to v5 doc (and refresh vision doc)

**v5 doc** (`build-v5.js` → `Neuron-Garage-Phase-2-Decisions-v5.docx`): add a new top-level section **"Open Decisions for Brett"** at the end, before any appendix. Eight items, each as: *what the source says · what the demo/v5 currently assumes · Brett's decision: ____*.

1. PEE Score tier band labels — sources: nothing. Demo: "Top Tier / Strong / Mixed / Weak". v5: "Strong / Validated / Watch / Avoid".
2. PEE Score numeric thresholds per band.
3. Six sub-score weights in 1A (lock the table).
4. Premium provider threshold ($400/week).
5. 1B isochrone weighting (60/40 currently assumed, not in sources).
6. 1B Trinity-vs-LeafSpring calibration margin (numeric gap).
7. QA correction queue ownership.
8. Map vendor (Mapbox vs HERE).

Also include a short paragraph: **"Demo v1.1 — decision-capture redesign"** with the two preview links (`/market-validation`, `/site-analysis`) so Brett can click through while reading.

**Vision doc** (`Neuron-Garage-Features-1A-1B-Vision-v1.docx` → v1.1): only two edits needed.
- Replace any tier-band sentence that asserts "Strong / Validated / Watch / Avoid" with "tier band TBD — see Open Decisions in v5 doc."
- Add one sentence to each feature's "Use Case" describing the new decision-capture surface (verdict dropdown + notes + export for 1A; verdict toggle + winner radio + decision-pack PDF for 1B).

No other vision content changes — purpose, function, signals, isochrones, calibration logic all stay.

## 2. Backend — two decision tables (Lovable Cloud)

Single migration, both tables with full GRANTs + RLS + updated_at trigger.

```sql
-- market_validation_decisions: one row per (user, city)
id uuid pk, user_id uuid → auth.users, city_id text, city_label text,
verdict text check in ('pursue','hold','drop','undecided'),
notes text, decided_at timestamptz, created_at, updated_at
unique(user_id, city_id)

-- site_analysis_decisions: one row per (user, address)
id uuid pk, user_id uuid → auth.users, address text, school_name text,
verdict text check in ('recommend','worth_a_look','dont_recommend','undecided'),
is_winner boolean default false, notes text, decided_at timestamptz, ...
unique(user_id, address)
```

RLS: own-row SELECT/INSERT/UPDATE/DELETE only. GRANT to authenticated + service_role. No anon.

## 3. Frontend redesign

### 1A `/market-validation` — shortlist table view

Replace the current single-city deep-dive layout with a **shortlist table** as the primary view. Each row is one of the 25 shortlisted cities. Columns: City · PEE · Absorption · Scaled Op · MBI band · Premium Density · Pricing · Sellout sparkline (mini) · **Verdict dropdown** (Pursue / Hold / Drop / Undecided) · **Notes** (✎ inline editor) · Updated. Sort by any column. Filter by verdict. **Export decisions** button → CSV with scores + verdicts + notes.

Click a row → it expands inline to show the current rich deep-dive (six sub-score cards, full sellout curve, provider table, QA flags). Collapse to return to table. No separate page.

Decisions persist to `market_validation_decisions` via `useMarketDecisions` hook (Lovable Cloud, 60s stale, optimistic update).

Demo data: extend `phase2DemoData.ts` from 1 city (Frisco) to ~8 sample shortlisted cities so the table is meaningful. Existing Frisco deep-dive data stays exactly as-is for the expanded row.

### 1B `/site-analysis` — verdict + winner per card

Keep the 4-up compare grid. Add to each filled card:
- **Verdict toggle** (Recommend / Worth a look / Don't recommend) — defaults to threshold mapping, Brett can override.
- **"Winner" radio** at top — single-select across the 4 cards.
- **Notes textarea** (collapsible).
- **Export decision pack** button (top-right of the section) → branded PDF that includes Brett's chosen winner, his notes, the per-site cards, and the calibration band. PDF generated client-side from existing card data (no map vendor wiring yet — uses current placeholder isochrone).

Decisions persist to `site_analysis_decisions` via `useSiteDecisions` hook. Winner radio enforces single selection by clearing `is_winner` on others when one is set.

### Files touched
- `src/pages/MarketValidation.tsx` — rewrite to table-first, keep deep-dive as expanded-row subcomponent
- `src/pages/SiteAnalysis.tsx` — add verdict/winner/notes controls + export button
- `src/components/phase2-demo/ShortlistTable.tsx` (new)
- `src/components/phase2-demo/MarketDecisionCell.tsx` (new — verdict dropdown + notes popover)
- `src/components/phase2-demo/SiteDecisionControls.tsx` (new)
- `src/hooks/useMarketDecisions.ts` (new)
- `src/hooks/useSiteDecisions.ts` (new)
- `src/lib/marketDecisionsExport.ts` (new — CSV)
- `src/lib/siteDecisionsExport.ts` (new — PDF, uses existing PDF stack)
- `src/data/phase2DemoData.ts` — extend shortlist sample from 1 → 8 cities
- `scripts/build-v5.js` — add Open Decisions section
- `scripts/build-vision-v1.js` → `build-vision-v1.1.js` — band-label edit + use-case sentence
- `.lovable/phase-2/CHANGELOG.md` — log the redesign and doc updates

### Not in scope
- Real isochrones (still Mapbox/HERE TBD — one of the open decisions).
- Real provider scraping.
- Changing any score formulas or weights.
- Touching City Search, Teacher Search, Candidate Pipeline.

## Sequencing
1. Migration (table 1 + table 2) — approved separately by you.
2. After migration runs: hooks + redesign components + page rewrites.
3. Regenerate v5 doc + v1.1 vision doc + PDFs to `/mnt/documents/`.
4. CHANGELOG entry.

## One confirmation before I start

The 8 sample shortlisted cities for the new 1A table — should I pull plausible Sunbelt/affluent metros (Frisco, Plano, Cary, Carmel, Bellevue, Newton, Pleasanton, Brookline), or do you want a specific list from Brett's actual shortlist?
