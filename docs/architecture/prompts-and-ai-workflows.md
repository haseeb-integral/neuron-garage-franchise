# Prompts & AI Workflows

A single page, written for **Sam**.

It answers three things, in this order:

1. **What you can do in this app on your own** — your playground.
2. **How to talk to Lovable** (the AI that builds this app) so you get good results — the Brett way.
3. **Appendix** — a reference list of every place the app itself uses AI, kept for Brett and Haseeb. You can skip it.

If you ever get stuck, send this page link to Brett or Haseeb and tell them which section you're on.

---

## Part 1 — Your playground

This is the most important section. Everything below is something you can do **today, on your own, with confidence.**

### Things you can do any time, no permission needed

- **Candidate Pipeline**
  - Add a note to any candidate.
  - Move a candidate between stages (drag the card, or use the stage dropdown).
  - Open a candidate, look at any tab (Overview, Lead Sheet, Qualification, Notes, Stage History).
  - Star-rate a candidate.
- **City Search**
  - Open any city's detail panel and read the report.
  - Use the **"Ask AI" bar inside a city** to ask questions like *"how does this compare to Charlotte?"* or *"who are the closest competitors here?"*
  - Use the **natural-language filter** at the top (e.g. *"show me Texas Tier A cities with lots of teachers"*).
  - Save a search so you can come back to it.
  - Export the visible list.
- **Teacher Search**
  - Filter teachers, sort by fit score, open any teacher's detail panel.
  - Ask the right-side **Ask AI** panel about the teachers currently on screen.
  - Export the teacher list to CSV.
  - Move teachers into a campaign.
- **Email Outreach**
  - Read the queue, replies, and campaign stats.
  - Use the **Ask AI** button to ask questions about what's happening (it's read-only — it cannot send anything).
  - Click the UI buttons to promote / snooze / suppress a lead. Those buttons are safe.

> If a button exists in the UI, you are allowed to click it. The app is designed so that anything destructive asks you to confirm first.

### Things you can ask Lovable to do for you

These are safe, small changes. Ask in plain English in the Lovable chat:

