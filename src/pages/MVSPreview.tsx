import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { DEFAULT_WEIGHTS } from "@/lib/mvs/computeMvs";
import { useLiveMvs } from "@/lib/mvs/useLiveMvs";
import { RunPipelineButton } from "@/components/phase2-demo/RunPipelineButton";

const SCORE_LABELS: Record<string, string> = {
  pricingAcceptance: "Pricing Acceptance",
  marketAbsorption: "Market Absorption",
  scaledOperator: "Scaled Operator",
  enrichmentDiversity: "Enrichment Diversity",
  marketDepth: "Market Depth",
  marketBalance: "Market Balance",
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(1);
}

export default function MVSPreview() {
  const { isManager, loading: roleLoading } = useIsManager();
  const navigate = useNavigate();
  const { result, providers, weeks, loading, error, refresh } = useLiveMvs("Austin, TX");

  if (roleLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#174be8]" />
      </div>
    );
  }
  if (!isManager) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#a35200]" />
        <h2 className="text-lg font-bold text-[#07142f]">Manager access required</h2>
        <p className="mt-2 text-sm text-[#526078]">
          The MVS preview is only available to managers and admins.
        </p>
      </div>
    );
  }

  const demoMvs = 76;

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#174be8] hover:underline"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <BarChart3 size={22} className="text-[#174be8]" />
        <div>
          <h1 className="text-xl font-bold text-[#07142f]">MVS Preview — Austin, TX</h1>
          <p className="text-[12px] text-[#526078]">
            Live pipeline data read-only preview. Normalization version: {result?.normalizationVersion ?? "1.0-fixed"}
          </p>
        </div>
      </div>

      <RunPipelineButton city="Austin, TX" onComplete={refresh} />

      {loading && (
        <div className="flex h-48 items-center justify-center rounded-lg border border-[#eef2f7] bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#174be8]" />
          <span className="ml-2 text-sm text-[#526078]">Loading Austin pipeline data…</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && providers.length === 0 && (
        <div className="rounded-lg border border-[#eef2f7] bg-white p-6 text-center">
          <p className="text-sm font-medium text-[#07142f]">No Austin pipeline data yet</p>
          <p className="mt-1 text-[12px] text-[#526078]">
            Run the MVS pipeline for Austin to populate providers and weeks. Once data is available,
            this page will compute the live MVS and sub-scores automatically.
          </p>
        </div>
      )}

      {!loading && !error && providers.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#eef2f7] bg-white p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#174be8]">
                Live MVS
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-[48px] font-black leading-none tabular-nums text-[#07142f]">
                  {fmt(result?.mvs ?? null)}
                </span>
                <span className="text-[12px] text-[#526078]">/ 100</span>
              </div>
              <div className="mt-3 text-[12px] text-[#526078]">
                Computed from {providers.length} providers, {weeks.length} weeks, v1.0 fixed ranges.
              </div>
            </div>

            <div className="rounded-xl border border-[#eef2f7] bg-white p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#526078]">
                Demo Comparison (City Search)
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-[48px] font-black leading-none tabular-nums text-[#526078]">
                  {demoMvs}
                </span>
                <span className="text-[12px] text-[#526078]">/ 100</span>
              </div>
              <div className="mt-3 text-[12px] text-[#526078]">
                Static composite from Feature 1 city-data seed. Gap shown for sanity-check only.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(DEFAULT_WEIGHTS).map(([key, weight]) => {
              const score = result?.scores[key as keyof typeof result.scores] ?? null;
              const input = result?.inputs[key as keyof typeof result.inputs] as any;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-[#eef2f7] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-bold text-[#07142f]">
                        {SCORE_LABELS[key]}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#174be8]">
                        {Math.round(weight * 100)}% weight
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[22px] font-black leading-none tabular-nums text-[#07142f]">
                        {fmt(score)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[#526078]">/ 100</div>
                    </div>
                  </div>

                  {input && (
                    <div className="mt-3 space-y-1 border-t border-dashed border-[#eef2f7] pt-2">
                      {Object.entries(input).map(([k, v]) => {
                        if (v == null || k === "year2Signal") return null;
                        return (
                          <div key={k} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#526078]">{k}</span>
                            <span className="font-medium tabular-nums text-[#07142f]">
                              {typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(2)) : String(v)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
