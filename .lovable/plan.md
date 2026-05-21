
# Teacher Search — 5-part UI upgrade

Goal: turn the current "filter bar + table" page into an operational cockpit: bridge from City Search, show funnel progress, suggest next moves, deepen bulk actions, and add an AI co-pilot. The existing `TeacherTable` and filter bar stay where they are — everything is added **above and to the right** of them.

## New layout

```text
┌─────────────────────────────── Page Header ───────────────────────────────┐
│  [1] City Search Rail  (horizontal scroll tiles)                          │
│  ┌──────────────────────────┐  ┌──────────────────────────┐               │
│  │ [2] Funnel Widget        │  │ [3] Next Best Action     │   ┌────────┐  │
│  │ Found→Enriched→Scored→…  │  │  3 suggestion cards      │   │        │  │
│  └──────────────────────────┘  └──────────────────────────┘   │ [5]    │  │
│                                                                │  AI    │  │
│  Market Context Banner (existing, kept)                        │ Assist │  │
│  Filter Bar (existing, kept)                                   │ panel  │  │
│  [4] Sticky Bulk Dock (when selection > 0)                     │        │  │
│  TeacherTable (existing, kept)                                 └────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

The AI panel is a collapsible right rail — full width on mobile, 360px drawer on desktop, toggled by a floating "Ask AI" button so the page still works at 440px.

---

## Part 1 — City Search rail

**Component:** `src/components/teacher-prospects/CitySearchRail.tsx`

Horizontal scrollable strip above the funnel. Each tile = one city:
- City, ST · Tier badge · composite score
- Teachers in DB count · enriched % · in-outreach count
- Click → sets `cityFilters = [city]` and scrolls to table
- "+" tile at the end → opens existing multi-select popover

**Source of cities (priority order):**
1. Cities currently in `cityFilters` (always visible)
2. User's `watchlist_items` (join `us_cities_scored`)
3. Top 5 Tier-A cities by `composite_score_default` that already have rows in `teacher_prospects`

**Data:** one new RPC `teacher_search_city_rail()` returning `{city, state, tier, composite, total, enriched, in_outreach}` per city. Aggregates `teacher_prospects` grouped by `(city, state)` + joins `us_cities_scored`.

---

## Part 2 — Funnel widget

**Component:** `src/components/teacher-prospects/FunnelWidget.tsx`

5 stacked horizontal bars respecting the SOW ("find → enrich → score → outreach → reply"):

```text
Found      ████████████████████  3,400
Enriched   ██████████             812  (24%)
Scored     ██████                 412  (51%)
In Outreach ███                    89  (22%)
Replied    █                       12  (13%)
```

- Counts respect the **current filter set** (city/state/source/search) so the funnel narrates the filtered cohort, not global totals.
- Click any bar → applies a saved scope:
  - Found = no extra filter
  - Enriched = `verification_status is not null`
  - Scored = `fit_score is not null`
  - In Outreach = exists in `outreach_queue`
  - Replied = exists in `smartlead_events` where `event_type='reply'` for that email
- "Show formula" popover per Rule #1 of AGENTS.md (show the SQL predicate in plain English).

**Data:** new RPC `teacher_funnel_counts(p_cities text[], p_states text[], p_search text)` returning the 5 counts.

---

## Part 3 — Next Best Action strip

**Component:** `src/components/teacher-prospects/NextBestActionStrip.tsx`

3 small cards generated client-side from the funnel + filter state. Examples:
- **"42 unenriched teachers in your Tier-A cities"** → button: "Enrich now" (calls existing `enrich-school-staff` in batch)
- **"8 high-fit teachers not in any campaign"** → button: "Add to outreach" (opens `AddToCampaignModal` pre-selected)
- **"3 schools have 4+ promising teachers"** → button: "View as school clusters" (sets group-by; placeholder if #5 group-by isn't built yet — degrade to filter)

Rules are simple thresholds in `src/lib/teacherNextActions.ts` — no ML, no edge function. Each card has dismiss (×) that persists in localStorage for 24h.

---

## Part 4 — Beefed-up Bulk Dock

**File:** edit `src/components/teacher-prospects/BulkActionBar.tsx`

Add to existing dock (keep Export, Add Tag, Add to Outreach, Clear):
- **Promote to Candidate ▾** — inserts rows into `candidates` (stage = `new_lead`, links `prospect_id`)
- **Enrich missing emails (N)** — N = count of selected with `needs_email_enrichment=true`; button hidden if N=0; calls `enrich-school-staff` in batches of 5
- **Status ▾** — set `status` to `shortlisted` / `in_outreach` / `not_fit`
- Make sticky at **bottom** (currently top) so it doesn't fight with the new top widgets. Slide-up animation.

---

## Part 5 — AI assistant right rail

**Component:** `src/components/teacher-prospects/TeacherAiPanel.tsx`
**Edge function:** new `supabase/functions/teacher-search-ai/index.ts`

- Collapsible right drawer, toggled by floating `Sparkles` button bottom-right (440px viewport: full-screen sheet).
- Single-conversation, **localStorage** persistence (matches the chat-agent-ui contract — internal tool, no thread management needed). Per AGENTS.md "explain *why* not just *how*": this is a co-pilot, not a CRM.
- Uses **AI Elements** (`conversation`, `message`, `prompt-input`, `shimmer`) — install with `bun x ai-elements@latest add conversation message prompt-input shimmer`.
- Logo: reuse the existing app brand mark (not `Sparkles` as identity — only as toggle button icon).
- System prompt grounds on: current `cityFilters`, current funnel counts, top 50 rows of current result set (name, school, city, fit_score, status). Sent as compact JSON in the system message.
- Sample prompt chips above the composer:
  - "Top 10 in current filter with verified email"
  - "Which schools have 3+ promising teachers?"
  - "Draft an outreach angle for {selected teacher}"
  - "Why is this city's fit score low?"
- Model: `google/gemini-2.5-flash` via Lovable AI Gateway (cheap, fast, good enough for list reasoning). No tool calling in v1 — pure Q&A over the grounded context.
- Assistant messages: no background (per contract). User bubble: `bg-primary text-primary-foreground`.

---

## Backend changes (one migration)

```sql
-- RPC 1: city rail aggregates
create or replace function public.teacher_search_city_rail(p_user uuid)
returns table(city text, state text, composite int, total int, enriched int, in_outreach int)
language sql stable security definer set search_path = public as $$ ... $$;

