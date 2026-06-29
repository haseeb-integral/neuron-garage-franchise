
# Phase 4 — Tavily Lead Search + Firecrawl Verification

## Why Tavily (vs Brave / SearchAPI / Firecrawl-only)

- Returns an AI-summarized answer **plus** ranked source URLs in one call (Brave and Firecrawl `/v2/search` do not).
- Lets us push provider-owned domains and exclude Yelp/Facebook/Reddit at the search layer (`include_domains` / `exclude_domains`), which is exactly what Boston-style aggregator-heavy cities need.
- Free tier on your Researcher plan = 1,000 credits/month. Pilot costs ~10–20 credits.
- One API key, one REST endpoint, no SDK. Smallest possible change to our stack.

Firecrawl still verifies. Tavily is the lead source, never the proof.

## Scope (locked)

- **Pilot only.** Boston, MA. Top 10 missing-price providers, ordered by tier (Premium first).
- **Files touched:** exactly one — `supabase/functions/mvs-discover-providers/index.ts`. Plus one secret (`TAVILY_API_KEY`). No UI. No DB migration. No new edge function. No changes to other cities.
- **Will not touch:** scoring math, freshness rules, default 475 logic, Saved Sites, exports, Provider Evidence screen, QA queue, weights, MVS composite, any UI page.

## Flow per provider (10 providers in the pilot)

```text
For each missing-price provider in Boston (top 10 by tier):

  1. Tavily /search
     query:   "<provider name> Boston camp tuition price per week"
     params:  search_depth=advanced
              include_answer=advanced
              include_domains=[provider_domain]  (if we know it)
              exclude_domains=[yelp.com, facebook.com, reddit.com,
                               instagram.com, tiktok.com, care.com, ...]
              max_results=5
     credits: ~2

  2. Pick best 1 URL:
       prefer provider_domain match
       else first result that is not an aggregator
       skip if no usable URL

  3. Firecrawl /v2/scrape
       onlyMainContent: false
       formats: ["markdown", "screenshot"]
       credits: 1

  4. Gemini extract (existing PRICE_RULES, no inference)

  5. Literal-match guard (existing Phase 2 guard):
       exact dollar amount must appear in scraped page text
       within ±150 chars of: camp | tuition | week | session | fee | registration
     If guard fails -> drop with reason, never save.

  6. Save price + source URL + screenshot + snippet
     + extraction_method = "tavily_lead_v1"
     + audit row in mvs_pipeline_runs.source_counts.discover.tavily_leads[]
```

## Budget per pilot run

| Item | Per provider | 10 providers |
|---|---|---|
| Tavily advanced search | 2 credits | 20 credits |
| Firecrawl scrape | 1 call (~$0.0017) | ~$0.017 |
| Wall clock | ~6–8 s | ~70 s (parallelized) |

Stays well under the 50-call Firecrawl pipeline cap and well under the 1,000-credit Tavily monthly free tier.

## Audit logging (debug data we'll persist)

Stored at `mvs_pipeline_runs.source_counts.discover.tavily_leads[]`, one entry per provider:

```text
{
  provider_name,
  query,
  tavily_answer,                 // AI summary text
  tavily_top_urls: [...],
  picked_url,
  picked_reason,                 // "provider_domain" | "first_non_aggregator" | "none"
  firecrawl_scraped: bool,
  price_min, price_max,          // null if dropped
  guard_result: "kept" | "dropped",
  guard_drop_reason,             // null if kept
  snippet_around_price,          // ±150 char window
  tavily_credits_used,
  firecrawl_calls_used
}
```

This lets Provider Evidence Review show exactly what Tavily said and what Firecrawl actually saw — same audit pattern as Phase 2.

## Success criteria (decide future of Phase 4 after pilot)

- **Ship Tavily fully** if ≥ 3 of 10 providers get a new verified price (≥ 30% lift on missing-price providers).
- **Drop Tavily** if 0–2 of 10 verify. Means Boston pricing is genuinely not on the open web; pivot to manual QA instead.
- Report after pilot:
  - Before/after coverage for those 10 providers
  - Tavily credits used
  - Firecrawl calls used
  - Guard drops (with reasons)
  - Top "AI summary said X but page did not prove it" cases (the most important trust signal)

## Phases & turns

| Phase | What | Turns |
|---|---|---|
| **4.0** | Save `TAVILY_API_KEY` secret. **You then rotate the pasted key in Tavily dashboard** and re-save the new value via the secure form. | 0 (I trigger the secret form) |
| **4.1** | Add `runTavilyLeadSearch()` helper inside `mvs-discover-providers/index.ts`. Wire it in behind a `tavilyPilot: true` flag so it only fires for Boston + top 10 missing-price. Add audit logging. Deploy. | 1 |
| **4.2** | Run `forceFresh:true` Boston pilot. Report numbers in the success-criteria format above. **Stop and wait for your decision.** | 1 |
| **4.3** *(only if you approve after 4.2)* | Remove pilot flag, broaden to any city where coverage < 25% after Phase 3.3 targeted scrape. Cap Tavily at 25 leads/city. | 1 |

Total to get a decision: **2 turns** (4.1 + 4.2).

## Risks & mitigations

- **Tavily AI summary hallucinates a price.** Mitigation: guard never trusts the summary; only the scraped page text counts. Logged for review.
- **Provider domain unknown.** Mitigation: fall back to first non-aggregator URL; if none, skip provider and log reason. No bad data saved.
- **Aggregator slips through.** Mitigation: hard exclude list, expandable via audit findings.
- **Tavily down or rate-limited.** Mitigation: pilot fails gracefully; existing Phase 3.3 results remain untouched. No regression possible.
- **Key already pasted in chat.** Mitigation: rotate immediately after Phase 4.0 — I will remind you in-chat.

## What I need from you to start

Approve the plan. On approval I will:
1. Open the secure-secret form for `TAVILY_API_KEY` (you paste the **rotated** key, not the one from chat).
2. Build Phase 4.1 in the next turn.
3. Run the Boston pilot in the turn after, then stop and report.

No other files, no other cities, no scope creep.
