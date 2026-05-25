## Problem

On the Teacher Search page, loading with no filters + "SmartLead Enriched" source selected times out:

> "The database took too long to respond. Try a narrower search or a single city filter."

### Root cause

`useTeacherProspectsData.loadPage()` runs:

```ts
supabase.from("teacher_prospects")
  .select("*", { count: "estimated" })
  .order("created_at", { ascending: false })
  .ilike("enrichment_source", "smartlead%")
  .range(0, 24);
```

Against a **167,698-row** table. Two compounding issues:

1. **`ilike "smartlead%"` is not sargable** against the existing `lower(enrichment_source)` index, so the planner can't use it for the source filter. The actual stored values are a tiny known set (`Manus`, `smartlead_csv`, `linkedin_danish`) — a plain equality / `IN` would be index-friendly.
2. **`count: "estimated"` falls back to exact `COUNT(*)`** in PostgREST whenever a filter is present and the planner's estimate is below the threshold. With an `ilike` over 167k rows and no usable index, the exact count is a full seq-scan → statement timeout. The 25-row page itself returns quickly; it's the count that kills the request.

## Fix (surgical, low risk)

### 1. `src/hooks/useTeacherProspectsData.ts`

- Replace the `ilike("enrichment_source", "smartlead%" | "linkedin%")` branches with `.in("enrichment_source", [...])` using the known stored values:
  - `smartlead` → `["smartlead_csv"]`
  - `linkedin` → `["linkedin_danish"]`
  - `needs_email` → unchanged (already `.eq` on indexed partial)
- Apply the same change in `buildFilteredQuery()` (used by bulk Export / Add-to-Campaign).
- Change `count: "estimated"` → `count: "planned"` on the page query. `planned` uses only `EXPLAIN` row estimates and never escalates to exact `COUNT(*)`, so it cannot time out. The "Quick Stats" sidebar already gets exact totals from the `teacher_prospects_stats` RPC, so the page-level count is purely for pagination — an estimate is fine and is what `"estimated"` was already trying to be.

### 2. Migration: add an index for equality on `enrichment_source`

```sql
CREATE INDEX IF NOT EXISTS idx_teacher_prospects_enrichment_source
  ON public.teacher_prospects (enrichment_source);
```

Lets the planner pick this index for the `IN (...)` filter when combined with the `created_at DESC` order; the cost stays bounded even as the table grows past 200k.

### 3. Verify

- Reload `/teacher-prospects` with default filters and with "SmartLead Enriched" / "LinkedIn" / "Needs Email" selected — each should return <1s, no toast.
- Confirm pagination still works (Next/Prev advances by 25; estimated total is shown as the page count basis; sidebar "Quick Stats → Total" remains exact from the RPC).
- Confirm bulk Export / Add-to-Campaign still pull the right rows (these use `buildFilteredQuery`, which gets the same source-filter fix).

## Out of scope

- No schema changes to columns, no RLS changes, no UI changes, no business logic changes.
- The stats RPC (`teacher_prospects_stats`) is untouched.
