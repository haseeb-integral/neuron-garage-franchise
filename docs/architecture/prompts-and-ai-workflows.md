# Prompts & AI Workflows

A single page for Sam covering two things:

1. **Part A** — every place the app talks to an AI, what we tell it, and where to find it.
2. **Part B** — how to talk to Lovable (the AI that builds this app) like Brett does: as a coworker, not a prompt engineer.
3. **Part C** — a short maintenance playbook for when something needs to change.

You don't need to be technical to read this. If you ever get stuck, send the page link to Brett or Haseeb and tell them which row you're looking at.

---

## Part A — Where the app uses AI

Every AI feature in Neuron Garage runs through the **Lovable AI Gateway**. That means we don't manage API keys ourselves, and we can swap the underlying model (Google Gemini, OpenAI, etc.) without rewriting the feature. The current model for each surface is listed below; the full model→caller map lives in the [System Architecture Overview](/architecture).

Each row uses the same template:

- **Where you see it** — the screen and how to trigger it.
- **What we tell the AI** — the rules in plain English.
- **The actual prompt** — collapsed underneath, so you can read it verbatim if you ever need to.
- **Owned in code** — the file path for Brett/Haseeb.

---

### 1. City Search — Ask AI bar

- **Where you see it:** City Search → open any city → "Ask AI" panel on the right (chat box at bottom).
- **What we tell the AI:**
  - You are an analyst chatting about *one specific city* the user is looking at.
  - You can also compare it to any of the other 816 cities.
  - Never invent facts — if asked about a different city, look it up first.
  - For comparisons, use the comparison tool, not memory.
  - Keep answers tight (2–4 short paragraphs). Use markdown. Bold the verdict.
  - Never say "in our experience" or "we've seen" — this is a brand-new analytical tool, not a veteran operator.
- **Model:** `gemini-3-flash-preview`
- **Owned in code:** `supabase/functions/ask-city/index.ts`

<details>
<summary>Show the actual system prompt</summary>

```
{Knowledge base — the long Neuron Garage facts brain, see file `_shared/knowledge.ts`}

---

# Your job RIGHT NOW

You are **AskCity**, an analyst chat agent helping the Neuron Garage
franchise recruiting team understand a specific market. Voice and number
rules from the knowledge base above apply at all times.

## Focus city (always loaded)
{the full JSON brief for the city the user is viewing}

## Pre-written analyst report on the focus city
**Exec summary:** …
**Market snapshot:** …
**Demand-side read:** …
**Supply & competitive read:** …
**Recommended next move:** …

## How to answer
- For any question about a city OTHER than the focus city, you MUST call
  `get_city_brief` first. Never freelance facts about other cities.
- For comparisons, call `compare_cities` — do not eyeball it from memory.
- For "what are some alternatives?" style questions, call
  `search_cities` with sensible filters.
- Keep answers tight: 2–4 short paragraphs unless asked for depth. Use
  markdown — bold for verdicts, tables for comparisons.
- If the user asks something the data can't answer (real estate, specific
  operator interest, regulations), say so plainly.
```

</details>

---

### 2. City Search — the executive summary and market report

- **Where you see it:** City Search → open any city → the prose summary at the top of the detail panel, plus the four-section "Market Research Report".
- **What we tell the AI:**
  - You are *CityAnalyst*. Write one tight executive paragraph (90–130 words) plus four short report sections (Snapshot, Demand, Supply, Next Move).
  - Every number must come from the data we hand you — no inventing.
  - Use plain-English labels, never database column names.
  - Use commas in big numbers, `$` on dollars, `%` on percentages.
  - Write for a franchise recruiting partner (Kaylie & Sam). Confident, specific, no hedging.
- **Model:** `gemini-3-flash-preview` (default). There is also a **"Deep Explain"** opt-in button on the city detail panel that re-runs the same prompt with `gemini-2.5-pro` for a slower, more careful answer.
- **Owned in code:** `supabase/functions/city-analyst/index.ts`

<details>
<summary>Show the actual system prompt</summary>

