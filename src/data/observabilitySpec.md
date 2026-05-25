# Data Observability — Technical Specification

**Status:** Live in production
**Owner:** Engineering (Haseeb)
**Route:** `/observability`
**Access:** `manager` role (currently every registered user)
**Last updated:** 2026-05-25

---

## 1. Purpose & Scope

The Data Observability subsystem answers a single operational question on demand: **"Is the data that powers Neuron Garage trustworthy right now?"**

It does this in three layers:

| Tier | Question it answers | Surface |
| --- | --- | --- |
| **Tier 1 — Status & Structure** | Are the core tables alive, fresh, populated, and within expected ranges? | `Status & Structure` tab |
| **Tier 2 — Accuracy & Rules** | Is the data internally correct (no nulls where forbidden, no negative populations, etc.)? Are there statistical outliers? | `Accuracy & Rules` tab |
| **Tier 3 — Alerts & History** | What did the data look like in the past, when did things break, and who wants to be told about it? | `Alerts & History` tab |

A weekly digest email (Monday 09:00 ET) summarizes all three tiers for stakeholders.

**Non-goals**

- Not an APM/tracing system — does not measure request latency, edge-function performance, or user behaviour.
- Not a BI tool — it does not visualize business metrics (campaign open rates, pipeline conversion).
- Not a write surface — all checks are read-only against production tables.

---

## 2. Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                          /observability (UI)                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Status (Tier 1) │  │ Accuracy (Tier 2)│  │ Alerts/History (T3)  │  │
│  └────────┬────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                    │                       │              │
│  src/lib/dbHealth/queries.ts   │   src/lib/dbHealth/   │              │
│   (DOMAINS + MetricRunner)     │   accuracy.ts         │   history.ts │
└───────────┼────────────────────┼───────────────────────┼──────────────┘
            │ supabase-js        │ supabase.rpc(...)     │ rpc + table
            ▼                    ▼                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Lovable Cloud)                         │
│                                                                       │
│  Source tables:  us_cities_scored, us_cities_geo, teacher_prospects, │
│                  public_schools, candidates, city_seed_runs           │
│                                                                       │
│  Health schema:  db_health_rules         (catalog of invariants)      │
│                  db_health_history       (6h snapshot stream)         │
│                  db_health_incidents     (open/close lifecycle)       │
│                  db_health_subscriptions (per-user notification opt-in)│
│                                                                       │
│  SECURITY DEFINER RPCs:                                               │
│    db_health_run_rule(_name)         — execute one invariant          │
│    db_health_random_city()           — random row inspector           │
│    db_health_outliers(_column,_n)    — 3σ outlier finder              │
│    db_health_history_for(_domain,_d) — fetch history window           │
│    db_health_snapshot()              — write a snapshot row           │
└──────────────────────────────────────────────────────────────────────┘
            ▲
            │ pg_cron every 6h
            │
