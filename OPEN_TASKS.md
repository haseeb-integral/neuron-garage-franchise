# Open Tasks — Neuron Garage (3-day sprint)

> Last reviewed: May 12, 2026.
> All four features ship in this sprint. No deferrals to Phase 2 except
> explicitly listed at the bottom.

---

## 📋 CHANGELOG — Read This First (Claude Code: start here)

### May 12, 2026 — Changes made via Perplexity (Sonnet 4.6) while Claude Code limit was hit

**Context:** Haseeb hit Claude Code usage limit mid-session and switched to Perplexity AI (Sonnet 4.6) to continue. Perplexity created GitHub branches, reviewed diffs, and instructed Lovable via prompts. All changes are merged to `main`.

#### What was investigated
- Diagnosed that `Metro Area`, `County`, and `Market Type` labels in the City Search detail panel were hardcoded strings (`"Dallas-Fort Worth, TX"`, `"Collin County"`, `"Suburb"`) on lines 866, 942, 947, 951 of `src/pages/CityScoring.tsx` — left over from static mockup, never wired to data.
- Confirmed `cities.metro_area` and `cities.county` are NULL for every DB row.
- Confirmed `RankedMarket` type in `cityScoringLiveData.ts` already has `metroArea` field but sample data has no values.

#### Changes merged to main (in order)

**PR #5 — `fix/metro-county-labels`** ✅ merged
- File: `src/pages/CityScoring.tsx`
- Replaced 4 hardcoded strings with live DB bindings:
  - Metro Area: `liveCity?.metro_area ?? selected.metroArea ?? "—"`
  - County: `liveCity?.county ?? "—"`
  - Market Type: `liveCity?.market_type ?? population-derived fallback`
  - Ranked list county subtitle: `(c as any).county ?? ""`
- Effect: cities show "—" until DB has data (honest, not broken)

**PR #6 — `feat/city-geo-lookup`** ✅ merged
- New file: `supabase/functions/_shared/cityGeo.ts`
  - Hardcoded lookup map: 50 franchise-target cities → `{ metroArea, county, marketType }`
  - Key format: `"city lowercase|state lowercase"` (e.g. `"frisco|texas"`)
  - Logs `console.warn` for unmapped cities
- Updated: `supabase/functions/fetch-city-market-data/index.ts`
  - Imports `lookupCityGeo`
  - Adds `metro_area`, `county`, `market_type` to the `cities` upsert block
  - Effect: hitting Refresh Data on any city permanently writes geo fields to DB

#### Post-merge actions done in Lovable (not in GitHub)

1. **Edge function redeployed** — Lovable deployed updated `fetch-city-market-data` to Supabase Cloud (was showing "4 days ago" before)
2. **SQL backfill ran** — Lovable ran a one-shot SQL migration populating `metro_area`, `county`, `market_type` for all cities currently in `cities` table (4 rows at time of run: Frisco, Plano, Ashburn, The Woodlands)
3. **UI fallback chain updated** — Lovable updated `CityScoring.tsx` fallback so ranked list query (which does `select("*")`) provides metro/county on click without requiring Refresh Data. `loadLiveRankedMarkets` already did `select("*")` so no change needed in `cityScoringLiveData.ts`.

#### Side effect discovered (IN PROGRESS — not yet fixed)
- After backfilling 110+ cities with geo-only data (NULL scores, NULL population), the dedupe logic in `cityScoringLiveData.ts` → `dedupeRankedMarkets()` started preferring live rows over sample rows unconditionally.
- Result: 110 zero-score live rows replaced sample rows → got filtered out by Min Population 25k+ and Min Score 35 filters → ranked list collapsed from ~30 cities to 6.
- **Fix approved, Lovable implementing now:**
  - Live row wins over sample ONLY IF `composite_score > 0` OR `population > 0` OR `lastScrapedAt` is set
  - If live row is geo-only stub → keep sample scores/population but copy `metroArea`, `county`, `marketType` onto sample row
  - If only a live stub exists (no sample twin) → show it anyway (score 0, filterable)
  - Single file change: `src/lib/cityScoringLiveData.ts`, function `dedupeRankedMarkets()`

---

## ✅ Completed — Day 1

~~**Task 1: Fix "Dallas-Fort Worth" metro label bug**~~ ✅ May 12
- Root cause: hardcoded literals on 4 lines in `CityScoring.tsx`
- Fix: PR #5 (UI binding) + PR #6 (edge function geo lookup) + SQL backfill
- Verify: click Frisco TX → Metro Area shows "Dallas-Fort Worth", County shows "Collin"
- **Known gap:** dedupe regression being fixed (see IN PROGRESS above)

---

## ⚡ Day 1 — City Search (remaining)

### NEXT: Verify dedupe fix is working
- After Lovable deploys the `dedupeRankedMarkets()` fix, ranked list should return to ~30 cities
- Spot-check: Frisco, Austin, Ashburn, Sugar Land — all should show Metro Area/County immediately on click
- If still blank after fix: check Supabase → cities table → confirm `metro_area` column has values

### 2. Rename "Add to Watch List" → "Add to Favorites"
- Build a working favorites list (currently button has no real backing)
- Day 1 scope: single default favorites list — Add/Remove/View must work
- Multiple named lists with drop-down → moved to Day 2 if Day 1 runs over
- **Risk:** low for rename; medium for the working list (needs a data store)

