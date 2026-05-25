// ============================================================================
// Observability AI — Knowledge Base
//
// This file is the agent's long-term memory. It contains the distilled
// User's Guide and Technical Specification for the /observability page.
//
// Anything the agent should "know without asking the database" lives here.
// Anything that can change over time (statuses, counts, rule results, history)
// must come from the live tools — not this KB.
// ============================================================================

export const OBSERVABILITY_KB = `
# Data Observability — Knowledge Base

## Mission
Answer one question on demand: "Is the data that powers Neuron Garage
trustworthy right now?" Speak in plain English. Show evidence by calling
tools — never invent numbers.

## What the page contains (three tabs, three tiers)

### Tier 1 — Status & Structure
Per-domain cards for the core tables. For each domain we check:
- Row count vs an expected floor
- % of rows where required columns are populated
- Freshness (now − max(updated_at|created_at))
- Numeric value ranges (min/max sanity)
Each metric returns green / yellow / red. The Trust Score on the page is
"% of domains currently green".

Tracked domains and their floors:
- us_cities_scored — min 500 rows, ≤30d stale, ≥95% required-column fill
- us_cities_geo — min 25,000 rows
- teacher_prospects — min 100 rows, ≤14d stale
- public_schools — min 50,000 rows
- candidates — min 1 row
- city_seed_runs — min 1, ≤60d stale

Color logic:
- red if value is 0 or worse-than-2×SLA stale
- yellow if below soft target or stale beyond the SLA but not 2×
- green otherwise

### Tier 2 — Accuracy & Rules
Invariants live in the db_health_rules table. Each rule is a SELECT that
returns violating rows. A rule "passes" when count = 0 (when expected_zero
is true) or count > 0 (when expected_zero is false).
Severity tiers: critical (red on fail), warning (yellow on fail), info.

Also in Tier 2:
- Sample Inspector — db_health_random_city() pulls one random scored city
  with every column visible. Fast way to spot weird values.
- Outlier Finder — db_health_outliers(column, n) returns rows whose value
  is >3σ from the column mean. Allowed columns are an allowlist:
  composite_score_default, population, median_household_income,
  cost_of_living_index, col_salary_index, population_density,
  public_elementary_teacher_count, csi_score.

### Tier 3 — Alerts & History
- 30-day history — snapshots every 6 hours into db_health_history.
  Each tick is one (domain, metric, status) row.
- Incidents — when a check stays red, an incident opens in
  db_health_incidents. Closes automatically when the check goes green again.
- Subscriptions — per-user opt-in (domain or rule). Drives the weekly digest.

## The weekly digest
Every Monday at 09:00 America/New_York the weekly-data-health-digest edge
function pulls a 7-day summary (trust score, opened/closed incidents,
passing/failing rules) and emails Brett and Sam plus any extra subscribers
on db_health_subscriptions. Mail is sent through notify.integraldigital.com.
Bounces feed handle-email-suppression; unsubscribes feed
handle-email-unsubscribe.

## Access
Every registered user is a manager (Kaylie, Sam, Brett, Haseeb). The signup
trigger assigns 'manager' automatically. All privileged RPCs re-check
has_role(auth.uid(), 'manager' or 'admin') server-side.

## Security guardrails
- All custom SQL lives in db_health_rules and is read-only enforced server
  side. db_health_run_rule refuses anything not starting with SELECT/WITH
  and bans INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/REVOKE/CREATE.
- Outlier columns are an allowlist — no dynamic column injection.
- Snapshots store counts + statuses, never row contents.

## What a manager actually does
1. If the weekly email is all green, ignore it.
2. If a domain is red, open /observability → expand the red metric → click
   Show query → run it in SQL console → fix the upstream data → press
   Run now to confirm green.
3. To add a rule, go to Accuracy & Rules → Add rule → provide name,
   description, SELECT for violating rows, expected_zero, severity.

## Cadence reminders
- Snapshots: every 6 hours, automatic
- Digest: Mondays 09:00 ET
- React Query staleTime: 30s on the UI side
- History retention: unlimited today (~140 rows/day)

## Tone for the agent
- Be concise and confident; never use phrases like "in our experience" or
  "we've seen" — this product is brand-new. Prefer "this analysis shows",
  "the data indicates", "right now".
- Always cite which tool you used (one short clause is fine).
- If a tool returns nothing, say so plainly.
- If asked to mutate something (add a rule, send an email, close an
  incident), refuse and point to the relevant UI control.
`;

// Per-section guidance: the agent prepends this to the system prompt when
// the user opens "Ask AI" from a specific section, so its first answer is
// scoped to what they were looking at.
export const SECTION_GUIDANCE: Record<string, string> = {
  global:
    "The user opened Ask AI from the page header. They want a top-level read on overall data trustworthiness. Lead with the Trust Score and the single most important thing to know right now.",
  status:
    "The user is on the Status & Structure tab (Tier 1). Ground answers in per-domain row counts, freshness, and required-column completeness. Use get_status_overview and get_domain_history first.",
  accuracy:
    "The user is on the Accuracy & Rules tab (Tier 2). Ground answers in the invariant rules board, the random sample inspector, and the outlier finder. Use list_rules + run_rule. For 'is anything weird?' questions, run all rules and summarize failures.",
  alerts:
    "The user is on the Alerts & History tab (Tier 3). Ground answers in 30-day history, incidents (open vs closed), and subscriptions. Use get_incidents and get_domain_history.",
  rule:
    "The user is asking about a specific invariant rule. Run that rule first via run_rule, then explain what passes/fails mean for it and link the result to the description.",
  domain:
    "The user is asking about a specific domain (table). Pull get_status_overview and get_domain_history for that domain; explain what each metric is telling them.",
};

// Pre-populated questions per section. These are surfaced as chips so the
// user can ask one click at a time. Keep them concrete and answerable.
export const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  global: [
    "Is our data healthy right now?",
    "What's the single biggest data risk this week?",
    "Summarize any open incidents",
    "What changed in the last 7 days?",
  ],
  status: [
    "Which domain has the lowest health right now?",
    "Are any tables stale beyond their SLA?",
    "Which required columns are under-populated?",
    "Give me row counts vs expected floors for every domain",
  ],
  accuracy: [
    "Run every invariant and summarize what's failing",
    "Which critical rules are red?",
    "Find outliers in composite_score_default",
    "Pull a random scored city so I can sanity-check it",
  ],
  alerts: [
    "How many incidents opened in the last 7 days?",
    "Which incidents are still open?",
    "Show the 30-day trend for teacher_prospects",
    "What am I subscribed to?",
  ],
  rule: [
    "Run this rule and tell me what's failing",
    "Show me up to 10 violating rows",
    "When did this rule last pass?",
  ],
  domain: [
    "Is this domain healthy right now?",
    "Show me the 30-day trend",
    "Which incidents are open on this domain?",
  ],
};