┌──────────────────────────────────────────────────────────────────────┐
│  Edge: weekly-data-health-digest  (Mon 09:00 ET via pg_cron + pg_net) │
│        → send-transactional-email → notify.integraldigital.com        │
└──────────────────────────────────────────────────────────────────────┘
```

All read traffic from the browser goes through `supabase-js` with the user's
JWT. Every privileged RPC validates `has_role(auth.uid(), 'manager')` before
returning. Direct table reads are governed by RLS.

---

## 3. Data Model

### 3.1 `db_health_rules`
Catalog of human-readable invariants.

| Column | Type | Notes |
| --- | --- | --- |
| `name` | text PK | Stable identifier (e.g. `teacher_email_required`) |
| `description` | text | Plain-English sentence rendered in the UI |
| `sql` | text | Must start with `SELECT` or `WITH`; no DDL/DML keywords |
| `expected_zero` | boolean | `true` = passing means count = 0; `false` = passing means count > 0 |
| `severity` | text | `info` / `warning` / `critical` — drives status color |
| `created_at` | timestamptz | |

### 3.2 `db_health_history`
Append-only stream of snapshot ticks.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `ts` | timestamptz | Snapshot time |
| `domain` | text | Table name or `'rules'` |
| `metric` | text | `row_count`, rule name, etc. |
| `status` | text | `green` / `yellow` / `red` |
| `value` | jsonb | Numeric payload (`{ count, min_expected }` or `{ violations }`) |
| `error` | text | Populated when a rule SQL throws |

### 3.3 `db_health_incidents`
Open/close lifecycle for sustained red statuses.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `domain` | text | |
| `metric` | text | |
| `opened_at` | timestamptz | |
| `closed_at` | timestamptz nullable | `null` = ongoing |
| `last_status` | text | |
| `notes` | text | E.g. `row_count=0` |

### 3.4 `db_health_subscriptions`
Per-user opt-in for notifications.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `user_id` | uuid | FK to `auth.users` |
| `domain` | text nullable | Subscribe to a whole domain |
| `rule_name` | text nullable | Or a single rule |
| `created_at` | timestamptz | |

**RLS:** users can only see/insert/delete their own rows.

---

## 4. Tier 1 — Status & Structure

### 4.1 Domains
Defined in `src/lib/dbHealth/queries.ts` as `DOMAINS: DomainDef[]`. Each entry
declares a table plus a list of `MetricDef` objects.

Tracked domains (as of this spec):

- `us_cities_scored` — every scored U.S. city
- `us_cities_geo` — geographic reference data
- `teacher_prospects` — outreach teacher master pool
- `public_schools` — NCES school directory
- `candidates` — pipeline candidates
- `city_seed_runs` — background job log

### 4.2 Metric types

| Metric | What it checks | Status rules |
| --- | --- | --- |
| **Row count** | `count(*)` of the table | `red` if 0; `yellow` if below `min_expected`; `green` otherwise |
| **% non-null** | Per critical column, the share of rows where the column is populated | `red < 50%`, `yellow < 90%`, `green ≥ 90%` (overridable per metric) |
| **Freshness** | `now() - max(updated_at|created_at)` | `red > 30d`, `yellow > 7d`, `green ≤ 7d` (per-domain SLA) |
| **Value range** | `min/max` of a numeric column | `red` if outside hard bounds; `yellow` if outside soft bounds |

### 4.3 UI behavior
- Each `MetricDef` is run as an independent React Query (see `useDomainMetrics`),
  so a slow column doesn't block others.
- Every result exposes its SQL via **Show query** and supports per-metric
  **Run now** without refreshing the whole page.
- A page-level **Run all checks** button bumps a `refreshTick` that remounts
  every `DomainCard`.

### 4.4 Trust Score
The header stat strip computes:

```
trust = round(100 * green_domains / total_domains)
```

`overall` health is the worst color across domains (`red > yellow > green`).
This rollup drives the colored ring and the four stat cards.

---

## 5. Tier 2 — Accuracy & Rules

### 5.1 Invariants (`RulesBoard`)
Rules live in `db_health_rules`. Each is a single SQL query that returns the
rows that violate it. Status comes from `ruleStatus(rule, result)`:

```ts
const pass = rule.expected_zero ? result.count === 0 : result.count > 0;
status = pass ? "green" : rule.severity === "critical" ? "red" : "yellow";
```

The UI groups rules by severity (`critical → warning → info`) and shows a
summary chip (`N passing · N warning · N failing · N not run`).

`db_health_run_rule(_name)` is the only entry point — it:
1. Enforces the manager role.
2. Loads the SQL from `db_health_rules`.
3. Refuses anything not starting with `SELECT`/`WITH`.
4. Refuses anything containing `INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE`.
5. Wraps the query in `SELECT count(*), jsonb_agg(to_jsonb(t)) FROM (…) t`.
6. Returns `{ rule, count, rows }`.

### 5.2 Sample Inspector
`db_health_random_city()` returns `to_jsonb(random row from us_cities_scored)`.
The UI renders every column as a sortable key/value list — the fastest way to
spot a weird value without writing SQL.

### 5.3 Outlier Finder
`db_health_outliers(_column, _n)` computes `μ` and `σ` over the chosen column
and returns rows with `|x − μ| / σ > 3`, ordered by `z DESC`, limited to `_n`.

Allowed columns are hard-coded server-side (`OUTLIER_COLUMNS` allowlist).
Anything else throws — there is no dynamic column injection from the client.

---

## 6. Tier 3 — Alerts & History

### 6.1 Snapshot job
`db_health_snapshot()` runs every 6 hours (pg_cron) and writes one row per
domain + one row per rule to `db_health_history`. For each:

- Recompute the current status (same logic as the live tiers).
- If `red`, open an incident if none exists; if `green/yellow`, close any
  open incident.

This gives a continuous timeline with automatic incident lifecycle.

### 6.2 30-day history
`db_health_history_for(_domain, _days)` returns the last N days of ticks.
The UI renders each tick as a colored bar in `Sparkline.tsx` (pure SVG,
oldest tick on the left, hover for timestamp).

### 6.3 Incidents
Rendered as a list with ongoing incidents first. An ongoing incident is one
whose `closed_at IS NULL`.

### 6.4 Subscriptions
Two grain levels:

- **Domain** — notify me when this domain goes red
- **Rule** — notify me when this specific invariant fails

`addSubscription` / `removeSubscription` write to `db_health_subscriptions`.
Today, subscriptions feed the weekly digest. A future per-event notifier can
read from the same table without schema changes.

---

## 7. Weekly Digest

### 7.1 Trigger
`pg_cron` calls the `weekly-data-health-digest` edge function every Monday at
**09:00 America/New_York** via `pg_net.http_post`.

### 7.2 Function
`supabase/functions/weekly-data-health-digest/index.ts`:

1. Pulls the latest history rows per domain.
2. Computes the Trust Score (same formula as the UI).
3. Counts open/closed incidents in the last 7 days.
4. Counts rule pass/fail in the last 7 days.
5. Renders the `data-health-digest` React-Email template
   (`supabase/functions/_shared/transactional-email-templates/data-health-digest.tsx`).
6. Calls `send-transactional-email` for each recipient on
   `db_health_subscriptions` plus the standing recipient list (Brett, Sam).

### 7.3 Deliverability
Mail is sent via `notify.integraldigital.com` (set up in the email-infra
migration). Bounces and complaints feed `handle-email-suppression`;
unsubscribes go through `handle-email-unsubscribe` and write to the
suppression list — no further sends to that address until manually cleared.

---

## 8. Security Model

- **Authentication:** Every page is behind `<ProtectedRoute>`; auth is
  Supabase JWT.
- **Authorization:** `useIsManager()` gates the UI. Every RPC re-checks
  `has_role(auth.uid(), 'manager' or 'admin')` server-side — the UI gate is
  defense-in-depth, not the security boundary.
- **SQL injection surface:** All custom SQL lives in `db_health_rules`,
  which is editable only by managers. `db_health_run_rule` refuses anything
  that isn't a read-only SELECT/WITH and bans DDL/DML keywords. Outlier
  columns are allowlisted server-side.
- **RLS:** `db_health_history`, `db_health_incidents`, and
  `db_health_rules` are readable by managers only.
  `db_health_subscriptions` is `user_id = auth.uid()` only.
- **No PII in snapshots:** History rows store counts and statuses, not row
  contents. Violating-row payloads from rule runs stay in memory on the
  manager's browser — they are never persisted.

---

## 9. Performance Notes

- Per-metric React Queries run in parallel and cache for 30s
  (`QueryClient.defaultOptions.queries.staleTime`).
- Snapshots use `count(*)` against indexed primary keys. Largest table
  (`public_schools` ~130k rows) finishes in low milliseconds.
- The rule evaluator wraps user SQL in a subquery; rules with `LIMIT 10`
  in their `SELECT` are encouraged to keep response payloads small.
- The outlier finder is O(N) over the column. Acceptable up to ~10⁶ rows;
  beyond that we'd materialize μ/σ in a sidecar table.

---

## 10. Operational Runbook

### 10.1 "Trust Score dropped"
1. Open `/observability`.
2. Find the red domain card → expand its failing metric → **Show query**.
3. Run the query in the SQL console to see violating rows.
4. Fix at the source (data ingestion / seed function) — not by mutating
   the snapshot.
5. Press **Run now** on the metric to confirm green.

### 10.2 "Weekly email didn't arrive"
1. Check `pg_cron.job_run_details` for the Monday tick.
2. Check `weekly-data-health-digest` edge logs.
3. Check `send-transactional-email` logs for delivery + suppression rows.
4. Verify recipient isn't on the suppression list.

### 10.3 "I want to add a new rule"
1. Go to **Accuracy & Rules → Add rule**.
2. Provide name, description, SQL (must `SELECT` violating rows),
   `expected_zero` (almost always `true`), and severity.
3. Press **Run now** to verify.
4. Subscribe in **Alerts & History** if you want weekly digest mentions.

### 10.4 "I want to add a new domain"
1. Add a `DomainDef` to `src/lib/dbHealth/queries.ts`.
2. Add the table to the `db_health_snapshot()` `VALUES` list with a
   sensible `min_rows`.
3. Add a plain-English description to `PLAIN_ENGLISH` in
   `src/pages/Observability.tsx`.

---

## 11. File Map

| Path | Role |
| --- | --- |
| `src/pages/Observability.tsx` | Page shell, tabs, stat strip |
| `src/components/dbHealth/DomainCard.tsx` | Per-domain card + metric list |
| `src/components/observability/AccuracySection.tsx` | Rules board, sample inspector, outlier finder |
| `src/components/observability/AlertsSection.tsx` | Sparklines, incidents, subscriptions |
| `src/components/dbHealth/Sparkline.tsx` | SVG history bar |
| `src/components/dbHealth/StatusPill.tsx` | Shared status chip |
| `src/hooks/dbHealth/useDomainMetrics.ts` | Parallel per-metric query orchestrator |
| `src/hooks/dbHealth/useIsManager.ts` | Manager-role gate |
| `src/lib/dbHealth/queries.ts` | `DOMAINS` + `MetricDef` registry |
| `src/lib/dbHealth/thresholds.ts` | Status math, color tokens, rollup |
| `src/lib/dbHealth/accuracy.ts` | RPC wrappers for rules/sample/outliers |
| `src/lib/dbHealth/history.ts` | RPC wrappers + table reads for Tier 3 |
| `supabase/migrations/*_email_infra.sql` | Health tables, RPCs, snapshot fn, cron job |
| `supabase/functions/weekly-data-health-digest/` | Monday digest edge function |
| `supabase/functions/_shared/transactional-email-templates/data-health-digest.tsx` | React-Email template |

---

## 12. Future Work (Not in v1.0)

- **Per-event notifications.** Wire `db_health_subscriptions` into the
  snapshot job so a red transition triggers an immediate email, not just
  the Monday digest.
- **Threshold UI.** Today thresholds live in code (`thresholds.ts` +
  `DOMAINS`). A manager-editable threshold table would let non-engineers
  tune what "yellow" means without a deploy.
- **Slack/Discord delivery.** The notifier is currently email-only.
  `db_health_subscriptions` already supports a `channel` column shape; the
  digest just doesn't read it yet.
- **Cross-table referential rules.** Today rules are single-statement. A
  small extension would let a rule reference a named CTE library.
- **Retention.** `db_health_history` grows ~140 rows/day. No retention
  policy yet — at the current rate that's 1.7M rows over 30 years, which
  is fine, but a soft cap (e.g. trim > 365 days) would be cheap insurance.