### 3. Remove 50% cap on master category sliders
- Allow each slider 0–100%
- When one moves, others auto-rebalance so total stays at 100%
- **Risk:** medium — auto-rebalance must be smooth, not jumpy
- **Verify by:** move one slider to 0%, others should sum to 100%; move one to
  100%, others should sum to 0%

### 4. Sub-weight flip-card system
- Click any of the 6 category cards → card flips
- Back of card shows each sub-metric with:
  - Sub-metric name
  - Editable weight (number input, NOT slider)
  - Source data label / link
  - Running total of sub-weights for that category
- NO auto-rebalance for sub-weights — manual entry (Sam's request)
- Front of card keeps the master weight visible at a glance
- **Risk:** medium-high — most complex UI change of Day 1
- **Verify by:** flip card, change weights, total updates correctly, save persists

### 5. Score explanation panel under each city score
- Verdict label (e.g., "Strong Fit")
- Plain-English reason (e.g., "High demand and low competition drove this score")
- Percentile rank (e.g., "Top 5% of scored cities")
- **Risk:** low-medium — verdict logic needs defining

### 6. "Show Formula" button on widgets
- Card flips → reveals weights, source data, and the actual formula
- Sam's hard QA requirement
- **Risk:** medium

### 7. Export City Search to Google Sheets / CSV
- For each ranked city: master scores, sub-scores, weights, formulas
- Lets Sam verify math externally
- **Risk:** low

### 8. Save Search (saved configurations)
- Save full scoring config (master + sub weights) by name
- Recall later — repopulates all weights
- **Risk:** medium — needs persistent storage

### 9. Multiple named favorites lists (if time)
- Drop-down on "Add to Favorites" → pick list
- Create / rename / delete lists; move cities between lists
- **Risk:** low-medium
- **If Day 1 is full → push to Day 2 morning**

---

## ⚡ Day 2 — Teacher Prospects (Firecrawl)

### 10. Wire Feature 2 to Firecrawl
- Firecrawl is already connected to Lovable — just call it
- From a scored city, "Find Prospects" runs a Firecrawl search for elementary
  teachers there
- Pull: name, school, city/state, email, phone, LinkedIn (where available)
- Store in prospect table linked to source city
- **Risk:** medium-high — first time wiring this feature to real data

### 11. Prospect list view + filters
- Columns: name, school, city/state, email (when available), fit score
- Filters: city, school, grade level, years of experience, enrichment status
- **Risk:** medium

### 12. AI fit scoring (1–100)
- Lightweight AI reviews each prospect's profile, scores 1–100 with reasoning
- Heavily weight prior summer camp or youth camp experience (per SOW)
- Use Lovable's built-in AI — no separate API
- **Risk:** medium — needs a defined prompt and scoring rubric

### 13. Prospect segmentation / tagged lists
- Tag prospects into named lists ("High Potential Austin", "Follow-Up Needed", "Not a Fit")
- Export to CSV
- **Risk:** low-medium

---

## ⚡ Day 3 — Email Outreach + Candidate Pipeline

### 14. SmartLead integration (Feature 3 / Email Outreach)
- Wire SmartLead ("Integral Leads") into the app
- Connect to prospect list from Feature 2
- AI personalizes each email using enriched data (school, district, role, experience)
- Send a small test batch first before any real send
- **Risk:** high — external API, real emails go out, easy to mess up
- **Verify by:** send 1 test email to yourself before any real sends

### 15. Prospect → Lead conversion
- When a prospect responds via SmartLead, they convert to "lead" and enter
  Candidate Pipeline (Feature 4) at "New Lead" stage
- **Risk:** medium — needs webhook or polling

### 16. Candidate Pipeline (Feature 4) — real data wiring
- Replace dummy candidates with real leads from Email Outreach
- Existing drag-and-drop confirmation gate stays as-is
- **Risk:** medium

### 17. PDF export of candidate lead sheet
- Kaylie's ask from May 8
- Per-candidate PDF with all card details
- **Risk:** low-medium

---

## 🚧 Realistic risk: this sprint is aggressive

Honest read for Haseeb: 3 days to wire 3 features end-to-end (Days 2 and 3
each contain things that normally take days alone). Pre-sprint, raise with
Brett:

- **Day 2 alone could spill** depending on Firecrawl response shape and AI
  scoring complexity.
- **SmartLead integration on Day 3 is a high-risk new external API.**
- **Sam's QA bar is high.** A buggy fully-wired app is worse than a fully-
  working City Search.

**Recommendation to negotiate:** if pressure mounts, the safe fallback is
"City Search 100% done + Teacher Prospects partially wired" rather than
"all 4 features wired but Sam finds bugs everywhere." Sam values working
math over feature count.

---

## 🛑 Explicitly out of scope this sprint

- Google / Microsoft / SSO login (intentionally removed)
- Multi-tenancy / public version
- Onboarding flow (Phase 2)
- Mobile app
- "Ask AI" sparkle button (nice to have, defer)
- PDF report generation for City Search (separate from candidate PDF)
- Module 2 migration to Cursor + VS Code
- Anything not on this list — write it in a `LATER.md` file, don't build it

---

## How to use this file

- Review at the start of each day and after every client touchpoint
- Strike through completed items with `~~text~~ ✅ <date>` — keep history
- If priorities shift, move items between days but don't delete them silently
- If something new comes up mid-sprint, ask: does this block the sprint?
  If no → add to `LATER.md` (create if it doesn't exist)
