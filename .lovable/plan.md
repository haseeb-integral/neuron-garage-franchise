
# Neuron Garage v1.0 — Final-Day Ship Plan

Goal: regardless of how Kaylie, Sam, or anyone else clicks around, the app feels finished, fast, internally consistent, and trustworthy. No dead ends, no contradictory numbers, no scary errors, no half-built screens visible.

The plan is grouped by **severity**. Tier 0 is non-negotiable for v1.0. Tier 1 is "do unless we run out of time." Tier 2 is polish that elevates the demo.

---

## Tier 0 — Ship-blockers (must land before client sees it)

### A. One source of truth for every visible number
Rule 12 already mandates `MarketView` for composites. Final-pass audit:
1. Grep every file that renders a score, tier, pillar, or percentage. Confirm it routes through `buildPillarView` / `MarketView` / `bandFromDisplayScore`. Fix any stragglers in drawers, PDF, AI panel, Executive Summary, ranked list, map popovers.
2. Turn on the dev drift detector in preview and click through 20 cities; fail the build if it fires.
3. Same audit for Teacher Search "fit score" and Pipeline "stage progress" if they compute anything.

### B. Dead-code & dead-route purge
1. Delete `CityDetailDrawer.tsx` + references in `specMarkdown.ts` and `marketView.test.ts` (already flagged earlier).
2. Delete or hide internal-only routes from the sidebar/nav so the client never lands on raw spec pages: `/spec`, `/smartlead-spec`, `/email-outreach-docs`, `/demographics-methodology`, `/methodology`, `/scoring-method`. Keep them reachable from a single "Methodology & Docs" entry under a settings/help menu — don't expose 6 separate doc routes.
3. Remove the older `EmailOutreach.tsx` page if `EmailOutreachV2` is the shipped version.
4. Remove `PlaceholderPage`, `JourneyBar`, or any "TODO" / "Coming soon" copy still visible.

### C. Error & empty states everywhere
For each of the 5 features, exercise: no data, 1 row, 1000 rows, failed fetch, slow fetch (throttled), auth expired, no permissions.
- Replace red React error overlays with `QueryErrorState` + a Retry button.
- Every list/table needs a real empty state with a CTA ("No markets yet — Run a search").
- Wrap each page in an ErrorBoundary that logs and shows a friendly fallback.

### D. Auth + roles hardening
1. Confirm `user_roles` table + `has_role()` pattern is in place (per system rules). No role checks against `profiles`.
2. RLS audit on every table the 4 features touch. Run `supabase--linter` and fix every critical finding.
3. Reset-password and email-verify flows work end-to-end on the live `lovable.app` URL.
4. Logout works from every page; session expiry shows a clean modal, not a console error.

### E. Refresh / long-running actions
"Refresh data" on City Search currently errored earlier in the chat. Audit every button that triggers an edge function:
- Disable while in-flight, show spinner + ETA copy ("This usually takes ~30s").
- Toast on success/failure with actionable message.
- Edge functions return structured `{ok, error, code}` — no 500s leaking raw stack traces to the UI.

### F. Performance smoke test
1. `bun run build` clean; bundle under 1.5 MB gzipped main chunk. Lazy-load heavy panels (PDF generator, map, charts) — looks like PDF is already heavy.
2. City Search list of 800+ rows must scroll at 60fps. If not, virtualize.
3. First contentful paint on `/` under 2s on a throttled connection.

---

## Tier 1 — Feature completeness per the four pillars

### 1. Dashboard (`/`, `Index.tsx`)
The dashboard is the first thing the client sees. Today it's likely thin. Bring it to "executive cockpit":
- 4 KPI tiles, one per feature: # markets scored, # teacher prospects, # emails sent (last 7d), # candidates in pipeline by stage.
- "Recent activity" feed (last 10 actions across features).
- "Top 5 markets right now" mini-table linking into City Search drawer.
- "Pipeline funnel" mini-chart linking to Candidate Pipeline.
- All tiles deep-link into the relevant feature with the same filter applied.

### 2. City Search
- Drawer Tier 1 upgrades from prior message (hero block w/ pillars + tier, percentile chips, peer comparison, bottom-line one-liner) — these were already designed; ship them.
- Ensure "Ask AI" only answers from real data (already hardened to A grade per prior message).
- Executive Report PDF: re-QA every section renders, no clipped text, brand color, footer with date + user.
- Map: zoom/pan smooth, markers clickable, tier color legend visible.
- CSI copy updates from last turn are in — verify all 4 files render correctly.

