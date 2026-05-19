
## 1. Smoke test result

Email arrived → SmartLead path is **proven end-to-end** (CSV → staging → batch → campaign → inbox via plus-aliases). Email Outreach is "good enough for v1" — no blocker remaining.

What's still parked behind it (will document, not build now):
- 17j (analytics realtime polish), 17n-v2 (per-lead SmartLead status in the drawer), 17m-v2 (server-side idempotency key in proxy). All low priority.

---

## 2. What's next — per AGENTS.md / OPEN_TASKS.md order

The sprint order is locked: **City → Teacher → Email → Pipeline**. City + Email are functional. The real blocker right now is **Task #0 (database layer)** and **Teacher Search seeding**.

So the next move is exactly what you asked: **wire teacher import into the Teacher Search screen**, using your two real sources. This unblocks Teacher Search.

---

## 3. Where Teacher Search stands today (audit)

- `teacher_prospects` table exists in backend with the right columns (email, name, school, district, city, state, grade, subject, segment, teacher_type, fit_score, status, enrichment_source, linkedin_url, donorschoose_id, raw jsonb, apify_run_id, last_enriched_at). **Backend table is ready.** No schema change needed for import.
- `TeacherProspects.tsx` already reads from `teacher_prospects` via Supabase + has a "Find Prospects" path that calls `fetch-teacher-prospects` edge function (Apollo/Apify).
- `src/data/teacherData.ts` still exports `sampleTeachers` dummy array (148 lines). Used as fallback / typing. **This is the dummy data to remove or quarantine.**
- No CSV import UI exists for teachers yet — only the "Find Prospects" auto-search button.

