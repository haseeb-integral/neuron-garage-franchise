# MAY15_MEETING_NOTES.md — Neuron Garage

> Date: May 15, 2026
> Attendees: Kaylie Reed, Sam Reed, Haseeb
> Status: SOURCE OF TRUTH — these decisions override all earlier docs
> Written up: May 18, 2026

---

## Why This Meeting Happened

The May 8 sprint had wired City Search to live API calls per city. Running a national ranked list was taking 5+ minutes. This meeting was called to review what was built, identify the blocker, and reset the architecture before continuing.

---

## Decision 1: Database-First Architecture (Critical)

**Problem identified:** City Search was fetching live data per city on each request. At ~5 minutes per city, a national ranked list of 800+ cities is impossible in real time.

**Decision:** Move to a pre-built database layer. Two Supabase tables — `us_cities_scored` and `teacher_prospects_master` — are seeded in advance and refreshed on a schedule. The app reads from these tables instantly. No live API calls at query time.

**Why this matters:** This is not just a performance fix. These tables become Neuron Garage's owned business assets — a scored city database and a teacher recruiting database — that compound in value over time.

**Deadline set:** Tuesday May 20, 2026.

**Full technical spec:** See `DATABASE_LAYER_SPEC.md`.

---

## Decision 2: Teacher Search Scope Confirmed

Kaylie confirmed the target teacher segments for the recruiting database:

1. **Active elementary school teachers (K–6)** — primary target. Available in summer (June–August = camp season). Direct age-group match.
2. **Retired elementary school teachers** — Kaylie's specific addition. 100% summer available. Deep experience. High director-role credibility.
3. **Summer camp / enrichment educators** — added May 18. Already proven in camp environments. Lowest learning curve.

> Scope note: This is the confirmed starting point. Kaylie/Sam may expand or reduce this list as strategy evolves.

**Full profile and fit scoring criteria:** See `TEACHER_IDEAL_PROFILE.md`.

---

## Decision 3: "Teacher Prospects" Renamed to "Teacher Search"

All UI labels updated from "Teacher Prospects" to "Teacher Search" — sidebar nav, page header, journey bar, dashboard tile, global search, onboarding tour.

---

## Decision 4: City Search Problem — Root Cause Confirmed

The Dallas-Fort Worth metro label bug was fixed in the earlier sprint. The remaining City Search problem is purely the database layer — once `us_cities_scored` is seeded, City Search returns the full ranked national list instantly with no further changes needed to the UI.

---

## Decision 5: Open Questions from This Meeting

### Teacher sourcing — decision needed from Brett
How do we seed `teacher_prospects_master`? Options:
- **Option A:** Apollo bulk export (already have access)
- **Option B:** Purchased vendor list (Exact Data, LeadsPlease, K12 Prospects — ~$500–2,000)
- **Option C:** Apify school staff directory scraping (targeted, slow)
- **Option D:** DonorsChoose API (free, strong fit-signal layer)
- **Recommended:** Combination of A + B + D

Brett must decide before `seed-teachers-database` edge function is built.

### GreatSchools API — waiting on Brett's key
Needed for private + charter elementary school counts in city scoring. Brett to sign up at https://www.greatschools.org/api (free 14-day trial, then $52.50/mo). Add key to Lovable env as `GREATSCHOOLS_API_KEY`.

### Apollo vs Clay — open
Clay is the most capable enrichment tool but adds integration complexity. Decision: start with Apollo for teacher seeding, evaluate Clay only if Apollo email coverage is below 40%.

---

## Sprint Reset After This Meeting

| Priority | Task | Status |
|---|---|---|
| #0 — BLOCKER | Database layer: seed `us_cities_scored` + `teacher_prospects_master` | 🔴 Not started |
| #1 | City Search: wire to `us_cities_scored` (instant ranked list) | Blocked by #0 |
| #2 | Teacher Search: wire to `teacher_prospects_master` | Blocked by #0 |
| #3 | Email Outreach: SmartLead integration | Not blocked |
| #4 | Candidate Pipeline: wire real data | Not blocked |

---

## What Was Already Shipped (Before This Meeting)

- ✅ Dallas-Fort Worth metro label bug fixed
- ✅ "Add to Watch List" renamed to "Add to Favorites" + working favorites list
- ✅ Master category slider cap removed + auto-rebalance to 100%
- ✅ Sub-weight drawer system (editable, running total, auto-normalizes on Apply)
- ✅ Score explanation panel (verdict label + plain-English reason)
- ✅ "Show Formula" button (raw/norm/share/contrib table, column tooltips, score-delta toast)
- ✅ Export City Search to CSV (full ranked table + per-city raw signals)
- ✅ Save Search (saved configurations persisted in `saved_searches` table)
- ✅ NCES CCD API wired (public elementary school count — 48/50 cities matched)
- ✅ "Teacher Prospects" renamed to "Teacher Search" across all UI

---

## Decisions That Did NOT Change From May 8

- Build order: City Search → Teacher Search → Email Outreach → Candidate Pipeline
- SmartLead = email outreach platform ("Integral Leads")
- Show the math: every calculated number must have a visible formula
- Auth: email/password only, no SSO
- 3 users max (Kaylie, Sam, Haseeb)
- Left sidebar layout locked (5 items)
- Scoring engine math changes go through Sam only
