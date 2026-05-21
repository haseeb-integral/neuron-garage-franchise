
## What I'll create

A new canonical doc at the repo root: **`THIRD_PARTY_DATA_PLAYBOOK.md`** (~1,500 words).

I'll also add one line to `README.md`'s "Read These First" list and one bullet to `AGENTS.md` source-of-truth section so future agents know this playbook exists and is canonical.

No code, no schema, no migrations in this step — just doctrine.

## Why this is worth a canonical doc

We've now hit the same pattern twice:
1. **City Search** — Manus delivered an 817-row enriched city table; ours had 50.
2. **Teacher Search** — similar pattern with Apollo / Apify imports earlier in the sprint.

And it will keep happening. Without a written rule, each new rich third-party table tempts us to either (a) throw away our schema and adopt theirs, or (b) ignore the new data because integrating feels risky. Both are wrong. The playbook codifies the middle path: **their table is the universe (rows), ours is the scoring layer (columns + logic).**

## Proposed contents of `THIRD_PARTY_DATA_PLAYBOOK.md`

```
# Third-Party Data Playbook

Canonical rule for absorbing external enriched tables (Manus, Apollo, Apify,
future vendors) into Neuron Garage without losing our scoring schema or
re-litigating architecture each time.

Status: canonical. When this conflicts with older docs, this wins.
Cross-ref: AGENTS.md (source-of-truth hierarchy), DATABASE_LAYER_SPEC.md.

---

## 1. The Core Principle

> **Third-party tables are the UNIVERSE (rows). Our schema is the SCORING
> LAYER (columns + logic). Never invert this.**

A vendor's job is to give us *which entities exist* (cities, teachers,
schools, competitors). Our job is to decide *what those entities mean for
franchise viability*. We import their rows. We keep our columns. We map
between them explicitly.

## 2. When This Playbook Applies

Trigger any time someone hands us a rich, populated table that overlaps
with an existing Neuron Garage entity. Examples:
- Manus 817-city demographics table → `us_cities_scored`
- Apollo / Apify teacher exports → `teacher_prospects`
- Future: competitor landscape table, school enrollment files, ZIP-level
  income data, etc.

Does **not** apply to:
- Live API calls that already write into our schema (Census, BLS, BEA)
- One-off CSVs used only for a single chart or QA check

## 3. The Five Steps

### Step 1 — Universe Audit (before any code)
Answer in writing:
- How many rows does the vendor table have vs. ours?
- What is the primary key of *their* table? (state+city, email, NCES id…)
- What's our matching key? Is there a clean join, or do we need fuzzy
  matching / normalization?
- Are there rows in theirs that aren't in ours? (almost always yes — that's
  the point)
- Are there rows in ours that aren't in theirs? (decide: keep, archive, or
  drop)

Output: a one-page Universe Audit committed alongside the migration.

### Step 2 — Column Triage
Go column-by-column on the vendor table and tag each one:
- **KEEP-AS-IS** — fills a gap in our schema cleanly, same geography /
  granularity / units. Import directly.
- **KEEP-RENAMED** — same data, different name. Map to our column. Never
  add a duplicate column just because the vendor used a different label.
- **RECOMPUTE** — vendor value is wrong granularity or stale. Example:
  Manus "STEM %" is state-level BLS, not city-level. Import as `null` and
  backfill from our own pipeline at correct geography.
- **DROP** — redundant, lower quality than ours, or out of scope.
- **NEW COLUMN** — vendor has a signal we don't track yet AND it matters
  for scoring. Add to our schema via migration (not as a loose JSON blob).

Output: a triage table in the migration's description.

### Step 3 — Name-vs-Meaning Check (the AGENTS.md rule)
For every KEEP-RENAMED or NEW COLUMN, re-read the destination column name
out loud. If the vendor's data would make the name misleading, **rename
the column in the same migration**. Do not silently widen meaning.

Example: importing Manus "elementary enrollment" into our
`public_elementary_enrollment` is fine — names align. Importing Manus
"# elementary schools" (which includes private + charter) into
`public_elementary_count` is NOT fine — rename or split first.

### Step 4 — Idempotent Import, Never Bulk Replace
The import job MUST be:
- **Idempotent** — running it twice produces the same result.
- **Upsert by stable key**, never `TRUNCATE + INSERT`. We have scored rows,
  user watchlists, and FKs pointing at our ids.
- **Additive** — adds missing rows, updates triaged columns, leaves
  untouched columns alone (especially anything we computed: scores,
  weather, enrichment results).
- **Logged** — write a row to an `imports` log table: source, batch_id,
  row counts (inserted / updated / skipped / errored), triage decisions.

If the vendor file is too big or messy to upsert cleanly, stage it first
(`staging_<source>_<date>`) and run the merge as a separate, reviewable
SQL step.

### Step 5 — Re-score the New Rows
After import, scoring is a separate pass. The import job does NOT write
to any `score_*` column. Trigger the scoring edge function over the
affected rows and confirm:
- New rows have non-null scores or a clear "not enough data" status.
- Pre-existing rows' scores didn't move unexpectedly (diff the before /
  after for a sample).

## 4. What NEVER Happens

- ❌ Adopting a vendor's table as our canonical table.
- ❌ Dropping our schema columns because the vendor doesn't have them.
- ❌ Storing vendor rows in a parallel table that the app then has to
  query separately from our own. One table per entity.
- ❌ Letting a vendor's pre-computed "score" or "rank" leak into our
  composite. Their scores can ride along as a signal, but our composite
  is computed by our engine, period.
- ❌ Silent column meaning changes (see AGENTS.md Name-vs-Meaning rule).
- ❌ `TRUNCATE` on a live entity table. Ever.

## 5. Roles & Cadence

- **Vendor delivery → Haseeb** receives the file, drops it in
  `/data/incoming/<source>/<date>/`.
- **Lovable agent** runs the 5-step playbook, produces:
  1. Universe Audit (markdown)
  2. Column Triage (markdown)
  3. Migration (additive + import job)
  4. Re-score pass + before/after diff
- **Sam** reviews the column triage before migration runs. He is the only
  approver for anything touching scoring inputs.
- **Brett** signs off on which vendor table becomes "the universe" for a
  given entity if there's ambiguity.

Expected cadence: every 4–8 weeks a new enriched table will land
(competitor data, school-level data, regional economics). Each one runs
this playbook. No exceptions, no "this one is small".

## 6. Worked Example — Manus 817 Cities (May 2026)

- **Universe:** 817 Manus rows vs. ~50 of ours. Manus becomes the city
  universe.
- **Key:** `(state_abbr, city_name)` after normalization (`"New York
  city"` → `"New York"`).
