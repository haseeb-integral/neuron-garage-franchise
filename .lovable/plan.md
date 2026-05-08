## Scope
UI-only cleanup in `src/pages/CityScoring.tsx`. No changes to drawer, report modal, helper, edge functions, DB, or scoring logic.

## 1. Restructure Scoring Weights header (lines 531–554)

Replace the current header row with a two-column flex layout:

```tsx
<div className="mb-3 flex items-start justify-between gap-4">
  <div className="min-w-0">
    <h3 className="text-sm font-bold text-[#07142f]">Scoring Weights</h3>
    <p className="text-[10px] text-[#8794ab] leading-snug mt-1">
      Set what matters most. 100% means scoring the market only by that category.
    </p>
    <p className="text-[10px] text-[#8794ab] leading-snug mt-0.5">
      Composite score uses six category scores. The 46 SOW metrics are evidence and are not fully rolled into the backend formula yet.
    </p>
    {totalWeight !== 100 && (
      <p className="text-[11px] text-[#ea580c] mt-1">Weights must total 100% to apply scoring.</p>
    )}
  </div>
  <div className="flex shrink-0 items-center gap-3">
    <span className="text-xs text-[#526078]">
      Total Weight: <span className={totalWeight === 100 ? "text-[#0ea66e] font-medium" : "text-[#ea580c] font-medium"}>{totalWeight}%</span>
    </span>
    <button onClick={resetWeights} className="text-xs font-medium text-[#174be8] hover:underline">Reset to Default</button>
    <Button
      size="sm"
      disabled={totalWeight !== 100}
      onClick={applyWeights}
      className="h-7 bg-[#174be8] hover:bg-[#1240c9] text-white text-[11px] px-3 disabled:opacity-50"
    >
      Apply Weights
    </Button>
  </div>
</div>
```

Helper lines stack under the title; controls stay right-aligned and don't shrink.

## 2. Rename "View All" → "View Evidence"

- Line 879 (Nearby Markets card): change button label `View All` → `View Evidence`. Click handler unchanged (still opens Source Evidence drawer).
- Line 901 (Source Data card): same change. Click handler unchanged.

## Out of scope
MarketDetailDrawer, MarketReportModal, cityScoringLiveData, edge functions, DB, scoring logic, slider behavior, legend text on line 953.