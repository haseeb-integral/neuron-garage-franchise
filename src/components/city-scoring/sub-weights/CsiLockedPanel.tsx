// CSI Locked Panel — Competitive Opportunity inputs are pulled from Manus
// (us_cities_scored.csi_score) and are read-only by design. This panel shows
// the inputs and the v2 formula; there are no editable sliders or Apply
// button. Extracted from SubMetricWeightsDrawer.tsx.

import type { SowMetricEntry } from "@/lib/sowMetricRegistry";
import { csiTierBadgeClass } from "@/lib/csiTierStyle";

interface CsiLockedPanelProps {
  metrics: SowMetricEntry[];
  rawValuesByKey?: Record<string, number | null | undefined>;
  csiRawScore: number | null;
  csiSaturationCategory: string | null;
  csiBrandDetail: string | null;
  selectedCityLabel?: string;
}

export function CsiLockedPanel({
  metrics,
  rawValuesByKey,
  csiRawScore,
  csiSaturationCategory,
  csiBrandDetail,
  selectedCityLabel,
}: CsiLockedPanelProps) {
  const formatValue = (v: number | null | undefined): string => {
    if (v == null || !Number.isFinite(v)) return "—";
    if (v >= 1000) return Math.round(v).toLocaleString();
    if (v >= 10) return v.toFixed(1);
    return v.toFixed(2);
  };

  // Parse csi_brand_detail string: "Code Ninjas(2)|KinderCare(1)|..."
  const brands: Array<{ name: string; count: number }> = (() => {
    if (!csiBrandDetail || typeof csiBrandDetail !== "string") return [];
    return csiBrandDetail
      .split("|")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const m = chunk.match(/^(.+?)\((\d+)\)\s*$/);
        if (!m) return { name: chunk, count: 1 };
        return { name: m[1].trim(), count: parseInt(m[2], 10) || 1 };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[12px] text-[#07142f] leading-relaxed">
      <div className="rounded border border-[#eef2f7] bg-white px-3 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[11px] uppercase tracking-wide text-[#526078] font-semibold">
            Competitive Opportunity · Raw CSI (Saturation) {selectedCityLabel ? `· ${selectedCityLabel}` : ""}
          </div>
          {csiSaturationCategory && (
            <span className={csiTierBadgeClass(csiSaturationCategory)}>
              {csiSaturationCategory}
            </span>
          )}
        </div>
        <div className="mt-1 text-[22px] font-bold tabular-nums text-[#07142f]">
          {csiRawScore == null ? "—" : csiRawScore.toFixed(0)}
          <span className="text-[11px] font-normal text-[#8794ab] ml-2">/ 100</span>
        </div>
        <p className="text-[10.5px] text-[#8794ab] mt-0.5 leading-snug">
          Lower = less crowded = better opportunity. The score is the city's percentile rank
          of real counted national-brand supply (STEM ×2.0 + general ×1.0) across all 817 cities.
          Composite uses <span className="font-mono">(100 − score)</span> so high contribution = good.
        </p>
      </div>

      <div className="rounded border border-[#eef2f7] bg-[#fafbfd] px-3 py-3">
        <p className="text-[11px] uppercase tracking-wide text-[#526078] font-semibold mb-1.5">
          Manus v2 formula (read-only)
        </p>
        <pre className="text-[11px] leading-relaxed text-[#07142f] whitespace-pre-wrap font-mono">
{`CSI = (NB_STEM × 2.0 + NB_Other × 1.0 + Local_Estimate)
      ÷  Demand_Adjusted_Market

Local_Estimate         = elementary_enrollment × 0.003
Demand_Adjusted_Market = elementary_enrollment × (median_HH_income ÷ 65,000)`}
        </pre>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-[#526078] font-semibold mb-1.5">
          Inputs from Manus (this city)
        </p>
        <div className="space-y-1">
          {metrics.map((m) => {
            const v = rawValuesByKey?.[m.key];
            return (
              <div
                key={m.key}
                className="flex items-center justify-between gap-3 px-2 py-1.5 rounded border border-[#eef2f7] bg-white"
              >
                <span className="text-[12px] text-[#07142f]">{m.label}</span>
                <span className="text-[12.5px] font-semibold tabular-nums text-[#07142f]">
                  {formatValue(typeof v === "number" ? v : null)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-[#526078] font-semibold mb-1.5">
          National brands present {brands.length > 0 && `(${brands.length})`}
        </p>
        {brands.length === 0 ? (
          <p className="text-[11.5px] text-[#8794ab] italic">
            No national brands detected in this city.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <span
                key={b.name}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#eef4ff] text-[#174be8] font-medium"
              >
                {b.name}
                <span className="text-[10px] text-[#526078]">×{b.count}</span>
              </span>
            ))}
          </div>
        )}
        <p className="text-[10.5px] text-[#8794ab] mt-1.5 leading-snug">
          STEM brands (Code Ninjas, Snapology, Engineering For Kids, Bricks 4 Kidz,
          iD Tech, Camp Invention, Mad Science, Galileo Learning, Challenge Island)
          are weighted ×2.0. General enrichment brands (Young Chefs Academy, Primrose,
          Goddard, KinderCare, i9 Sports, Wiz Kids) are weighted ×1.0.
        </p>
      </div>
    </div>
  );
}
