
# Teacher Search Docs — Accuracy Audit

I checked both docs against the live code:
- `src/data/teacherSearchSpec.md` (v1.0, dated 2026-07-21)
- `src/data/teacherSearchMethodology.md` (v1.0, dated 2026-07-21)

Against: `src/pages/TeacherProspects.tsx`, `src/components/teacher-prospects/*`, `src/stores/teacherProspectsStore.ts`, `src/hooks/useTeacherProspectsData.ts`, `src/utils/fitScore.ts`, `src/lib/teacherSourceLabels.ts`, `supabase/functions/{fetch-teacher-prospects,enrich-school-staff,teacher-search-ai}/index.ts`.

## Verdict
**Not 100% accurate.** Most content is correct, but I found 4 real mismatches. Both docs still say v1.0 · 2026-07-21, so they have not been touched since the pipeline changes we shipped later.

## What's wrong

### 1. Source filter values (both docs)
- **Docs say:** filter options are "Apify / CSV / Manual" (spec §6) and describe a "source filter" in methodology §5.
- **Code actually shows** (`TeacherFilterBar.tsx` + `teacherSourceLabels.ts`):
  `All Sources` · `SmartLead Enriched` · `LinkedIn Import` · `Needs Email Enrichment`.
- These are *bucketed* labels defined in `sourceLabelFor()`, not raw ingest sources.

### 2. Fit Score is not actually computed
- **Spec §3 says:** "Computed in `src/utils/fitScore.ts`" using grade match, teacher type, summer availability, subject match.
- **Code:** `src/utils/fitScore.ts` only exports `deriveFitTag()` (tag from score). Both writer paths (`fetch-teacher-prospects/index.ts:262`, `enrich-school-staff/index.ts:168`) insert `fit_score: null`. No computation exists anywhere.
- Methodology §3 makes the same overstated claim.

### 3. Master Pool Import Wizard location
- **Spec §5** lists `MasterPoolImportWizard` as a Teacher Search modal without noting it lives under `src/components/email-outreach/`. Minor, but confusing for engineers.

### 4. Status list is incomplete / partly aspirational
- **Docs list:** `new, shortlisted, in_outreach, in_smartlead, suppressed, not_fit`.
- **Code:** status is a free-form string in the DB and UI; only some transitions are wired. Worth a short "actual UI actions today" note vs. the full status vocabulary.

## What is accurate (confirmed)
- Data-source table (Apify, NCES, CSV single, CSV bulk, manual).
- UI structure: `CitySearchRail`, `MarketContextBanner`, `NextBestActionStrip`, `FunnelWidget`, `TeacherFilterBar`, `TeacherTable`, `BulkActionBar`, `TeacherDetailPanel`, `TeacherAiPanel` — all present in `src/pages/TeacherProspects.tsx`.
- Modals: `FindProspectsModal`, `TeacherImportWizard`, `MasterPoolImportWizard`, `AddToCampaignModal` — all imported.
- Fit Tag thresholds (≥80 / 50–79 / <50) — match `deriveFitTag()`.
- Edge functions (`fetch-teacher-prospects`, `enrich-school-staff`, `teacher-search-ai`) — all exist.
- AI co-pilot behavior (Gemini 2.5 Flash, grounded, `[[FOLLOWUPS]]` sentinel, 429/402 handling, voice rules) — matches `teacher-search-ai/index.ts` exactly.
- `teacher_prospects` schema fields — match `src/integrations/supabase/types.ts`.

## Proposed fix (1 turn, docs-only)

Update both markdown files in place:

1. **Spec §6** and **Methodology §5**: replace the source-filter list with the real 4 options and briefly explain "these are bucketed labels based on `enrichment_source` + verification status".
2. **Spec §3** and **Methodology §3**: change wording from "computed" to "planned — today `fit_score` is stored on the row but not automatically calculated; `deriveFitTag()` only maps the stored score to a tag." Move the 4-input list into "planned inputs (Phase 2)".
3. **Spec §5**: note `MasterPoolImportWizard` lives under `components/email-outreach/` and is reused by Email Outreach.
4. **Spec §4**: add a one-line note that not every status is reachable from the UI today; `new`, `shortlisted`, `in_outreach`, `not_fit` are the actively wired transitions.
5. Bump both files to **v1.1 · 2026-07-24** with a short "Changed since v1.0" line.

No code changes. No component changes. Docs only.

## Risks / not touched
- No behavior changes; risk = zero.
- Not touching `specMarkdown.ts` (that is the older long-form spec surface, separate doc).

Approve and I'll ship the doc edits in one turn.
