## Append "Questions for Brett" section to Phase 2 June Timeline (v3)

Extend the existing v2 doc with a new section that gives Brett everything he needs to unblock items 3–8, without leaving Lovable.

### What gets added (after the Full Phase 2 Scope table, before the doc ends)

**Section header:** "Open Questions — Items 3–8 (Spec Pending / Under Review)"

**Lead-in paragraph:**
- These 6 workstreams cannot move from `not-started` to `architecting` until Brett answers the questions below.
- Brett can reply two ways: (a) edit this doc and send back, or (b) reply directly inside Lovable chat — both work, Lovable response is faster.
- Every question lists what we already know (from Brett's 5-point sketch + Sam's May 29 call) so Brett isn't starting from scratch.

**Per-item block** (one per item, 3–8). Each block has 4 sub-parts:

1. **What we have so far** — 2–3 lines pulled verbatim from frozen sources (`brett-5-point-sketch.md`, `summary-transcript Sam meeting May 29.md`).
2. **Why it's blocked** — the single biggest unknown that stops architecting.
3. **Questions Brett needs to answer** — 3–5 concrete questions, each answerable in 1–2 sentences. No open-ended "what do you want?" — every question offers context or a default we'd pick if Brett stays silent.
4. **Default if no answer by [date]** — what Lovable will assume so the item doesn't stall forever.

### Item-by-item question content

- **Item 3 — Candidate Pipeline 1.5**
  Questions: candidate-portal scope (login + edit profile + upload docs?), which fields candidate owns vs recruiter owns, stage-gate auto-advance rules, structured Notes/Activity field list, whether Brett's Google Form is the template to clone.

- **Item 4 — Teacher Search 1.5**
  Questions: which new Fit Score inputs (years teaching? grade band? subject? location radius?), dedupe rule when same teacher appears from Apollo + scrape + referral (keep newest? merge? prefer highest-confidence source?), what "tighter SmartLead loop" means (auto-push on Fit > X? manual gate?).

- **Item 5 — SmartLead 1.5**
  Questions: reply-categorization taxonomy (proposed buckets: Interested / Not now / Not interested / OOO / Auto-reply / Bounce — keep all?), action per bucket (move to pipeline? pause sequence? human review?), campaign-analytics KPIs Brett actually looks at, whether reply data flows back into Teacher Search Fit Score.

- **Item 6 — Mailboxes 1.0**
  Questions: what "healthy" means as one number (proposed weights: warmup% 40, bounce rate 30, spam complaint 20, reply rate 10 — adjust?), auto-pause threshold, who gets notified when a mailbox drops below threshold, whether warmup state is read from SmartLead API or manual.

- **Item 7 — Video Training 1.0**
  Questions: audience (franchisees post-signing? staff at active camps? public marketing?), gating (login-required? per-module unlock?), hosting (inside app / Vimeo / YouTube unlisted?), camp-footage delivery date (Sam said videographer started Mon of May 29 call — is footage in hand yet?), whether the 300-page standards manual + curriculum drives module structure.

- **Item 8 — 4th Manus App / CSI 1.0**
  Questions: stand-alone Manus app vs folded into 1A Market Balance Index (Sam wanted stand-alone, confirm?), what "competitive saturation" means at city level vs site level, who owns architecture (Manus or Lovable), whether this blocks 1A shipping.

### Closing note to Brett (last paragraph)

- "Reply in Lovable when you're back — even one-liners help. We'll mark each item `architecting` the moment its answers land and start building. Items 1 and 2 keep moving in the meantime."

### Output

- New file: `/mnt/documents/Neuron-Garage-Phase-2-June-Timeline-v3.docx` (v2 kept untouched)
- Render PDF, visual QA via `pdftoppm`, confirm no clipping and all 6 item blocks render
- No code, route, Supabase, or `.lovable/phase-2/` edits

### Out of scope

- No new questions for items 1, 2 (already shipped as demo mockups)
- No timeline dates added
- No changes to existing v2 sections (scope table, Week 1–4 table, featured-this-week)
