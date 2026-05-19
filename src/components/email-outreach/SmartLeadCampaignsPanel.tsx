import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Plus, Mail, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SLCampaign {
  id: number | string;
  name?: string;
  status?: string;
  created_at?: string;
  client_id?: number | string | null;
  track_settings?: unknown;
}

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
    body: { endpoint, method, payload },
  });
  if (error) throw new Error(error.message ?? String(error));
  return data;
}

const statusTone = (s?: string) => {
  const v = (s ?? "").toUpperCase();
  if (v === "ACTIVE" || v === "RUNNING") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "PAUSED" || v === "STOPPED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (v === "DRAFTED" || v === "DRAFT") return "bg-blue-50 text-blue-700 border-blue-200";
  if (v === "COMPLETED") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
};

export function SmartLeadCampaignsPanel() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<SLCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callProxy("campaigns/");
      setCampaigns(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = () => {
    toast.info(
      "Campaign creation comes in Phase 4. For now create it inside SmartLead — it will appear here automatically.",
      { duration: 6000 },
    );
    window.open("https://app.smartlead.ai/app/campaigns", "_blank");
  };

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#07142f]">Campaigns</h2>
          <p className="mt-0.5 text-xs text-[#5a6b85]">
            Read-only view of campaigns in your SmartLead account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#eef2f7] bg-white px-3 py-1.5 text-xs font-medium text-[#14233b] hover:bg-[#f7faff]"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f5bff] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0757ff]"
          >
            <Plus size={13} />
            Create Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-[#5a6b85]">
          <Loader2 size={16} className="mr-2 animate-spin" /> Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#dbe4f2] bg-[#fbfdff] py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4ff] text-[#1f5bff]">
            <Mail size={22} />
          </div>
          <h3 className="text-base font-semibold text-[#07142f]">No campaigns yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#5a6b85]">
            Your SmartLead account is connected but doesn't have any campaigns. Create your first
            campaign to start outreach — it'll appear here automatically.
          </p>
          <button
            onClick={handleCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1f5bff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0757ff]"
          >
            <Plus size={13} /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#eef2f7]">
          <table className="w-full text-sm">
            <thead className="bg-[#f7faff] text-left text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {campaigns.map((c) => (
                <tr key={String(c.id)} className="hover:bg-[#f7faff]">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[#07142f]">{c.name ?? `Campaign ${c.id}`}</div>
                    <div className="text-[10px] text-[#5a6b85]">ID {c.id}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusTone(c.status)}`}
                    >
                      {(c.status ?? "—").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[#5a6b85]">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <a
                      href={`https://app.smartlead.ai/app/email-campaign/${c.id}/analytics`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1f5bff] hover:underline"
                    >
                      Open <ExternalLink size={11} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
