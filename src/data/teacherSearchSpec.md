# Teacher Search — Feature Spec

**Version:** v1.1 · **Date:** 2026-07-24 · **Owner:** Neuron Garage / Lovable
**Status:** Shipped, evolving. **Source of truth:** this page + the Teacher Search Methodology doc + the current chat.

**Changed since v1.0 (2026-07-24):** corrected source-filter values, clarified that Fit Score is stored but not auto-computed today, noted `MasterPoolImportWizard` is shared with Email Outreach, and flagged which status transitions are actually wired in the UI.

---

## 1. What this feature does

Teacher Search finds current and former **elementary school teachers** in a target city and scores each one for fit as a future Neuron Garage franchisee or camp lead. It is the top-of-funnel discovery step that feeds Email Outreach and the Candidate Pipeline.

Output surfaces:

- A filterable table of teacher prospects (name, school, city, email status, LinkedIn, Fit Score, tag, source).
- A per-row detail panel with bio, contact info, school context, signals, and activity log.
- Bulk actions (tag, promote, push to SmartLead, export CSV).
- A grounded AI co-pilot scoped to whatever is currently on screen.
- CSV import wizard for bulk uploads and a Master Pool import path.

Not in scope: sending outreach emails (Email Outreach), running the recruiter interview funnel (Candidate Pipeline), scoring the city itself (City Search / MVS).

---

## 2. Data sources

| Source | How | Purpose |
|---|---|---|
| **Apify Google-Maps actor** | `fetch-teacher-prospects` edge function | Discovers teachers by scraping public school listings for the target city. |
| **NCES public-school directory** | `public_schools` table | Anchors each teacher to a known school and NCES id. |
| **School-staff enrichment** | `enrich-school-staff` edge function | Pulls staff / email from linked NCES schools on demand. |
| **CSV upload (single)** | Teacher Import Wizard | Ad-hoc list uploads with AI column mapping. |
| **CSV upload (bulk pool)** | Master Pool Import Wizard | Bulk loading into the Master Teacher DB with dedupe on `lower(email)`. |
| **Manual add / edit** | Detail panel | Inline edits, tags, status changes. |

All rows land in `public.teacher_prospects`. Apollo, purchased vendor lists, and a planned `teacher_prospects_master` multi-source pool are **not yet wired** (Phase 2).

---

## 3. Fit Score (0–100)

**Today:** `fit_score` is a numeric column on `teacher_prospects` but is **not automatically calculated**. Both discovery writers (`fetch-teacher-prospects` and `enrich-school-staff`) insert `fit_score: null`. Scores today come from manual entry (Promote flow / New Candidate modal) or legacy imports.

`src/utils/fitScore.ts` exports only `deriveFitTag(score)`, which maps a stored score to a **Fit Tag**:

- `>= 80` → **High Potential**
- `50–79` → **Follow-Up**
- `< 50` → **Not a Fit**

The tag is the default sort key in the table and the ranking signal the AI co-pilot uses when asked for "top N".

**Planned inputs (Phase 2 — not yet wired):**

- **Grade match** — K–6 weighted heavily; middle/high school down-weighted.
- **Teacher type** — active / retired / camp_enrichment.
- **Summer availability heuristic.**
- **Subject match** — enrichment / STEM adjacency (Segment 4).

---

## 4. Statuses

`teacher_prospects.status` values used by the UI:

| Status | Meaning |
|---|---|
| `new` | Default after discovery / import. |
| `shortlisted` | Manually shortlisted from the table or detail panel. |
| `in_outreach` | Currently loaded into a SmartLead campaign. |
| `in_smartlead` | Legacy alias for `in_outreach` — treated the same in the UI. |
| `suppressed` | Do-not-contact / unsubscribed. |
| `not_fit` | Reviewed and rejected as a fit. |

Status changes from the table are optimistic and roll back on error.

---

## 5. UI structure

Left → right:

1. **Sidebar** — global nav.
2. **City Search Rail** — pick or toggle a city filter; drives the whole page.
3. **Main column**:
   - `PageHeader` (title, count, market context).
   - `MarketContextBanner` — parent city composite + tier (only when 1+ city selected).
   - `NextBestActionStrip` — surfaces the highest-leverage action.
   - `FunnelWidget` — Total → With Email → Verified → In SmartLead.
   - `TeacherFilterBar` — search, source, "hide already in outreach" toggle, pagination controls.
   - `TeacherTable` — sortable, selectable, per-row promote / shortlist / mark-not-fit / enrich actions.
   - `BulkActionBar` — docked bulk-action bar that appears when rows are selected.
