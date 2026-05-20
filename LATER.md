# LATER.md — Out of Sprint, Not Forgotten

Things that came up during the sprint but don't block the demo. Review after Day 3 with Brett and Sam.

---

## Task 9 — Multiple Named Favorites Lists

**What it is:** Drop-down on "Add to Favorites" to pick which list to add a city to. Create / rename / delete lists. Move cities between lists.

**Current state:** Single flat watchlist per user. `watchlist_items` table has no `list_id` column. One user = one bucket.

**What it takes to build:**
- New table `watchlist_lists` (id, user_id, name, created_at)
- Add `list_id uuid` FK to `watchlist_items`, drop single-list assumption
- UI: split button or dropdown on bookmark icon
- "Manage Lists" modal: create / rename / delete + move city action
- **Risk:** low-medium

**Why deferred:** Low demo priority. Day 2–3 are packed with Teacher Search and Email Outreach. Sam values working math over feature count.

---

## Prompt A — "NEW DEMAND METRIC" audit (paste into Lovable after Day 5 confirmed)

Before moving on: what is the "NEW DEMAND METRIC" custom metric showing
"Neutral 50" in the Frisco drawer? Is the value 50 hardcoded, calculated,
or a placeholder? Show me the code in sowMetricRegistry.ts and the SOW writer.
Do not change anything. Just show me the code.

---

## Prompt B — Firecrawl pricing URL fix (paste into Lovable after Prompt A answered)

Fix Firecrawl URL sourcing for pricing metrics — the 5 competitor URLs are
Google Maps listings with no inline pricing. Use Firecrawl search or map to
find actual camp website pricing pages before scraping. Target URLs containing:
/pricing /tuition /rates /register /summer-camp. Cap still 5 URLs. If no pricing
URLs found, keep status: 'missing'. Do not change regex or missing-not-null logic.
Deploy → refresh Frisco → report new Live count. Wait for my confirm.

---

## Day 6–8 Remaining Metrics Plan (City Search)

**Status as of Day 5:** 25 Live / 8 Estimated / 11 Missing / 2 Blocked

### Day 6 — Cheap wins, no new keys (target: 11 → ~6 missing)

Sources already wired, just not written as metrics:

- `households_with_children_under_13` — Census B11003/B23008 (already in Census call)
- `dual_income_household_pct` — Census B23007 (already pulled)
- `young_family_growth_rate` — ACS 5-yr vs 1-yr delta on under-18 pop (Census, already keyed)
- `commute_sprawl_index` — Census B08303 long-commute % (already pulled)
- `national_brand_presence` — derive from existing Apify Google Maps competitor pull (count Goldfish/Primrose/KinderCare hits)

### Day 7 — Requires one new key (target: 6 → ~3 missing)

- `private_school_count`, `montessori_school_density`, `student_teacher_ratio_elementary` — needs GreatSchools API key (Task 11 in OPEN_TASKS)
- `private_charter_montessori_teacher_count` — same key
- `waitlist_sold_out_signal_count` — Firecrawl scrape of competitor pages for "waitlist"/"sold out" strings

### Day 8 — Permanently blocked or manual

- 2 Blocked stay blocked (no public source exists — documented as such)
- Remaining → manual-entry fields with "Source unknown" badge

---

## teacher_prospects Migration (completed Day 5 sprint)

Migration applied. Schema:

