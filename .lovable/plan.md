

## Teacher Prospects Page Plan

Build a feature-rich Teacher Prospects page following the established City Scoring page pattern.

### Files to Create

**Data Layer**
- `src/data/teacherData.ts` — `TeacherProspect` interface + 12 sample prospects across Frisco, Plano, Coral Springs (linked to existing city IDs). Fields: id, cityId, name, school, city, state, email, phone, linkedin, fitScore, tag, enrichmentStatus, gradeLevel, yearsExperience, hasSummerCampExp, aiReasoning, tags[], notes.

**Components (`src/components/teacher-prospects/`)**
- `FindProspectsModal.tsx` — Dialog with city dropdown (sourced from `sampleCities`), "Run Search" button → 1.5s spinner → injects 5 new prospects for selected city into state.
- `TeacherFilterBar.tsx` — City, Tag, Grade Level dropdowns + Summer Camp checkbox + Enrichment Status filter.
- `TeacherTable.tsx` — Sortable table with all 10 columns, row click opens detail panel, checkbox bulk select.
- `FitScoreBadge.tsx` — Color-coded badge (80+ green, 50–79 gold, <50 red).
- `TagBadge.tsx` — Pill badge (High Potential/Follow-Up/Not a Fit).
- `TeacherDetailPanel.tsx` — 450px right `Sheet` with full profile, AI reasoning, editable tags, notes textarea, Promote/Mark Not a Fit buttons.
- `BulkActionBar.tsx` — Sticky bar shown when rows selected: Export CSV, Add Tag, Promote Selected.
- `OutreachIntelligence.tsx` — Two cards: Local Events (3 items) + Suggested Channels (4 items).

**Page**
- `src/pages/TeacherProspects.tsx` — Replace placeholder. Manages prospect state, filters, selection, modal/panel open state.

### Design Tokens
- Page bg `#f2f4f6`, cards white with `#dee2e6` border
- Header text `#003c7e`, primary button `#fd7e14`
- Email masking: `j••••@school.edu` if present
- LinkedIn: `Linkedin` icon from lucide as link
- Enrichment: `CheckCircle2` (green) for Enriched, `Clock` (grey) for Pending

### Layout Structure
```text
┌─ Header: "Teacher Prospects" + [Find Prospects] (orange) ─┐
├─ Filter Bar (white card)                                   ┤
├─ Bulk Action Bar (conditional, appears on selection)       ┤
├─ Teacher Table (white card, 12 rows initially)             ┤
└─ Outreach Intelligence (2-col grid of cards)              ─┘
```

### Sample Data Distribution
- 4 prospects in Frisco, TX (cityId: 1)
- 4 prospects in Plano, TX (cityId: 2)
- 4 prospects in Coral Springs, FL (cityId: 3)
- Mixed fit scores (range 35–95), varied tags, enrichment status, grade levels (K–2, 3–5, 6–8)

### Interactions
- Find Prospects modal → spinner → 5 new rows prepended for chosen city
- Row click → slide-over panel with full details
- Checkbox selection → bulk action bar slides in at top
- All filters operate via `useMemo` filtering pipeline

