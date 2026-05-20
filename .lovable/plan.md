
# Teacher Search → Row actions, missing columns, and Outreach handoff

## What I found (the honest audit)

I checked the code and the live `teacher_prospects` table (11,752 rows). Here is the truth about what is real vs fake today:

### Row action dropdown — what each item actually does

| Action | Today | Real backend? |
|---|---|---|
| View profile | Opens the right-side detail panel | ✅ real (reads the row) |
| Enrich contact | `toast.info("Sample enrichment queued…")` | ❌ no-op stub |
| Add to shortlist | `toast.success("…added to shortlist")` | ❌ no-op, no `shortlist` table exists |
| Add to outreach | Sets a local `Set<number>` in React state and shows a toast | ❌ **not persisted** — refresh the page and it's gone. Nothing is written to any table. Email Outreach screen uses its own hardcoded mock array of 16 prospects (`src/pages/EmailOutreach.tsx` lines 70–86) — your promoted row never appears there. |
| Mark not fit | `toast.info("…marked as not a fit")` | ❌ no-op stub. No `status='not_fit'` write. |

### Why the detail panel shows "Grade Level: 3-5" but the table shows "—"

The detail panel value is **fake**. Looking at the DB:

```
SELECT count(grade) FROM teacher_prospects;  →  0 of 11,752
SELECT count(district) FROM teacher_prospects; →  0 of 11,752
SELECT count(experience_years) FROM teacher_prospects; → 0
SELECT count(subject) FROM teacher_prospects; → 0
```

The flat columns `grade`, `district`, `experience_years`, `subject` are 100% empty. The table is honest — it shows "—". The detail panel cheats by falling back to a sample default of `"3-5"` and `"0 years"` even when the row has no data. That mismatch is the bug.

### The good news — the data exists in `raw` JSONB

The Apollo/SmartLead import wrote everything into the `raw` jsonb blob. 9,825 rows have:

- `raw.title` (job title — "5th Grade Teacher", "Math Teacher", "Principal", etc.)
- `raw.companyName` (school name)
- `raw.companyWebsite` ← **this is the school URL Sam will want**
- `raw.department`, `raw.level`, `raw.industry`, `raw.subIndustry`
- `raw.companyHeadCount`, `raw.address`

And separately: `linkedin_url` is populated for **11,724 of 11,752 rows (99.8%)**.

So nothing needs new scraping — we just have to extract from `raw` and show it.

---

## What I will build

### 1. Make the row actions actually do things

Schema work (one migration):

- **`teacher_prospects.status`** already exists (defaults `'new'`). Add the allowed values via a CHECK: `new | shortlisted | in_outreach | not_fit | replied`.
- **New table `outreach_queue`** — the bridge between Teacher Search and Email Outreach:
  - `id`, `teacher_prospect_id` (FK), `campaign_id` (nullable until assigned), `added_by` (uuid), `added_at`, `state` (`queued | assigned | sending | sent | failed`), `notes`.
  - Unique `(teacher_prospect_id, campaign_id)` so you can't double-add to the same campaign.
  - RLS: authenticated full access (matches existing `teacher_prospects` policy).

Wire the actions:

| Action | New behavior |
|---|---|
| **View profile** | unchanged |
| **Enrich contact** | Calls `enrich-school-staff` edge function with the row's NCES id (function already exists). If no NCES id, disabled with tooltip "School not linked yet". |
| **Add to shortlist** | `UPDATE teacher_prospects SET status='shortlisted' WHERE id=…`. Row gets a yellow ⭐ chip in the Source column. Becomes "Remove from shortlist" if already shortlisted. |
| **Add to outreach** | Opens the new **Add to Campaign** modal (see §3). On confirm: insert into `outreach_queue` AND update `status='in_outreach'`. **Persists** across refresh. |
| **Mark not fit** | `UPDATE teacher_prospects SET status='not_fit'`. Row gets greyed out and a filter "Hide Not-Fit" turns on by default. Reversible from detail panel. |

### 2. Fix the table columns and the detail-panel lie

**Detail panel:** stop showing fake "3-5" / "0 years". If `grade` is null, render "—" with a small "Not enriched" hint, same as the table. Same for years experience.

**Show what we actually have.** Surface from `raw` JSONB by extending the page query to also `SELECT raw->>'title' AS title, raw->>'companyWebsite' AS school_url`. Update `TeacherProspect` type with `title` and `schoolUrl` fields.

**New / reworked columns** (responsive — collapse to a "More" popover under 1200px):

```
☐  Name              Title             School (link)        City        LinkedIn    Source           ⋯
   👤 Adra Valentine 5th Grade Teacher Marin Country Day ↗  San Fran…   🔗          SmartLead·Verif  ⋯
```