```sql
CREATE TABLE public.teacher_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  school_name text,
  district text,
  teacher_name text,
  email text,
  phone text,
  years_experience integer,
  grade_level text,
  subjects text[],
  fit_score integer,
  fit_tag text,
  enrichment_status text DEFAULT 'Pending',
  source_channel text,
  has_camp_experience boolean DEFAULT false,
  apify_run_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: authenticated users can SELECT / INSERT / UPDATE. No DELETE policy.
Reuses existing `update_updated_at_column()` trigger.
No frontend code touched. Types regenerate automatically post-migration.

---

## Teacher Search — Upgrade to Agenscrape Actor (after Firecrawl pipeline validated)

**What it is:** Replace/supplement the Firecrawl staff-page scraper with the Apify actor `agenscrape/us-schools-coaching-staff` as the primary source for individual teacher names + emails.

**Why deferred:** Agenscrape is pay-per-result (~$0.01–0.05 per teacher row). During the sprint we use `jungle_synthesizer` (school list) + Firecrawl (staff pages) which costs nothing extra. Once the pipeline is validated and Kaylie has seen real data, upgrade to Agenscrape for higher coverage and reliability.

**What it takes to build:**
- In `fetch-teacher-prospects` edge function: add `agenscrape~us-schools-coaching-staff` as primary actor
- Input shape: `{ state: "TX", city: "Frisco" }` — accepts city directly, no FIPS conversion needed
- Field mapping: `name`, `email`, `phone`, `title` → `grade` (when title contains "Grade"/"Teacher"), `school_name` → `school`
- Keep email-based upsert logic (unchanged)
- Keep Firecrawl `enrich-school-staff` function as fallback for schools Agenscrape misses
- Estimated Apify cost: ~$1–5 per 100-teacher run

**Decision to make at that point:** Run Agenscrape first, then Firecrawl fills gaps (Option 3 from Lovable Day 6 plan) — highest coverage, modest cost.

**Risk:** Low — additive change, Firecrawl fallback stays in place.

### Known Firecrawl limitations that Agenscrape solves

These are confirmed risks from the Day 6 Firecrawl implementation (Lovable’s own assessment):

| Risk | Impact | Agenscrape fix? |
|------|--------|-----------------|
| ~40–60% of school sites have no scrapeable staff page (PDFs, gated portals) | Up to 60% of schools return 0 teachers | ✅ Yes — Agenscrape pulls from a pre-built 800K-staff database, not live sites |
| Name extraction is heuristic regex — ~10–15% of rows have wrong/garbled names | Dirty data in `teacher_name` field | ✅ Yes — structured database records, not parsed HTML |
| Email is the only trustworthy field from Firecrawl | Can’t rely on name for outreach personalization | ✅ Yes — name + email both reliable |
| Total runtime ~3–4 min per city (90s Apify + 3 min Firecrawl at concurrency 5) | Slow UX even with progress toast | ✅ Partial — Agenscrape direct query is faster, no crawl wait |
| k12.state.us email regex may miss some district email formats (e.g. `@friscoisd.org`) | Some real emails dropped | ✅ Yes — pre-enriched database has verified emails |

**When to pull the trigger:** After first successful Frisco TX run with Firecrawl — check the `teacher_prospects` table. If fewer than 30 teachers inserted for 42 schools, Agenscrape upgrade is justified immediately.

---

## Google Trends — `search_interest_stem_education` + `search_interest_kids_camps` (parked May 18)

**What it is:** 2 low-weight soft-signal metrics measuring relative search interest by metro for STEM education + kids camps.

**Why parked:**
- Google Trends has no official API. `pytrends` (unofficial) gets aggressively rate-limited from server IPs — unusable from edge functions.
- Running pytrends from a local machine works but requires Python + pip + Terminal + manual weekly runs. Not viable for Haseeb (non-technical).
- Manual download via trends.google.com is 5 min/city × 960 cities = not viable.

**Backup plan if Brett insists:** Wikipedia Pageviews API (free, no key, server-friendly) on pages like "Science, technology, engineering, and mathematics" + "Summer camp" — same signal shape, different source.

**Decision:** Do nothing pre-PMF. Revisit if Sam upweights these in scoring.

---

## Email Outreach — deferred polish (added May 19)

Not built; not blocking the demo. Promote to OPEN_TASKS only if Kaylie hits the need in real use.

- **Reply-intent manual override button** — let a user re-tag a reply the classifier got wrong. Needs real reply volume first.
- **Suppression list viewer** — show who's unsubscribed / bounced / complained so they're never contacted again. Needs bounces and unsubscribes to start accumulating before it has data to show.
- **Save campaign as template** — reuse send-time settings, tracking flags, schedule across campaigns. Premature until 3+ campaigns exist.
- **"Suggest next campaign" AI** — looks at hot leads and winning subject lines, proposes next batch. Needs winning-subject-line history.
- **Daily send cap UI** — hard ceiling per mailbox per day. SmartLead already enforces per-mailbox warmup ramp, so this is belt-and-suspenders. Add only if Kaylie explicitly wants the extra guardrail.
- **Add `{{unsubscribe}}` merge tag to default sequence body (was Task 17f)** — deferred May 19 per Haseeb for self-inbox smoke tests. **Must be promoted back to OPEN_TASKS and shipped before the first real teacher send** — CAN-SPAM legal requirement and Gmail/Outlook deliverability tank without it. ~5 min edit in `NewCampaignDrawer.tsx`.

---

## How to use this file

- Add items here instead of building them mid-sprint
- Review with Brett after the sprint — promote to OPEN_TASKS.md if prioritized
- Don't delete entries — they're a decision log


---

## Hidden on Teacher Search (May 20, Variant A — Surgical)

Task 13 shipped a cleaned-up `/teacher-prospects` page. The following UI was intentionally **hidden or stubbed** to avoid showing fake numbers. Restore each item when its blocking task lands. **Remind me of this list when those tasks come up.**

| Hidden element | Where | Why hidden | Restore when |
|---|---|---|---|
| **Fit Score column values** | `TeacherTable.tsx` | No scoring engine yet; column shows "—" | Task 14 (AI fit scoring) |
| **Avg Fit Score** Quick Stat | `TeacherProspects.tsx` sidebar | Same | Task 14 |
| **Response Rate** Quick Stat | `TeacherProspects.tsx` sidebar | No SmartLead reply data joined yet | Task B6 (SmartLead send/reply tracking) |
| **Shortlisted column / star** | `TeacherTable.tsx` | Feature not built | Task 15 (segmentation / tagged lists) |
| **Experience column** | `TeacherTable.tsx` | v1.0 dummy field, no real data source | Optional — only if Apollo/enrichment returns years_experience |
| **Signals column** (DonorsChoose, etc.) | `TeacherTable.tsx` | No signals pipeline | LATER: DonorsChoose wiring + camp signal |
| **Fit Tag column** | `TeacherTable.tsx` | Depends on Fit Score | Task 14 + Task 15 |
| **Grade-level filter** | `TeacherFilterBar.tsx` | No grade data on `teacher_prospects` rows | When teacher_prospects_master (B1) ships with grade field |
| **Camp Experience filter** | `TeacherFilterBar.tsx` | No camp signal yet | LATER: camp signal logic |
| **Fit Tags filter** | `TeacherFilterBar.tsx` | Depends on Fit Score | Task 14 + 15 |
| **Status filter** (old) | `TeacherFilterBar.tsx` | Replaced by Source filter | N/A — superseded |
| **"Expand your reach" card** | `TeacherProspects.tsx` | Marketing fluff, no real action | Optional — restore if/when a real action exists |
| **Market Context banner** | `TeacherProspects.tsx` | Not wired to `us_cities_scored` | LATER: Market Context wiring (depends on `?city=&state=` query params) |
| **Sourcing Insights (LinkedIn/Referrals %)** | `TeacherProspects.tsx` | Numbers were placeholders | Replaced by live `enrichment_source` breakdown — do not restore |

**Apollo enrichment for 5,253 LinkedIn-only rows** is a separate task (not in OPEN_TASKS yet) — flag when sourcing decision lands.

**Pagination behavior change:** previously the table silently capped at the Supabase 1000-row default. Now it fetches up to 20,000 rows and paginates client-side at 25/page. If row count grows past ~25k, switch to true server-side `.range()` pagination.

**Files touched:**
- created `src/components/teacher-prospects/SourceBadge.tsx`
- created `src/lib/teacherSourceLabels.ts`
- edited `src/components/teacher-prospects/TeacherFilterBar.tsx`
- edited `src/components/teacher-prospects/TeacherTable.tsx`
- edited `src/pages/TeacherProspects.tsx`
- edited `src/stores/teacherProspectsStore.ts`
- edited `src/data/teacherData.ts` (removed `sampleTeachers`)
