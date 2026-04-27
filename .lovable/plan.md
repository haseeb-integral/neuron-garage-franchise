## Goals

Address four things together so the Candidate Pipeline (and the rest of the app) feels tighter and safer:

1. Reclaim screen space with a collapsible sidebar (CurbWaste-style icon rail).
2. Borrow a couple of small, useful UX patterns from the CurbWaste screenshot — without disturbing the existing system.
3. Decide on avatars next to names (keep, but make them meaningful).
4. Add a guard rail so cards don't get moved between stages by an accidental drop.

---

## 1. Collapsible sidebar (icon rail)

**Current:** Sidebar is a fixed 240 px navy panel on desktop. Always full-width. Eats a lot of horizontal real estate on the Kanban board.

**Change:**
- Convert `AppSidebar` + `AppLayout` to support two states:
  - **Expanded:** 240 px (current look — logo + label + nav text).
  - **Collapsed:** ~64 px icon rail (logo mark only, icons centered, labels hidden, active orange left-border preserved, tooltip on hover showing the label).
- Add a small chevron toggle button at the top of the sidebar (just under the logo, right-aligned). Clicking it flips state.
- Persist the choice in `localStorage` (`ng:sidebar-collapsed`) so it survives reloads.
- Update the main content offset: `md:ml-60` becomes dynamic (`md:ml-60` when expanded, `md:ml-16` when collapsed) via a CSS variable or a context value.
- The "User's Guide" footer link gets the same icon-only treatment when collapsed (icon centered, tooltip = "User's Guide").
- Mobile drawer behavior is unchanged (still full-width slide-in via Sheet).

**Visual reference:** The thin navy icon rail in the CurbWaste screenshot — small square icons, no labels, single accent for active.

## 2. CurbWaste-inspired UX additions (Candidate Pipeline only)

Two small, non-disruptive borrowings — chosen because they map cleanly to features we already have:

**a. Quick filter chip row above the board.**
Right now we only have the "Jump to stage" dot row. Add a slim filter strip just above it with chips for:
- **Owner** (Kaylie / Sam / Skylar / All)
- **Tag** (High Potential / Active / Follow-Up / Qualified)
- **Fit score** (90+ / 75+ / All)
- A small "Clear" link when any filter is active.

Filters narrow the cards shown in each column (column counts update accordingly). No new data, no schema change — purely a client-side filter on `candidates`.

**b. Status legend strip in the page header** (mirrors CurbWaste's "Pending / In Progress / Completed / Unable to Complete" row). For us, this becomes a one-line legend explaining the orange left-border on cards = days-in-stage health (green ≤3 days, amber 4–7, red 8+). We already color-code implicitly; making it explicit teaches new staff what they're looking at.

**Skipped on purpose** (would disturb the existing system):
- The "Driver schedule / Date / Hauler" top toolbar — our pipeline isn't time-of-day based.
- The checkbox-per-card bulk select pattern — we don't have bulk actions defined for candidates yet, and adding them is its own feature.

## 3. Avatars next to names — keep, but upgrade

**Decision: keep them, they're useful** — they show *who owns* the candidate (Kaylie / Sam / Skylar), which is exactly the kind of at-a-glance info a Kanban benefits from. Removing them would lose information.

**Polish:**
- Keep the colored circle with the owner's first initial (current implementation is good).
- Add the same owner avatar in the **Detail Panel header** and on the **Onboarding table** "Assigned To" column for consistency across the four modules.
- Add an `aria-label` and visible tooltip ("Owned by Kaylie") so it's not just decorative.
- No photographic avatars — initials-on-color is faster, keeps the prototype data-free, and matches the existing flat aesthetic.

## 4. Drag-and-drop guard rail

**Current behavior:** Drop a card into any column → stage updates instantly with a toast. Easy to do by accident, no undo.

**New behavior — three layers:**

1. **Confirm dialog on stage change.** When a card is dropped in a *different* column, show an `AlertDialog`:
   > "Move *Sarah Mitchell* from **Initial Qualification** to **FDD Review**?"
   > [Cancel] [Move]
   - Dropping in the same column does nothing (no dialog, no toast).
   - Cancel = card snaps back, no state change.

2. **Extra-strong confirm for Disqualified.** If the destination is `disqualified`, the dialog copy becomes destructive-style ("This will mark the candidate as disqualified.") with a red confirm button.

3. **Undo toast.** After a confirmed move, the success toast gets an "Undo" action (`sonner` supports this) that reverts the stage for ~6 seconds. Covers the case where the user confirms but then realizes the mistake.

A small "Drag to move • drop to confirm" hint sits under the density toolbar so first-time users know the gesture is safe.

---

## Files touched

**Sidebar / layout**
- `src/components/AppSidebar.tsx` — collapse/expand state, icon-only rendering, tooltip on hover.
- `src/components/AppLayout.tsx` — read collapsed state, swap `md:ml-60` ↔ `md:ml-16`, render correct sidebar width.
- (optional small) `src/lib/sidebarState.ts` — tiny helper for `localStorage` get/set + a custom event so layout and sidebar stay in sync without a full context.

**Pipeline UX**
- `src/pages/CandidatePipeline.tsx` — add filter strip state, legend strip, drag-confirm dialog, undo toast.
- `src/components/candidate-pipeline/KanbanBoard.tsx` — accept `pendingMove` props; on drop, call up to page instead of committing immediately.
- `src/components/candidate-pipeline/KanbanColumn.tsx` — same, just pass through.
- `src/components/candidate-pipeline/CandidateCard.tsx` — add tooltip / aria-label to avatar; add days-in-stage colored left border (green/amber/red).

**Avatar consistency**
- `src/components/candidate-pipeline/CandidateDetailPanel.tsx` — show owner avatar in header.
- `src/components/onboarding/OnboardingTable.tsx` — show owner avatar in the assigned-to cell.

No data model changes, no new dependencies, no breaking changes to other pages.

---

## Out of scope (call-outs)

- Bulk-select / batch actions on candidate cards — would be a separate feature.
- Date/time scheduling on cards — our pipeline is stage-based, not time-of-day.
- Photographic avatars — initials-on-color is the right choice for this prototype.