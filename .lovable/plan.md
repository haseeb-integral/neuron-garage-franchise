## Turn 2.2 — Tier Classifier (Full scope) + Enrichment Diversity bug fix

### Goal
Make Premium/Mid/Budget/Community tagging trustworthy by combining price + cross-source presence + brand signals, and fix the visible Enrichment Diversity = 1.1 bug on Austin (table clearly shows 5+ categories but pillar says 2).

---

### Part A — Rework `mvs-classify-tier`

Current logic uses Gemini + a deterministic overlay that only looks at `price_max >= 400`. Problems: ignores the new `sources` JSONB (cross-source presence is a strong "real/scaled" signal), brand list is short, no handling for providers with no price (defaults to "mid" which inflates Mid count and dilutes Premium).

**New deterministic overlay (runs after Gemini, wins on conflict):**

1. **Community keywords** (extended): `ymca, jcc, parks?\s*(and|&)?\s*rec, public library, municipal, city of, church, kindercare, boys & girls club, scout, 4-h, parks dept` → `community`.
2. **Childcare/preschool exclusion**: name matches `daycare, preschool, montessori (\bschool\b only — not "montessori camp"), childcare, after.?school care, learning center` AND no week price → `community` + `category_classified='childcare-excluded'`.
3. **Price-based** (when at least one price bound is set):
   - `price_max >= 400` OR `price_min >= 400` → `premium`
   - `price_max < 200` AND `price_min < 200` AND `price_max > 0` → `budget`
   - else → `mid`
4. **National Premium brand list** (case-insensitive contains): `galileo, id tech, steve & kate, snapology, lavner, mad science, code ninjas, kumon enrichment, british soccer, challenger sports, school of rock` → `premium`.
5. **Cross-source presence boost** (NEW, uses `sources` jsonb): if `sources.length >= 3` (found by 3+ of Sawyer/ActivityHero/Google/Yelp) AND not community AND no price set → promote from default `mid` to `premium` (real, established operator).
6. **Unknown-price guard**: if no price AND only 1 source AND not in brand list → tier stays as Gemini said but capped at `mid` (never premium without price evidence or cross-source proof).

**Category classification fix** — Gemini's `category_classified` is too freeform (it sometimes returns "camp" for everything). Add a normalizer that maps Gemini output + `category_raw` + name hints into a fixed enum: `art, music, dance, stem, language, sports, swim, gymnastics, camp, multi-activity, childcare-excluded, other`. This directly feeds the Enrichment Diversity pillar.

---

### Part B — Fix Enrichment Diversity pillar

Confirmed bug: Austin shows `categoryCount: 2` but the Premium table lists `camp, art, language, stem, sports` (5 categories). Root cause is almost certainly that the composite computes diversity from `tier='premium'` rows only, and `category_classified` is being set to `"camp"` for most rows regardless of the underlying activity.

Fix in `mvs-compute-composite` (or wherever the pillar is computed — will locate during build):
- `categoryCount` = distinct `category_classified` across **all non-community providers with a week price** (not just Premium), excluding the catch-all bucket `"camp"` when a more specific category exists for the same provider.
- Re-derive `diversityRatio` accordingly.

The bigger fix is upstream in Part A's normalizer — once categories are right at the row level, the pillar math is correct.

---

### Part C — Re-run + verify on Austin

1. Trigger reclassify on Austin: `supabase.functions.invoke('mvs-classify-tier', { body: { city: 'Austin, TX', reclassify: true } })`.
2. Recompute composite for Austin.
3. **Verification checks** (built into a `/mvs-preview` check or run via SQL — pick whichever is faster):
   - Premium count should drop or stay ~similar (not balloon). Today: 17. Expected: 12–18.
   - Enrichment Diversity should show ≥4 categories (matches what the table visually shows).
   - Spot-check: search for any "YMCA Austin" or parks-rec rows — must be `community`, not Premium.
   - Spot-check: Galileo / iD Tech / Steve & Kate's rows — must be `premium`.

---

### Part D — Test second city: Boston, MA

After Austin verifies clean:
1. Add Boston to the rollout if not already there; flip to Live; click **Run Pipeline** from `/market-validation/rollout`.
2. Wait ~2–3 min (background pipeline).
3. Open Boston's detail panel and apply the same 4 verification checks as Austin.
4. Expected differences from Austin: higher median price (Boston market), more language/STEM providers, lower headroom (Market Balance < 100).

**Why Boston:** Brett's plan explicitly names Boston as the Tier-A gate city — it must pass before opening Tier-A rollout. Different demographics and provider mix from Austin so it stress-tests generalization.

---

### Files to touch
- `supabase/functions/mvs-classify-tier/index.ts` — new deterministic overlay + category normalizer
- `supabase/functions/mvs-compute-composite/index.ts` (or equivalent) — diversity pillar fix
- No DB schema changes
- No new UI

### Out of scope
- The Sellout Rate looking low (14.7) — separate extract issue, not classifier
- Turn 5 cleanup
- PDF export
- `/mvs-preview` page (Turn 4.2)

### Turn count
1 build turn for Parts A+B+C, then 1 verify turn for Part D (Boston run + sanity check).
