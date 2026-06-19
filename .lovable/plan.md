
## Answering your two questions

### 1. Why does Boston show "failed"?

**It's a UI false alarm — the run actually succeeded.**

DB truth for the latest Boston run (`9838fa1c…`):
- `started_at`  = 11:12:42 UTC  (= 4:12:42 PM your time, matches your screenshot)
- `finished_at` = 11:17:33 UTC  → ran for **~4 min 51 sec**
- `status` = **done**
- `error` = null

The rollout table in `src/pages/MarketValidationRollout.tsx` (line 196–207) has this rule:

> "If a row is still `running` after 3 minutes, display it as **failed** with the message *Run appears stuck (>3 min). Try again.*"

Boston legitimately took ~5 min (Boston has more providers + more sources than Austin), so the UI tripped the 3-min stale-guard **before** the pipeline finished. The badge is wrong, the pipeline is fine.

### 2. Did scores actually update for Boston? — Yes.

- `mvs_city_flags.updated_at` = 11:17:33 (matches finish time, `mvs_data_source = live`)
- **MVS score = 47.0** (vs Austin 43.8)
- Provider mix after the new classifier:
  - Premium: **9** (stem 3, art 2, music/dance/sports/outdoor 1 each) — clean, no YMCA/parks
  - Mid: 32, Budget: 7, Community: 38 (YMCAs + 8 childcare-excluded correctly bucketed)
  - **Enrichment Diversity categories present:** stem, art, music, dance, sports, gymnastics, theater, outdoor, multi-activity → ≥7 → fix from Austin holds
- Boston Premium count is lower than Austin (9 vs 17) — consistent with Boston having fewer Sawyer-listed premium camps and more community/YMCA presence. Sanity-OK.

So Boston **passes the 2.2 verification** the same way Austin did. Just refresh the page and the badge will turn green.

---

## Plan: remove the false-failure UX trap

One file, frontend only, no business-logic changes.

### File: `src/pages/MarketValidationRollout.tsx`

**Change 1 — raise the stale threshold from 3 min to 8 min.**
Real runs take 4–6 min on larger cities (Boston proved it). 8 min gives a safety margin without hiding genuinely dead runs.
```ts
const STALE_MS = 8 * 60 * 1000;  // was 3 min
```

**Change 2 — auto-refresh every 30 s while any row is `running`.**
Today the table only re-fetches on manual reload, so even after a run finishes you keep seeing the stale "failed" badge until you reload. Add a lightweight interval that polls `fetchAll()` every 30 s while at least one city is in `running` state, and stops when none are.

**Change 3 — tweak the stale message.**
Change `"Run appears stuck (>3 min). Try again."` → `"Run appears stuck (>8 min). Try again."` so the tooltip matches the new threshold.

### Out of scope (intentionally not touching)
- Score recompute logic, classifier, pillar formulas — Boston already verified clean.
- The Market Absorption "sold out" extractor gap (still flagged for a later turn).
- The 0-weeks-for-non-Sawyer providers issue (later turn — needs extractor work for Google Maps / Yelp / ActivityHero pages).

### Verify after build
1. Re-open `/market-validation/rollout` — Boston row should show **done · 47.0** (green).
2. Click Run on a third city (suggest **Brooklyn, NY** or **Denver, CO** — both Tier-A, different profiles); confirm it does not flip to "failed" before finishing, and the row updates automatically without manual reload.
