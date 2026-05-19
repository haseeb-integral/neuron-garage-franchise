## Goal

Prevent accidental double-sends from the Import Wizard's Step 4 "Send N to SmartLead" button, and document the gap in `OPEN_TASKS.md` as **Task 17m**.

Real-world impact today: SmartLead deduped your double-click by email, so no harm done. But the UI lets a user click "Send" 5 times in a row with no feedback — a future change to SmartLead settings or a different email-key field would silently produce duplicates.

## Task 17m — what to add to OPEN_TASKS.md

Insert after 17l, before `---`:

```
### 17m — Import Wizard: prevent double-send + dedup guardrails
Step 4 "Send N to SmartLead" button has no protection against repeat clicks
or re-submission of an already-imported batch. Today a user can click 5 times
and we'd fire 5 push-to-SmartLead requests. SmartLead currently dedupes by
email (verified May 19), but that's defensive luck, not our design.

Standard imports (Apollo, Instantly, HubSpot, Lemlist) all do some combo of:
  a) disable button on first click + show "Sending…" spinner until response
  b) idempotency key per batch (UUID) sent in payload so backend can ignore replays
  c) post-success state: replace button with green "✓ Sent — view batch" link
  d) "This batch was already imported X min ago to campaign Y — re-send?" warning
     keyed off prospect_batches.batch_name + campaign_id + day

Scope for v1 (smallest useful guard):
  - Disable Send button + show spinner the moment it's clicked
  - On success → replace with disabled "✓ Sent — 2/2 imported" pill + Close button
  - On error → re-enable with retry
  - Store batch UUID in prospect_batches.id and pass to smartlead-proxy as
    x-idempotency-key header; proxy can no-op identical replays within 60s

Effort: ~3 hrs · Risk: low · Files:
  - src/components/email-outreach/ImportLeadsWizard.tsx (button state)
  - supabase/functions/smartlead-proxy/index.ts (idempotency cache)
```

## Implementation (build-mode work after this plan is approved)

1. Append Task 17m to `OPEN_TASKS.md`.
2. In `ImportLeadsWizard.tsx` Step 4: add `sending` and `sent` local state. While `sending` → button disabled + spinner. On success → set `sent=true`, replace button with "✓ Sent — N/N imported" + close. On error → reset.
3. (Optional v1+) Pass `prospect_batches.id` as idempotency key to `smartlead-proxy`; proxy keeps a tiny in-memory LRU (60s TTL) and returns the cached response on replay.
4. Doc-sync per AGENTS.md Rule 9: draft PROJECT_CONTEXT.md note ("Import Wizard now guards against double-clicks; see Task 17m") + one-line OPEN_TASKS update, show to Haseeb before writing.

No DB migration. No SmartLead API changes. UI-only change for v1; proxy guard is nice-to-have.
