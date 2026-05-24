## Goal

Two related upgrades to the City Detail experience:

1. **Kill the deterministic exec summary + "Detailed Explanation."** Replace both with output from a single, well-trained AI analyst agent ("CityAnalyst") whose voice and depth are good enough that Kaylie, Sam, and the franchise recruiting team would put it in front of a candidate without edits.
2. **Add an "Ask AI" agent ("AskCity")** on the City Detail page that answers free-form questions about the selected city, can compare it to any of the other 816 cities, and ships with pre-populated suggested questions. Backed by quickly-searchable knowledge files so it consistently performs at 10/10.

Honest read on today's quality: the current write-up is **a competent 7/10** — accurate, on-brand, never drifts from the math — but it is template prose. A franchise sales conversation needs analyst voice, judgment, and specificity. This plan gets us to 10/10.

---

## Part 1 — CityAnalyst (replaces deterministic summary + detailed report)

### What the agent must produce, every time

Two artifacts per city, generated together in one call to avoid drift:

- **Executive Summary** (shown in the right-column card on the City Detail page) — 90–130 words, one tight paragraph, partner-meeting tone. Leads with the verdict, names the 2 most important signals by number, ends with the recommended next move.
- **Market Research Report** (shown in the expanded drawer, replaces "Detailed Explanation") — 600–900 words, 4 sections with H3s:
  1. *Market Snapshot* — score, tier, what kind of market this is in plain English
  2. *Demand-Side Read* — household economics, child population, parent profile
  3. *Supply & Competitive Read* — teacher pool, school footprint, brand saturation
  4. *Recommended Next Move* — concrete action tied to the tier (recruit / watchlist / park) with named follow-ups

### Voice & guardrails (built into the system prompt)

- Analyst voice — confident, specific, never marketing-fluff
- Voice rules already in place stay: no "in our experience" / "we've seen" — neutral analytical framing
- **Numbers come only from the structured input payload** — model never invents a figure, never rounds differently from `marketView`, never restates a percentage in a new form
- If a signal is missing, the agent must say so explicitly rather than fabricate
- Banned words list: "synergy", "robust", "leverage", "ecosystem", "vibrant"
- Required cadence: short sentences mixed with one longer one; no bullet dumps inside paragraphs
- Recommended-next-move section must match the tier — Tier A says "promote to active recruiting", Tier D says "park unless catalyst"

### Model & infra

- Edge function `city-analyst` (new), calls Lovable AI Gateway
- Model: `google/gemini-3-flash-preview` for production runs (fast, cheap, plenty good for this length); fall back / "Regenerate (Pro)" button uses `google/gemini-2.5-pro` for the rare 11/10 write-up
- Structured tool-calling output so we always get `{ executive_summary: string, report_sections: { snapshot, demand, supply, next_move } }` — no JSON-mode parsing edge cases
- System prompt + few-shot pair (one Tier-A city, one Tier-D city) shipped as a knowledge file the function reads at boot

### Caching

- Cache by `(city_id, weights_hash, model_id, prompt_version)` in a new `city_narratives` table
- First view of a city generates and stores; subsequent views are instant
- "Regenerate" button on the drawer invalidates the cache row and re-mints
- Bulk pre-warm script (optional, run once before the demo) generates narratives for the ~50 cities most likely to be clicked

### Frontend changes

- `ExecutiveSummaryPanel.tsx`:
  - Delete the deterministic `summary`, `argument`, `verdictSentence`, `demandSentence`, `tamSentence`, `oppSentence`, `detailedExplanationParagraphs` blocks
  - Replace with `useCityNarrative(cityId, weightsHash)` hook → loading shimmer → AI output rendered through `react-markdown`
  - Keep the "Key market signals, explained" rows and per-row pill explanations (those are short, deterministic, and add real value)
  - Keep the calibrated pillar bars and score gauge — these are math, not prose
- "Regenerate" + "Regenerate with Pro model" buttons in the drawer header
- Error state: if the AI call fails, fall back to a one-line "Narrative unavailable — open Ask AI to discuss this market" with a button into AskCity. No silent regression to deterministic prose.

---

## Part 2 — AskCity (Ask AI agent on the City Detail page)

### UX

- New "Ask AI about this city" panel inside the City Detail drawer, below the report
- 5 **pre-populated suggested questions** rendered as chips, regenerated per-city from a small template:
  1. "Why is {city} scored {score}/100?"
  2. "How does {city} compare to {top-peer-city}?"
  3. "What would have to change for {city} to move up a tier?"
  4. "Who are the realistic competitors I'd face here?"
  5. "What teachers should I recruit first in {city}?"
- Free-text input below the chips
- Streaming responses (token-by-token, SSE) rendered with markdown
- Conversation history kept in component state for the session; persisted to `ask_city_conversations` table keyed by `(user_id, city_id)` so re-opening a city restores the thread
- Inline "Compare to…" autocomplete that injects a second city's full context into the next user turn

### Comparison capability (any of the 817 cities)

- When the user picks a comparison city, the edge function loads **both** cities' full context bundles (see knowledge files below) and the system prompt switches into "comparative analyst" mode
- Output format for comparisons: a short verdict paragraph + a 3-row table (Demand / TAM / Competitive) with the deltas highlighted, then a "which would you pick and why" paragraph
- Comparison is a first-class tool call (`compare_cities(city_a_id, city_b_id)`) so the agent can also do it spontaneously when the user's free-text question implies one ("is Austin better than Philly?")

