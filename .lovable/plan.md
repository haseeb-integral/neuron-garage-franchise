# Turn 4 — Flip the engine on & smoke-test

## Context

Pre-checks are clean:
- The console error is from `lovable.js` (Lovable's preview shell postMessage bridge), not our app — ignore.
- The greyed inputs on `/site-analysis` are the original **demo** UI, not a bug. `LiveEngineCard` is gated behind `VITE_SAS_ENGINE_LIVE === "true"` and is not rendering yet.
- `compute-sas` and `sas-calibrate` edge functions are deployed.
- `CENSUS_API_KEY` and `MAPBOX_TOKEN` secrets confirmed present.

## Goal of this turn

Turn the live engine **on** for the preview, render the `LiveEngineCard` above the demo block on `/site-analysis`, run one real end-to-end compute against a known address, and confirm pillar + composite scores come back from the backend.

## Changes

1. **Add `VITE_SAS_ENGINE_LIVE=true` to `.env`** so Vite exposes the flag to the client.
   - Single line addition; no other env vars touched.
   - Triggers an auto dev-server restart.

2. **No other code changes.** Everything else is already wired:
   - `SiteAnalysis.tsx` imports `LiveEngineCard` + `SAS_ENGINE_LIVE` and renders the card conditionally.
   - Demo path stays intact when the flag is on (card renders *above* it, doesn't replace it).

## How I'll verify (automated, before handing back)

- Re-read `.env` to confirm the line is present.
- Hit `compute-sas` with a sample payload via `supabase--curl_edge_functions` using the address **4131 Spring Valley Rd, Addison, TX 75001** and confirm a 200 response with `sas` + 5 pillar scores.
- Pull `edge_function_logs` for `compute-sas` to confirm Mapbox + Census calls succeeded (no 401/403 from missing tokens).
- Spot-check `site_analysis_isochrones` and `site_analysis_acs_cache` rows were written.

## Human manual test for Haseeb

After my automated checks come back green:

1. Hard-refresh `/site-analysis` (Cmd-Shift-R).
2. You should now see a new card at the top titled **"Live Site Analysis Engine (v0.1)"** with a blue `ENGINE LIVE` badge. Inputs should be **editable**, not greyed.
3. Fill in:
   - School name: `Trinity Christian Academy`
   - Address: `4131 Spring Valley Rd, Addison, TX 75001`
   - Leave other fields default.
4. Click **Compute SAS**. Button shows "Computing…" for ~5–15s on first run.
5. Expected result: a SAS composite (0–100) and 5 pillar tiles (School profile, Affluence, Family density, Ecosystem, Accessibility), plus a place label like "Addison, TX".
6. Click **Compute SAS** again with the same address — should return in <2s (cache hit on isochrones + ACS).
7. Try a second address (e.g. `1234 Mockingbird Ln, Dallas, TX 75201`) — should also succeed with different scores.

## Troubleshoot matrix (what to tell me if it fails)

| Symptom | Likely cause | What I'll do |
|---|---|---|
| Card still doesn't appear | Vite didn't pick up `.env` | Restart dev server |
| "Geocoding failed" / 4xx from Mapbox | Bad/expired `MAPBOX_TOKEN` | Re-issue token, re-add secret |
| "Census fetch failed" / empty ACS | Bad `CENSUS_API_KEY` or rate-limit | Verify key, add retry |
| 5xx with no body | Edge function exception | Pull `compute-sas` logs, patch |
| Scores all 0 or all 100 | Pillar math edge case | Inspect `sas-math.ts` against payload |

## What stays untouched

- Demo UI (the greyed mock you see today) — still there for comparison.
- Any existing `site_analyses` rows or scoring config.
- All other Phase 2 areas (Market Validation, Candidate Pipeline, etc.).

## After this turn

If smoke test passes, next turns are (in order):
1. **Calibration run** — invoke `sas-calibrate` on 5–10 known schools, tune pillar weights.
2. **Persist + history** — wire the "Save analysis" button on the live card to write to `site_analyses`.
3. **Map overlay** — render the 10/15-min isochrones on the existing map.
4. **Polish + remove demo block** — once Brett signs off on parity, retire the greyed demo UI.
