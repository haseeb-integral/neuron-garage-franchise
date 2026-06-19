
## Diagnosis

### 1. Duplicate NYC rows

DB truth (`mvs_shortlist_cities`):
- Only **2 manager additions** exist: `Denver, CO` and `New York, NY`
- Built-in demo (`SHORTLIST_DEMO`) already includes `New York, NY` → so the merge produces **2 NYC rows** that share the id `new-york-ny`

But the screenshot shows **6 NYC rows** (1 demo + 5 LIVE) and the header still says "11 cities". That mismatch tells me:
- `allShortlistRows` length is being computed correctly (11)
- But the render pass is duplicating NYC rows because **multiple rows share the same React `key` (`r.id`)** — `[...SHORTLIST_DEMO, ...extras]` does no dedupe, and any stale/repeated extras with the same slugged id collide with the demo row

Either way the root cause is the merge in `src/pages/MarketValidation.tsx` (lines 170–185): it concatenates demo + DB additions without dedupe, and the id is derived purely from city+state so the demo's `new-york-ny` and an addition's `new-york-ny` collide.

A second, lower-likelihood factor: the DB has no unique constraint on `(city, state)` in `mvs_shortlist_cities`, so a manager could insert "New York / NY" several times. Today the table only has 1 NYC addition, but we should harden it so this can't happen again.

### 2. Selected row doesn't persist

`src/pages/MarketValidation.tsx` line 187:
```ts
const [activeCityId, setActiveCityId] = useState<string>("san-antonio-tx");
```

It always resets to San Antonio on mount. There's no read from localStorage, no URL param, nothing tying it to the user's last pick.

---

## Plan

Two small, frontend-only fixes plus one tiny DB guard.

### A. Stop the duplicate rows (`src/pages/MarketValidation.tsx`)

In the `allShortlistRows` `useMemo` (around lines 170–185):
1. Build `extras` as today.
2. Concat `[...SHORTLIST_DEMO, ...extras]`.
3. **Dedupe by id** — keep the first occurrence (so demo wins over any addition that slugs to the same id like NYC). Use a `Set<string>` of seen ids.

This makes the merge defensive even if `mvs_shortlist_cities` ever contains a duplicate row.

### B. Persist the selected row (`src/pages/MarketValidation.tsx`)

1. Replace the hardcoded initial state:
   ```ts
   const [activeCityId, setActiveCityId] = useState<string>(
     () => localStorage.getItem("mvs-active-city") ?? "san-antonio-tx"
   );
   ```
2. Write to localStorage whenever it changes:
   ```ts
   useEffect(() => { localStorage.setItem("mvs-active-city", activeCityId); }, [activeCityId]);
   ```
3. If the saved id no longer exists in `allShortlistRows` (city was removed), fall back to the existing `?? allShortlistRows[0]` guard already on line 188. No extra code needed.

Effect: open the page → it lands on the row you last clicked. Across tabs, across refreshes.

### C. DB hardening — unique constraint on `mvs_shortlist_cities`

Add a case-insensitive unique index on `(city, state)` so two managers can never insert "New York / NY" twice (today nothing stops them):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS mvs_shortlist_cities_city_state_ci_uniq
  ON public.mvs_shortlist_cities (lower(city), lower(state));
```

No data migration needed — current table only has 2 distinct rows. `useShortlistAdditions.addCity` will get a clean DB error on conflict, which the existing `throw new Error(error.message)` already surfaces.

### Out of scope (deliberately not touching this turn)
- The "live overlay shows 45.7 / 100 / 0 …" numbers on NYC — those come from `useLiveMvs("New York, NY")` reading sparse data (only 13 providers exist). That's a Phase 4 (full Tier-A rollout) job, not a duplication bug.
- PDF / QA Queue / ACS / Firecrawl extractor expansion — still pending from the 7-point plan.

### Verify after build
1. Reload `/market-validation` → exactly **2 NYC rows max** (likely just 1 since the addition slugs to the same id as the demo and gets deduped). Header "11 cities" matches visible row count.
2. Click `Boston, MA`. Hard-refresh. Boston row is still highlighted/selected on load.
3. (Optional) Try to add "New York / NY" again from the Rollout page → should fail with a unique-constraint error in the toast.
