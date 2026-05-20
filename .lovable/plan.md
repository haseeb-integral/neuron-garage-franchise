## Goal

Add a top-bar **"Ask"** input on the Email Outreach screen that answers natural-language questions about what's happening on that screen (queue, replies, campaigns, candidates). Read-only — no writes. Built as a reusable `<AskAssistant />` so City Search, Teacher Search, and Pipeline can adopt it later with one line.

## What the user gets (Phase 1)

A slim input in the Email Outreach page header: *"Ask about queue, replies, campaigns…"*. Press Enter → answer streams below it in a collapsible panel. Examples it can answer:
- "How many leads are queued vs sent today?"
- "Which campaign has the highest reply rate this week?"
- "Why is Adra still in triage — what's her state?"
- "Show me positive replies from yesterday I haven't promoted"
- "Which prospect batches haven't been pushed to SmartLead yet?"

## Architecture (reusable foundation)

```text
src/components/ask/
  AskAssistant.tsx        # Top-bar input + streaming answer panel (UI)
  useAsk.ts               # AI SDK useChat hook wired to /functions/v1/ask
  registry.ts             # Per-screen config: { screen, systemPrompt, tools[] }
  screens/
    email.ts              # Email screen's tools + system prompt
    (city.ts, teacher.ts, pipeline.ts — added later)

supabase/functions/ask/
  index.ts                # Single edge function, routes by `screen` param
  _shared/ai-gateway.ts   # Lovable AI Gateway provider (already pattern in repo)
```

**Usage on any screen** (after Phase 1):
```tsx
<AskAssistant screen="email" />
```

## Tools exposed to the model (Email screen, read-only)

All are thin wrappers over existing Supabase queries — same data the UI already reads:

| Tool | Purpose |
|---|---|
| `query_outreach_queue` | Filter by state/date/campaign; returns counts + sample rows |
| `query_reply_triage` | Filter by sentiment/state/date; returns counts + sample rows |
| `query_campaigns` | SmartLead campaign list with stats (sent, replied, bounced) |
| `query_prospect_batches` | Batch status, push status to SmartLead |
| `get_candidate` | Look up a candidate by name/id, return profile + pipeline status |
| `query_email_accounts` | Connected sender accounts and health |

Each tool has a narrow Zod `inputSchema`, returns compact JSON (capped row counts), and is scoped to the authenticated user via RLS. No mutation tools in Phase 1.

## Model & cost

- **Model:** `google/gemini-3-flash-preview` via Lovable AI Gateway (no API key — already wired)
- **Estimated cost at 3 users × ~50 questions/day:** under **$0.20/month**. Hard ceiling under $2/month even with heavy use.
- **Latency:** sub-second first token via streaming.

## UI behavior

- Slim single-line input in the Email Outreach page header (next to existing title)
- Enter → opens a slide-down panel below the header with the streamed answer
- Answer renders markdown + small data tables (reuses existing table primitives)
- "Show data sources" disclosure shows which tools were called + raw JSON (your **"Show the math"** rule applies here too)
- Close panel = X button. State doesn't persist across reloads (Phase 1).
- Doesn't touch any existing functionality, layouts, buttons, or data flows.

## Technical details

- **Backend:** new edge function `ask` using AI SDK `streamText` + `tool` + `stepCountIs(50)`, returns `toUIMessageStreamResponse`.
- **Frontend:** AI SDK `useChat` + `DefaultChatTransport` pointed at the function. Render `message.parts` (text + tool parts) so the data-sources disclosure works.
- **Auth:** function validates JWT, scopes all tool queries to `auth.uid()`.
- **Tool deferral:** not needed at this size (~6 tools). Register directly.
- **No new tables.** No schema changes. No new secrets (LOVABLE_API_KEY already present).

## What this is NOT (deferred)

- ❌ No write actions (no promote/snooze/draft) — Phase 2 if useful
- ❌ No cross-screen memory or unified agent — only after 2+ screens prove value
- ❌ No conversation history persistence — session-only for now
- ❌ Not added to other screens yet — foundation is reusable, but only Email is wired

## Doc sync after build

Per AGENTS.md Rule 9, after implementation I'll draft one-line updates for `PROJECT_CONTEXT.md` (new component + edge function), `APIS.md` (Lovable AI Gateway usage), and `HOW_IT_WORKS.md` (Email screen now has an Ask bar). Will wait for your "go" before writing.

## Risk: low

Pure addition. No changes to existing email functionality, schema, or RLS. Easy to remove (delete one component + one edge function).
