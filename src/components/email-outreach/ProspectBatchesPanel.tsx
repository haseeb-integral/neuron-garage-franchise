import { useEffect, useState } from "react";
import { RefreshCw, RotateCw, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BatchDetailDrawer } from "./BatchDetailDrawer";

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

type CampaignLite = { id: string; name: string | null };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#eef2f7] text-[#526078]",
  importing: "bg-[#fff4df] text-[#b7791f]",
  complete: "bg-[#e6f7ef] text-[#0a8f5a]",
  failed: "bg-[#fff1f1] text-[#ef4444]",
};

const callProxy = async (endpoint: string, method: string, payload?: unknown) => {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
    body: { endpoint, method, payload },
  });
  if (error) throw error;
  return data;
};

export function ProspectBatchesPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [campaignsById, setCampaignsById] = useState<Record<string, CampaignLite>>({});
  const [failedByBatch, setFailedByBatch] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [openBatch, setOpenBatch] = useState<Batch | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("teacher_import_batches").select("*").order("created_at", { ascending: false }).limit(50);
    const list = (rows ?? []) as Batch[];
    setBatches(list);

    // Campaign name lookup
    const { data: cache } = await supabase.from("campaign_cache").select("id, name");
    const map: Record<string, CampaignLite> = {};
    (cache ?? []).forEach((c) => { map[String(c.id)] = c as CampaignLite; });
    setCampaignsById(map);

    // Failed staging counts per batch
    if (list.length > 0) {
      const ids = list.map((b) => b.id);
      const { data: staged } = await supabase
        .from("prospects_staging").select("batch_id, qa_status").in("batch_id", ids);
      const counts: Record<string, number> = {};
      (staged ?? []).forEach((s: { batch_id: string; qa_status: string }) => {
        if (s.qa_status === "rejected") counts[s.batch_id] = (counts[s.batch_id] ?? 0) + 1;
      });
      setFailedByBatch(counts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const retryFailed = async (batch: Batch) => {
    if (!batch.campaign_id) { toast.error("Batch has no campaign_id — cannot retry"); return; }
    setRetryingId(batch.id);
    try {
      const { data: failed } = await supabase
        .from("prospects_staging")
        .select("email, first_name, last_name, company, city")
        .eq("batch_id", batch.id).eq("qa_status", "rejected");
      const rows = (failed ?? []).filter((r) => r.email);
      if (rows.length === 0) { toast.info("Nothing to retry"); setRetryingId(null); return; }

      const payload = {
        lead_list: rows.map((r) => ({
          email: r.email,
          first_name: r.first_name ?? "",
          last_name: r.last_name ?? "",
          company_name: r.company ?? "",
          location: r.city ?? "",
        })),
      };
      await callProxy(`/campaigns/${batch.campaign_id}/leads`, "POST", payload);

      // Mark as approved (now sent)
      await supabase.from("prospects_staging")
        .update({ qa_status: "approved", rejection_reason: null })
        .eq("batch_id", batch.id).eq("qa_status", "rejected");

      toast.success(`Retried ${rows.length} failed leads`);
      load();
    } catch (e) {
      toast.error(`Retry failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white">
      <div className="flex items-center justify-between border-b border-[#edf2f8] px-3 py-2">
        <div>
          <h2 className="text-xs font-black">Import Batches</h2>
          <p className="text-[11px] text-[#66728a]">Past uploads pushed to SmartLead.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-[#dbe4f2] px-2 py-1 text-[11px] font-bold text-[#174be8]"><RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>
      {batches.length === 0 ? (
        <div className="px-4 py-5 text-center text-[12px] text-[#66728a]">No import batches yet. Click "Import Leads" to create one.</div>
      ) : (
        <table className="w-full text-[11px]">
          <thead><tr className="text-left text-[9px] uppercase text-[#8794ab]"><th className="px-3 py-1.5">Batch</th><th>Source</th><th>City</th><th>Segment</th><th>Records</th><th>Approved</th><th>Campaign</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>{batches.map((b) => {
            const campaign = b.campaign_id ? campaignsById[String(b.campaign_id)] : null;
            const failedCount = failedByBatch[b.id] ?? 0;
            return (
              <tr key={b.id} onClick={() => setOpenBatch(b)} className="cursor-pointer border-t border-[#edf2f8] hover:bg-[#f7faff]">
                <td className="px-3 py-1.5 font-bold">
                  <span className="inline-flex items-center gap-1">
                    <ChevronRight size={10} className="text-[#8794ab]" />
                    {b.batch_name}
                  </span>
                </td>
                <td className="py-1.5">{b.source ?? "—"}</td>
                <td className="py-1.5">{b.city ?? "—"}{b.state ? `, ${b.state}` : ""}</td>
                <td className="py-1.5">{b.segment ?? "—"}</td>
                <td className="py-1.5">{b.record_count}</td>
                <td className="py-1.5">{b.approved_count}</td>
                <td className="max-w-[160px] truncate py-1.5" title={campaign?.name ?? b.campaign_id ?? ""}>
                  {campaign?.name ? (
                    <span className="text-[11px] font-medium text-[#07142f]">{campaign.name}</span>
                  ) : b.campaign_id ? (
                    <span className="font-mono text-[10px]">{b.campaign_id}</span>
                  ) : "—"}
                </td>
                <td className="py-1.5"><span className={`inline-flex h-4 items-center rounded-md px-1.5 text-[10px] font-bold ${STATUS_STYLES[b.status] ?? STATUS_STYLES.pending}`}>{b.status}</span></td>
                <td className="py-1.5 text-[10px] text-[#66728a]">{new Date(b.created_at).toLocaleString()}</td>
                <td className="pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {failedCount > 0 && (
                    <button
                      onClick={() => retryFailed(b)}
                      disabled={retryingId === b.id || !b.campaign_id}
                      title={!b.campaign_id ? "No campaign linked" : `Retry ${failedCount} failed leads`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#ef4444] px-1.5 py-0.5 text-[10px] font-bold text-[#ef4444] hover:bg-[#fff1f1] disabled:opacity-50"
                    >
                      {retryingId === b.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCw size={10} />}
                      Retry {failedCount}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
      <BatchDetailDrawer
        batch={openBatch}
        campaignName={openBatch?.campaign_id ? campaignsById[String(openBatch.campaign_id)]?.name ?? null : null}
        onClose={() => setOpenBatch(null)}
      />
    </div>
  );
}
