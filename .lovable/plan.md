# Remove silent fallbacks in the scoring engine

You asked me to (a) remove the silent fallback to 70 in Accessibility v0.2 and (b) list every other fallback in the engine. Here's both.

## Part A — Fix: remove the silent fallback to 70

**The problem.** In `sas-math.ts`, when `roadDistanceMi` or `highwayDistanceMi` is `null` (Overpass rate-limited, Mapbox failed, or no highway within 12 mi), `roadFactor`/`highwayFactor` silently return `70`. The pillar score still renders and looks normal — you have no way to know the number is fake.

**The fix.** Stop returning `70`. Treat a failed lookup as an engine error, not a score.

1. **`supabase/functions/_shared/sas-math.ts`** — change `accessibilityScore` to return `null` when either distance is `null`. Remove the `if (d == null) return 70` branches in `roadFactor`/`highwayFactor`.
2. **`supabase/functions/compute-sas/index.ts`** — when `pillars.accessibility` comes back `null`:
   - Do NOT compute a composite SAS (composite also becomes `null`).
   - Write `status: 'partial'` (new value) on the row, not `'ready'`, with `error: 'accessibility: highway/road lookup failed'`.
   - Still persist whatever distances we did get and all other pillars, so the row is debuggable.
   - Add a `signals.accessibility.failure` block listing which lookup failed (`overpass_highway`, `overpass_road`, `mapbox_directions_highway`, `mapbox_directions_road`).
3. **`src/hooks/useSiteScore.ts`** + **`src/pages/SiteAnalysis.tsx`** — handle `status: 'partial'`:
   - Show a red banner: "Accessibility pillar unavailable — live road/highway lookup failed. Composite score not computed."
   - Render the other 4 pillars normally with their real numbers.
   - "Drive to hwy" tile shows "—" with a tooltip explaining the source failure.
   - Composite tile shows "—" instead of a number.
4. **`src/lib/sasMath.ts`** — mirror the `null`-returning change so the frontend recompute helper matches the engine.

## Part B — Every other fallback / silent default in the engine

I scanned `compute-sas`, `sas-math.ts`, `sasMath.ts`, `census.ts`, and `urban-institute.ts`. Here is the complete list:

### Hard-coded "demo" numbers that mask missing data
| Location | What it does | Risk |
|---|---|---|
| `sas-math.ts` `roadFactor` null → **70** | Used when road distance lookup fails | Fake score — **fixed in Part A** |
| `sas-math.ts` `highwayFactor` null → **70** | Used when highway distance lookup fails | Fake score — **fixed in Part A** |
| `sas-math.ts` `schoolProfileScore` enrollment null → **60** | When user doesn't enter enrollment | Synthetic default — see Q1 below |
| `sas-math.ts` `SCHOOL_TYPE_FACTOR[...] ?? 30` | Unknown school type | Defensive default, unreachable from current UI |
| `sas-math.ts` `GRADE_ALIGN_FACTOR[...] ?? 50` | Unknown grade band | Same as above |

### Silent zero-coalescing (treats missing data as 0, lowers score without telling you)
| Location | Behavior |
|---|---|
| `compute-sas/index.ts` ACS cache read: `Number(cached.median_hhi) \|\| 0`, same for `pct_hh_above_150k`, `pct_dual_income`, `children_5_12`, `families_with_kids_5_12`, `total_population` | If a cached row has NULLs, all six fields become 0 and Affluence/Family Density collapse toward 0 without an error |
| `compute-sas/index.ts` nearby schools loop: `Number(r.enrollment) \|\| 0` | School with missing enrollment counts as 0 students nearby |

### Documented fallbacks (intentional, not "fake")
| Location | Fallback |
|---|---|
| Ecosystem pillar | Urban Institute → if it fails, drops to the internal `public_schools` table. `signals.ecosystem.source.provider` records which one was used. Not silent. |
| `nearestHighwayNode` cycles through 3 Overpass mirrors before returning `null` | This is retry, not a fake value |

### Not a fallback, just FYI
- `engine_version_override` — calibration harness tag, not a data fallback.

## Out of scope (call out, don't fix here)
- Cleaning up the enrollment=60 default and the `?? 0` ACS coalescing — both can also produce misleading scores, but neither is what you asked about. I'd recommend a follow-up to either require enrollment in the UI or render that pillar as partial when it's missing, and to fail the ACS step explicitly when the cache row has NULLs.

## Question before I implement

**Q1.** Do you want me to also fix the `enrollment null → 60` default and the ACS `|| 0` coalescing in this same change (treat them as missing data → partial), or keep this PR focused on just the highway/road silent 70?
