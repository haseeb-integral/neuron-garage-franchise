## What I just verified (live, in your preview)

I opened both pages in a headless browser session signed in as you and inspected the real network responses.

**Teacher Search** — `/teacher-prospects`
- Header: **"11,752 teachers across 188 cities · live as of 05:17 AM"**
- Total Imported = **11,752**
- Email‑Ready = **3,922**
- Needs Email Enrichment = **5,253**
- Right rail Quick Stats: Cities **188**, Email‑ready **3,922**
- Raw RPC response body confirmed: `{"total": 11752, "cities": 188, "email_ready": 3922, "needs_enrichment": 5253}`

**Email Outreach** — `/email-outreach`
- Active Campaigns **2**, Prospects in Outreach **1**, Open Rate **50.0%**, Replies **1**, Interested **0**, Promoted **1**

So the numbers are not broken — neither page is shipping zeros today. My previous fix did stick.

## So why did you see zeros?

The zeros in your screenshot are the **initial render** before the RPC has answered. Look at the current Teacher Search code:

```ts
const emptyStats = { total: 0, withEmail: 0, needsEnrichment: 0, cities: 0, bySource: [] };
// cards render stats.total.toLocaleString()  → "0"
```

So between mount and ~200ms later (when `teacher_prospects_stats` resolves) the cards literally render `0`. If you screenshot in that window — or if the tab was paused/throttled — you see all‑zero cards that look identical to "broken / no data". Same pattern on Email Outreach (`queueCounts` starts `null` → shows `—`, but Open Rate shows `…` while analytics loads, which is inconsistent).

**This is the real bug** — not the data layer, the loading state. It looks broken every page load for ~½ second, every time.

## Fix plan — make this category of mistake impossible to repeat

### 1. Never render a literal `0` while loading
Replace the `emptyStats` default with `stats = null`. Cards show a skeleton bar (`<Skeleton className="h-7 w-16" />`) until the RPC actually returns. Apply the same rule on Email Outreach so every card consistently uses skeleton → number → error, never "0 / —/ …".

### 2. Distinct empty‑states
- **Loading** → skeleton bar
- **Loaded + truly zero** → big "0" + faint "no data yet"  caption (so a real zero is visually distinct from a stale zero)
- **Error** → "—" + tooltip with the error message + Retry link

### 3. Last‑updated stamp on every card group
A small "Updated 12:17:09" footer under the card row (already present in the Teacher Search subtitle — add it to Email Outreach too) so you can tell at a glance whether the page is showing fresh data.

### 4. Auto‑refetch on tab refocus
Add a `visibilitychange` listener that re‑runs `loadStats()` when the tab regains focus. If you keep the tab open overnight, you won't return to stale zeros from a connection that dropped.

### 5. Hard‑refresh button
The page already has a Refresh button — wire it to also re‑run `loadStats()` (Teacher Search currently only refreshes the table on filter changes, not on the visible Refresh button).

### 6. Tiny test guard
Add a one‑line vitest assertion: `expect(emptyStats).toBeUndefined()` — fails the build if anyone re‑introduces the hardcoded zero default.

## Out of scope
- No DB / RPC changes — verified end‑to‑end working.
- No layout / copy changes to the cards themselves.

## Files I'll touch
- `src/pages/TeacherProspects.tsx` — kill `emptyStats`, add skeletons, wire Refresh, add visibility listener.
- `src/pages/EmailOutreachV2.tsx` — same skeleton treatment for the 6 dashboard stat cards; add Updated stamp.
- `src/components/teacher-prospects/TeacherFilterBar.tsx` — skeletons in Quick Stats (right rail).
- (new) `src/test/stats-loading.test.ts` — guard against the zero‑default regression.

## Why this is the right diagnosis, not another guess
- Browser network panel shows the RPC returning real data (11,752).
- psql against the live DB shows `teacher_prospects_stats(NULL, 'All', 'all')` returning the same numbers.
- The only path that produces "0/0/0" is the initial `useState(emptyStats)` render before the first fetch completes.

Confirm and I'll implement A–F in one pass.