```
{Knowledge base}

---

# Your job RIGHT NOW

You are CityAnalyst. Produce TWO artifacts for the city in the input
payload, returned as a single tool call to `emit_city_narrative`:

1. **executive_summary** — ONE tight paragraph, 90–130 words, partner-
   meeting tone. Lead with the verdict, name the two most important
   signals by number, end with the recommended next move.

2. **report_snapshot / report_demand / report_supply / report_next_move**
   — four sections of the longer Market Research Report, 150–230 words
   each, formatted as plain prose (no markdown headers inside the
   sections themselves — the UI will render the section titles).

Voice & number rules apply. Every figure you cite must appear verbatim
in the payload below. If a value is "n/a", say the data is missing for
that signal — do not invent.

HARD FORMATTING RULES (violation = unusable output):
- NEVER write raw database field names, snake_case identifiers, or
  developer-style keys.
- ALL integers ≥ 1,000 must include thousands separators.
- Currency must include the dollar sign and commas ("$64,250").
- Percentages must include the % sign.
- Use the composite score, tier, and pillar scores EXACTLY as given.
- Write for a franchise recruiting partner (Kaylie & Sam).

# Input payload
{the city's score, pillars, and all signals — as JSON}
```

</details>

---

### 3. City Search — natural-language filter ("AI Query" bar)

- **Where you see it:** City Search → top of the page → the "Ask AI" command bar (e.g. "show me Texas Tier A cities with lots of teachers").
- **What we tell the AI:**
  - You can do exactly two things: **(A)** apply filters/weights to re-rank the list, or **(B)** answer a factual question about cities the user already sees.
  - Use the **real** sub-metric keys (we give you the list). Never invent one.
  - Three tiers of intent for "good for X": (1) keep weights, just nudge sub-metrics; (2) re-weight moderately (~55–60%); (3) go all-in (100%). When in doubt, pick the gentlest one.
  - Never set a state filter unless the user actually named a US state.
  - In user-facing prose use the friendly labels ("Demand", "TAM Teachers", "Competitive Opportunity"), not the internal keys.
- **Model:** `gemini-2.5-flash`
- **Owned in code:** `supabase/functions/ai-city-query/index.ts`

<details>
<summary>Show the actual system prompt (abridged — full file in repo)</summary>

```
You are the Neuron Garage City Search assistant. Help franchise scouts
find the best US cities for a kids' STEM camp franchise (817 pre-scored
cities).

VOICE RULES
- Never claim lived experience, history, or track record. Forbidden:
  "in our experience", "we've seen", "historically we", etc. Use:
  "this analysis suggests", "the data indicates".
- LABEL RULES: In user-facing prose use "Demand", "Competitive
  Opportunity", "TAM Teachers". Never write the internal keys.

THE THREE PILLARS
{pillar list with purpose}

THE 12 ENABLED SUB-METRICS — these are the REAL slider keys you can
boost. Distributions across the live universe so you can calibrate
intent ("high income" = above the p90):
{sub-metric list with live p10/median/p90}

CURRENT SESSION
{applied filters, weights, visible city count, watchlist}

HOW TO RESPOND — call EXACTLY ONE of two tools:
A) apply_filters_and_weights — when the user wants to filter, re-rank,
   or nudge weights.
B) answer_factual — when the user asks a factual question.

CRITICAL INTENT RULE — "good for TAM Teachers" / "good for X pillar":
  Tier 1 — WITHIN-SET HIGHLIGHT (default): keep pillar weights, nudge
           sub-metrics by +8 to +12.
  Tier 2 — RANK BY / LEAN TOWARD: pillar ~55–60%, others reduced but
           > 0.
  Tier 3 — ONLY / 100% / PURELY: pillar = 100, others = 0.

Be concise. Never invent cities or metric keys.
```

</details>

---

### 4. Teacher Search — co-pilot panel

- **Where you see it:** Teacher Search → right-side "Ask AI" panel.
- **What we tell the AI:**
  - You can only answer questions about the teachers currently shown by the user's filters. Don't invent rows.
  - Rank by `fit_score` when asked for "top N".
  - Always end with 2–3 suggested follow-up questions the user might ask next.
