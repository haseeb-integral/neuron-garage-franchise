# Third-Party Data Playbook

Canonical rule for absorbing external enriched tables (Manus, Apollo, Apify, future vendors) into Neuron Garage without losing our scoring schema or re-litigating architecture each time.

**Status:** canonical. When this conflicts with older docs, this wins.
**Cross-ref:** `AGENTS.md` (source-of-truth hierarchy + Name-vs-Meaning rule), `DATABASE_LAYER_SPEC.md`.

---

## 1. The Core Principle

> **Third-party tables are the UNIVERSE (rows). Our schema is the SCORING LAYER (columns + logic). Never invert this.**

A vendor's job is to give us *which entities exist* (cities, teachers, schools, competitors). Our job is to decide *what those entities mean for franchise viability*. We import their rows. We keep our columns. We map between them explicitly.

If you ever find yourself about to (a) replace our table with theirs, (b) duplicate our entity into a parallel vendor-shaped table, or (c) trust a vendor-computed score as our score — stop and re-read this section.

## 2. When This Playbook Applies

Trigger any time someone hands us a rich, populated table that overlaps with an existing Neuron Garage entity. Examples seen so far:

- **Manus 817-city demographics table** → `us_cities_scored` (May 2026)
- **Apollo / Apify teacher exports** → `teacher_prospects` (earlier in sprint)

Examples we expect:

- Competitive Landscape table (incoming)
- School-level NCES files
- ZIP-level income / housing data
- Future Manus or Manus-equivalent refreshes every 4–8 weeks

Does **not** apply to:

- Live API calls that already write into our schema (Census, BLS, BEA, FRED, NCES CCD)
- One-off CSVs used only for a single chart or QA check, with no intent to persist

## 3. The Five Steps

### Step 1 — Universe Audit (before any code)

Answer in writing, committed alongside the migration:

- How many rows does the vendor table have vs. ours?
- What is the primary key of *their* table? (`state+city`, email, NCES id, …)
- What's our matching key? Is there a clean join, or do we need fuzzy matching / normalization (e.g., `"New York city"` → `"New York"`)?
- Are there rows in theirs that aren't in ours? (Almost always yes — that's the point of importing.)
- Are there rows in ours that aren't in theirs? (Decide explicitly: keep, archive, or drop. Default: keep.)

**Output:** a one-page Universe Audit in the PR description.

### Step 2 — Column Triage

Go column-by-column on the vendor table and tag each one:

- **KEEP-AS-IS** — fills a gap in our schema cleanly, same geography / granularity / units. Import directly.
- **KEEP-RENAMED** — same data, different name. Map to our existing column. Never add a duplicate column just because the vendor used a different label.
- **RECOMPUTE** — vendor value is at the wrong granularity, stale, or otherwise low-trust. Example: Manus "STEM %" is state-level BLS, not city-level. Import as `null` and backfill from our own pipeline at the correct geography.
- **DROP** — redundant, lower quality than ours, or out of scope.
- **NEW COLUMN** — vendor has a signal we don't track yet AND it matters for scoring. Add to our schema via migration (not as a loose JSON blob, not as a sidecar table).

**Output:** a triage table in the migration's description. One row per vendor column, one of the five tags, one-line justification.

### Step 3 — Name-vs-Meaning Check (the AGENTS.md rule)

For every KEEP-RENAMED or NEW COLUMN, re-read the destination column name out loud. If the vendor's data would make the name misleading, **rename the column in the same migration**. Do not silently widen meaning.

- ✅ Importing Manus "elementary enrollment" into `public_elementary_enrollment` — names align, semantics align.
- ❌ Importing Manus "# elementary schools" (which includes private + charter) into `public_elementary_count` — rename or split first, in the same migration.

Scope qualifiers (`elementary`, `active`, `verified`, `public`, `primary`) must leave the name if we stop honoring them.

### Step 4 — Idempotent Import, Never Bulk Replace

The import job MUST be:

- **Idempotent** — running it twice produces the same result.
- **Upsert by stable key** — never `TRUNCATE + INSERT`. We have scored rows, user watchlists, candidate-pipeline FKs, and outreach state pointing at our ids. Bulk replace breaks all of it.
- **Additive** — adds missing rows, updates only the triaged columns, leaves untouched columns alone. Especially anything we computed: `score_*`, weather, enrichment results, Fit Score, Tier.
- **Logged** — write a row to an `imports` log table: source name, batch id, file checksum, row counts (inserted / updated / skipped / errored), and a link to the triage decisions.

