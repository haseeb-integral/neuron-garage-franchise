import { useCallback, useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { DOMAINS } from "@/lib/dbHealth/queries";
import { HealthStatus, rollup } from "@/lib/dbHealth/thresholds";
import { DomainCard } from "@/components/dbHealth/DomainCard";
import { StatusPill } from "@/components/dbHealth/StatusPill";
import { AccuracyTab } from "@/components/dbHealth/AccuracyTab";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";

/**
 * /db-health — single-page "is everything working?" answer for managers.
 * Tier 1: status row + per-domain cards with row counts, % non-null, freshness,
 * and value ranges. Every metric exposes the SQL we ran and a Run-now button.
 */
export default function DbHealth() {
  const { loading: roleLoading, isManager } = useIsManager();
  const [perDomain, setPerDomain] = useState<Record<string, HealthStatus>>({});
  const [refreshTick, setRefreshTick] = useState(0);
  const [tab, setTab] = useState<"status" | "accuracy">("status");

  const overall = useMemo(() => rollup(Object.values(perDomain)), [perDomain]);

  const handleDomainStatus = useCallback((key: string, s: HealthStatus) => {
    setPerDomain((prev) => (prev[key] === s ? prev : { ...prev, [key]: s }));
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (roleLoading) {
    return <div className="p-6 text-[13px] text-[#526078]">Loading…</div>;
  }
  if (!isManager) {
    return (
      <div className="mx-auto max-w-xl mt-12 rounded-2xl border border-[#eef2f7] bg-white p-6 text-center">
        <h1 className="text-[15px] font-black text-[#0b1a36]">Manager access only</h1>
        <p className="mt-2 text-[13px] text-[#526078]">
          The database health page is restricted to managers.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-2">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-black text-[#0b1a36] tracking-tight">
            Database Health
          </h1>
          <p className="text-[13px] text-[#526078] mt-1">
            Live snapshot of every table that powers the app. Click any pill to jump
            to its section, or open "Show query" to see the exact SQL we ran.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={overall} label="Overall" />
          <button
            onClick={() => setRefreshTick((t) => t + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff]"
          >
            <RotateCw size={12} />
            Refresh all
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-[#eef2f7] bg-[#f7faff] p-3 mb-4 flex flex-wrap gap-2">
        {DOMAINS.map((d) => (
          <StatusPill
            key={d.key}
            status={perDomain[d.key] ?? "unknown"}
            label={d.label}
            onClick={() => scrollTo(`domain-${d.key}`)}
            compact
          />
        ))}
      </div>

      <div className="grid gap-4">
        {DOMAINS.map((d) => (
          <DomainCard
            // Remount on refresh-all to re-run all metrics
            key={`${d.key}-${refreshTick}`}
            domain={d}
            anchorId={`domain-${d.key}`}
            onStatusChange={(s) => handleDomainStatus(d.key, s)}
          />
        ))}
      </div>

      <p className="text-[11px] text-[#94a3b8] mt-6 text-center">
        Thresholds and queries live in <code>src/lib/dbHealth/</code> — tune them
        there. Send this URL to anyone asking "is the data healthy?"
      </p>
    </div>
  );
}
