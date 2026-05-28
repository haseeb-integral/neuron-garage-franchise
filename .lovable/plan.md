## Plan

Add a new section at the bottom of `.lovable/tier2-backlog.md` that tracks Tier 2 items with open questions for Brett. This becomes the durable home for the parked Brett questions (so they don't get clobbered by `plan--create` overwriting `.lovable/plan.md` again).

### New section to append

```markdown
---

## Awaiting Brett Approval

Items where work is done or partially done, but a product decision from Brett is needed before continuing.

### #4 — Editable profile fields (Candidate Pipeline → Overview tab)

**Status:** UI shipped. Edits to Name, Email, Phone, Location, Assigned To, and Source persist to the `candidates` table. `source` column was added.

**Open question for Brett — edit propagation back to upstream records:**

Flow in production: Teacher Search → Email Outreach → Candidate Pipeline. The `candidates` row is a copy linked via `prospect_id` back to `teacher_prospects`. Today, edits in Pipeline only update the candidate row, not the original teacher record.

Three options:

- **(a) Keep separate** *(current behavior)* — candidate is the sales working copy; teacher record is cold-outreach source of truth. Clean, but a phone fix here won't show on Teacher Search.
- **(b) Sync all edits back to `teacher_prospects`** — one source of truth. Risk: overwrites verified enrichment data.
- **(c) Sync only safe fields** (phone, city, state) but NOT email — email drives Smartlead deliverability, isolate it from pipeline edits.

Haseeb's gut: (c). Awaiting Brett's pick. Once decided, Part 3 wires in ~10 min.

**Brett message draft (copy-paste ready):** see chat log.
```

### Files touched
- `.lovable/tier2-backlog.md` — append the section above. No other edits.

That's it. Self-contained, won't get overwritten by future plan calls.