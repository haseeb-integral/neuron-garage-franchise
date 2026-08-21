# Fix the Stuck Master Teacher Import

## What is happening

The latest batch has **20,907 source rows** and is still marked **Importing**. The database already received **2,645 teachers**, so it is not fully frozen.

The slowdown starts when a 500-row group contains one duplicate. The app then sends that whole group again **one teacher at a time**. This can create hundreds or thousands of slow browser requests. The progress message does not update until that work finishes, so it looks stuck.

The database is healthy. Memory, connections, and disk use are normal. This is an import-code problem, not a Cloud capacity problem.

## Phase 1 — Stop and safely recover this batch

**Estimate: 1 Lovable turn**

- Mark the abandoned batch as failed so it no longer looks active.
- Keep the 2,645 teachers already saved. Do not delete them.
- Make the next import skip those saved teachers through the normal duplicate check.
- Confirm no existing teacher details are overwritten by this recovery step.

## Phase 2 — Replace slow one-at-a-time fallback

**Estimate: 1 Lovable turn**

- Remove the one-request-per-teacher duplicate fallback.
- When a 500-row group has a conflict, split it into smaller groups to isolate bad rows quickly.
- Keep good rows moving in bulk.
- Update progress after every completed group, including saved, enriched, and skipped totals.
- Add a clear failure message if a request times out or the browser loses the connection.

## Phase 3 — Make large enrich runs fast

**Estimate: 1 Lovable turn**

- Stop sending one update request for every matched teacher.
- Process enrichment in safe bulk groups while keeping the current **Fill blanks** or **Overwrite** rule.
- Save evidence links in groups as it does today.
- Keep counts accurate if part of an import fails.

## Phase 4 — Test the real 20,907-row flow

**Estimate: 1 Lovable turn**

- Test the attached file in Add + Enrich mode.
- Confirm the re-run skips the 2,645 rows already saved.
- Confirm all 36 groups advance without sitting on one group.
- Confirm the final batch counts equal saved + enriched + skipped.
- Confirm blank signal counts save as zero and evidence links remain separate.

## Areas affected

- Import to Master Teacher Pool progress and retry behavior
- New teacher inserts
- Existing teacher enrichment
- Import batch status and totals
- Evidence saving after the teacher rows finish

Teacher Search display, filters, SmartLead, candidate records, and existing teacher values will not be changed.

## Risks and safeguards

- **Duplicate teachers:** keep the current dedupe rules and test a second run.
- **Partial import:** preserve completed rows and record exact progress before showing failure.
- **Accidental overwrite:** keep Fill blanks as the active rule unless the user selected Overwrite.
- **Browser closing:** clearly mark an interrupted batch instead of leaving it as Importing.

## Aesthetics

- Keep the current three-step import layout.
- Show live saved, enriched, and skipped counts instead of a spinner that appears frozen.
- Use plain status text such as “Saving group 4 of 36” and show a clear failed or completed state.
