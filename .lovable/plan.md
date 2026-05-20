## Issues

### 1. Email Outreach summary cards show "0" / "—"
Look at `src/pages/EmailOutreachV2.tsx` lines 75–85. Five of the six cards are hardcoded: `value: "0"` / `"—"` with subtitle `"no live data yet"`. Only **Active Campaigns** is wired. Root cause: the cards were stubbed during Phase 1a and never connected to the data sources we already have.

### 2. Queue row layout breaks when a campaign is assigned
In `OutreachQueuePanel.tsx` (lines 230–246) the Campaign cell renders a colored pill **and** a full-width `<select>` with placeholder "change…" side-by-side. The select is ~220px wide, which pushes the row to wrap (the "Push" button drops to a second line, as seen in the screenshot). Root cause: the "Change campaign" affordance was built as a sibling control instead of a secondary action.

---

## Fix Plan

### A. Real numbers in cards (`EmailOutreachV2.tsx`)

Add one effect that loads, in parallel:

1. **Outreach queue counts** — `supabase.from("outreach_queue").select("state", { count, head:false })` then group client-side:
   - `Prospects in Outreach` = rows where `state ∈ {queued, assigned, sending}`
   - `Promoted to Pipeline` = rows where `state = 'sent'` (until candidate_pipeline linkage exists; document the proxy)
2. **SmartLead analytics overview** — reuse `fetchAggregated()` from `AnalyticsPanel.tsx` (extract to `src/lib/smartleadAnalytics.ts` so both pages share it). Use the localStorage cache key `smartlead_analytics_overview` first for instant paint; refresh in background.
   - `Open Rate` = `rates.openRate` → e.g. `"24%"`
   - `Replies` = `totals.reply`
   - `Interested Leads` = `totals.interested`

If a value can't load, keep `—` plus a tooltip with the error (not silent zeros). Subtitles become meaningful: `"queued + assigned"`, `"based on N sent"`, etc.

Refresh button + Import-Leads completion already trigger `loadCampaigns()` — extend the same flow to call the new loader so numbers stay live.

### B. Fix queue row layout (`OutreachQueuePanel.tsx`)

Replace the inline pill+select pair (lines 231–246) with:

```text
[ Campaign Name ▾ ]   ← single compact button, max-w-[180px], truncates
```

- Button shows the assigned campaign name (or "Select campaign…" when unassigned).
- Clicking opens a small dropdown menu (use existing shadcn `DropdownMenu`) listing `campaignOptions`, with a check-mark on the current one. Selecting calls `assignCampaign`.
- Removes the duplicate "change…" placeholder select entirely.
- Pin column width with `w-[200px]` so other columns (Added, State, Action) stay on the same row.

For unassigned/invalid rows, the same button shows red border + "Pick a campaign" label and opens the same dropdown — one consistent control, no stacked text + select.

Also:
- Wrap the Action cell contents in `whitespace-nowrap` so Push + trash always stay inline.
- Reduce min-table-width from `760px` to `860px` to give the new Campaign column its share without forcing horizontal scroll at 1044px viewport.

### C. Prevent regression

Add a short comment block at the top of the cards array in `EmailOutreachV2.tsx`:

```ts
// Every card MUST resolve to a live value or an explicit "—" with tooltip.
// Never ship hardcoded zeros — caught May 20, 2026.
```

And in `OutreachQueuePanel.tsx` above the Campaign cell:

```ts
// One control per cell. Do not stack a pill + a select — breaks row height.
```

### D. Doc sync (Mode A — draft only)

After implementation, propose one-line updates to:
- `PROJECT_CONTEXT.md` — Email Outreach cards now wired to outreach_queue + SmartLead `/analytics/overview`
- `HOW_IT_WORKS.md` — Queue Campaign cell uses single dropdown trigger
- `OPEN_TASKS.md` — close the "cards show zero" + "row UX" items

Wait for explicit "go" before writing docs.

---

## Files Touched

- `src/pages/EmailOutreachV2.tsx` — wire stats loader
- `src/components/email-outreach/OutreachQueuePanel.tsx` — replace pill+select with single dropdown trigger, lock column widths
- `src/lib/smartleadAnalytics.ts` *(new)* — extract `fetchAggregated` for reuse
- `src/components/email-outreach/AnalyticsPanel.tsx` — import from the new lib (no behavior change)

No DB migration. No schema change.