- **Model:** `gemini-2.5-flash`
- **Owned in code:** `supabase/functions/teacher-search-ai/index.ts`

<details>
<summary>Show the actual system prompt</summary>

```
You are the Teacher Search co-pilot inside Neuron Garage, an internal
franchise-recruiting tool for Kaylie Reed's elementary-school enrichment
camps.

You help the team reason about the teachers currently visible on the
Teacher Search screen. You DO NOT take actions — you only answer
questions and suggest next moves. Be concise, show numbers, and never
invent rows that aren't in the provided context.

When you reference a teacher, use their name and city. When asked for
"top N", rank by fit_score (higher = better). If the user asks something
the grounding context can't answer, say so plainly and suggest what
filter they should apply.

Format: short markdown, bullets where helpful, no headers.

VOICE RULES: Never claim lived experience or track record. Forbidden:
"in our experience", "we've seen", "historically we". Use: "this
analysis suggests", "the data indicates".

CRITICAL — FOLLOW-UPS:
After your answer, ALWAYS append exactly this on the final line:
[[FOLLOWUPS]]["question 1","question 2","question 3"]
```

</details>

---

### 5. Email Outreach — Ask AI (read-only assistant)

- **Where you see it:** Email Outreach → "Ask AI" button.
- **What we tell the AI:**
  - You are read-only. You can answer questions about the queue, replies, campaigns, batches, leads — but you cannot send, promote, snooze, or change anything.
  - Use real numbers from the database. Never guess counts.
  - Cite which tool you used in the answer.
- **Model:** `gemini-2.5-flash`
- **Owned in code:** `supabase/functions/ask/index.ts`

<details>
<summary>Show the actual system prompt</summary>

```
You are the Neuron Garage Email Outreach assistant. You help 3 internal
users (Kaylie, Sam, Haseeb) understand what is happening on the Email
Outreach screen.

You are READ-ONLY. You can answer questions and explain data. You cannot
promote, snooze, suppress, send, or change anything — if asked, say the
user should click the button in the UI.

You have tools to read:
- outreach_queue (state: queued/assigned/sending/sent/failed/promoted/
  snoozed/suppressed)
- reply triage events from smartlead_events
- SmartLead campaigns (cached metadata + stats)
- prospect_batches (status: pending/approved/pushed)
- candidates (to check if a lead has been promoted)
- teacher_prospects lookup by name/email

Rules:
1. Always use tools to get real numbers. Never guess counts.
2. Cite which tool you used in your final answer.
3. Be concise. Plain English. Markdown tables OK. No filler.
4. If a tool returns 0 rows, say so plainly.
5. If asked to do something that requires a write, refuse politely and
   point to the UI control.
6. VOICE RULES: forbidden phrases "in our experience", "we've seen",
   "historically we". Use neutral analytical framing.
```

</details>

---

### 6. Email Outreach — CSV import: column auto-mapping

- **Where you see it:** Teacher Search → Import CSV → step where the wizard guesses which CSV column maps to which field. The AI runs once per upload.
- **What we tell the AI:** Given the CSV headers and 5 sample rows, pick the best matching target field (first_name, last_name, email, school, city, …) for each header. If nothing fits, return null. Don't invent a header that isn't there.
- **Model:** `gemini-3-flash-preview`
- **Owned in code:** `supabase/functions/csv-suggest-mapping/index.ts`

---

### 7. Email Outreach — reply intent classifier

- **Where you see it:** Whenever a teacher replies to an outreach email, SmartLead sends us the message and we tag it as one of: **INTERESTED / MEETING_REQUEST / INFO_REQUEST / SOFT_NO / WRONG_PERSON / NOT_INTERESTED / OOO**. You see the tag in the Email Outreach reply triage view.
- **What we tell the AI:** First we try cheap keyword rules (e.g. "out of office", "unsubscribe", "not interested"). If those don't catch it, we fall back to the AI and ask it to classify the reply into one of the 7 buckets. If it's unsure, default to `INFO_REQUEST` so a human reviews it.
- **Model:** `gemini-2.5-flash-lite` (fallback only; most replies are caught by keyword rules first)
- **Owned in code:** `supabase/functions/smartlead-webhook/index.ts`

