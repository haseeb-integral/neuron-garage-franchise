## What I found

**1. The "non-2xx" error is a form-validation 400, not a crash.**
Edge logs show `POST /compute-sas → 400` four times in a row when you clicked Compute SAS. The engine requires `enrollment` (we hardened it in v0.2 to refuse fabricated defaults), but the form labels the field "optional" and you submitted Trinity with enrollment blank. So the function correctly rejects it — but the UX lies about it being optional.

**2. The cards DID rerun on v0.3, but the gap got WORSE (11.9 → 8.2).**
DB confirms both anchors were rescored under `engine_version = sas-v0.3`:

| Pillar          | Trinity v0.2 → v0.3 | LeafSpring v0.2 → v0.3 |
|-----------------|---------------------|------------------------|
| School Profile  | 92.31 → 92.31       | 27.50 → 27.50          |
| Affluence       | 23.70 → 22.26       | 34.65 → **45.51**      |
| Family Density  | 6.88 → **35.75**    | 14.67 → **48.83**      |
| Ecosystem       | 100   → 81.86       | 100   → 72.91          |
| Accessibility   | 33.00 → 40.44       | 33.00 → 46.73          |
| **SAS**         | 50.33 → **54.14**   | 38.42 → **45.96**      |

Manus's three fixes worked technically — Family Density unsaturated, Ecosystem unsaturated, extrapolation lifted both anchors out of the floor. But **LeafSpring jumped MORE than Trinity in every demographic pillar**, so the gap shrank.

**Why:** the engine is now reading reality correctly, and reality says **LeafSpring's address (7000 Preston Rd, West Plano) is in a more affluent, more family-dense neighborhood than Trinity's (4131 Spring Valley Rd, Addison).** Median HHI on the cards confirms it: LeafSpring **$138k / 42% >$150k**, Trinity **$91k / 22% >$150k**. The pillar scores aren't wrong; the anchor pair is wrong.

This is the **"are we even comparing the right two sites"** point from the Perplexity analysis (Phase 3). SAS methodology Section 6 reference table uses **Trinity Episcopal School of Austin (Westlake)** as the positive anchor — a genuinely affluent area — vs LeafSpring Plano. We swapped in Trinity Christian Academy Addison somewhere along the way, and it's not the right positive anchor: it's a strong school in a middling neighborhood, sitting next to a closed daycare in a strong neighborhood. The demographics cancel.

**3. Side issue:** `signals.popReachable15Extrapolated`, `iso15AreaSqMi`, etc. are NULL in the DB rows even though the function computes them. They aren't being written into `signals` — only the pillar scores landed. Worth fixing so we can debug from data, not screenshots.

## Plan

### A. Fix the 400 (form UX, ~5 min)
- `src/components/site-analysis/LiveEngineCard.tsx`: enrollment input — drop the "optional" placeholder, mark it required, block submit when empty with a clear inline error ("Enrollment required — engine refuses to fabricate"). No engine change.

### B. Persist the diagnostic signals (~5 min)
- `supabase/functions/compute-sas/index.ts`: include `popReachable15Raw`, `popReachable15Extrapolated`, `iso15AreaSqMi`, `iso10AreaSqMi`, `avgTractPop15`, `tractsHit15` in the `signals` JSONB written to `site_analyses`. Re-deploy.

### C. Swap the positive anchor to a real affluent site (the actual fix for the gap)
Two options — I recommend C1:

- **C1 (SAS-doc canonical):** Use **Trinity Episcopal School, 4011 Bee Caves Rd, Austin, TX 78746** (Westlake) as the positive anchor, matching SAS methodology Section 6. LeafSpring Plano stays as negative. This is the pair the SAS doc itself calibrates against (reference gap 86 vs 41 = 45 pts).
- **C2 (DFW pair):** Keep DFW but pick a positive anchor in a genuinely affluent DFW pocket — e.g. **Greenhill School, 4141 Spring Valley Rd, Addison** (no — same block) or **St. Mark's School of Texas, 10600 Preston Rd, Dallas** (Preston Hollow). Faster to A/B against the current LeafSpring address, but departs from the SAS doc.

After swap, re-run calibration. Expected outcome with C1: Trinity Episcopal pillars rise sharply (Westlake median HHI ~$200k, dense family pop), gap should open past 20.

### D. If C still doesn't open the gap past 20
That's the signal that Manus's three code fixes were necessary but not sufficient, and Lever B (mild reweight: School Profile 25→30, Ecosystem 15→20, Affluence 25→20, Family Density 20→15) is the next move — exactly the fallback both Perplexity and Manus converged on.

### Out of scope (don't touch)
- Closed-site penalty (Lever A) — both analyses rejected it.
- Family Density weight cut to zero (Lever C) — both rejected it.
- Pillar weights — only revisit if C fails.

## Decision needed from you
**Which positive anchor for C?**
1. **C1**: Trinity Episcopal, Westlake Austin (SAS doc canonical — recommended)
2. **C2**: St. Mark's School, Preston Hollow Dallas (DFW pair)
3. **Keep Trinity Christian Academy Addison** and skip to Lever B reweight instead

Pick one and I'll execute A + B + C (or A + B + D) in one pass.
