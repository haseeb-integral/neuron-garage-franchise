## The problem (plain English)

Right now the Ask AI bar does **not** literally do what you ask. It only knows how to "nudge" the 6 sliders by at most ±20 points, then a frontend rule says "if one category was nudged up, make it 60% and split the rest 8/8/8/8/8". That's why you got `Demand 60 / others 8`, even though you said **100%**.

The fix: teach the AI to return **absolute weights** (exact percentages) when you say things like "100%", "only", "exclusively", "just demand", or give explicit numbers like "demand 50, pricing 30". The frontend then sets the sliders to *exactly* those values — no rebalancing, no dominant-detection magic.

We keep the old delta path for vague asks like "lean a bit more on pricing" — that one should still nudge softly.

---

## What changes

### 1. `supabase/functions/ai-city-query/index.ts`

- **Extend the JSON contract** the AI must return:
  ```
  weightMode: "absolute" | "delta"     // new
  absoluteWeights: { demand, pricingPower, competitiveLandscape,
                     franchiseeSupply, easeOfOperations, parentMindset }  // new, 0–100 each
  weightAdjustments: { ... }            // kept, used only when mode = "delta"
  ```
- **Update SYSTEM_PROMPT** with a new rule block:
  > If the user states an exact percentage, says "only / exclusively / 100% / just / pure / all", or names specific numbers for one or more categories, return `weightMode: "absolute"` and set `absoluteWeights` to exactly what they said. Any category the user did not mention must be set to 0. Do not normalize, do not round to "fair" values — match the user's words literally.
  > Otherwise (vague intent like "lean toward demand"), return `weightMode: "delta"` and use `weightAdjustments` as today.
- **Sanitize** `absoluteWeights`: clamp each to 0–100, only normalize if the user-stated total is wildly off (e.g. >120 or <80). For "100% demand" the AI returns `{demand:100, others:0}` and we pass it through untouched.

### 2. `src/pages/CityScoring.tsx` (the `askAi` handler around lines 480–524)

- Branch on `result.weightMode`:
  - `"absolute"` → set `weights`, `appliedWeights`, and `customWeightsSnapshot` **directly** to `result.absoluteWeights`. No dominant detection, no 60/8/8/8/8/8 rebalance.
  - `"delta"` → keep current behavior (the dominant detection + additive nudge path stays as a safety net for vague queries).
- Toast copy for absolute mode: *"AI set your category weights exactly as requested."*

### 3. `src/components/city-scoring/AiAnswerCard.tsx`

- When `weightMode === "absolute"`, render the chips from `absoluteWeights` instead of `weightAdjustments`, and label them `weight · Demand 100%`, `weight · Pricing Power 0%`, etc. — so the user sees the literal compliance instead of "+20 / −20" deltas.
- Hide zero-value chips in absolute mode to keep the card tidy (show only categories with weight > 0, plus a small "others: 0%" pill).

### 4. Doc sync (Mode A — drafts, awaiting your "go" before I touch files)

- **HOW_IT_WORKS.md** — Ask AI section: add "Absolute vs delta weight modes — literal requests like '100% demand' now set sliders exactly, not via a +20 nudge."
- **PROJECT_CONTEXT.md** — note the new `weightMode` / `absoluteWeights` fields in the `ai-city-query` response.
- **GLOSSARY.md** — add "Absolute weight mode = Ask AI sets sliders to the exact numbers the user named; everything else goes to 0."

No DB migrations. No schema changes. Existing `ai_query_history.response` is JSONB so the extra fields slot in cleanly.

---

## What stays the same

- The 6 category keys and the scoring math (Sam-only — untouched).
- The delta path for fuzzy/qualitative requests.
- Filters (state, tier, minScore) — already work fine.
- The 6-turn conversation cap and history.

---

## One small judgement call for you

When the user says **"100% demand"**, should the 5 other categories go to **exactly 0%** (so they contribute nothing to the composite — composite literally = demand score), or should we floor them at **1% each** so the composite still has a tiny stabilizing signal?

Default I'll ship: **exactly 0%** — that's what "100%" means in plain English. Tell me if you want the 1% floor instead.