-- RPC 2: funnel counts under current filter
create or replace function public.teacher_funnel_counts(
  p_cities text[] default null, p_states text[] default null, p_search text default null
) returns table(found int, enriched int, scored int, in_outreach int, replied int)
language sql stable security definer set search_path = public as $$ ... $$;
```

No new tables. No RLS changes. Edge function `teacher-search-ai` uses existing `LOVABLE_API_KEY`.

---

## File list

**New**
- `src/components/teacher-prospects/CitySearchRail.tsx`
- `src/components/teacher-prospects/FunnelWidget.tsx`
- `src/components/teacher-prospects/NextBestActionStrip.tsx`
- `src/components/teacher-prospects/TeacherAiPanel.tsx`
- `src/lib/teacherNextActions.ts`
- `src/hooks/useTeacherFunnel.ts`
- `src/hooks/useTeacherCityRail.ts`
- `supabase/functions/teacher-search-ai/index.ts`
- AI Elements installed under `src/components/ai-elements/`

**Edited**
- `src/pages/TeacherProspects.tsx` — wire new widgets above existing layout, add right-rail toggle
- `src/components/teacher-prospects/BulkActionBar.tsx` — add Promote / Enrich / Status; move to bottom
- 1 migration (2 RPCs)

**Untouched**
- `TeacherTable`, `TeacherFilterBar`, `MarketContextBanner`, `SavedListsMenu`, `TeacherDetailPanel`, store, types

---

## Build order (one PR per step, each independently shippable)

1. **Bulk Dock upgrade** (Part 4) — smallest, no backend, immediate value
2. **Funnel widget** (Part 2) + RPC — establishes filter-aware aggregation pattern
3. **City Search rail** (Part 1) + RPC — reuses funnel pattern
4. **Next Best Action strip** (Part 3) — pure frontend on top of the above
5. **AI assistant panel** (Part 5) — largest, ships last; everything below still works without it

---

## Risks & guardrails

- **Mobile (440px)**: rail scrolls horizontally; funnel + NBA stack vertically; AI panel becomes full-screen sheet. Verify at user's current viewport.
- **Funnel "Replied"** requires joining `smartlead_events` on email — can be slow. Wrap RPC count in a materialized view if it lags > 500ms.
- **AI grounding context size**: cap at 50 rows + funnel summary so prompt stays under ~8k tokens.
- **NBA card thresholds** are hard-coded for v1. Document them in a code comment; do not invent ML.
- **Doc-sync (AGENTS.md rule 9)**: after merge, draft updates to `PROJECT_CONTEXT.md` (new Teacher Search layout), `OPEN_TASKS.md` (close items), `APIS.md` (new edge function), `HOW_IT_WORKS.md` (funnel definitions). Wait for "go".

## Out of scope (deferred to LATER.md)

- Group-by toggle (#5), heatmap (#1), saved-market tabs (#6), card view (#8), signal sparklines (#7)
- AI tool-calling (e.g., AI directly tagging teachers) — v2
- Multi-thread AI history
