# Build Plan: Priority 1 — Asynchronous Background Jobs for Missing Price Scrapes

You and your advisor are asking the **exact right questions**. Vague background magic is how data gets corrupted. Because this is an internal tool with 3 staff users, we want **100% predictable, bulletproof database bookkeeping**.

Here are the plain-English engineering answers to your 4 questions:

---

### How it works: Idempotency, Tracking, Retries & Double-Writes

#### 1. How are background jobs tracked?
* Every time you click "Run Pipeline" on Columbus, our orchestrator creates **one master record** in the `mvs_pipeline_runs` table (`status: "running"`).
* When the discovery function finds 45 missing camps, it will stamp a new field `catchup_batches_total: 9` (nine 5-camp batches) onto that parent run record.
* As each background micro-batch finishes its 5 camps, it updates the parent record: `catchup_batches_completed = catchup_batches_completed + 1`.
* The rollout screen polls this exact record. You will literally watch a live progress bar: *"Filling missing prices: 4/9 batches completed"*.

#### 2. How do we prevent double-writing the same price?
* **Database Lock (Idempotency):** Right before a background worker searches Google for a camp (e.g., *School of Rock*), it executes a conditional SQL update: `UPDATE mvs_providers SET price_min = -1 WHERE id = :camp_id AND price_min IS NULL`.
* If two background jobs accidentally try to check *School of Rock* at the exact same millisecond, only the first worker wins the SQL lock (`price_min IS NULL`). The second worker sees `price_min = -1` (already claimed) and instantly skips it. 
* When the winning worker extracts the real weekly price (e.g. `$450`), it overwrites `-1` with `450`. If Google finds nothing, it overwrites `-1` with `null` and records `last_crawled_at: now()`.

#### 3. How do retries work?
* **Zero silent retries.** In cloud systems, automatic background retries are the #1 cause of runaway API bills and duplicate data.
* If a 5-camp micro-batch fails (e.g. Google temporarily blocks the IP), that batch catches the error, logs it into `mvs_pipeline_runs.error_log`, and marks itself completed. 
* The camp's price simply stays `null`. On your next normal pipeline run (or clicking "Re-run"), the scanner sees `price_min IS NULL`, grabs it again, and tries a fresh search.

#### 4. How does failure recovery work?
* If the cloud server loses power mid-run, the parent run record stays stuck at `running`.
* Our existing orchestrator already has an **auto-cleanup safety guard**: any run stuck at `running` for >3 minutes is automatically marked `failed`, unlocking the city so staff can safely click "Run Pipeline" again.

---

### Summary of Small Safe Phases

* **Phase 1 (Worker Logic & Lock Guard):** 
  * Update `mvs-discover-providers` to accept `catchupCampIds: string[]` and `parentRunId`.
  * Add the atomic SQL lock (`price_min IS NULL`) so duplicate writes are mathematically impossible.
  * *Estimate:* **1 Lovable turn.**

* **Phase 2 (Orchestrator Tracking & UI Progress):**
  * Update `mvs-run-pipeline` to dispatch these 5-camp batches in background promises and track `batches_completed` vs `batches_total`.
  * *Estimate:* **1 Lovable turn.**

* **Total Timeline:** **2 Lovable turns** (~10 minutes). No existing UI, scoring formulas, or CSV exports will be touched.

---

### Approval
Now that tracking, idempotency, retries, and recovery are explicitly locked down, please click **Implement plan** below to approve and start Phase 1!