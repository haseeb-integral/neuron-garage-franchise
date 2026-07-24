## Goal

When you filter Teacher Search by "Houston," we should also pull teachers from Houston's suburbs (like Katy, Sugar Land, The Woodlands, etc.) — not just rows where `city = 'Houston'`. And we want this to be reusable for other metros later (Dallas, Phoenix, etc.).

## The Problem Today

- `teacher_prospects.city` stores the exact city name from the CSV ("Katy," "Sugar Land," "Houston").
- Filters in `TeacherFilterBar`, `CitySearchRail`, and `teacher_prospects_stats` all do an **exact match** on `city`.
- So filtering "Houston" misses the 98 Katy rows and any other suburb rows.

## The Approach — Metro Aliases Table (Single Source of Truth)

Create one small lookup table that maps a **metro name** to its **member cities**. Every place in the app that filters by city checks this table first and expands the filter if the name is a known metro.

### New table: `public.city_metro_aliases`

| Column         | Type    | Notes                                                 |
| -------------- | ------- | ----------------------------------------------------- |
| `metro_name`   | text    | e.g. "Houston"                                        |
| `metro_state`  | text    | e.g. "TX"                                             |
| `member_city`  | text    | e.g. "Katy"                                           |
| `member_state` | text    | e.g. "TX"                                             |

Primary key: (`metro_name`, `metro_state`, `member_city`, `member_state`).
The metro itself is also a member row (Houston → Houston), so one query returns the full list.

RLS: read for `authenticated`, write for `service_role`. No `anon`.

### Houston seed rows (for approval)

Houston metro (Harris + surrounding counties) — the suburbs I'd seed:

1. Houston
2. Katy
3. Sugar Land
4. The Woodlands
5. Pearland
6. Cypress
7. Spring
8. Humble
9. Kingwood
10. Missouri City
11. Friendswood
12. League City
13. Pasadena
14. Baytown
15. Conroe
16. Tomball
17. Richmond
18. Rosenberg
19. Stafford
20. Bellaire
21. Deer Park
22. La Porte
23. Channelview
24. Atascocita
25. Fresno
26. Manvel
27. Alvin
28. Webster
29. Seabrook
30. Dickinson

If any of these shouldn't count as "Houston" for your outreach, just tell me which to drop before I seed.

### How the UI uses it

A small helper `expandCityFilter(city, state)`:
- If the city is a metro (row exists in `city_metro_aliases` as a `metro_name`), returns the full list of member cities.
- Otherwise, returns just `[city]`.

Three call sites get updated:

1. **`teacher_prospects_stats` RPC** — accept an expanded `p_cities[]` (already supported!) so the "1,418 Houston" tile counts suburbs too.
2. **`useTeacherProspectsData` hook** — when the active city filter is a metro, expand before the `.in('city', [...])` query.
3. **`CitySearchRail`** — the Houston tile shows the metro total (Houston + all suburbs), with a small subtitle like "+ 29 suburbs."

Exact matching still works for non-metro cities (Denver, Austin, etc.) — nothing changes for them.

## Phases

**Phase 1 — Schema + seed (1 turn)**
- Migration: create `city_metro_aliases` with RLS + GRANTs.
- Insert Houston + 29 suburbs (after you approve the list).
- No UI change yet; existing filters keep working.

**Phase 2 — Wire filters to expand (1–2 turns)**
- Add `src/lib/metroAliases.ts` helper + a small cached hook.
- Update `useTeacherProspectsData`, `teacher_prospects_stats` call, and `CitySearchRail` to use expansion.
- Show "+ N suburbs" subtitle on metro tiles.

**Phase 3 — (Optional, later) Add more metros**
- Insert Dallas–Fort Worth, Phoenix, Denver metro, NYC, etc. as needed. No code change required — just data.

## What Won't Change

- `teacher_prospects.city` stays as-is (still "Katy" for Katy rows).
- Non-metro cities behave exactly like today.
- Exports, MVS scoring, City Search scoring — all untouched. This is a Teacher Search filter-layer change only.

## Risks & Things to Test

- **Risk:** Someone genuinely wants to filter Katy alone. Fix: the filter chip still lets you pick "Katy" directly from the city dropdown; expansion only triggers when the metro name is chosen.
- **Test:** After Phase 1, "Houston" filter should return 1,418 rows (was 1,320). Katy alone should still return 98.
- **Test:** Non-metro filter (e.g. "Denver") returns the same count as before.

## Questions Before I Build

1. Approve the 30-city Houston seed list above? Any to drop?
2. Do you want the Houston tile in `CitySearchRail` to say "Houston + 29 suburbs" or just "Houston (1,418 teachers)"?

Awaiting approval to ship Phase 1.
