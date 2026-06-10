## Update Phase 2 June Timeline doc — v2

Add one-line scope summaries for all 8 workstreams in the Full Phase 2 Scope table, sourced from Brett's 5-point sketch + Sam's May 29 call notes. No dates added.

### Changes to `/tmp/build_timeline.js`

- Restructure the scope table from 3 columns to 4 columns:
  `# / Workstream / Scope (one-line) / June Status`
- Column widths: 500 / 2700 / 3760 / 2400 DXA (sums to 9360)
- Status labels shortened: "Spec pending" (items 3–7) and "Under review" (item 8)
- Items 1 and 2 keep "In Progress — demo live W2" + light blue row tint

### Scope one-liners (sourced verbatim from frozen sources)

| # | Workstream | Scope |
|---|---|---|
| 1 | Market Validation (1A) | Per-city composite score (demand, pricing, absorption, operator landscape, balance) + branded PDF |
| 2 | Site Analysis (1B) | Address-level Site Opportunity Score, side-by-side compare up to 4 sites, 10/15-min isochrones |
| 3 | Candidate Pipeline 1.5 | Candidate-facing form, candidate login, smarter scoring, cleaner stage gates, structured Notes/Activity |
| 4 | Teacher Search 1.5 | Tighter sourcing, dedupe, deeper Fit Score inputs, tighter SmartLead loop |
| 5 | SmartLead 1.5 | Reply categorization, campaign analytics, inbox health, loop back into Teacher Search |
| 6 | Mailboxes 1.0 | Inbox health, warmup state, deliverability signals |
| 7 | Video Training 1.0 | Module built on 300-page standards manual + curriculum + live Austin/Telluride camp footage |
| 8 | Manus CSI App 1.0 | Stand-alone Manus app for competitive saturation, separate from 1A's Market Balance Index |

### Output
- New file: `/mnt/documents/Neuron-Garage-Phase-2-June-Timeline-v2.docx` (original v1 kept)
- Render PDF + visual QA via `pdftoppm`; fix any clipping before delivering

### Out of scope
- No code, route, Supabase, or `.lovable/phase-2/` edits
- No dates for items 3–8
- No changes to Week 1–4 timeline table or featured-this-week section