- **Triage:**
  - KEEP-AS-IS: state, city, population, median_household_income,
    college_degree_pct, cost_of_living_index, elem enrollment
  - KEEP-RENAMED: Manus "# districts" → new column
    `school_district_count`
  - RECOMPUTE: Manus "STEM %" and "metro income" (state-level) → import
    as null, backfill from BLS / BEA at MSA geography
  - DROP: none
  - NEW COLUMN: `school_district_count`
- **Import:** upsert into `us_cities_scored` on `(state_abbr, city_name)`.
  Touches only the 7 triaged columns. Leaves weather, camp signals,
  scores, and our enrichment columns alone.
- **Re-score:** scoring edge function runs over the ~770 new rows; old 50
  rows' scores are unchanged (verified by diff).

## 7. Worked Example — Teacher Imports (Apollo / Apify)

Same playbook. Apollo is the universe for "active teachers with
contactable email"; our schema owns Fit Score, Tier, candidate pipeline
linkage, outreach state. Apollo never writes Fit Score. We never drop
our pipeline FKs because Apollo doesn't know about them.

## 8. Checklist (copy into every import PR)

- [ ] Universe Audit committed
- [ ] Column Triage committed
- [ ] Name-vs-Meaning check passed (or renames included in same migration)
- [ ] Import is upsert + idempotent + logged
- [ ] No writes to `score_*` columns from the import job
- [ ] Sam reviewed triage
- [ ] Re-score pass run; before/after diff attached
- [ ] PROJECT_CONTEXT.md, APIS.md, OPEN_TASKS.md doc-sync drafted
```

## Doc-sync follow-ups (after this lands)

- `README.md` — add `THIRD_PARTY_DATA_PLAYBOOK.md` to "Read These First"
- `AGENTS.md` — add bullet under "Non-Negotiable Rules" pointing to the playbook for any third-party table import
- `OPEN_TASKS.md` — reference the playbook on the Manus-import task and on the future Competitive Landscape import

Drafted per AGENTS.md doc-sync rule; will wait for explicit "go" before writing those.

## Approve and I will

Write `THIRD_PARTY_DATA_PLAYBOOK.md` with the content above, then surface the README / AGENTS / OPEN_TASKS one-liners for your "go".