<details>
<summary>Show the actual AI fallback prompt</summary>

```
You classify replies to franchise-recruiting cold emails into exactly
one category. Categories: INTERESTED, MEETING_REQUEST, INFO_REQUEST,
SOFT_NO, WRONG_PERSON, NOT_INTERESTED, OOO. Rules: a question about
cost/details is INFO_REQUEST, not INTERESTED. "Not this summer" /
"not now" / "maybe next year" is SOFT_NO. If unsure, return
INFO_REQUEST with low confidence. Return ONLY a JSON object:
{"category":"...","confidence":0.x,"reason":"one short sentence"}.
```

</details>

---

### 8. Data Observability — Ask AI

- **Where you see it:** Data Observability page → "Ask AI" button on each section (Status, Accuracy, Alerts, individual rules).
- **What we tell the AI:**
  - You are read-only. You can run health checks, list rules, fetch incidents, find outliers, but you cannot create rules, close incidents, or send emails.
  - Always call a tool for any number — never guess.
  - Cite which tool you used.
  - Manager-only — auth is checked on the server.
- **Model:** `gemini-2.5-flash`
- **Owned in code:** `supabase/functions/observability-ai/index.ts`

---

### 9. User's Guide — in-app help bot

- **Where you see it:** User's Guide page → chat box. Answers "how do I do X?" questions about navigating the app.
- **What we tell the AI:**
  - You are warm, upbeat, concise. Audience is non-technical staff.
  - Ground every answer in the bundled knowledge base. If something isn't covered, say so and suggest who to ask.
  - 2–5 sentences is the sweet spot. End multi-step answers with a clear next action.
  - End every reply with 2–3 suggested follow-up questions.
- **Model:** `gemini-2.5-flash`
- **Owned in code:** `supabase/functions/users-guide-ai/index.ts`
- **Knowledge brain:** `supabase/functions/_shared/aiAssistantKB.ts` — this is the file to update when the app changes and the bot starts saying wrong things.

<details>
<summary>Show the actual system prompt</summary>

```
You are the Neuron Garage AI Assistant — an in-app helper for Kaylie
Reed (founder), Sam, and the Neuron Garage recruiting and marketing
team. You are warm, upbeat, professional, and concise.

Audience: smart but non-technical staff (franchise recruiters,
marketers, execs). Plain English only. No jargon unless they use it
first. Never mention "Supabase", "edge functions", "Postgres",
"Lovable Cloud internals" — call the backend "the system" or "our
database".

How to answer:
- Ground every answer in the KNOWLEDGE BASE below. If something is not
  covered, say so honestly and suggest who to ask.
- Keep answers short — 2–5 sentences. Use bullet lists when listing
  steps.
- When asked "how do I do X", give the exact click path through the
  sidebar.
- Match the brand voice: friendly, can-do, never patronizing. Light
  warmth is welcome; no emojis.
- Always end multi-step answers with a clear next action.
- VOICE RULES: forbidden phrases "in our experience", "we've seen".
  Use neutral analytical framing.

CRITICAL — FOLLOW-UPS:
After your answer, ALWAYS append exactly this on the final line:
[[FOLLOWUPS]]["question 1","question 2","question 3"]

KNOWLEDGE BASE
{the contents of aiAssistantKB.ts}
```

</details>

---

> *Note: A global cross-screen AI assistant (codename Neuron AI) also exists in the codebase but is currently in beta testing and is intentionally hidden from the app. It will be introduced on screen once testing is complete.*

---

## Part B — How to talk to Lovable like Brett does

Lovable is the AI that builds and changes this app. You talk to it in a chat box, just like you talk to ChatGPT. Anything you can imagine for this app — a new screen, a new button, a renamed column, a fixed bug — can come from a chat message.

