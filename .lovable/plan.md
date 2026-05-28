## Plan

Replace the Bottom line verdict copy in `src/components/city-scoring/market-detail/DrawerHeroSummary.tsx` with action-oriented, market-only language. No franchisee/candidate references. One file, one function (`bottomLine`).

### New copy (Option B)

- **90+**: "Top-tier market. Open recruiting now."
- **80–89**: "Strong market. Move forward; keep an eye on **{bottom} ({n})**."
- **70–79**: "Borderline. Worth a closer look at **{top} ({n})** before committing."
- **<70 with gap ≥25**: "Skip as a primary market, but **{top} ({n})** is unusually strong — niche play possible."
- **<70 flat**: "Skip — no pillar above {n}."

### Notes

- Pillar names rendered with proper casing (Demand / TAM Teachers / Competitive Opp).
- Top/bottom pillar chosen from displayed pillar scores, same as today.
- "<70 flat" line uses the top pillar's display value (so the user sees how low the ceiling is).
- Markdown-style **bold** in the source is just for the plan; the actual JSX keeps the existing plain-text rendering inside the Bottom line box (no new bold markup unless you want it).

### Files touched

- `src/components/city-scoring/market-detail/DrawerHeroSummary.tsx` — rewrite the `bottomLine()` function body only.
