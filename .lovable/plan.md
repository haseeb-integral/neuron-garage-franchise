## Goal

Two clear fixes on the MVS QA Queue page:

1. Show **exactly which URLs the bot tried** for each flagged provider and **what went wrong**, so a human can quickly see what to QA.
2. Make **Mark resolved** actually work end‑to‑end (find why clicking it does nothing for you and fix it).

No scoring/database math changes. Pipeline behavior stays the same — we just capture and show more of what already happens.

---

## What is happening today (so you have full clarity)

When we run the pipeline for a city, for every camp provider the bot does this inside `mvs-extract-weeks`:

1. Picks a **starting website** = `website_url` → else `source_listing_url` → else `url`.
2. Asks Firecrawl `/map` for up to 100 links on that site and scores them for words like "summer-camp / register / schedule".
3. Asks Firecrawl `/search` for `"<provider> <city> summer camp registration schedule"` and keeps results on the same domain or on `hisawyer.com`.
4. Scrapes the top 3 candidate pages and picks the one with the most week dates + status words.
5. If none of that works, the provider is added to the QA queue with `entity_type = 'provider'` and a tiny `reason` text like `no registration page found` or `extraction returned 0 weeks`.

The problem: **none of the URLs the bot tried, and no per‑URL error, are saved.** The QA row only has the short `reason` string. That is why on the QA page you cannot see which page it actually checked.

For "Mark resolved": the button calls a database function `mvs_qa_resolve` which sets `resolved_at = now()`. The DB function looks correct and your role is manager. Checked the table: 0 of the current 16 New York rows are resolved, so either the call is silently failing or the UI isn't refreshing. Needs a live test with the network tab to confirm before we change anything.

---

## Plan (phases, one Lovable turn each)

### Phase 1 — Capture diagnostics in the pipeline (1 turn)

- Migration: add column `mvs_qa_queue.diagnostics jsonb` (nullable). No data loss, no policy change.
- In `supabase/functions/mvs-extract-weeks/index.ts`:
  - On `ProviderOutcome`, add `root_url`, `tried_pages: { url, step, ok, http_status?, note? }[]`, `firecrawl_calls`.
  - Record one entry every time we call `/map`, `/search`, or `/scrape` for that provider, with the URL and a short note (e.g. `map ok 87 links`, `scrape http 403`, `scrape too short md`, `search returned 0 same-domain results`).
  - When inserting provider QA rows, also write `diagnostics = { root_url, tried_pages, error }`.
- Re-running the pipeline for a city will refill diagnostics for newly flagged rows. Old rows stay as they are (we'll show a friendly fallback for them).

### Phase 2 — Show the diagnostics on the QA page (1 turn)

In `src/pages/MVSQAQueue.tsx`, under "Why flagged" for each provider card add a clean panel:

```text
Bot started at:    <root url>  ↗ open
Pages the bot tried:
  • https://… /summer-camps          scrape → 403 forbidden
  • https://… /register              scrape → ok, but page was too short
  • https://… /classes               scrape → ok, no week dates found
Search results checked:
  • hisawyer.com/<provider>/…        scrape → ok, no week dates found
Final result: no registration page found
```

- Each URL is a clickable link that opens in a new tab so the reviewer can verify in one click.
- For old rows without `diagnostics`, show: *"Diagnostics weren't captured for this row. Re-run the pipeline for this city to record what the bot tried."*
- Keep the existing "open provider website ↗" and "search the web ↗" links in the header.

### Phase 3 — Fix "Mark resolved" (1 turn)

- Open the page, click Mark resolved, watch the network call to `rpc/mvs_qa_resolve` and the console. Three likely causes:
  - **a)** RPC returns an error and `toast.error` is firing but you don't notice → make the error visible, log it.
  - **b)** RPC succeeds but `load()` isn't re-running → force `await load()` and clear the row from local state immediately for instant feedback.
  - **c)** Auth header missing on the RPC call → re-check session.
- Fix the actual cause found above. Add a small visual change: when a row is resolved, fade it out and show "✓ Resolved by you just now" for 2 seconds before it disappears, so you have proof the click worked.
- Also add a clearer error toast that shows the full DB error message when it fails.

### Phase 4 — Smoke test together (0 code, just verify)

- On `/market-validation` → open `/mvs-qa-queue` → New York.
- Confirm each card now shows the tried URLs + per‑URL note.
- Click Mark resolved on one provider — row should fade and disappear; toggling "Show resolved" should bring it back marked resolved.
- Re-run the pipeline for one small city and confirm new rows have full `diagnostics`.

---

## What may be affected

- `mvs-extract-weeks` edge function (more fields written, same flow).
- `mvs_qa_queue` table (one new nullable jsonb column + GRANTs unchanged).
- `MVSQAQueue.tsx` page UI.
- Nothing else: no change to scoring, weights, shortlist, Market Validation table, briefs, exports, or any other page.

## Risks / what not to touch

- Do **not** change `mvs_qa_resolve` signature or how week-level rows are saved.
- Do **not** change Firecrawl call counts or thresholds.
- Old QA rows stay valid; they simply have no diagnostics until next pipeline run.

## Effort

~3 small Lovable turns + 1 verify turn.

**Please approve and I'll start with Phase 1.**