- Rename a label, a button, a column header, or a tab.
- Change the color of a badge or a tag.
- Add a new column to a table, or hide one you never use.
- Add a new filter chip.
- Fix a visible display bug you can see on screen (a number that looks wrong, two places that disagree, text that's cut off).
- Reword a tooltip or a help message.
- Add a sort option.

### Things to ask Brett or Haseeb about first

Not because you can't — but because these affect everyone and a mistake is hard to undo. Send them a Slack/message and copy the request you'd give to Lovable.

- Anything that changes **scoring math** or **tier cutoffs** (the A / B / C / D thresholds, the weights between Demand / Operator & Venue Supply / Competitive Opportunity, what counts as a "good" market).
- Adding, renaming, or deleting **columns in the database**.
- Anything about **login, accounts, or who can see what**.
- Swapping the **AI model** behind a feature (e.g. moving from Gemini to GPT).
- Anything in Email Outreach that would **actually send emails** to real teachers (turning campaigns on/off, changing send rates, editing the templates that go out).

That's it. Everything outside this short list is yours to drive.

---

## Part 2 — Talking to Lovable like Brett does

Lovable is the AI that builds and changes this app. You talk to it in a chat box, just like ChatGPT. Anything you can imagine for this app — a new screen, a renamed column, a fixed bug — can come from a chat message.

The trick is **how** you ask.

### 2.1 The mindset

Think of Lovable as a smart, fast junior engineer who has **never seen your face** and has **no memory of yesterday's conversation**. Brett gets great results because he writes the way he'd talk on a video call:

- He describes the **outcome** ("the badge says B but the side panel says A"), not the code.
- He **points at things** the way you would on a call ("the second row, the one for Nashville").
- He doesn't try to sound technical. He just sounds like himself.

You don't need to learn "prompt engineering." You need to describe a problem clearly to someone who can't see your screen unless you tell them.

### 2.2 The Golden Rule — Ask Before Building

> **If a change touches scores, rankings, the database, or anything that affects how cities or candidates are evaluated — always ask Lovable to explain the plan first, before it builds.**
>
> Say this, word for word:
>
> *"Before you make any changes, tell me exactly what you are going to do and what could go wrong."*

This one sentence has prevented more bugs than any other instruction in this project. Use it any time the change feels risky.

### 2.3 Five worked examples

Each example shows a typical situation, the **bad** way to ask, the **good Brett-style** way to ask, and what Lovable will do.

---

**Example 1 — Fixing a display issue**

> Situation: The Tier badge on the Nashville row in the City Search table says "B", but when you click into the city the side panel says "A".

❌ Bad ask: *"Tier wrong fix it"*

✅ Good ask:
> "On City Search, the Nashville row shows Tier B in the table but Tier A in the right-side detail panel when I click it. The score is 91. Both should say A. Please find where the table is computing the tier and check it against the detail panel, then fix whichever one is wrong. Don't change the scoring math itself."

What Lovable does: investigates both places, tells you which one is wrong, and fixes only the display.

---

**Example 2 — Adding a small feature**

> Situation: You want a column on the Teacher Search table that shows when the teacher was last contacted.

❌ Bad ask: *"add last contacted"*

✅ Good ask:
> "On the Teacher Search table, can you add a new column called 'Last Contacted' that shows the date of the most recent outreach email we sent to that teacher? Put it just to the right of the Fit Score column. If we've never contacted them, show a dash."

What Lovable does: adds the column with the exact label, position, and empty-state you described.

---

**Example 3 — Changing a label**

> Situation: The pipeline column says "Qualified" but Kaylie wants it to say "In Review."

❌ Bad ask: *"rename qualified"*

✅ Good ask:
> "In the Candidate Pipeline, rename the column currently called 'Qualified' to 'In Review.' Don't change any of the logic behind it — just the label everywhere it appears."

What Lovable does: finds every place the label shows up and renames them. Nothing else changes.

---

**Example 4 — Asking for the plan before building (the Golden Rule)**

> Situation: You want Lovable to change how the composite city score is rounded. This affects every city.

✅ The right way to start:
> "I want to change how the composite city score gets rounded — right now we round to the nearest whole number; I want to round down (floor) instead. **Before you make any changes, tell me exactly what you are going to do, every file you'd touch, and what could go wrong.** Don't write any code yet."

What Lovable does: comes back with a plan. You read it. If anything looks scary, you forward it to Brett or Haseeb before approving. **Real example of how Brett responds when a plan looks fine**:
>
> *"I think this is fine. Just ask lovable to check before and after to take care and test after the change that there are no downstream issues. Move ahead."*
>
> Notice: he didn't write any code. He read the plan, gave a thumbs-up, and asked for a safety check. That's the whole pattern.

---

**Example 5 — Reporting a bug**

> Situation: You see something that's clearly wrong but you don't know why.

❌ Bad ask: *"broken"*

✅ Good ask (Brett's style — describe what you see, in order):
> "Something looks off on City Search. When I click into Nashville, the score in the right-side panel says 91, but the same score in the 'Selected Market' card in the middle says 53. Both are looking at the same city. I haven't changed any filters. Can you investigate which one is correct and tell me what's happening before fixing anything?"

What Lovable does: investigates, explains in plain English what it found, and only then proposes a fix. You decide whether to approve it.

### 2.4 Two things to remember

1. **Approvals**: Brett or Haseeb can approve any change. You are never blocking anyone — but on anything risky, loop them in.
2. **Lovable has no memory across chats**: each new chat starts fresh. Don't say *"like we discussed yesterday"* — repeat the context.

---

## Part 3 — Appendix: every place the app uses AI

> **Sam — you can skip this section.** It's a reference for Brett and Haseeb so they know which screen calls which AI, with which model, and where to find the prompt in the codebase.

Every AI feature in Neuron Garage runs through the **Lovable AI Gateway**. We don't manage API keys ourselves, and we can swap the underlying model (Google Gemini, OpenAI, etc.) without rewriting the feature.

For each surface below: what it does in plain English, the current model, and the file that owns the verbatim prompt. The prompts themselves are easier to read on GitHub than in this in-app viewer, so we link to the source file rather than pasting them in.

### 1. City Search — Ask AI bar (per-city)

- **Where:** City Search → open any city → "Ask AI" panel.
- **What we tell it:** You are an analyst for one specific city; you can compare it to any of the other 816; never invent facts about other cities (look them up via tools); keep answers tight, bold the verdict.
- **Model:** `gemini-3-flash-preview`
- **Prompt source:** `supabase/functions/ask-city/index.ts`

### 2. City Search — executive summary & market report

- **Where:** City Search → open any city → the prose summary at the top of the detail panel, plus the four-section Market Research Report.
- **What we tell it:** You are *CityAnalyst*; produce one tight executive paragraph (90–130 words) plus four short report sections; every number must come from the data we hand you; plain-English labels only; partner-meeting tone.
- **Model:** `gemini-3-flash-preview` (default). A **"Deep Explain"** button on the detail panel re-runs with `gemini-2.5-pro` for a slower, more careful answer.
- **Prompt source:** `supabase/functions/city-analyst/index.ts`

### 3. City Search — natural-language filter ("AI Query" bar)

- **Where:** City Search → top of the page → the "Ask AI" command bar.
- **What we tell it:** You do exactly two things — apply filters/weights to re-rank, or answer a factual question. Use only the real sub-metric keys we list. Three tiers of intent for "good for X"; when in doubt, pick the gentlest. Never invent a state filter.
- **Model:** `gemini-2.5-flash`
- **Prompt source:** `supabase/functions/ai-city-query/index.ts`

### 4. Teacher Search — co-pilot panel

- **Where:** Teacher Search → right-side "Ask AI" panel.
- **What we tell it:** Answer only about the teachers currently visible; rank by fit score for "top N"; always end with 2–3 suggested follow-up questions.
- **Model:** `gemini-2.5-flash`
- **Prompt source:** `supabase/functions/teacher-search-ai/index.ts`

### 5. Email Outreach — Ask AI (read-only)

- **Where:** Email Outreach → "Ask AI" button.
- **What we tell it:** You are read-only — answer questions about the queue, replies, campaigns; you cannot send, promote, snooze, or change anything. Always use tools for numbers, never guess. Cite which tool you used.
- **Model:** `gemini-2.5-flash`
- **Prompt source:** `supabase/functions/ask/index.ts`

### 6. Email Outreach — CSV column auto-mapping

- **Where:** Teacher Search → Import CSV → the step where the wizard guesses which CSV column maps to which field.
- **What we tell it:** Given the CSV headers and 5 sample rows, pick the best matching target field for each header. If nothing fits, return null. Don't invent headers.
- **Model:** `gemini-3-flash-preview`
- **Prompt source:** `supabase/functions/csv-suggest-mapping/index.ts`

### 7. Email Outreach — reply intent classifier

- **Where:** When a teacher replies to an outreach email, we tag it as one of: INTERESTED / MEETING_REQUEST / INFO_REQUEST / SOFT_NO / WRONG_PERSON / NOT_INTERESTED / OOO.
- **What we tell it:** Cheap keyword rules try first. The AI is only a fallback. Classify into one of 7 buckets; default to INFO_REQUEST if unsure so a human reviews it.
- **Model:** `gemini-2.5-flash-lite` (fallback only — most replies are caught by keyword rules first)
- **Prompt source:** `supabase/functions/smartlead-webhook/index.ts`

### 8. Data Observability — Ask AI

- **Where:** Data Observability page → "Ask AI" button on each section.
- **What we tell it:** You are read-only. You can run health checks, list rules, fetch incidents, find outliers; you cannot create rules or close incidents. Always call a tool for any number. Manager-only.
- **Model:** `gemini-2.5-flash`
- **Prompt source:** `supabase/functions/observability-ai/index.ts`

### 9. User's Guide — in-app help bot

- **Where:** User's Guide page → chat box.
- **What we tell it:** Warm, upbeat, concise; audience is non-technical staff; ground every answer in the bundled knowledge file; 2–5 sentences is the sweet spot; end multi-step answers with a clear next action; end every reply with 2–3 suggested follow-ups.
- **Model:** `gemini-2.5-flash`
- **Prompt source:** `supabase/functions/users-guide-ai/index.ts`
- **Knowledge brain:** `supabase/functions/_shared/aiAssistantKB.ts` — this is the file to update when the app changes and the bot starts giving stale answers.

---

> *Note: A global cross-screen AI assistant (codename **Neuron AI**) also exists in the codebase but is currently in beta testing and is intentionally hidden from the app. It will be introduced on screen once testing is complete.*
