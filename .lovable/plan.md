## What I see on your console

- **4 failed cities** (red): Houston, San Antonio, Philadelphia, Los Angeles — last run failed 6/19. Their scores are stale.
- **8 done cities** (green) — but many have `3/5 sources` or `2/5 sources` badges, meaning some data providers didn't return data. These likely have missing prices too.
- **New York, Chicago, Boston, Austin, Columbus** — recently run, healthiest.

## Which button to use — simple rule

| Situation | Button | Why |
|---|---|---|
| City status = **failed** | **Force fresh** | No usable data exists. Must re-crawl from scratch. |
| City status = **done** but missing prices | **Catch-Up Missing Prices** (on deep dive card) | Keeps existing providers, only fills blanks. Much cheaper and faster. Uses new B1+B2+B3 crawler on unpriced rows only. |
| City status = **done** and older than 90 days | **Run** (normal) | Uses freshness policy. |
| City looks totally wrong / bad data | **Force fresh** | Wipes and rebuilds. |

**Key point:** Force fresh throws away everything and re-discovers providers (30-45 min, expensive). Catch-Up only touches unpriced rows (3-5 min, cheap). Prefer Catch-Up whenever the city is already `done`.

## Recommended order

Run **one city at a time** (the table locks anyway). Group by type:

### Group 1 — Fix failed cities first (Force fresh, one by one)
These have no usable data. Do them first so the shortlist becomes complete.

1. **Houston, TX** — Force fresh
2. **Philadelphia, PA** — Force fresh
3. **San Antonio, TX** — Force fresh
4. **Los Angeles, CA** — Force fresh

Wait for each to finish before starting the next. Each ≈ 30-45 min.

### Group 2 — Fill missing prices on done cities (Catch-Up button)
Go into each city's deep dive and hit **Catch-Up Missing Prices**. Order by lowest coverage first so you see biggest lift:

5. **Johns Creek, GA** (score is `—`, likely very thin)
6. **San Diego, CA** (43.5, `3/5 sources`)
7. **Indianapolis, IN** (44.0)
8. **Denver, CO** (56.5, `3/5 sources`)
9. **Boston, MA** (60.0, `3/5 sources`) — already caught up recently, may be small lift
10. **Columbus, OH** (69.9, `3/5 sources`) — already caught up recently
11. **Chicago, IL** (52.6) — already caught up recently
12. **Austin, TX** (58.4) — already caught up recently
13. **New York, NY** (66.9) — check unpriced count first

For Group 2, each Catch-Up run is ~3-5 min.

## What "new crawler" gives you on Catch-Up

The Catch-Up button already uses:
- **B2** directory-first queries (Sawyer, ActivityHero, CampPage)
- **B2.2** brand token hints + sibling median ranges
- **B3** Google AI Overview fallback (Apify)
- Relaxed price guards + natural language queries

Force fresh uses all of the above **plus** re-discovers providers. So Force fresh helps when the provider list itself is stale or missing camps — not just prices.

## Expected impact

- Failed 4 cities → go from `—` to real scores.
- Catch-Up on done cities → typically +30 to +120 priced providers per city (based on what we saw for Boston, Chicago, Columbus).

## Recommendation for today

Start with **Houston Force fresh** now. While it runs, open **Johns Creek deep dive** and hit **Catch-Up** in a second tab — different city, so no lock conflict.

Reply **"go"** and I'll wait as you kick off Houston, then guide the next step.