### Agent tools (function-calling)

The AskCity agent has four tools it can call mid-conversation:

1. `get_city_brief(city_id)` — returns the compact context bundle for any of the 817 cities (sub-100ms)
2. `get_city_signals(city_id)` — returns the 12 key signals + benchmark bands
3. `compare_cities(city_a_id, city_b_id)` — returns a pre-diffed structure ready for narrative
4. `search_cities(filter)` — e.g. "find me Tier-A cities in the Southeast with teacher pool > X" — for follow-ups like "what's a better alternative?"

All four tools are thin wrappers over existing `signals_for_display` + `market_view` data — no new heavy compute.

### Knowledge files (the thing that makes it 10/10)

Stored in `supabase/functions/_shared/knowledge/`, loaded by the edge function at cold start, indexed for fast lookup. Plain markdown + small JSON, no vector DB needed at this scale — 817 cities is well under the threshold where embeddings beat structured lookup.

| File | Purpose | ~Size |
|---|---|---|
| `voice-and-style.md` | Voice rules, banned words, cadence, tier-matched tone — shared with CityAnalyst | 2 KB |
| `scoring-methodology.md` | How the 3 pillars are computed, what each signal means, how tiers map to scores | 6 KB |
| `signal-glossary.md` | One-paragraph plain-English explanation per signal_key, plus what HIGH/MED/LOW/SATURATED means in business terms | 8 KB |
| `tier-playbook.md` | What we do with Tier A / B / C / D cities — the actual recruiting motion. This is the file that lets the agent answer "what should I do next?" credibly | 4 KB |
| `comparison-framework.md` | How to compare two cities — what tradeoffs matter (demand vs supply vs whitespace), how to break ties | 3 KB |
| `franchise-economics.md` | The unit economics assumptions that drive "is this market worth it" — pricing, instructor ratios, breakeven volume — pulled from Kaylie's existing spec | 4 KB |
| `competitive-landscape-context.md` | The 15 national brands we track, what kind of competitor each one is, how their presence affects entry strategy | 5 KB |
| `city-briefs/{city_id}.json` (817 files) | Pre-baked compact JSON: score, tier, pillars, top-3 strongest + weakest signals, metro context, named peers (3 most similar cities), notable facts | ~1 KB each |

Pre-generation script (`scripts/build-city-briefs.ts`) runs once against `city_metrics` + `signals_for_display` to mint the 817 briefs — re-runnable any time data refreshes. This is the move that makes comparison feel instant instead of slow.

### Searchability

- `city-briefs` are stored in a new `city_briefs` Postgres table (one row per city, JSONB column + indexed `tier`, `state`, `metro`, `pillar_demand`, `pillar_tam`, `pillar_opp` columns)
- `search_cities` tool just runs an indexed SQL filter — no embeddings needed at this scale
- The 7 prose knowledge files are loaded as plain strings into the system prompt for every conversation (total ~35 KB, well within Gemini 3 Flash's context budget) — no retrieval step, no chunking, no RAG complexity. Simpler is better here.

### Model & infra

- Edge function `ask-city` with streaming SSE response
- Model: `google/gemini-3-flash-preview` (good streaming latency, strong tool-calling, cheap)
- `verify_jwt = false` for the function entry, but JWT is validated in code (per the auth pattern)
- Rate limit handling: surface 402 / 429 to the UI with a friendly toast
- Conversation persisted to `ask_city_conversations` (user_id, city_id, messages JSONB, updated_at) with RLS so only the owning user reads it

---

## Sequenced build order

1. **Knowledge layer first** — write the 7 prose files, build the `city_briefs` table + pre-gen script, run it. Without this, neither agent is 10/10.
2. **CityAnalyst edge function + cache table + frontend swap.** Delete the deterministic prose blocks. Verify on Philadelphia (the example), then 4 contrast cities (one Tier-A non-coastal, one Tier-B, one Tier-C, one Tier-D).
3. **AskCity edge function + tools + persistence table + RLS.**
4. **AskCity UI** — pre-populated chips, streaming chat, comparison autocomplete, conversation restore.
5. **Pre-warm pass** — generate CityAnalyst narratives for the top ~50 cities so the demo never waits on the first call.
6. **QA pass against Philadelphia + 4 contrast cities** for both agents. Check voice, accuracy of every cited number against `marketView`, comparison correctness, fallback states.

### Technical risks I'm accounting for

- **Number drift** — the model invents a figure that contradicts the gauge. Mitigation: structured tool-calling output, model receives numbers in a fixed JSON block it must echo verbatim, post-generation sanity-check that every digit in the prose appears in the input payload.
- **Voice regression** — the model writes "vibrant ecosystem" once and the whole thing reads like a deck. Mitigation: explicit banned-words list, two few-shot examples in the prompt, "Regenerate with Pro" escape hatch.
- **Latency on first view** — cold generation is ~3–6s on Gemini 3 Flash. Mitigation: cache + pre-warm + skeleton loader.
- **Comparison hallucination on obscure cities** — agent invents context for City B. Mitigation: comparison is a *tool call* that returns concrete data, not free recall — the prose is forced to be grounded in the returned bundle.

### Out of scope for this pass

- Vector embeddings / RAG (overkill at 817 entries with ~1 KB each)
- A separate "compare two cities" page (handled inside AskCity)
- User-editable narrative (could be a v1.1 feature)
- Multi-city batch comparison ("show me my top 10 in the Southeast") — `search_cities` enables it, but the UI for it is post-v1.0