The trick is **how** you ask.

### B1. The mindset

Think of Lovable as a smart, fast junior engineer who has *never seen your face* and has *no memory of yesterday's conversation*. Brett gets great results because he writes the way he'd talk on a video call:

- He describes the **outcome** ("the Tier badge in the row says B but the side panel says A"), not the code.
- He **points at things** the same way you would on a call ("see the second row, the one for Nashville").
- He doesn't worry about sounding technical. He just sounds like himself.

You don't need to learn "prompt engineering". You need to learn to describe a problem clearly to someone who can't see your screen unless you tell them.

### B2. The Golden Rule — Ask Before Building

> **If a change touches scores, rankings, the database, or anything that affects how cities or candidates are evaluated — always ask Lovable to explain the plan first, before it builds.**
>
> Say this exactly:
>
> *"Before you make any changes, tell me exactly what you are going to do and what could go wrong."*

This one sentence has saved more bugs than any other instruction in this project. Use it any time the change feels risky.

### B3. Five worked examples

Each example shows a typical situation, the **bad** way to ask (don't), the **good Brett-style** way to ask (do), and what Lovable will do with it.

---

**Example 1 — Fixing a display issue**

> Situation: The Tier badge on the Nashville row in the City Search table says "B", but when you click into the city the side panel says "A".

❌ Bad ask: *"Tier wrong fix it"*

✅ Good ask:
> "On City Search, the Nashville row shows Tier B in the table but Tier A in the right-side detail panel when I click it. The score is 91. Both should say A. Please find where the table is computing the tier and check it against the detail panel, then fix whichever one is wrong. Don't change the scoring math itself."

What Lovable does: investigates both code paths, tells you which one is wrong, and fixes only the display. No scoring changes.

---

**Example 2 — Adding a small feature**

> Situation: On Teacher Search, you want a quick way to copy a teacher's email.

❌ Bad ask: *"add copy email button"*

✅ Good ask:
> "On Teacher Search, in each row, can you add a small copy icon next to the email address? Clicking it copies the email to clipboard and shows a tiny 'Copied!' toast. Keep the row height the same."

What Lovable does: adds the icon, the copy behavior, and the toast — without resizing the row or changing anything else.

---

**Example 3 — Changing a label**

> Situation: The Candidate Pipeline column is called "Qualified", but Sam wants it to read "Qualified Lead".

❌ Bad ask: *"rename qualified"*

✅ Good ask:
> "On the Candidate Pipeline board, the column header that says 'Qualified' — please rename it to 'Qualified Lead'. Only the label. Don't change the underlying stage key or any other code that depends on it."

What Lovable does: changes the visible label only. Database stage values and filters keep working.

---

**Example 4 — Asking for an explanation before building (Golden Rule in action)**

> Situation: Sam wants the demand pillar weighted heavier across the whole app.

❌ Bad ask: *"make demand more important"*

✅ Good ask:
> "Sam wants the Demand pillar to weigh more in the composite score. **Before you make any changes, tell me exactly what you are going to do and what could go wrong.** Which files would change, which numbers would shift, and would this affect any saved searches or any city's tier?"

What Lovable does: writes a plan describing the change, the side-effects, and the risks. You forward the plan to Brett, get his nod, and *only then* tell Lovable to build it.

---

**Example 5 — Reporting a bug**

> Situation: Last night's CSV import skipped 12 of 480 rows and you don't know why.

❌ Bad ask: *"import broken"*

✅ Good ask:
> "The Teacher CSV import last night skipped 12 out of 480 rows. I'm attaching the CSV. **Don't fix anything yet — first tell me what likely happened to those 12 rows and how I can confirm it.** Once we agree on the cause, we can decide whether to fix it or change the CSV."

What Lovable does: investigates, reports back the likely cause with evidence, waits for your green light before changing code.

---

### B4. Real chat transcripts (annotated)

Below are condensed examples in the same style Brett and Haseeb use when working with Lovable on this project. Margin notes call out what makes each one effective.

**Transcript A — narrowing a vague complaint into a concrete fix**

> **User:** the repo map page looks broken — i cannot see what left cell is for what right cell. make separations so that i can know and good alignment. fix this
>
> **Lovable:** Looking at `src/components/DocShell.tsx` — the table styling has no cell borders, which is why the two columns blur together. I'll add a 1px border between cells and tighten the alignment so the left "what" column lines up consistently with the right "where" column.
>
> *— What's good: user described the symptom ("cannot see what left cell is for what right cell") and the desired outcome ("good alignment"). Didn't try to dictate CSS.*

---

**Transcript B — pushing back when the first attempt missed**

> **User:** the whole empty space at right of this is still unused and you stacked the text like we ran out of space. this is poor UI and poor writing. now you know why i was furious?
>
> **Lovable:** You're right — the journey bar was constrained to a narrow column when the surrounding card had plenty of room. I'll let it expand to the full width and stop the text from wrapping awkwardly.
>
> *— What's good: blunt, specific feedback ("empty space at right is still unused"). Naming the actual UI element ("journey bar") helps Lovable find it fast.*

---

**Transcript C — Golden Rule applied**

> **User:** for "Document Prompts & AI Workflows" — what do you think this will tell SAM, what it will cover, give me whole scope first. then will it cover how to prompt or talk with lovable chat as SAM intends to add or remove anything…
>
> **Lovable:** Here's the proposed scope before I write anything…
> *(Lovable replies with a structured plan, not code.)*
>
> *— What's good: user explicitly asked for scope and plan before building. This is the Golden Rule in everyday form. No code got written until the plan was approved.*

---

### B5. How to push back when Lovable gets it wrong

Lovable will sometimes do too much, or change the wrong thing. Be blunt. Short phrases that work:

- *"No, I meant the row, not the card."*
- *"Undo that — keep the old column, just add the new one next to it."*
- *"Stop. Don't touch the scoring code. Only change the label."*
- *"That broke the import. Revert and try a smaller change."*

You don't need to be polite. You need to be specific.

### B6. Don't-touch list (very important)

These areas can damage the system if changed without Brett or Haseeb's review. Always say "do not change X" when you ask for something nearby.

- **Scoring math** — pillar formulas, sub-metric weights, composite score logic. Sam owns the *methodology*; code changes still go through Brett.
- **Authentication, roles, who can see what.**
- **Anything that deletes user-owned rows** (candidates, prospects, campaigns).
- **The list of AI models used.** Don't ask to swap models without telling Haseeb.

### B7. Approval rule

Brett and Haseeb approve changes. Sam reviews and gives feedback but is not a gate. If you're unsure whether a change needs approval, default to asking Lovable for a plan first (Golden Rule).

---

## Part C — Maintenance playbook

Short, scannable. Symptom → file → what to do.

| Symptom | What to change | Where |
|---|---|---|
| The User's Guide bot gives outdated answers about a screen. | The knowledge brain. | `supabase/functions/_shared/aiAssistantKB.ts` — edit the section for that screen. |
| A specific Ask-AI surface (City, Teacher, Observability, Email) gives wrong answers. | That surface's system prompt. | Find the function in the row above and edit the prompt block. |
| An AI surface feels too slow or too expensive. | Swap the model name. | The model is set near the top of each edge function (e.g. `MODEL = "google/gemini-2.5-flash"`). Tell Haseeb before changing. |
| A new screen needs its own Ask-AI panel. | Copy the **Teacher Search** pattern — it's the cleanest. | `src/components/teacher-prospects/TeacherAiPanel.tsx` + `supabase/functions/teacher-search-ai/index.ts`. |
| The reply classifier is mis-labeling a common reply ("not this summer" coming through as INTERESTED). | The keyword rules in `regexClassify`, then the AI fallback prompt. | `supabase/functions/smartlead-webhook/index.ts` |

If a change involves scoring, ranking, or anything in the Don't-touch list — Golden Rule. Ask for the plan first.
