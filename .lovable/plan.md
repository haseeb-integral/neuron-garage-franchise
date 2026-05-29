## Candidate Pipeline cleanup plan

### What I will fix
1. **Remove Jump To auto-highlight logic**
   - Stop blue-selecting any jump pill based on horizontal scroll visibility.
   - Keep all pills neutral unless explicitly clicked for navigation feedback, or remove active styling entirely if it remains confusing.
   - This fixes the current misleading behavior where a pill turns blue just because a column is partly most-visible in the scroller.

2. **Fix Days in stage to use real stage-entry timing**
   - Recompute each candidate’s `daysInStage` from the most recent `candidate_stage_history.changed_at` entry for that candidate’s current stage.
   - Use `created_at` only as a fallback when no matching stage-history row exists.
   - Keep the existing ranges unless a later product decision changes them:
     - `Fresh (≤3)`
     - `Watch (4–7)`
     - `Stalled (8+)`
   - This should fix the current bug where candidates are filtered by account age instead of time in their current stage.

3. **Expand the Fit filter beyond only `90+` and `75+`**
   - Replace the old coarse thresholds with explicit score buckets that match the pipeline’s scoring language:
     - `All`
     - `90+`
     - `75–89`
     - `60–74`
     - `<60`
   - Wire the filtering logic to the actual numeric `fitScore` values (0–100).
   - Ensure the visible candidates in the board match the selected bucket exactly.

4. **Keep the four metric cards live and verify them**
   - Preserve the top four cards as live backend-driven metrics, not dummy placeholders.
   - Re-verify the current definitions:
     - `Total in Pipeline` = active candidates
     - `Hot Leads` = fit score `>= 80`
     - `Conversion Rate` = candidates who ever reached signing / total candidates
     - `New This Week` = created within last 7 days
   - If smoke test reveals a mismatch after the stage-day fix, adjust only the affected metric logic.

5. **Smoke test the page after changes**
   - Verify no jump pill appears randomly selected while scrolling.
   - Verify each Fit bucket shows the correct candidates.
   - Verify each Days in stage filter shows the correct candidates.
   - Verify metric cards still render live values and do not regress.

### Guidance recovered from earlier chat
- **Sam’s punchlist explicitly asked for a Days in Stage filter.**
- **The four top metric cards are intended to be live**, not dummy; earlier chat explicitly approved `Hot Leads (fit ≥ 80)` and `New This Week` as real metrics.
- I **did not find any explicit Brett/Sam instruction** defining the exact Fit bucket labels (`90+`, `75+`, etc.) or asking for Jump To auto-highlighting. So I’ll normalize those to clearer behavior and clearer score bands.

### Technical details
- **Jump bar bug source:** current `KanbanBoard.tsx` uses an `IntersectionObserver` to mark the “most visible” column as active; that creates inconsistent-looking blue pills while horizontally scrolling.
- **Days in stage bug source:** current `CandidatePipeline.tsx` derives `daysInStage` from `candidates.created_at`, which is candidate age, not time in current stage.
- **Fit filter source:** current logic only supports `all | 90 | 75`, so the board cannot represent the full score range cleanly.

If you approve, I’ll implement these fixes and then smoke-test the preview.