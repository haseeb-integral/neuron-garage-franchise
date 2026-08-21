# Manus City CSV — new columns for Teacher Search import

## What Manus is asking for

Their new City / Metro export has 24 columns. We already handle 14 of them. The new
part is **evidence data**: verified enrichment facts, verified creator signals, and
weaker "secondary" signals — each with source URLs and a confidence level.

The big rule: **verified facts and secondary signals must stay separate.** A LOW or
MEDIUM secondary signal must never be shown as "verified".

## What I checked in our app today

- `teacher_prospects` has: name, first/last, email, school, district, city, state,
  grade, subject, teacher_type, experience_years, linkedin_url, notes, status, raw.
- There is **no `phone` column** (the wizard maps phone but cannot save it).
- `dedupe_key` is a **database-generated** column: `email:<email>` if there is an
  email, else `name:<first>|<last>||<state>|<city>`. We cannot write Manus's own
  `dedupe_key` into it — it needs its own column.
- The import wizard already supports Add-only / Add+Enrich / Enrich-only and
  Fill-blanks / Overwrite. Unmapped columns get dumped into the `raw` JSON blob.
  Today all the Manus evidence columns would land in that blob — unsearchable.

## What we will build

### 1. New columns on the teacher record
| Column | Why |
|---|---|
| `phone` | wizard maps it but has nowhere to put it |
| `manus_dedupe_key` (unique index) | Manus's own stable key, first upsert key |
| `record_added_at` | original roster date |
| `outreach_status_source` | Manus outreach state (kept apart from our `status`) |
| `verified_enrichment_fact_count` (int) | filterable count |
| `verified_enrichment_signal_types` (text[]) | split on `|` |
| `verified_creator_signal_count` (int) | filterable count |
| `secondary_signal_count` (int) | filterable count |
| `secondary_signal_confidence` (`MEDIUM` / `LOW` only) | filter + badge |
| `secondary_signal_match_basis` | stored exactly as given, for audit |

### 2. New child table `teacher_evidence`
One row per piece of evidence, so URLs never get flattened:
`teacher_id, class ('verified_creator' | 'secondary'), signal_type, summary,
source_url, confidence, match_basis, source_label, import_batch_id, created_at`.
Unique on `(teacher_id, class, source_url, signal_type)` so re-importing the same
file adds nothing new. RLS + GRANTs to match `teacher_prospects`.

### 3. Import wizard changes
- Add the new fields to the mapping list (Step 2) and to the AI mapping helper, so
  Manus headers auto-map on upload.
- Upsert order: `manus_dedupe_key` → `work_email` → name+city+state (this matches
  our existing generated key as the last fallback).
- Non-destructive: blank roster fields only get filled; `notes` and our `status`
  are never overwritten unless the user picks Overwrite.
- Evidence rows are always **merged, never replaced** — matched by source URL +
  signal type.
- Review screen (Step 3) gains counts: rows with verified facts, rows with creator
  signals, rows with MEDIUM / LOW secondary signals.

### 4. Teacher Search UI
- **Filters:** has verified facts, has creator signal, secondary confidence
  (MEDIUM / LOW), secondary source, plus existing city / district / school / grade /
  status filters.
- **Detail panel:** a compact "Enrichment" section — counts first, then Verified
  creator signals (green verified badge + clickable source links), then Secondary
  professional signals in a clearly separate lower-confidence block showing source,
  detail, link, and the `name + city` basis.
- No "human review" status column, no inferred franchise-fit scoring.

## Phases and turns

- **Phase 1 (1 turn)** — DB: new columns, `teacher_evidence` table, indexes, RLS,
  GRANTs. Nothing visible changes yet.
- **Phase 2 (1–2 turns)** — Wizard: new mapped fields, upsert key order, evidence
  writes, new review counts.
- **Phase 3 (1 turn)** — Teacher Search filters + detail-panel Enrichment section.
- **Phase 4 (1 turn)** — Update the Teacher Search spec doc and smoke-test with a
  Houston CSV run twice to prove it is idempotent.

## Risks and what not to touch

- Existing 246k teacher rows are untouched — all new columns are nullable.
- `dedupe_key` stays as-is (generated); we add a second key beside it, so old
  imports keep working.
- SmartLead push, outreach queue, and campaign logic are not touched.
- Test after Phase 2: import the Houston CSV, then import the exact same file again
  — second run should insert 0 rows and add 0 evidence rows.
