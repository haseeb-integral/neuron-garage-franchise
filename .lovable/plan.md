
## F1 — Candidate Avatars (initials now, photo later)

**New shared component:** `src/components/ui/CandidateAvatar.tsx`
- Props: `name`, `photoUrl?`, `size?` (default **40**), `title?`.
- Perfectly round (`border-radius: 50%`).
- Initials = first-name initial + last-name initial, uppercase, bold white.
- Background color is deterministic from `name` using a hash → navy/teal/slate palette only:
  `#003c7e, #0d4f8b, #1a5fa3, #17506b, #1f6f8b, #2c7a7b, #274060, #3b5998, #4a6fa5, #475569` (no red/green so status semantics stay clean).
- If `photoUrl` is provided, render `<img class="object-cover w-full h-full">` inside the same circle. Falls back to initials on `onError`.

**Sizes used:**
- Compact density card: **20px** (per your note).
- Normal card (top-right): **40px**.
- Detail panel header: **48px**.

**Data model:** Add optional `photoUrl?: string` to `Candidate` in `src/data/pipelineData.ts`. No values populated yet.

**Where the photo gets uploaded later:**
Best place = **Candidate Detail Panel → Overview tab**, by clicking the avatar. Same pattern as Slack / Linear / Notion — most "guess-able". For now I'll add a small "Upload photo" link beneath a 64px avatar at the top of the Overview tab (file input is wired but stores nothing — placeholder until a backend exists). When real upload exists, setting `candidate.photoUrl` makes the avatar render the image everywhere automatically (card + detail panel + any future table).

**Owner indicator on the card:** the existing 24px owner-initial circle in the bottom-right of the card stays as-is so you can still see who owns the candidate at a glance. The new candidate avatar replaces the inline initial in the top-right area of the card layout.

**Files edited:**
- New `src/components/ui/CandidateAvatar.tsx`
- Edit `src/data/pipelineData.ts` (add optional `photoUrl`)
- Edit `src/components/candidate-pipeline/CandidateCard.tsx` (use CandidateAvatar at top-right; 20px in compact, 40px in normal)
- Edit `src/components/candidate-pipeline/CandidateDetailPanel.tsx` (use CandidateAvatar at 48px in header)
- Edit `src/components/candidate-pipeline/tabs/OverviewTab.tsx` (add 64px avatar + "Upload photo" placeholder)

---

## F2 — Global Search Bar

**New component:** `src/components/GlobalSearch.tsx`
- ~440px wide centered input, light bg `#f8f9fa`, border `#dee2e6`, search icon left, placeholder "Search candidates, prospects, cities…".
- On non-empty query, dropdown shows up to 3 grouped sections, max 5 each:
  - **Candidates** (from `sampleCandidates`) — sub-label `"{Stage label} stage"`
  - **Teacher Prospects** (from `sampleTeachers`) — sub-label `"{city}, {state} · Score {fitScore}"`
  - **Cities** (from `sampleCities`) — sub-label `"Score: {compositeScore} · Tier {tier}"`
- Match: simple `name.toLowerCase().includes(query)`.
- Click navigates and opens the relevant detail:
  - Candidate → `/candidate-pipeline?candidate={id}`
  - Prospect → `/teacher-prospects?prospect={id}`
  - City → `/city-scoring?city={id}`
- Escape closes; click-outside closes; arrow keys not required for v1.
- Hidden below `md` (mobile keeps the existing top bar untouched).

**Header integration:** `src/components/AppLayout.tsx`
- Add a thin top header bar inside `<main>` on desktop hosting `GlobalSearch` (centered) with the existing help icon kept on the right. Keeps page padding intact below.

**Detail-panel auto-open hooks (small additions):**
- `CandidatePipeline.tsx` — read `?candidate=` and call `setActive(found)`.
- `TeacherProspects.tsx` — read `?prospect=` and call `setActive(found)`.
- `CityScoring.tsx` — read `?city=` (id) and open the drawer with the matching city.

---

## F3 — Sidebar Collapse Refinements

The collapse mechanic, persistence (`ng:sidebar-collapsed`), 64px icon rail, and tooltips already exist. Refinements:

1. **Move the toggle into the sidebar header row**, right-aligned next to the logo (matches the Jira pattern in your screenshot). Left-arrow when expanded, right-arrow when collapsed. Remove the standalone toggle row currently below the logo.
2. **Smooth transition** — already 200ms on width and main margin; verify it stays smooth.
3. **Pipeline page default-collapsed:**
   - Add a second `localStorage` key `ng:sidebar-user-set` that flips to `"1"` the first time the user clicks the toggle.
   - Add a small `useDefaultCollapsedForRoute()` helper used in `AppLayout`. On `/candidate-pipeline`, if `ng:sidebar-user-set` is unset, force the sidebar to collapsed so all 7 Kanban columns are visible. Once the user toggles even once, their preference is honored everywhere.

No icon, color, link, or Journey Bar changes.

**Files edited:**
- New `src/components/GlobalSearch.tsx`
- Edit `src/components/AppLayout.tsx` (header row hosting GlobalSearch + apply default-collapsed for `/candidate-pipeline`)
- Edit `src/components/AppSidebar.tsx` (move toggle into header row)
- Edit `src/lib/sidebarState.ts` (add `userSet` flag + `useDefaultCollapsedForRoute` helper)
- Edit `src/pages/CandidatePipeline.tsx`, `src/pages/TeacherProspects.tsx`, `src/pages/CityScoring.tsx` (open detail from query param)

---

## Summary

- F1 gives every candidate a real circular avatar (40px normal / 20px compact / 48px panel) with deterministic navy-slate-teal colors, ready to swap in a photo via `photoUrl` — uploadable later from the Overview tab by clicking the avatar.
- F2 adds a centered Jira-style global search in the header with grouped Candidates / Prospects / Cities results that deep-link into the right detail panel.
- F3 keeps the existing collapsible sidebar but moves the toggle into the header (left/right arrow), and defaults to collapsed on the Candidate Pipeline page until the user expresses a preference.
