# Houston enrichment signals — what landed, and the fix before Austin

## Where we stand today (checked in the live database)

Houston re-upload ran on Aug 21 ("Houston Enriched Batch Re-Upload", 20,907 rows, marked complete).

Results from that run:

| Thing | Number |
|---|---|
| Rows in the file | 20,907 |
| New teachers added | 0 |
| Existing teachers updated | 2,857 |
| Rows skipped (nothing to fill) | 17,853 |
| Duplicate rows inside the file | 197 |
| Evidence links saved | **0** |

And across the whole 310,084-teacher pool right now:

- Teachers with a verified fact count above zero: **0**
- Teachers with a creator signal: **0**
- Teachers with a secondary signal: **0**
- Rows in the evidence table (the source links): **0**
- Rows carrying the Manus key: 2,857

So: the names, schools, phones and the Manus key came in fine. **None of the
entrepreneurial signal data came in.** Every count is zero and not one source
link was saved.

## Why it happened

Two separate problems, both in the Master Pool import wizard.

**1. "Fill blanks only" blocked the signal numbers.**
The run used Add + Enrich with "Fill blanks only". The signal count columns are
never blank on an existing teacher — they sit at 0 by default. "Fill blanks"
sees a value already there (0) and writes nothing. So the counts stayed at 0
even for teachers whose file row had real signals.

**2. Evidence links were thrown away for skipped rows.**
The wizard only knows a teacher's internal id for rows it inserted or enriched.
For the 17,853 rows it skipped, it had no id, so their evidence rows were
silently dropped. Even for the 2,857 it did touch, nothing was written, which
points at the signal columns arriving empty or split differently than the
wizard expects (it splits lists on the `|` character).

## What we will change

**Phase 1 — treat signals as always-refresh (1 turn)**
Signal fields stop following the fill-blanks rule. If the file gives a signal
number, list, confidence, or match basis, it is written — in both modes. Plain
roster fields (name, school, notes, our status) keep today's safe behaviour.

**Phase 2 — never lose evidence links (1 turn)**
Before saving evidence, look up the teacher id for *every* row in the file, not
just the ones we inserted or enriched. Rows that only carry evidence stop being
skipped. Evidence stays merge-only, matched on teacher + class + source link, so
re-running the same file adds nothing twice.

**Phase 3 — show the truth on the review screen (1 turn)**
Step 3 of the wizard gains four honest counts read from the actual file:
rows with verified facts, rows with creator signals, rows with MEDIUM secondary
signals, rows with LOW secondary signals, plus the total evidence links found.
If those read zero before you press Import, the file or the column mapping is
wrong and you stop there instead of after a 20-minute run.

**Phase 4 — re-run Houston, then Austin (1 turn)**
Re-import the same Houston file to backfill its signals, check the numbers are
no longer zero, then run Austin.

## Risks and what is not touched

- No database change needed — the columns and the evidence table already exist.
- The 310,084 existing teacher records are safe: only signal fields and evidence
  links get written.
- SmartLead push, outreach queue, Teacher Search filters and the detail panel are
  not touched.
- Files changed: `src/components/email-outreach/MasterPoolImportWizard.tsx` only.

## What you should test after Phase 4

1. Houston re-run reports evidence links saved well above zero.
2. Open a Houston teacher with a creator signal — the Enrichment block shows the
   verified signal and a clickable source link.
3. Run the exact same Houston file a third time — it should add 0 new evidence.
4. Then upload Austin and read the Step 3 counts before importing.

## One thing I need from you

Please send me the Austin file (or the Houston one again). I want to confirm the
signal columns really hold `|`-separated lists and the exact header names, so
Phase 1 is fixed against real data rather than a guess.