So what's missing for your fast path:
1. CSV import wizard for teachers (mirror of the Email Outreach `ImportLeadsWizard`, but writes to `teacher_prospects`).
2. Source-aware column mapping for your **two sources** (SmartLead-enriched export, Danish's custom scrape).
3. Dedup rule (email primary, fallback name+school).
4. Kill / quarantine `sampleTeachers` dummy.

---

## 4. Foolproof plan for the two sources — the "smart" pre-import audit

Before any code, I do exactly what you asked: **diff the two sources first**, then build one importer that handles both.

### Step A — You send me the two files (or 5-row samples)

I need:
- Source 1: SmartLead-enriched export (CSV/XLSX). 5–20 sample rows is enough.
- Source 2: Danish's Upwork scrape (CSV/XLSX). 5–20 sample rows.

I'll write a one-off audit script in the sandbox that prints:
- Column list per source + row count
- Column-name overlap matrix (which source-1 columns map to which source-2 columns by header similarity)
- Per-column: % populated, sample values, detected type (email / url / phone / text / number)
- Email validity rate per source
- **Duplicate report**: intra-file dupes (email), cross-file dupes (same email in both)
- Any column in one source that has *no equivalent* in the other → flagged "drop or add column"

You get one markdown report. We agree on the canonical mapping → then I build the importer to that contract. No guessing.

### Step B — Canonical column contract (proposed, may shift after audit)

Map both sources into `teacher_prospects` columns:

| Canonical (DB)      | SmartLead export likely header | Danish scrape likely header | Required |
|---------------------|--------------------------------|------------------------------|----------|
| email               | email / Email                  | email / contact_email        | ✅       |
| name                | full_name / first+last          | teacher_name                 | ✅       |
| school              | company / school_name          | school                       | ✅       |
| district            | district                        | district                     |          |
| city                | city / location                | city                         | ✅       |
| state               | state                           | state                        | ✅       |
| grade               | custom.grade                   | grade_level                  |          |
| subject             | custom.subject                 | subject                      |          |
| teacher_type        | custom.segment                 | (default: "active")          | ✅       |
| linkedin_url        | linkedin / linkedin_url        | linkedin                     |          |
| enrichment_source   | (hard-coded "smartlead")       | (hard-coded "danish_scrape") | ✅       |
| raw (jsonb)         | full original row              | full original row            | ✅       |

Locked once you confirm.

### Step C — Build (after Step A report is approved)

Mirroring the email-outreach wizard pattern (which you've validated end-to-end), one new component:

1. **`TeacherImportWizard.tsx`** — 4 steps:
   - Step 1: pick source ("SmartLead enriched export" / "Danish scrape" / "Other CSV") + city/state/segment defaults
   - Step 2: CSV upload + auto-map columns (preset mapping per source, editable)
   - Step 3: QA review — flag missing email, invalid email, intra-file dupe, **already-exists-in-DB dupe** (queries `teacher_prospects` by email)
   - Step 4: Confirm + insert. Chunked inserts, idempotent (skip dupes by default, override per row)
2. **"Import Teachers" button** on `TeacherProspects.tsx` next to "Find Prospects". Same drawer pattern.
3. **Kill dummy**: remove `sampleTeachers` fallback from `TeacherProspects.tsx` — show empty-state CTA "Import teachers or Run Prospect Search". Keep the `TeacherProspect` *type* (it's used everywhere) but delete the seeded array.
4. **Reuse Import Batches concept**: optional v2 — write a `teacher_import_batches` row so you get the same drill-down UI as Email Outreach. *I'd defer this to v2* — for v1 just insert directly with `enrichment_source` stamped and `raw` jsonb keeping provenance.

### Step D — Standard guardrails (the "bare minimum" any web app does on bulk import)

I'll bake these into the wizard — these are the things you asked me to recall from training:

1. **File size / row cap** — reject files > 10 MB or > 10k rows in v1, with a clear toast.
2. **Header normalization** — trim, lowercase, snake_case before mapping.
3. **Email normalization** — trim, lowercase, regex validation.
4. **Required column gate** — can't proceed past Step 2 without `email` mapped.
5. **Intra-file dedup** — first occurrence wins, others flagged.
6. **Cross-file dedup** — query DB for existing emails, show count, offer "skip / overwrite / import as new with suffix".
7. **Preview before commit** — Step 3 shows first 100 rows with QA flags, total counts, before any DB write.
8. **Chunked writes** — 500-row chunks like the email wizard, with progress bar.
9. **Transactional feel** — if any chunk fails, surface error count and which chunk failed; don't roll back (Postgres can't across chunks) but log to UI.
10. **Provenance** — every row gets `enrichment_source` + `raw` jsonb so we can trace back later.
11. **Idempotency** — same source + same email = skip on re-upload (or flag "already imported MAY-20").
12. **Audit row** — log import in `prospect_batches` equivalent (or a new `teacher_import_log` if you want clean separation; I lean toward reusing `prospect_batches` with a `kind` column → schema change → I'll ask before adding).
13. **Empty-state UX** — when zero teachers, show "Import CSV" + "Find Prospects" CTAs instead of an empty table.
14. **Undo escape hatch** — show "View last import" → bulk-delete-by-batch button (v2, not v1).

I'll skip the heavy stuff that's overkill for 3 users: virus scan, multi-tenancy isolation, S3 staging, background worker queue. We're not building a SaaS — internal tool.

---

## 5. Sequence — fastest path

**Today (this loop):**
- Approve this plan
- You upload sample rows from both sources (drop them in chat — I'll copy them into the sandbox)

**Next loop (build, ~2 hrs):**
- I run the audit script → produce the diff report → confirm mapping with you
- Build `TeacherImportWizard.tsx` + button on Teacher Search
- Remove `sampleTeachers` dummy fallback
- Smoke test with 5-row CSV from each source

**Next-next loop (~30 min):**
- You upload the full files → import → verify in DB + UI

**Deferred to LATER.md:**
- Per-batch teacher drill-down (mirror of 17n)
- Bulk re-push from teachers → SmartLead campaigns (Email Outreach already does this via the prospects_staging path; we'd unify later)
- Cross-source dedupe when same teacher exists in both (handled minimally in v1, full merge logic later)

---

## 6. What I need from you to start

1. **"Go" on this plan**, then
2. **Sample rows from each source** (5–20 rows each, CSV/XLSX both fine). Even just column headers + 2 rows is enough to start the audit.

Once I have those, the audit + build runs in one loop.

