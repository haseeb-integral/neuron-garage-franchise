
## Plain-English answer first (no code change needed to understand)

**Where do notes & tags go today?**
Nowhere durable. The detail-panel writes them only to React state — refresh the page, they vanish. There is no `notes` or `tags` column on `teacher_prospects`. So yes, we need a tiny "mini-CRM" layer at the backend.

**What other web apps do** (Apollo, Outreach.io, Salesloft, HubSpot, Lemlist):
- Notes → auto-save on blur with a tiny "Saved · 2s ago" timestamp under the field. Stored in a `prospect_notes` table (one row per note, append-only, with author + timestamp). The panel shows the latest 3, "View all".
- Tags → free-text + colored chips, saved instantly on Enter. Stored as `text[]` on the prospect or a separate `prospect_tags` join table. Add-Tag from the bulk bar opens a small popover, not a drawer (lighter weight).

**What happens to a teacher when "Added to Outreach" — the bit that's confusing you:**
1. Today: a row lands in `outreach_queue` (state = `queued`). That's it. **Nothing is pushed to SmartLead.** No campaign on SmartLead's side gets new contacts.
2. The Email Outreach screen has **never read** `outreach_queue`, so the teacher seems to disappear. That's the disconnect.
3. The badge in Teacher Search ("In Outreach") only means "row exists in our internal queue".

The industry standard (Apollo / Outreach) is:
- Teacher row gets a status pill **"In sequence: <Campaign Name>"** with click-through.
- The campaign/sequence screen has a **"Members"** tab listing every contact, their step, last activity, reply status.
- A separate **"Outreach Queue"** or **"Pending sync"** view shows contacts queued but not yet pushed to the email tool.

We don't push to SmartLead yet (that's Task B-something). So in the interim we should at least show the queue on the Email Outreach screen so adds are visible.

---

## What to build

### 1. Persist notes & tags (the mini-CRM)
- Migration: add `notes text` and `tags text[] default '{}'` columns to `teacher_prospects` (simplest, fits 3-user internal tool — no need for a separate notes table yet; document in LATER.md that we can split later if Sam asks for note history).
- `TeacherDetailPanel`:
  - Notes textarea: debounced auto-save (700 ms) + on blur. Show "Saving…" → "Saved · just now" under the field.
  - Tags: add saves immediately to DB; remove saves immediately. Toast only on error.
- `handleUpdate` in `TeacherProspects.tsx` performs the real `update()` against the DB.

### 2. Bulk-bar "Add Tag" actually works
- Replace the toast-only handler with a small popover: input + "Apply to N selected". Writes to `tags` array on every selected row in one `update().in('id', uuids)` call.
- Bulk "Export CSV" actually exports the selected rows (currently broken — just shows a toast).

### 3. Export CSV — fix the four bugs at once
- Header-bar "Export CSV" (no rows selected) → export **all rows matching current filters**, not just the visible page. Use the same query as the table but without `.range()`, paged in chunks of 1000 to dodge Supabase's row cap.
- Selected-rows "Export CSV" → export exactly those rows.
- Sorted to match the current table sort order (today: `created_at desc`).
- Show a tiny progress toast while chunks load ("Exporting 11,752 rows…").
- Default sort note: keep `created_at desc` (newest first) — that **is** the standard for CRM lists (Apollo, HubSpot). Add an indicator arrow on the column header so it's obvious.

### 4. Cosmetic fixes (UI quality)
- **Close-X overlapping red pill** (BulkActionBar): move the X to the far right with `ml-auto`, give it `text-[#66728a] hover:bg-[#f1f4f9] rounded-md p-1`. The "1 selected" stays left.
- **Bar pushes table down**: standard practice (Apollo, Linear, Gmail) is to make this bar **sticky at the top of the table**, not insert it above. We'll set `position: sticky; top: 0; z-index: 10` on the bar and reserve a fixed 48-px slot above the table so it doesn't shift on first selection.
- **Status Legend**: convert from cramped 4-stack to a clean 2-col grid in a card with proper spacing; pills become flat tokens with a dot indicator, not bold text-on-tint blocks.
- **Dropdowns (City, Source)**: replace native-looking select with shadcn `Command` + `Popover` (searchable combobox). Show item count beside city name, group header "Filters" at the top. Match height/border to other inputs.

### 5. Wire Email Outreach to the queue (the missing screen)
- New panel on `/email-outreach` (top of page, above existing): **"Outreach Queue"** — reads `outreach_queue` joined with `teacher_prospects` and `campaign_cache`.
  - Columns: Name · Email · School · City · Campaign · Added · State (queued / sent / failed) · Action (Remove).
  - Filter chips by state and by campaign.
  - "Push to SmartLead" button per row — for now shows a tooltip "Push integration coming — Task B5". This is honest and unblocks visibility.
- Teacher Search side: keep the green "In Outreach" pill but make it click to `/email-outreach?queue=<uuid>` and scroll to that row.

### 6. Reduce confusion in the Add-to-Campaign modal
- Default the modal to **"Existing campaign"** with the most-recent active campaign pre-selected (already done).
- Show a confirmation banner after success: "Added Anna Weisberg to *[Campaign Name]*. **View in Email Outreach →**" (link).

---

## Technical sketch (for the next coder, skip if non-technical)

```text
DB
  ALTER TABLE teacher_prospects
    ADD COLUMN notes text,
    ADD COLUMN tags  text[] NOT NULL DEFAULT '{}';

  -- optional later: prospect_notes(id, prospect_id, body, author, created_at)

src/pages/TeacherProspects.tsx
  - handleUpdate({notes, tags}) → supabase.from('teacher_prospects').update(...).eq('id', uuid)
  - handleExport() → loop .range(0..999, 1000..1999…) until count exhausted, build CSV in chunks
  - handleBulkExport(selectedUuids) → query .in('id', uuids)

src/components/teacher-prospects/
  TeacherDetailPanel.tsx → debounce notes (use existing useDebounced); show save status
  BulkActionBar.tsx → fix X position; AddTag popover with Input + Apply
  TeacherFilterBar.tsx → swap Select → Command+Popover combobox

src/pages/EmailOutreach.tsx (or V2)
  + <OutreachQueuePanel /> reading outreach_queue with teacher_prospect + campaign joins
```

## Out of scope (going to LATER.md)
- Real SmartLead push (Task B5 — separate sprint).
- Note history / multi-author trail.
- Tag auto-complete from existing tag library.
- Saved sort-orders per user.

## Risk
Low overall. The DB migration adds two nullable/defaulted columns — non-breaking. The Email Outreach panel is additive. The cosmetic changes are isolated to three components. Each change can be reverted independently.