### 3. Teacher Search
- Confirm the search→results→detail flow works on a fresh user.
- Fit Score must show its formula (Rule 1). Add "Show Formula" if missing.
- Bulk actions: select N teachers → "Add to Outreach List" → routes into Email Outreach with the list pre-loaded.
- Dedupe banner: "12 duplicates merged" visibility.
- Apollo / Apify quotas surfaced as a tiny chip ("API credits: 4,210 left this month") so Sam knows when we're burning budget.

### 4. Email Outreach (V2)
- SmartLead connection status banner (green/red dot).
- "Send test email to myself" button on every template — single most reassuring demo feature.
- Per-lead status from `smartlead-webhook` reflected in UI within 5s (poll or realtime).
- Unsubscribe / bounce list visible and filterable.
- Template editor: AI personalize button works, preview shows merged fields with real lead data.

### 5. Candidate Pipeline
- Drag-and-drop between columns: prospect → qualification → confirmation → signing. Confirmation gate enforced (Rule: cannot skip into Signing).
- Card shows: name, source market, fit score, last contact, owner.
- Click card → drawer with full history (emails sent, market context, notes).
- Add-note + assign-owner work and persist.
- Empty pipeline state with "Promote a teacher from Teacher Search" CTA.

---

## Tier 2 — Demo polish (do all of these if time permits, they're each <30 min)

1. **Global command palette** (Cmd-K) already partially exists (`GlobalSearch.tsx`) — make sure it jumps to any city, teacher, candidate, or page.
2. **Keyboard shortcuts cheatsheet** modal (`?` key).
3. **Onboarding tour** for first login (5 tooltips: sidebar → city search → teacher search → outreach → pipeline). Stored as `seen_tour_v1` flag on profile.
4. **Consistent loading skeletons** in place of spinners.
5. **Dark mode parity** — pick one, lock it, remove the toggle if half-broken.
6. **404 page** is on-brand, links back to dashboard.
7. **Favicon + page title** per route (`<title>` swap) — current title likely says "Lovable" or generic.
8. **Print stylesheet** so anything Sam screenshots looks clean.
9. **"What's new in v1.0" modal** that auto-opens once — sets the tone that this is a release.
10. **Analytics**: Posthog or simple event log for clicks on the 4 main features, so we know during demo what gets used.

---

## Pre-demo checklist (run morning of)

```text
[ ] bun run build → no warnings
[ ] supabase linter → zero critical
[ ] Click every sidebar item logged out → redirects to /auth
[ ] Click every sidebar item logged in → renders, no console errors
[ ] City Search: search a city, open drawer, generate PDF, ask AI, refresh data
[ ] Teacher Search: search a city, add 3 to outreach
[ ] Outreach: send test email to self, verify receipt
[ ] Pipeline: drag a card across all 4 stages, then back
[ ] Dashboard: every tile is non-zero and links work
[ ] Logout → log back in → state persists where it should
[ ] Mobile viewport (440px): no horizontal scroll, sidebar collapses
```

---

## Execution order I'd run today

1. **Morning (2–3h):** Tier 0 A, B, D, E — math integrity, dead-code purge, auth/roles, error states. Highest risk of embarrassment.
2. **Midday (2h):** Tier 0 C + F — empty/error states for every page, perf pass.
3. **Afternoon (3h):** Tier 1 — Dashboard build-out, then Teacher Search + Outreach + Pipeline gap-fills in parallel since they're separate files.
4. **Late afternoon (1h):** Tier 2 polish #1, #6, #7, #4 minimum.
5. **End of day:** Run the pre-demo checklist. Fix anything that blinks red. Publish.

---

## What I'd explicitly NOT do

- No new features beyond what's listed (per Rule 2).
- No scoring engine math changes (per Rule — Sam only).
- No nav redesign (Rule 7).
- No new third-party providers (Rule 8).
- No optimistic "AI summarizes the whole pipeline" — too risky to hallucinate in front of the client.

---

**Confidence after this plan executes:** the client can mash buttons in any order across all 5 surfaces and will see consistent numbers, friendly errors, real data, and a coherent narrative from market → teacher → email → pipeline. That's v1.0.

Want me to start executing Tier 0 now, or do you want to edit the plan first?
