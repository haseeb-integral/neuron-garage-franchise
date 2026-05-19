import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Batch = {
  id: string;
  batch_name: string;
  source: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  record_count: number;
  approved_count: number;
  status: string;
  campaign_id: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#eef2f7] text-[#526078]",
  importing: "bg-[#fff4df] text-[#b7791f]",
  complete: "bg-[#e6f7ef] text-[#0a8f5a]",
  failed: "bg-[#fff1f1] text-[#ef4444]",
};

export function ProspectBatchesPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("prospect_batches").select("*").order("created_at", { ascending: false }).limit(50);
    setBatches((data ?? []) as Batch[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [refreshKey]);

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white">
      <div className="flex items-center justify-between border-b border-[#edf2f8] px-4 py-3">
        <div>
          <h2 className="text-sm font-black">Import Batches</h2>
          <p className="text-[11px] text-[#66728a]">History of lead uploads pushed to SmartLead</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-[#dbe4f2] px-2 py-1 text-[11px] font-bold text-[#174be8]"><RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>
      {batches.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-[#66728a]">No import batches yet. Click "Import Leads" to create one.</div>
      ) : (
        <table className="w-full text-[11px]">
          <thead><tr className="text-left text-[9px] uppercase text-[#8794ab]"><th className="px-4 py-2">Batch</th><th>Source</th><th>City</th><th>Segment</th><th>Records</th><th>Approved</th><th>Campaign</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>{batches.map((b) => (
            <tr key={b.id} className="border-t border-[#edf2f8]">
              <td className="px-4 py-2 font-bold">{b.batch_name}</td>
              <td>{b.source ?? "—"}</td>
              <td>{b.city ?? "—"}{b.state ? `, ${b.state}` : ""}</td>
              <td>{b.segment ?? "—"}</td>
              <td>{b.record_count}</td>
              <td>{b.approved_count}</td>
              <td className="font-mono text-[10px]">{b.campaign_id ?? "—"}</td>
              <td><span className={`inline-flex h-5 items-center rounded-md px-2 text-[10px] font-bold ${STATUS_STYLES[b.status] ?? STATUS_STYLES.pending}`}>{b.status}</span></td>
              <td className="text-[10px] text-[#66728a]">{new Date(b.created_at).toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
