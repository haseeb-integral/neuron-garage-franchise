## Task 13 — Wire Teacher Search to real data (v1.0 for Sam)

### Guiding rule (your revision)

> "Nothing fake on screen. If it doesn't work in v1.0, hide it. Never name the human source (no 'Danish'). Keep 'Connect SmartLead' style placeholders only where they're honest about what's coming."

Everything below follows this rule.

### Source labels — sanitized for Sam

Never display contributor names. Show provenance as neutral channel labels:

| Internal `enrichment_source` value (DB) | What Sam sees on screen |
|---|---|
| `smartlead_csv` | **SmartLead Enriched** |
| `linkedin_danish` | **LinkedIn Import** |
| (future) `apollo` | **Apollo Enriched** |
| (future) `apify_school_scrape` | **School Directory** |

The DB value stays as-is (don't break existing 11,752 rows). Display mapping lives in one constant: `src/lib/teacherSourceLabels.ts`. Anywhere we render a source — table badge, sidebar breakdown, filter dropdown — goes through this map. No raw DB strings leak to the UI.

### What stays, what gets hidden, what changes (every element on the current screen)

| Element | Decision | Why |
|---|---|---|
| **"Total Prospects" card** | **Keep**, rename to "Total Imported", show real `11,752` + sublabel "across 188 cities" | Real, useful, honest |
| **"Shortlisted" card** | **Hide in v1.0** | Shortlist column doesn't exist yet (Task 15) — fake number today |
| **"Contacted This Week" card** | **Hide in v1.0** | Needs SmartLead send events (Task B6) — fake today |
| **"In Outreach" card** | **Hide in v1.0** | Same — needs SmartLead campaign membership wired (Task B6) |
| → Replacement | **Replace the 4 cards with 3 honest cards**: <br>1. **Total Imported** — 11,752 across 188 cities <br>2. **Email-Ready** — 5,705 (can be sent to SmartLead now) <br>3. **Needs Email Enrichment** — 5,253 (LinkedIn-only) with button "Connect Enrichment Tool" (placeholder, like Connect SmartLead) | All 3 numbers are real from DB today |
| **"Sourcing Insights" sidebar** — Top Sourcing Channels (LinkedIn 41%, Referrals 24%, etc.) | **Replace** with real source breakdown from `enrichment_source` using sanitized labels: SmartLead Enriched 9,825 (84%) · LinkedIn Import 1,927 (16%) | Real + neutral naming |
| **Sidebar "Quick Stats"** — Avg Fit Score 82, Avg Experience 6.2 yrs, Cities 28, Response Rate 36% | Replace with: <br>• Cities: **188** (real) <br>• Email-ready: **5,705** (real) <br>• Avg Fit Score: **"Not scored yet — Run AI Scoring"** placeholder button <br>• Response Rate: **"Connect SmartLead"** placeholder button (your call: retained) | Honest. Two real, two placeholders that telegraph what's coming. |
| **Sidebar "Expand your reach" card** | **Hide in v1.0** | "Manage Channels" goes nowhere — fake CTA |
| **Market Context banner** ("Finding teacher-operators for San Diego, Tier 3, score…") | **Hide in v1.0** unless user lands here via "Find Prospects in this city" from City Search | Pulls from hardcoded `sampleCities`, not real `us_cities_scored`. Defer wiring to a later task. Empty banner is worse than no banner. |
| **Default city filter = "Frisco"** | **Change to "All Cities"** | We have 188 cities now; pinning to Frisco hides 99% of data |
| **Table column "Signals"** (LinkedIn / mail / globe icons always on) | **Hide column in v1.0** — replace with real source badge | Icons today are decorative, not driven by data |
| **Table column "Fit Score"** | **Keep**, but show "—" for all rows + tiny hint "Score with AI" until Task 14 lands | Honest — no fake scores |
| **Table column "Fit Tag" ("Untagged")** | **Hide in v1.0** | Driven by fit score which doesn't exist yet |
| **Table column "Status" ("Enriched")** | **Replace** with real status badge using sanitized source: <br>• **SmartLead · Verified** (green) <br>• **SmartLead · Unverified** (amber) <br>• **SmartLead · No Email** (gray) <br>• **LinkedIn Import** (blue, with subtle "needs email" dot) | Driven by real columns: `enrichment_source` + `verification_status` + `needs_email_enrichment` |
| **Table column "Experience" (years)** | **Hide in v1.0** | Not populated for either source. All show "0 yrs" today = lie |
| **Table filter "All Grades"** | **Hide in v1.0** | Grade column mostly empty in imports |
| **Table filter "Has Camp Experience"** | **Hide in v1.0** | Camp signal logic not yet defined — see LATER.md note below |
| **Table filter "All Fit Tags"** | **Hide in v1.0** | No tags yet |
| **Table filter "All Status"** | **Replace** with "All Sources" dropdown: All / SmartLead Enriched / LinkedIn Import / Needs Email | Drives real value |
| **Pagination** ("Showing 1–6 of 354") | **Fix** — real count, real pages, server-side pagination (25/page) | Currently caps at 1000 rows + lies about total |
| **"Export CSV" button** | **Keep** — works | Honest |
| **"Import CSV" button** | **Keep** — works (built last loop) | Honest |
| **"Find Prospects" button** | **Keep but soften** — rename to "Find via Apify" or move to a "More" menu since the primary input now is CSV import | Still works, just no longer the headline action |

### New screen — ASCII wireframe

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Teacher Search       [Export CSV] [Import CSV] [Find via Apify ▾]     │
│ 11,752 teachers imported across 188 cities                             │
├────────────────────┬───────────────────┬──────────────────────────────┤
│ Total Imported     │ Email-Ready       │ Needs Email Enrichment       │
│ 11,752             │ 5,705             │ 5,253                        │
│ 188 cities         │ can send today    │ [Connect Enrichment Tool]    │
├────────────────────┴───────────────────┴──────────────────────────────┤
│ [Search] [All Cities ▾] [All Sources ▾]                               │
├─────────────────────────────────────────────────┬──────────────────────┤
│ ☐  Name           School / District   Source ★ │ Sources              │
│ ☐  Adra V.        Marin Country Day   [SL ✓]   │ SmartLead Enriched   │
│ ☐  Diana Landry   Gilbert Public      [LI]     │  9,825 ███████  84%  │
│ ☐  Marlease B.    UChicago            [SL ✓]   │ LinkedIn Import      │
│ ☐  Yarilis Ruiz   Temple Univ         [SL ⚠]   │  1,927 █        16%  │
│ ☐  Amanda Milz    Abington Friends    [SL ✉?]  │                      │
│  …                                              │ Quick Stats          │
│ Showing 1–25 of 11,752      ‹ 1 2 3 … 471 ›    │ Cities         188   │
│                                                 │ Email-ready  5,705   │
│                                                 │ Avg Fit Score        │
│                                                 │  — [Run AI Scoring]  │
│                                                 │ Response Rate        │
│                                                 │  — [Connect SmartLead│
└─────────────────────────────────────────────────┴──────────────────────┘

Legend (rendered on screen too):
 [SL ✓]   SmartLead Enriched · email verified
 [SL ⚠]   SmartLead Enriched · email unverified (excluded from campaigns)
 [SL ✉?]  SmartLead Enriched · no email returned
 [LI]     LinkedIn Import · needs email enrichment
```

### MD file updates I will draft (your "remind me later" list)

Per AGENTS.md doc-sync rule, I will draft these and wait for your "go" before writing. Capturing them here so they're not lost:

**`LATER.md` — add 2 entries:**
1. **Camp Experience signal** — How do we determine if a teacher has summer-camp experience? Source options: scrape bio, LinkedIn description keywords (`camp counselor`, `summer program`, `enrichment`), tag at import via custom column, or AI inference at scoring time. Decide with Haseeb. Currently hidden from UI.
2. **Market Context banner** — Wire to real `us_cities_scored` instead of hardcoded `sampleCities`. Only re-show when user enters Teacher Search from a City Search drill-down (`?city=&state=`).

**`OPEN_TASKS.md` — update:**
- Mark Task 13 in progress with this scope
- Note dependencies that **unhide** elements when complete:
  - Task 14 (AI Fit Scoring) → unhides Fit Score values + Fit Tag column + Quick Stats avg
  - Task 15 (Segmentation) → unhides Shortlisted card
  - Task B6 (SmartLead send/reply) → unhides Contacted/Response Rate cards
- Add sub-task: **Apollo enrichment for the 5,253 LinkedIn-only rows** (separate task, not in current sprint)

**`PROJECT_CONTEXT.md` — update:**
- Teacher Search status: "Wired to live `teacher_prospects` (11,752 rows across 188 cities). v1.0 hides metrics that depend on unbuilt tasks (fit scoring, shortlist, send tracking, camp signal). Source names sanitized — no contributor names rendered."

**`GLOSSARY.md` — add:**
- **SmartLead Enriched** — internal label for rows imported from SmartLead's enriched CSV export (`enrichment_source = smartlead_csv`).
- **LinkedIn Import** — internal label for rows imported from LinkedIn-derived CSVs (`enrichment_source = linkedin_danish`). Contributor names are never rendered.

### Visual preview — what happens after you approve this plan

The moment you click approve, I will:
1. Generate **3 rendered HTML prototypes** of the new screen (you'll click to pick one)
2. Variants:
   - **A — Surgical:** keep your current shell, just hide/swap elements per the table above
   - **B — Funnel-first:** replace the 3 cards with a horizontal funnel ribbon (Imported → Email-Ready → Verified → Scored → In Outreach) — makes the "what's working / what's not yet" story visual
   - **C — Health dashboard:** keep the 3 cards but add a one-row "Data Health" strip above the table (verified % · enrichment-needed % · scored %) with progress bars
3. After you pick one, I implement that direction. No code is written until you pick.

### Files that will change

- `src/pages/TeacherProspects.tsx` — hide dummy cards, swap sidebar, default city = "All", remove `sampleCities` market banner for the no-context path
- `src/components/teacher-prospects/TeacherTable.tsx` — drop Experience / Signals / Fit Tag columns, add Source badge, real pagination
- `src/components/teacher-prospects/TeacherFilterBar.tsx` — drop Grades / Camp / FitTags / Status, add "All Sources"
- `src/stores/teacherProspectsStore.ts` — replace `tagFilter` / `gradeFilter` / `enrichmentFilter` / `campOnly` with `sourceFilter`. Bump persist version to `2` so old localStorage doesn't poison the new shape.
- **New** `src/lib/teacherSourceLabels.ts` — single source of truth for sanitized labels
- **New** `src/components/teacher-prospects/SourceBadge.tsx`
- `src/data/teacherData.ts` — delete `sampleTeachers` constant, keep `TeacherProspect` type

No DB migration needed.

### Risk

Low. Pure presentation changes against an already-wired table. Only behavior change: real pagination (positive) and source-filter replaces 4 filters most of which were no-ops.