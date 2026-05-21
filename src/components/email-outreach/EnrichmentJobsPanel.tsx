import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Job = {
  id: string;
  city: string | null;
  state: string | null;
  provider: string;
  status: string;
  requested_count: number;
  succeeded_count: number;
  failed_count: number;
  total_cost_cents: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  smartlead_campaign_id: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-[#eef2f7] text-[#526078]",
  running: "bg-[#fff4df] text-[#b7791f]",
  complete: "bg-[#e6f7ef] text-[#0a8f5a]",
  failed: "bg-[#fff1f1] text-[#ef4444]",
};

const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;

/**
 * Sprint 3 #7 — surface `enrichment_jobs` so cost + status are visible
 * regardless of which scope (Master DB / SmartLead) the user is in.
 * Single backend; row click could later open a per-job detail drawer.
 */
export function EnrichmentJobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("enrichment_jobs")
      .select("id, city, state, provider, status, requested_count, succeeded_count, failed_count, total_cost_cents, created_at, started_at, completed_at, smartlead_campaign_id")
      .order("created_at", { ascending: false })
      .limit(50);
    setJobs((data ?? []) as Job[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalSpend = jobs.reduce((sum, j) => sum + (j.total_cost_cents ?? 0), 0);

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white">
      <div className="flex items-center justify-between border-b border-[#edf2f8] px-3 py-2">
        <div>
          <h2 className="flex items-center gap-1 text-xs font-black"><Sparkles size={12} className="text-[#7c3aed]" /> Enrichment Runs</h2>
          <p className="text-[11px] text-[#66728a]">Per-city email/contact enrichment jobs across providers. Spend last 50 runs: <strong>{fmtCents(totalSpend)}</strong>.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-[#dbe4f2] px-2 py-1 text-[11px] font-bold text-[#174be8]">
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Refresh
        </button>
      </div>
      {jobs.length === 0 ? (
        <div className="px-4 py-5 text-center text-[12px] text-[#66728a]">
          No enrichment runs yet. They'll appear here when you trigger Apollo, Hunter, or SmartLead enrichment for a city.
        </div>
      ) : (
        <table className="w-full text-[11px]">
          <thead><tr className="text-left text-[9px] uppercase text-[#8794ab]">
            <th className="px-3 py-1.5">City</th><th>Provider</th><th>Status</th>
            <th>Requested</th><th>Success</th><th>Failed</th><th>Cost</th><th>Created</th>
          </tr></thead>
          <tbody>{jobs.map((j) => (
            <tr key={j.id} className="border-t border-[#edf2f8] hover:bg-[#f7faff]">
              <td className="px-3 py-1.5 font-bold">{j.city ?? "—"}{j.state ? `, ${j.state}` : ""}</td>
              <td className="py-1.5"><span className="rounded bg-[#f2ebff] px-1.5 py-0.5 text-[10px] font-bold text-[#7c3aed]">{j.provider}</span></td>
              <td className="py-1.5">
                <span className={`inline-flex h-4 items-center rounded-md px-1.5 text-[10px] font-bold ${STATUS_STYLES[j.status] ?? STATUS_STYLES.queued}`}>{j.status}</span>
              </td>
              <td className="py-1.5">{j.requested_count}</td>
              <td className="py-1.5 text-[#0a8f5a]">{j.succeeded_count}</td>
              <td className="py-1.5 text-[#ef4444]">{j.failed_count || ""}</td>
              <td className="py-1.5 font-mono">{fmtCents(j.total_cost_cents)}</td>
              <td className="py-1.5 text-[10px] text-[#66728a]">{new Date(j.created_at).toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
