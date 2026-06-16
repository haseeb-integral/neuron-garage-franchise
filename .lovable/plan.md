## Goal

Drop the "PHASE 2 EXCEPTION" rule from project memory so I never auto-read `.lovable/phase-2/` docs. This chat (and SOW v2.2 / Sam brief v2.2 lines you paste here) is the only source of truth.

## Change

Edit `mem://index.md` Core section:

**Remove** the entire third paragraph:
> "PHASE 2 EXCEPTION to the no-pre-reads rule: for any Phase 2 task ... ALWAYS read `.lovable/phase-2/phase-2-sow.md` and `.lovable/phase-2/phase-2-status.md` BEFORE doing anything ... Sources live in `.lovable/phase-2/sources/` and are frozen ..."

**Add** a replacement one-liner:
> "Phase 2 work (Market Validation 1A, Site Analysis 1B, Candidate Pipeline 1.5, Teacher Search 1.5, SmartLead 1.5, Mailboxes, Video Training, Manus CSI): source of truth is this chat — SOW v2.2 and Sam's brief v2.2 lines you paste here. Never read `.lovable/phase-2/` (sow, status, methodology, changelog, sources) unless you explicitly name a file in the current message. Never invent thresholds, weights, or criteria not present in pasted SOW/brief text."

## Effects

- No more auto-reads of `phase-2-sow.md`, `phase-2-status.md`, `sas-methodology.md`, etc.
- No more auto-logging to `.lovable/phase-2/CHANGELOG.md`.
- `.lovable/phase-2/` files stay on disk (not deleted) — just ignored unless you point at one by name.
- Removes the failure mode where I echoed my own invented numbers (e.g. ≥20 threshold) into a status doc and then treated the doc as authority.

## Out of scope

- No code changes.
- No deletion of `.lovable/phase-2/` files (say the word separately if you want them removed).
