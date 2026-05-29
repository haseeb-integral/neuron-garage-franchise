import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
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

type StagedRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  city: string | null;
  qa_status: string;
  rejection_reason: string | null;
};

const callProxy = async (endpoint: string, method: string) => {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
    body: { endpoint, method },
  });
  if (error) throw error;
  return data;
};

const QA_STYLES: Record<string, string> = {
  approved: "bg-[#e6f7ef] text-[#0a8f5a]",
  rejected: "bg-[#fff1f1] text-[#ef4444]",
  pending: "bg-[#eef2f7] text-[#526078]",
};

export function BatchDetailDrawer({
  batch,
  campaignName,
  onClose,
}: {
  batch: Batch | null;
  campaignName?: string | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<StagedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaignTotal, setCampaignTotal] = useState<number | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  useEffect(() => {
    if (!batch) return;
    let cancelled = false;
    setLoading(true);
    setRows([]);
    setCampaignTotal(null);
    setCampaignError(null);

    (async () => {
      const { data } = await supabase
        .from("prospects_staging")
        .select("id, email, first_name, last_name, company, city, qa_status, rejection_reason")
        .eq("batch_id", batch.id)
        .order("qa_status", { ascending: true })
        .limit(1000);
      if (cancelled) return;
      setRows((data ?? []) as StagedRow[]);
      setLoading(false);

      // Fetch campaign-side lead total for the disambiguation banner
      if (batch.campaign_id) {
        try {
          const res = await callProxy(`campaigns/${batch.campaign_id}/leads?limit=1`, "GET");
          if (cancelled) return;
          const total = res?.total_leads ?? res?.data?.length ?? null;
          setCampaignTotal(total != null ? Number(total) : null);
        } catch (e) {
          if (!cancelled) setCampaignError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [batch]);

  if (!batch) return null;

  const approved = rows.filter((r) => r.qa_status === "approved").length;
  const rejected = rows.filter((r) => r.qa_status === "rejected").length;
  const total = rows.length;

  const showDriftBanner =
    batch.campaign_id != null &&
    campaignTotal != null &&
    campaignTotal !== approved;

  const slUrl = batch.campaign_id ? `https://app.smartlead.ai/app/email-campaign/${batch.campaign_id}/analytics` : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside className="h-full w-full max-w-[820px] overflow-y-auto border-l border-[#e7edf5] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[#edf2f8] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Import batch</div>
            <h2 className="mt-0.5 truncate text-lg font-black text-[#07142f]">{batch.batch_name}</h2>
            <div className="mt-1 text-[11px] text-[#526078]">
              {batch.source ?? "—"} · {batch.segment ?? "—"} · {batch.city ?? "—"}{batch.state ? `, ${batch.state}` : ""} · {new Date(batch.created_at).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[#526078] hover:bg-[#f7faff]"><X size={18} /></button>
        </div>

        <div className="space-y-4 p-5">
          {/* Counts */}
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Records" value={String(batch.record_count)} />
            <Stat label="Approved" value={String(approved || batch.approved_count)} tone="green" />
            <Stat label="Rejected" value={String(rejected)} tone={rejected > 0 ? "red" : "gray"} />
            <Stat label="Status" value={batch.status} tone={batch.status === "complete" ? "green" : batch.status === "failed" ? "red" : "gray"} />
          </div>

          {/* Campaign link */}
          {batch.campaign_id && (
            <div className="flex items-center justify-between rounded-lg border border-[#dbe4f2] bg-[#fbfdff] px-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-[#07142f]">Destination campaign</div>
                <div className="truncate text-[#526078]">{campaignName ?? <span className="font-mono">{batch.campaign_id}</span>}</div>
              </div>
              {slUrl && (
                <a href={slUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[#174be8] px-2.5 py-1.5 text-[11px] font-bold text-white">
                  Open in SmartLead <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          {/* Disambiguation banner: campaign has more leads than this batch sent */}
          {showDriftBanner && (
            <div className="flex gap-2 rounded-lg border border-[#fce8b0] bg-[#fff8e6] p-3 text-[11px] text-[#7a5a00]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#b7791f]" />
              <div>
                <div className="font-black text-[#7a5a00]">Campaign contains {campaignTotal} leads — this batch pushed {approved}.</div>
                <div className="mt-1">
                  The other {Math.max(0, (campaignTotal ?? 0) - approved)} were added separately: prior imports, manual adds in SmartLead, or SmartLead reusing
                  existing <code>lead_id</code>s when the same email already exists in your account (account-wide dedup). No duplicate sends occur — SmartLead
                  attaches the existing lead to this campaign instead of creating a copy.
                </div>
              </div>
            </div>
          )}
          {campaignError && (
            <div className="rounded-lg border border-[#fad2d2] bg-[#fff1f1] p-2 text-[11px] text-[#ef4444]">
              Couldn't read campaign lead count: {campaignError}
            </div>
          )}

          {/* Leads table */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-black text-[#07142f]">Leads in this batch ({total})</h3>
              <div className="text-[10px] text-[#8794ab]">From <code>prospects_staging</code></div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-[12px] text-[#526078]">
                <Loader2 size={14} className="mr-2 animate-spin" /> Loading leads…
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#dbe4f2] py-10 text-center text-[12px] text-[#66728a]">
                No staged rows found for this batch.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[#edf2f8]">
                <table className="w-full text-[11px]">
                  <thead className="bg-[#f7faff] text-left text-[9px] uppercase text-[#8794ab]">
                    <tr><th className="px-3 py-2">Email</th><th>Name</th><th>City</th><th>QA</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-[#edf2f8]">
                        <td className="px-3 py-1.5 font-mono text-[10px] text-[#07142f]">{r.email ?? "—"}</td>
                        <td className="text-[#34445f]">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                        <td className="text-[#526078]">{r.city ?? "—"}</td>
                        <td>
                          <span className={`inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[9px] font-bold uppercase ${QA_STYLES[r.qa_status] ?? QA_STYLES.pending}`}>
                            {r.qa_status === "approved" && <CheckCircle2 size={9} />}
                            {r.qa_status}
                          </span>
                        </td>
                        <td className="text-[10px] text-[#ef4444]">{r.rejection_reason ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone = "gray" }: { label: string; value: string; tone?: "gray" | "green" | "red" }) {
  const toneCls =
    tone === "green" ? "text-[#0a8f5a]" : tone === "red" ? "text-[#ef4444]" : "text-[#07142f]";
  return (
    <div className="rounded-lg border border-[#edf2f8] bg-white px-3 py-2">
      <div className="text-[9px] font-bold uppercase text-[#8794ab]">{label}</div>
      <div className={`mt-0.5 text-lg font-black ${toneCls}`}>{value}</div>
    </div>
  );
}