- **Title** — `raw.title`, truncate at 22ch with tooltip
- **School** — clickable; if `raw.companyWebsite` present, becomes a link with a tiny ↗ icon (opens new tab). Pattern follows Apollo / Clay / Salesloft.
- **LinkedIn** — single LinkedIn-blue `in` icon button, not the raw URL. Opens new tab. Greyed out when missing. (This is the standard in Apollo, Lusha, Hunter, Clay.)
- **Grade** column **hidden by default** (since 100% empty) and moved to a "Hidden columns" menu — logged in `LATER.md` to un-hide once enrichment fills it.
- **District** same treatment — hidden, restore later.
- **Email** stays as today.

Add a small **"Columns"** button in the table toolbar with checkboxes — standard pattern (Linear, Notion, Airtable, Supabase Studio) so Sam can toggle visibility without code.

### 3. The "Add to Outreach" handoff — the right UX

Today: row → toast → user has to remember to navigate to /email-outreach → screen shows mock data unrelated to what they added. That's broken.

Industry standard for "send these leads to a sequence" (Apollo, Outreach.io, Salesloft, Smartlead's own UI, HubSpot Sequences):

**Two-step, never one-step:**

1. User clicks "Add to outreach" → small modal opens **on the Teacher Search screen**:
   ```
   Add Adra Valentine to a campaign
   ─────────────────────────────────
   Campaign:  [ ▼ Pick existing campaign ]
              [ + Create new campaign  ]
   ☐ Skip if already in another active campaign (recommended)
   ☐ Open Email Outreach after adding
   [Cancel]                            [Add to campaign]
   ```
2. On confirm, write to `outreach_queue`, show toast with both "Undo" and "View in Outreach" actions.

Why a modal instead of jumping straight to Email Outreach: keeps the user in their filtering flow, lets bulk-add work the same way (selected 50 rows → same modal), and matches every serious sales tool. The "Open Email Outreach after adding" checkbox covers the user who *does* want to jump.

**Email Outreach screen update (minimal scope):** add a real "Queued Leads" panel above the mock campaigns that reads from `outreach_queue` where `state='queued'`. So when you add from Teacher Search you immediately see them appear there. This replaces today's situation where the promoted row vanishes into the void.

### 4. Redesign the action dropdown

The current dropdown is plain `DropdownMenu` items with mixed icon colors and no grouping. Redesigned:

- Grouped into 3 sections with subtle dividers: **View** · **Enrichment** · **Pipeline action**
- Icons all 14px, single neutral color, primary color only on hover
- Destructive "Mark not fit" pulled into its own red-tinted section at the bottom (standard pattern — GitHub, Linear, Vercel)
- Width fixed at 220px, 6px corner radius, soft shadow `0 8px 24px rgba(15,23,42,0.08)`, no harsh border
- Add keyboard shortcut hints on the right (`V`, `E`, `S`, `O`, `N`) — power-user touch Sam will appreciate after a week

I'll generate 3 visual directions for the dropdown via `design--create_directions` so you can pick one before I build.

---

## Out of scope (logged in `LATER.md`)

- Backfilling `grade` / `district` / `experience_years` from Apollo or another provider (needs the enrichment pipeline rebuild)
- Real campaign creation in SmartLead — the "Create new campaign" option will write to `outreach_queue` with `campaign_id=null` and a TODO. SmartLead create-campaign API wiring is its own task.
- Bulk action redesign — current bulk bar stays as-is; the new modal just accepts arrays too.

---

## Technical details (for Lovable / future me)

- One migration: add CHECK on `teacher_prospects.status`, create `outreach_queue` + RLS + `updated_at` trigger.
- `src/pages/TeacherProspects.tsx`: extend the `.select(...)` to include `raw`, map `raw.title → title`, `raw.companyWebsite → schoolUrl`. New handlers `handleShortlist`, `handleEnrich`, replace local `promotedIds` Set with a real query on `outreach_queue`.
- `src/components/teacher-prospects/TeacherTable.tsx`: new columns, new `RowActionsMenu` component extracted for clarity.
- New `src/components/teacher-prospects/AddToCampaignModal.tsx`.
- New `src/components/teacher-prospects/ColumnsMenu.tsx` + localStorage-backed visibility state in `teacherProspectsStore`.
- `src/pages/EmailOutreach.tsx`: add "Queued Leads" panel reading `outreach_queue`.
- `src/components/teacher-prospects/TeacherDetailPanel.tsx`: remove hardcoded fallbacks for grade/years; show "—" when null.
- Update `PROJECT_CONTEXT.md`, `OPEN_TASKS.md`, `HOW_IT_WORKS.md`, `LATER.md` (with explicit "go" from you per AGENTS.md rule #9).

**Order of execution after approval:**

1. Migration (status CHECK + `outreach_queue` table) — ask for migration approval
2. Wire the 5 row actions to real writes
3. Surface `title` + `schoolUrl` + LinkedIn icon in table; fix detail-panel honesty
4. Build `AddToCampaignModal` + "Queued Leads" panel on Email Outreach
5. Redesign dropdown (after you pick a direction from the 3 visual options)
6. Draft doc updates and wait for your "go"
