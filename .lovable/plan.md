
# Saved Sites — SAS Watch List Plan

## Name
**Saved Sites** (clear, matches what it does). The bookmark icon stays standard.

## My opinion on freeze vs live (you asked)
**Live re-run, with a small "score at save" badge if it changed.**

Why:
- A saved list with old numbers is not helpful — you said this yourself.
- Inputs (address, grade band, enrollment) are saved, so the engine can always re-score from the same inputs. Numbers stay fresh.
- We also store the score at save time as a snapshot. If today's score is different, we show a tiny pill like `Was 72 → Now 78 ▲` so you see the drift.
- Best of both: fresh truth + memory of what it looked like when you saved.

## What it saves (per site)
- Site name, address, lat/lng
- Type, grade band, enrollment
- Score snapshot: 5 pillar scores, composite, confidence band, verdict — at save time
- Saved by: user id + name (from profile)
- Saved at: timestamp
- Shared with team: always true (Phase 1)

## How it serves users
- Build a short list of finalist sites while working across days/weeks
- See teammates' picks without asking ("Brett saved this one yesterday")
- Re-open any saved site → loads inputs back into a card → re-runs live engine → see if score moved
- Foundation for later: notes, tags, compare, export

## UI (Option A)

**1. Bookmark icon on each candidate card header**
- Empty bookmark = not saved
- Filled bookmark = saved (one click to remove)
- Tooltip: "Save to Saved Sites" / "Remove from Saved Sites"
- If saved by someone else: filled bookmark + small avatar/initial of who saved it first

**2. Top bar pill: `🔖 Saved Sites · N`**
- Sits in the SAS page header next to "Export PDF"
- Click → opens right-side **Drawer**

**3. Drawer contents**
- Header: "Saved Sites" + count
- Filter chips: `All` · `Mine` · `Team`
- List of cards, newest first:
  - Site name + address
  - Score badge (today's live re-score) + band color
  - If today's score differs from snapshot: small pill `Was 72 → Now 78 ▲`
  - "Saved by Brett · 2 days ago" with avatar
  - Buttons: **Load into card** · **Remove** (only the user who saved it, or admin, can remove)
- Empty state: "No saved sites yet. Click the bookmark on any site to save it."

**4. "Saved by" attribution everywhere**
- In drawer list
- As a small avatar overlay on the bookmark icon on the candidate card
- Hover/tooltip: "Saved by Brett on Jun 20"

## Technical details

### Database
New table `site_saved_sites`:
- `id` uuid pk
- `user_id` uuid (saver) — fk to auth.users
- `site_name` text
- `address` text
- `lat` numeric, `lng` numeric
- `site_type` text, `grade_band` text, `enrollment` int
- `inputs_json` jsonb (full input payload for re-run)
- `snapshot_json` jsonb (pillar scores, composite, band, verdict at save)
- `created_at`, `updated_at` timestamptz
- Unique `(lat, lng, site_type)` rounded — prevents dupes across team

RLS:
- SELECT: any authenticated user (team-shared)
- INSERT: authenticated, must set `user_id = auth.uid()`
- DELETE/UPDATE: only `user_id = auth.uid()` OR admin role

GRANTs: `authenticated` SELECT/INSERT/UPDATE/DELETE, `service_role` ALL.

### Frontend
- New hook `useSavedSites()` — list, add, remove, isSaved(lat,lng)
- New component `SavedSitesDrawer.tsx` — uses shadcn `Sheet`
- New component `SavedSitesPill.tsx` — header pill with count
- Update `SiteAnalysis.tsx`:
  - Add bookmark icon to each candidate card header
  - Add pill to header
  - "Load into card" handler restores inputs into a free card slot and re-runs engine
- Live re-score: when drawer opens, run `recomputeSiteScores` on each saved site's inputs; compare to snapshot to show drift pill

### Out of scope (later)
- Notes per saved site
- Tags / folders
- Full Saved Sites page (drawer is enough for now)
- Real-time updates when teammate saves (just refetch on drawer open)

## Phases (build order)
1. Migration: `site_saved_sites` table + RLS + GRANTs
2. Hook `useSavedSites`
3. Bookmark icon on candidate card + save/remove wiring
4. Header pill + drawer shell
5. Drawer list with live re-score + drift pill + "saved by" attribution
6. "Load into card" handler
7. Verify with Playwright: save → see in drawer → load back → remove

Ask me anything before I build.
