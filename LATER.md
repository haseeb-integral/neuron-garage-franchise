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

## How to use this file

- Add items here instead of building them mid-sprint
- Review with Brett after the sprint — promote to OPEN_TASKS.md if prioritized
- Don't delete entries — they’re a decision log
