## Implement Variant A — Surgical

Build the approved Task 13 plan using the **A — Surgical** prototype as the visual target. No new scope; same files listed in the approved plan.

### Changes

1. **New `src/lib/teacherSourceLabels.ts`** — single source of truth mapping `enrichment_source` → sanitized display label (`smartlead_csv` → "SmartLead Enriched", `linkedin_danish` → "LinkedIn Import"). Helper `getStatusBadge(row)` returns `{label, tone}` combining source + `verification_status` + `email` presence into one of: SmartLead · Verified / Unverified / No Email, or LinkedIn Import.

2. **New `src/components/teacher-prospects/SourceBadge.tsx`** — renders that badge with emerald / amber / slate / sky tones.

3. **`src/pages/TeacherProspects.tsx`**
   - Replace 4 stat cards with 3: Total Imported (11,752 · 188 cities), Email-Ready (5,705), Needs Email Enrichment (5,253 + "Connect Enrichment Tool" placeholder).
   - Drop "Sourcing Insights" (LinkedIn/Referrals %) → replace with live source breakdown from `enrichment_source` using sanitized labels.
   - Replace Quick Stats: Cities (real), Email-ready (real), Avg Fit Score (placeholder "Run AI Scoring"), Response Rate (placeholder "Connect SmartLead").
   - Hide "Expand your reach" card.
   - Hide Market Context banner unless `?city=&state=` query params present.
   - Default city filter = "All Cities".
   - Add Status Legend card in sidebar.

4. **`src/components/teacher-prospects/TeacherTable.tsx`**
   - Drop columns: Experience, Signals, Fit Tag, old Status.
   - Add Source column using `<SourceBadge>`.
   - Fit Score column shows "—" with hint until Task 14.
   - Real server-side pagination (25/page) with total count.

5. **`src/components/teacher-prospects/TeacherFilterBar.tsx`**
   - Drop: Grades, Camp Experience, Fit Tags, Status.
   - Add: "All Sources" (All / SmartLead Enriched / LinkedIn Import / Needs Email).

6. **`src/stores/teacherProspectsStore.ts`**
   - Remove `tagFilter`, `gradeFilter`, `enrichmentFilter`, `campOnly`.
   - Add `sourceFilter: 'all' | 'smartlead' | 'linkedin' | 'needs_email'`.
   - Add `page`, `pageSize` (default 25).
   - Bump persist version to `2`.

7. **`src/data/teacherData.ts`** — delete `sampleTeachers` constant; keep `TeacherProspect` type.

8. **Data fetching** — switch from current capped `.range(0, 999)` to:
   - `select('*', { count: 'exact' })` with `.range(page*size, page*size+size-1)`
   - Aggregate counts (total, email-ready, needs-enrichment, source breakdown, cities) via separate lightweight queries on mount + when filters change.

### Out of scope (deferred per plan)
- AI Fit Scoring values (Task 14)
- Shortlisted column (Task 15)
- Send/reply tracking (Task B6)
- Camp Experience signal logic (LATER.md)
- Market Context wiring to `us_cities_scored` (LATER.md)
- Apollo enrichment for 5,253 LinkedIn-only rows (separate task)

### Doc updates (drafted, will wait for "go" before writing)
Per AGENTS.md Mode A: after code lands I'll draft updates to `LATER.md` (camp signal + market context), `OPEN_TASKS.md` (mark Task 13 done + unhide-dependency notes), `PROJECT_CONTEXT.md`, and `GLOSSARY.md`, then summarize for your approval.

### Risk
Low. Presentation-only against an already-wired table. Pagination is the one behavior change (positive — currently silently caps at 1000).