## Goal

Make the Email Outreach screen self-sufficient for verifying what was imported, so users don't have to log into SmartLead to answer "which leads went into this batch?".

## Why

Today, **Import Batches panel** shows batch-level summary only:
- batch name, source, segment, city, status, **counts** (record_count / approved_count)
- linked campaign name (via `campaign_id`)

What it doesn't show:
- The actual email addresses sent
- Per-lead QA outcome (approved vs rejected with reason)
- Whether SmartLead reused an existing lead_id or created a new one (the "why 5 instead of 2" question)

The `prospects_staging` table already stores every row from every CSV with its `qa_status` and `rejection_reason` — we just don't surface it.

## Scope (v1 — read-only drill-down, no new data needed)

1. **Make each Import Batches row clickable** → opens a side drawer
2. **Drawer contents:**
   - Batch metadata (name, source, city, segment, status, created_at, campaign link)
   - Counts grid: total / approved / rejected / sent-to-smartlead
   - **Leads table** (from `prospects_staging` filtered by `batch_id`):
     - email · first_name · last_name · city · qa_status badge · rejection_reason (if any)
   - "Open campaign in SmartLead" button (deep link to `https://app.smartlead.ai/campaigns/<id>`)
3. **Small clarifying banner at the top** of any campaign that has more leads than this batch pushed: "This campaign contains N leads. M came from this batch — the other (N−M) were added separately (older imports, manual adds, or SmartLead account-wide email dedup reused existing lead IDs)." Pulled by comparing `total_leads` from `campaigns/<id>/leads` vs our `approved_count`.

## Files

- `src/components/email-outreach/ProspectBatchesPanel.tsx` — make rows clickable, manage drawer open state
- `src/components/email-outreach/BatchDetailDrawer.tsx` *(new)* — drawer UI + query `prospects_staging` + optional `campaigns/<id>/leads` call

No DB migration. No new edge function. `prospects_staging` already exists and is populated.

## OPEN_TASKS entry — Task 17n

Append after 17m:

```
### 17n. Import Batches — per-batch lead drill-down (added May 19)
- Today the Import Batches panel shows counts only. To see WHICH emails
  went into a batch, user must open the campaign in SmartLead.
- Add clickable rows → BatchDetailDrawer showing every row from
  prospects_staging filtered by batch_id (email, name, city, qa_status,
  rejection_reason) + a deep link to the SmartLead campaign + a
  disambiguation banner when the campaign's total_leads differs from our
  approved_count (explains SmartLead's account-wide dedup behavior).
- Origin: May 19, 2026 — user pushed 2-lead CSV but SmartLead campaign
  showed 5 leads. Cause: 3 leftover test leads in the campaign from
  earlier work + SmartLead reused existing lead_ids for test1/test2.
  No actual duplication — but UX gave no way to verify this without
  leaving the app.
- Effort: ~3 hrs · Risk: low · Files: ProspectBatchesPanel.tsx,
  BatchDetailDrawer.tsx (new)
```

## Doc-sync (per AGENTS.md Rule 9)

After implementation, draft one-line updates to:
- `OPEN_TASKS.md` — add 17n
- `PROJECT_CONTEXT.md` — "Import Batches panel now drills down to per-lead view; explains SmartLead's account-wide dedup"
- `HOW_IT_WORKS.md` — short paragraph in the Email Outreach section explaining the dedup model (account-wide lead_id reuse) so future readers don't hit the same "why 5 not 2" confusion

Show one-line summary to Haseeb before writing — do not silently overwrite.

## Out of scope (v1)

- Real-time lead-level status sync from SmartLead per lead (status: SCHEDULED / SENT / OPENED) — that's bigger, deferred to Task 21
- Bulk re-push from a batch — deferred
- Edit/delete prospects_staging rows — deferred