If the vendor file is too big or messy to upsert cleanly, **stage it first** in `staging_<source>_<date>` and run the merge as a separate, reviewable SQL step. Staging tables are disposable; the entity table is not.

### Step 5 — Re-score the New Rows

Scoring is a separate pass, not part of the import. The import job does NOT write to any `score_*` column. After import:

1. Trigger the scoring edge function over the affected rows.
2. Confirm new rows have non-null scores or an explicit "not enough data" status.
3. Diff pre-existing rows' scores before vs. after. They should not move unless the import intentionally changed a scoring input — and if it did, that change was named in the triage.

## 4. What NEVER Happens

- ❌ Adopting a vendor's table as our canonical table.
- ❌ Dropping our schema columns because the vendor doesn't have them.
- ❌ Storing vendor rows in a parallel table that the app then has to query separately from our own. **One table per entity.**
- ❌ Letting a vendor's pre-computed "score" or "rank" leak into our composite. Their scores can ride along as a *signal* (one input among many), but the composite is computed by our engine, period.
- ❌ Silent column meaning changes (see AGENTS.md Name-vs-Meaning rule).
- ❌ `TRUNCATE` on a live entity table. Ever.
- ❌ Importing without a triage doc because "it's just a small file."

## 5. Roles & Cadence

- **Vendor delivery → Brett or Haseeb** receives the file, drops it in `/data/incoming/<source>/<date>/`.
- **Lovable agent** runs the 5-step playbook and produces:
  1. Universe Audit (markdown, in PR)
  2. Column Triage (markdown, in PR)
  3. Migration (additive schema changes + idempotent import job)
  4. Re-score pass + before/after diff sample
- **Sam** reviews the column triage before the migration runs. He is the only approver for anything touching scoring inputs.
- **Brett** signs off on which vendor table becomes "the universe" for a given entity when there's ambiguity (e.g., two vendors covering the same entity).

**Expected cadence:** every 4–8 weeks a new enriched table will land — competitor data, school-level data, regional economics, refreshed city demographics. Each one runs this playbook. No exceptions, no "this one is small."

## 6. Worked Example — Manus 817 Cities (May 2026)

- **Universe:** 817 Manus rows vs. ~50 of ours. Manus becomes the city universe.
- **Key:** `(state_abbr, city_name)` after normalization (`"New York city"` → `"New York"`).
- **Triage:**
  - KEEP-AS-IS: `state`, `city`, `population`, `median_household_income`, `college_degree_pct`, `cost_of_living_index`, elementary enrollment
  - KEEP-RENAMED: Manus "# districts" → new column `school_district_count`
  - RECOMPUTE: Manus "STEM %" and "metro income" (state-level) → import as `null`, backfill from BLS / BEA at MSA geography
  - DROP: none
  - NEW COLUMN: `school_district_count`
- **Import:** upsert into `us_cities_scored` on `(state_abbr, city_name)`. Touches only the triaged columns. Leaves weather, camp signals, scores, and our enrichment columns alone.
- **Re-score:** scoring edge function runs over the ~770 new rows; the original 50 rows' scores are unchanged (verified by diff sample).

## 7. Worked Example — Teacher Imports (Apollo / Apify)

Same playbook. Apollo is the universe for "active teachers with contactable email"; our schema owns Fit Score, Tier, candidate-pipeline linkage, and outreach state. Apollo never writes Fit Score. We never drop our pipeline FKs because Apollo doesn't know about them. Apify scrapes ride the same rails: upsert by email, leave our computed columns alone, log the batch.

## 8. Checklist (copy into every import PR)

- [ ] Universe Audit committed
- [ ] Column Triage committed (one row per vendor column, tagged)
- [ ] Name-vs-Meaning check passed (or renames included in the same migration)
- [ ] Import is upsert + idempotent + logged (no `TRUNCATE`, no bulk replace)
- [ ] No writes to `score_*` columns from the import job
- [ ] Sam reviewed triage
- [ ] Re-score pass run; before/after diff attached
- [ ] `PROJECT_CONTEXT.md`, `APIS.md`, `OPEN_TASKS.md` doc-sync drafted per AGENTS.md
