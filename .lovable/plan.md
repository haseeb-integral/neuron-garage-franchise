## What you asked

1. The saved card shows "Saved by you · 11m ago" but you want richer save metadata (who, when, context).
2. You want me to check what standard web apps do.
3. You want to know why I am slow.

---

## Part 1 — What standard apps show on a saved item

I checked common patterns (Notion, Linear, Figma, Google Drive, Zillow saved homes, LoopNet, Redfin, HubSpot saved views). The standard "saved item" card shows 5 things:

1. **Who saved it** — avatar + full name (not just initial)
2. **When saved** — relative time ("11m ago") + exact date on hover tooltip ("Jun 22, 2026, 3:42 PM")
3. **Last updated / re-scored** — separate line if score was refreshed after save
4. **Score at save time vs now** — if they differ, show both ("Saved at 31.20 → now 29.62")
5. **Optional tag/note** — short label or list (we skipped notes per your Option A choice)

Right now we show #1 partially (initial only) and #2 partially (relative only). We are missing full name, exact timestamp, last-refreshed time, and score drift.

---

## Part 2 — Plan: upgrade the saved card

**File:** `src/components/site-analysis/SavedSitesDrawer.tsx` only. No DB change — all fields already exist (`saved_by`, `saved_at`, `updated_at`, `score_at_save`, current `composite_score` from snapshot).

**New card layout (top → bottom):**

```text
┌─────────────────────────────────────────────────────────┐
│ 📍 St. Francis School                          29.62    │
│    300 E Huntland Dr, Austin, TX 78752         LOW      │
│                                                          │
│ ┌──┐                                                     │
│ │HA│ Saved by Haseeb Ahmed                              │
│ └──┘ Jun 22, 2026 · 3:42 PM  (11m ago)                  │
│                                                          │
│ Score at save: 31.20 → now 29.62  ▼ -1.58              │
│ Last re-scored: 2m ago                                  │
│                                                          │
│                       [ Load into card ]  [ Remove ]    │
└─────────────────────────────────────────────────────────┘
```

**Specific changes:**

1. **Full name next to avatar** — pull `full_name` from `profiles` (already hydrated in `useSavedSites`). Fall back to email, then "Unknown user".
2. **Exact timestamp** under the name line — `Jun 22, 2026 · 3:42 PM` formatted with `Intl.DateTimeFormat`. Keep "(11m ago)" in muted text next to it.
3. **Score drift row** — only show if `score_at_save` differs from current `composite_score` by ≥ 0.5. Show old → new with a small up/down arrow in green/red.
4. **Last re-scored line** — show `updated_at` relative time, only if it is newer than `saved_at`.
5. **Tooltip on the time line** — full ISO date for precision.
6. **Team view distinction** — on the "Team" tab, show "Saved by Sarah K." in primary color so it's clear it's not yours. On "Mine" tab, keep "Saved by you".

No layout changes to the buttons (we just fixed those last turn).

---

## Part 3 — Why I am slow (honest audit)

You asked, so here is the truth:

1. **Plan mode forces a write-then-wait loop.** Every plan needs your approval before I touch code. That's a product rule, not me being slow on this turn — but it adds a full round-trip.
2. **Each tool call is one network round-trip** to the sandbox (~1–3 sec each). When I read 4 files and run a search, that's 4–5 round-trips even if each is fast.
3. **I sometimes re-read files I already have in context.** That's wasted calls. I should trust the file-summary section more.
4. **I sometimes run commands serially when they could be parallel.** Independent reads/searches should go in one batch.
5. **Long context (this chat is huge) makes every model response slower** to generate — more tokens in = more time per turn.

**What I will do to be faster:**
- Skip reading files already summarised in context unless I truly need fresh content.
- Batch all independent reads/searches into one tool call.
- Keep plans short (like this one) so you approve faster.
- Stop asking questions when the request is clear — just plan or build.

---

## Summary

Upgrade the saved-site card with full name, exact timestamp, score drift, and last-rescored time. One file changes: `SavedSitesDrawer.tsx`. No DB work. Approve and I'll build it in one turn.