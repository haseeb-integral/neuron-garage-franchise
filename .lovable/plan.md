## Goal

Add AI-powered "Ask" search + Top-N ranked view to City Search, using Lovable AI Gateway (Gemini 2.5 Flash). Replace default table view with a ranked Top-N list, add a prominent Ask AI bar that re-ranks results and explains its reasoning, with multi-turn refinement and saved query history.

## Scope

In:
- New `ai-city-query` edge function (Lovable AI Gateway, structured JSON output)
- New `ai_query_history` table (per-user, threaded for multi-turn)
- New UI: `AskAiBar`, `AiAnswerCard` (with collapsible reasoning chain), `RankedMarketsList`
- Wire into existing `cityScoringStore` + `clientSubWeightScoring.ts`
- Default landing = Top 20 ranked **by user's current weights** (recomputed client-side)
- View toggle: 10 / 20 / 50 / All (table view stays available)
- Query history dropdown (Google-style) reading from `ai_query_history`
- Doc sync (PROJECT_CONTEXT, HOW_IT_WORKS, OPEN_TASKS, GLOSSARY, APIS)

Out:
- New metrics / data pulls (AI only operates on 14 live metrics)
- Edits to scoring math (AGENTS Rule: Sam only)
- Voice input, sharing threads across users

## UI Flow

```text
┌─ City Search ───────────────────────────────────────────────┐
│ [Ask AI: "best Texas markets for young families…"   ↵]  ▾   │  ← query history dropdown
│   ↑ prominent at top                                         │
├──────────────────────────────────────────────────────────────┤
│ ┌─ AI Answer ─────────────────────────────────────────────┐ │
│ │ Summary: Frisco, Plano, Round Rock lead on demand+      │ │
│ │ schools. Filtered TX, min_income ≥ $90k.                │ │
│ │ Applied: state=TX, weights demand+15, schools+10        │ │
│ │ ▾ Show AI reasoning (4 steps)                           │ │
│ │ [Refine →                                          ↵]   │ │  ← multi-turn
│ └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ View: ◉ Top 20  ○ Top 10  ○ Top 50  ○ All  |  ⊞ Table       │
│ ─────────────────────────────────────────────────────────── │
│ 1.  Frisco, TX        92  Tier A   [why?]                   │
│ 2.  Plano, TX         90  Tier A   [why?]                   │
│ ... (re-ranked using user's current weights + AI nudges)    │
└──────────────────────────────────────────────────────────────┘
```

## Architecture

**Edge function** (`supabase/functions/ai-city-query/index.ts`)
- Input: `{ query, threadId?, previousMessages?[] }`
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with structured output schema
- Returns: `{ summary, filters:{state?, minScore?, tier?}, weightAdjustments:{[category]:delta}, reasoning_steps:string[], dataGaps:string[] }`
- Validates all metric/category keys against `sowMetricRegistry.ts` before returning — strips hallucinated keys
- Handles 429 / 402 with explicit error codes for frontend toast
- Persists query+response to `ai_query_history`

**Database** (one migration)
```sql
create table ai_query_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  thread_id uuid not null,         -- groups multi-turn conversations
  parent_id uuid,                  -- previous turn in thread
  query text not null,
  response jsonb not null,         -- full structured response
  created_at timestamptz default now()
);
-- RLS: user_id = auth.uid() for all ops
-- Index on (user_id, created_at desc) for history dropdown
```

**Frontend** (3 components + store changes)
- `AskAiBar.tsx` — input + history dropdown (last 10 queries) + Enter/Esc/↑↓ keyboard nav
- `AiAnswerCard.tsx` — summary, applied filters/weights chips, collapsible reasoning chain, "Refine →" input for multi-turn
- `RankedMarketsList.tsx` — Top-N card/row view with rank number, composite score, tier badge, click to open existing `MarketDetailDrawer`
- `cityScoringStore.ts` adds: `aiThreadId`, `aiTurns: AiTurn[]`, `viewMode: 'ranked'|'table'`, `topN: 10|20|50|'all'`
- Ranking uses **user's current applied weights** (Q1 = option A). When AI returns weight nudges, they apply on top via existing `clientSubWeightScoring.ts`. User sees badge "ranked by your weights + AI adjustments".

## Build Steps

1. Migration: create `ai_query_history` + RLS + index
2. Edge function `ai-city-query` with system prompt referencing `sowMetricRegistry`, structured output, history persistence
3. Provision `LOVABLE_API_KEY` (already present per secrets list — verify)
4. Build `AskAiBar` + history dropdown (queries from `ai_query_history`)
5. Build `AiAnswerCard` with collapsible reasoning + Refine input
6. Build `RankedMarketsList` + view toggle (10/20/50/all + table)
7. Wire into `CityScoring.tsx` page above existing `FilterBar`
8. Store additions + multi-turn thread handling (cap 6 turns)
9. Doc sync: draft updates, wait for "go"

## Key Decisions (locked from your answers)

- **Default ranking when user has custom weights:** Top 20 by user's current weights (option A)
- **Query history:** Supabase table `ai_query_history`, Google-style dropdown
- **Multi-turn:** Yes, "Refine →" on answer card, cap 6 turns per thread
- **Reasoning chain:** Yes, collapsed by default, shows data gaps explicitly
- **AI provider:** Lovable AI Gateway, model `google/gemini-2.5-flash`

## Risks

- AI hallucinates metric keys → mitigated by registry validation in edge function
- Multi-turn token cost → mitigated by 6-turn cap + history truncation
- User confusion "why did ranking change?" → mitigated by visible applied-filters/weights chips on AiAnswerCard

## What I'm NOT doing

- New data sources, scoring math changes, new categories
- Replacing the existing table view (it stays as toggle option)
- Sharing queries across users