4. **Right column** — `TeacherAiPanel` (grounded AI) and `TeacherDetailPanel` (opens on row click).

Modals: `FindProspectsModal`, `TeacherImportWizard`, `MasterPoolImportWizard`, `AddToCampaignModal`.

---

## 6. Filters (client → URL → query)

The store (`useTeacherProspectsStore`) is the single source of truth for filters and paging. Filters:

- `cityFilters: string[]` — multi-city. Serialized as `?city=austin,denver`.
- `search: string` — debounced 350ms across name, school, city, specialization.
- `sourceFilter` — Apify / CSV / Manual.
- `hideInOutreach: boolean` — hides rows whose `id` appears in `email_campaign_recipients`.
- Paging: `page`, `pageSize`.

`useTeacherProspectsData` builds the Supabase query from these filters, returns rows + stats + a `buildFilteredQuery()` closure used by the CSV export path.

---

## 7. AI co-pilot (`teacher-search-ai`)

An edge function that answers plain-English questions about **whatever is currently on the screen**. It never takes actions.

- Model: `google/gemini-2.5-flash` via the Lovable AI Gateway.
- Grounding: a JSON `context` blob with current city filters, funnel numbers, and the top 50 rows on screen (name, school, city, state, fit score, status, `hasEmail`).
- Voice rules: neutral analytical framing only. Forbidden phrases include "in our experience", "we've seen", "historically we", etc. — the tool is new and has no track record to claim.
- Output: markdown reply plus 2–3 short first-person follow-up questions, delivered via the `[[FOLLOWUPS]][...]` sentinel on the last line.
- Error codes surfaced to the UI: `429` (rate limit), `402` (AI credits exhausted).

---

## 8. Promote → Candidate Pipeline

Clicking **Promote** in the table or the detail panel creates a row in `candidates` at the **New Lead** stage. Fields copied: name (split into `first_name` / `last_name`), email (or a placeholder if missing), city, state, `fit_score`. UI is live; end-to-end FK wiring back to `public_schools` / `us_cities_scored` is tracked under the Phase 2 plan.

---

## 9. Data model

| Table | Status | Key fields |
|---|---|---|
| `teacher_prospects` | Active | `id, name, email, phone, city, state, school, school_nces_id, fit_score, status, teacher_type, subject, segment, linkedin_url, tags[], enrichment_source, last_enriched_at, needs_email_enrichment, verification_status, dedupe_key, last_pushed_at, apify_run_id, teacher_import_batch_id, raw jsonb` |
| `teacher_saved_lists` | Active | Per-user named filter sets. |
| `public_schools` | Active | NCES-anchored school directory (referenced by `school_nces_id`). |
| `candidates` | Active | Downstream table Promote writes into. |

RLS: authenticated read/insert/update/delete on `teacher_prospects`. All writes from the UI go through the Supabase JS client with the user's JWT.

---

## 10. Edge functions

| Function | Purpose |
|---|---|
| `fetch-teacher-prospects` | Discovery via Apify Google-Maps actor. |
| `enrich-school-staff` | Pulls staff / email for a given `nces_id`. |
| `teacher-search-ai` | Grounded Q&A over the current filter/result set. |

Client never holds the Apify or Lovable AI Gateway keys — every function reads them from Supabase secrets.

---

## 11. Known limitations (2026-07-21)

- Apify is the only automated discovery source today; Apollo + vendor lists are Phase 2.
- Fit Score inputs are heuristic — no ML model, no LinkedIn-signal weighting yet.
- Email verification is best-effort (`verification_status` may be null for legacy rows).
- Promote → Candidate Pipeline copies fields but does not yet link the FK back to the source `public_schools` / `us_cities_scored` row.
- `teacher_prospects_master` (multi-source pool) is planned, not built.

---

## 12. Out of scope for v1.0

- Sending outreach emails (owned by Email Outreach / SmartLead).
- Interview scheduling and stage transitions (owned by Candidate Pipeline).
- ML-based Fit Score.
- Per-teacher LinkedIn scraping (using public profile URLs only).
- Multi-tenant sharing of saved lists across users.
