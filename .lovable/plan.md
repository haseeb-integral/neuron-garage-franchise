## What I found

I checked the DB and the read code. Both `assigned_to` and `source` columns exist on `candidates` (so writes succeed), but here's the catch:

**Source — NOT actually fixed end-to-end.** Last loop I added the column + write path, but `CandidatePipeline.tsx` still hardcodes `source: "—"` when reading rows from the DB (lines 104 and 185). So even though the value saves, the UI throws it away on refresh and shows "—". This is the bug you're seeing.

**Assigned To — read path is correct** (`assignedTo: r.assigned_to ?? ""` on lines 102 and 183), and the column exists. Allison's DB row currently has `assigned_to = NULL` and `source = NULL`, which matches what your screenshot shows. So if Assigned To is also going blank after a real save, it's likely one of:
- You picked "Unassigned" in the dropdown (value = empty → saves `null` on purpose), or
- The save errored silently. I'll add a small guard to surface that.

## Plan

### Fix 1 — Read `source` from the DB (the real source bug)
In `src/pages/CandidatePipeline.tsx`, change both row-mapping spots:
- line 104: `source: "—",` → `source: r.source ?? "",`
- line 185: `source: "—",` → `source: r.source ?? "",`

That's it for source. Column exists, write exists, this is the missing leg.

### Fix 2 — Make Assigned To save errors visible
The save path already toasts "Saved" on success and throws on error, but errors only surface if `OverviewTab` catches them. Quick sanity check: OverviewTab does `catch (e) { toast.error(...) }`, so failures should be visible. No code change here unless after Fix 1 you still see Assigned To going blank — then we'll add a console log to confirm whether it's a save failure vs. a deliberate "Unassigned" pick.

### Verification (after you approve)
1. Open Allison → Overview, set Source = "Referral" and Assigned To = a team member, hit save.
2. Confirm "Saved" toast appears for each.
3. I'll run `SELECT source, assigned_to FROM candidates WHERE first_name='Allison'` to confirm DB values.
4. You refresh the page. Both should now persist on screen.

### Brett — still parked
Part 3 (sync edits back to `teacher_prospects`) stays parked until Brett picks (a) / (b) / (c). Not touching that in this loop.

## Files touched
- `src/pages/CandidatePipeline.tsx` (2 one-line changes)

No migration, no schema change, no other files.