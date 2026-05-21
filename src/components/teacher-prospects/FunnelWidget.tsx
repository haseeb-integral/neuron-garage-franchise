import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

interface Props {
  total: number | null;          // Found
  emailReady: number | null;     // Enriched (verified email)
  needsEnrichment: number | null;
  inOutreach: number | null;     // existing allPromotedIds intersected with filter
  loading?: boolean;
}

// 4-stage funnel: Found → Enriched → Email-Ready → In Outreach.
// "Replied" deferred (needs smartlead_events join) — see plan.
export function FunnelWidget({ total, emailReady, needsEnrichment, inOutreach, loading }: Props) {
  const rows = useMemo(() => {
    const found = total ?? 0;
    const enriched = Math.max(0, found - (needsEnrichment ?? 0));
    const er = emailReady ?? 0;
    const io = inOutreach ?? 0;
    const max = Math.max(found, 1);
    const pct = (n: number) => Math.round((n / max) * 100);
    const conv = (n: number, prev: number) => (prev > 0 ? Math.round((n / prev) * 100) : 0);
    return [
      { key: "found", label: "Found", count: found, width: pct(found), conv: 100, formula: "All teachers matching current filters." },
      { key: "enriched", label: "Enriched", count: enriched, width: pct(enriched), conv: conv(enriched, found), formula: "Teachers with any email or verification status set (needs_email_enrichment = false)." },
      { key: "email_ready", label: "Email-ready", count: er, width: pct(er), conv: conv(er, enriched), formula: "Has email AND verification is null/valid/verified — safe to send via SmartLead." },
      { key: "in_outreach", label: "In Outreach", count: io, width: pct(io), conv: conv(io, er), formula: "Currently in outreach_queue with state queued/assigned/sending/sent." },
    ];
  }, [total, emailReady, needsEnrichment, inOutreach]);

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Pipeline Funnel</div>
        <span className="text-[10.5px] text-[#8794ab]">scoped to current filters</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[#07142f]">{r.label}</span>
                <Popover>
                  <PopoverTrigger className="text-[#8794ab] hover:text-[#174be8]">
                    <Info size={11} />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 bg-white p-3 text-xs">
                    <div className="mb-1 font-bold text-[#07142f]">{r.label}</div>
                    <div className="text-[#526078]">{r.formula}</div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-[#07142f]">{loading ? "—" : r.count.toLocaleString()}</span>
                {r.key !== "found" && !loading && (
                  <span className="text-[10.5px] text-[#8794ab]">{r.conv}%</span>
                )}
              </div>
            </div>
            <div className="h-2 rounded-full bg-[#edf2f8]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: loading ? "0%" : `${Math.max(r.width, r.count > 0 ? 4 : 0)}%`,
                  backgroundColor:
                    r.key === "found" ? "#174be8" :
                    r.key === "enriched" ? "#1e6fb8" :
                    r.key === "email_ready" ? "#0a8f5a" :
                    "#b7791f",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
