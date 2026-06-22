## Plan — Sync Candidate Pipeline with the Google Form

After reading all 7 sections of the form text you pasted and comparing to the live code, **the gap is much smaller than feared**. The Process tab already covers Steps 2–7 (trial close, post-call, homework, credit/background, FDD date, reference checks, signing). The only real gap is **6 missing Step-1 fields in the Lead Sheet tab**.

## What changes (plain English)

The Lead Sheet tab grows from 8 fields to 14, matching the Google Form's Step 1 exactly. Every other tab is untouched. No scoring math, no other features, no other apps touched.

Field-by-field, here is what gets added to Lead Sheet (already there is in brackets):

| # | Field | Type | Already there? |
|---|---|---|---|
| 1 | First Name | text | ✅ (on `candidates` table) |
| 2 | Last Name | text | ✅ (on `candidates`) |
| 3 | Email | text | ✅ (on `candidates`) |
| 4 | Phone | text | ✅ (on `candidates`) |
| 5 | **Role** | radio: Operator / Investor / Other (+ other text) | ❌ new |
| 6 | **Married?** | radio: Yes / No | ❌ new |
| 7 | Will you have a partner? | switch | ✅ |
| 8 | **City located in** | text | ❌ new (today `location_preferences` mixes city + market) |
| 9 | Desired market | text | ✅ as `location_preferences` (will relabel) |
| 10 | Timeline | text | ✅ |
| 11 | **Discovery source** | textarea | ❌ new |
| 12 | **Investment ability** ($1K + $15K + 1 summer sweat equity) | switch + note | ❌ new |
| 13 | Motivation / why interested | textarea | ✅ |
| 14 | **Other summer income opportunities** | textarea | ❌ new |
| — | Liquid capital, Net worth, Additional notes | financial fields | ✅ (keep, used later in process) |

Bonus tiny fix: if City is in a registration state, show a small red banner under the City field using the existing `stateRequiresRegistration(state)` helper. **Read-only check, no logic change.**

## Phases and turns

| Phase | What | Turns |
|---|---|---|
| **Phase 1 — DB migration** | Add 6 nullable columns to `candidate_profiles`: `role`, `role_other`, `married`, `city`, `discovery_source`, `can_invest_min`, `other_opportunities`. Plus 1 boolean `sweat_equity_ok`. All nullable, no defaults that break old rows. | **1 turn** (you approve the migration) |
| **Phase 2 — Lead Sheet UI** | Edit only `LeadSheetTab.tsx`: add the 6 new field controls, relabel `location_preferences` → "Desired market", add registration-state banner under City. | **1 turn** |
| **Phase 3 — Manual smoke test (you)** | You open a candidate, fill the new fields, save, refresh, confirm fields persisted. Confirm Process tab, Documents tab, Qualification stars, Kanban all still work. | **0 turns (no code)** |
| **Phase 4 — Cleanup (optional, only if you ask)** | Verify activity log writes when Lead Sheet saves; resolve HomeworkTab vs ProcessTab.homework overlap. | **1–2 turns, only if requested** |

**Total: 2 turns guaranteed. You can stop after Phase 3.**

## Safety rules (commitments)

1. **Only 2 files opened**: the migration SQL + `LeadSheetTab.tsx`. Nothing else.
2. **Additive migration only** — 7 new nullable columns, no renames, no deletes, no type changes.
3. **No scoring/composite/ranking changes** — `candidateScoring.ts`, `recomputedPillars.ts`, `compute-sas` untouched.
4. **No other features touched** — Market Validation, Site Analysis, Teacher Prospects, Email Outreach, Smartlead, Onboarding, City Scoring all untouched.
5. **No edits to auto-gen files** — `src/integrations/supabase/client.ts`, `types.ts`, `.env` left alone.
6. **No data migration on existing rows** — old candidate_profiles rows still load fine because new columns are nullable.
7. **`location_preferences` is kept as the storage column for "Desired market"** — only the UI label changes, so no data move and no risk to existing data.

## What I'm explicitly NOT doing

- ❌ Not touching the Process tab (Steps 2–7 already match the form).
- ❌ Not touching the Qualification tab (5 pillars stay as-is).
- ❌ Not adding Step-1 fields to ProcessTab.data — keeping the rule "Step 1 = Lead Sheet, Steps 2–7 = Process tab".
- ❌ Not renaming or removing any existing column.
- ❌ Not changing how `candidates.first_name/last_name/email/phone` are stored.

## After you approve

I'll call the migration tool first (you'll get a separate approval popup for the SQL). Once the migration runs, I'll edit `LeadSheetTab.tsx`. Then you smoke-test.

If you want to wait for the PDF you said you'd send next, just reply "wait for PDF" and I'll hold. Otherwise reply **"approved"** and I'll start with the migration.
