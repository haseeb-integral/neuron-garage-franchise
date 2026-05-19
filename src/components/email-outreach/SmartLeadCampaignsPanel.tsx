import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Mail, ExternalLink, AlertCircle, Play, Pause, Square } from "lucide-react";
import { toast } from "sonner";
import { callSmartLeadProxy, getSmartLeadErrorMessage } from "@/components/email-outreach/smartleadErrors";

interface SLCampaign {
  id: number | string;
  name?: string;
  status?: string;
  created_at?: string;
  client_id?: number | string | null;
  track_settings?: unknown;
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
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callSmartLeadProxy("campaigns/");
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

  const applyDefaultLaunchSetup = async (campaignId: string | number) => {
    const timezone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch {
        return "UTC";
      }
    })();

    await callSmartLeadProxy(`/campaigns/${campaignId}/schedule`, "POST", {
      timezone,
      days_of_the_week: [1, 2, 3, 4, 5],
      start_hour: "09:00",
      end_hour: "18:00",
      min_time_btw_emails: 10,
      max_new_leads_per_day: 50,
    });

    const accounts = await callSmartLeadProxy("/email-accounts", "GET");
    const emailAccountIds = (Array.isArray(accounts) ? accounts : [])
      .map((account: any) => account?.id)
      .filter((id: unknown) => typeof id === "number" || typeof id === "string");

    if (!emailAccountIds.length) {
      throw new Error("No email accounts connected in SmartLead. Connect one in Email Accounts tab first.");
    }

    await callSmartLeadProxy(`/campaigns/${campaignId}/email-accounts`, "POST", {
      email_account_ids: emailAccountIds,
    });
  };

  const setStatus = async (c: SLCampaign, status: "START" | "PAUSED" | "STOPPED") => {
    const actionKey = `${c.id}-${status}`;
    setActing(actionKey);
    try {
      if (status === "START") {
        await applyDefaultLaunchSetup(c.id);
      }
      await callSmartLeadProxy(`/campaigns/${c.id}/status`, "POST", { status });
      toast.success(`Campaign "${c.name ?? c.id}" → ${status}`);
      await load();
    } catch (e) {
      toast.error(`Failed: ${getSmartLeadErrorMessage(e)}`);
    } finally {
      setActing(null);
    }
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
            Use the "+ Campaign" button at the top of the page to create one. Test Mode is on by default — it sends only to your inbox until you switch it off.
          </p>
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
              {campaigns.map((c) => {
                const s = (c.status ?? "").toUpperCase();
                const isRunning = s === "ACTIVE" || s === "RUNNING";
                const isPaused = s === "PAUSED";
                const isTest = (c.name ?? "").startsWith("[TEST]");
                return (
                  <tr key={String(c.id)} className="hover:bg-[#f7faff]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#07142f]">{c.name ?? `Campaign ${c.id}`}</span>
                        {isTest && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">🧪 TEST</span>}
                      </div>
                      <div className="text-[10px] text-[#5a6b85]">ID {c.id}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusTone(c.status)}`}>
                        {s || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#5a6b85]">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {!isRunning && (
                          <button onClick={() => setStatus(c, "START")} disabled={acting === `${c.id}-START`} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" title="Launch">
                            {acting === `${c.id}-START` ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} Launch
                          </button>
                        )}
                        {isRunning && (
                          <button onClick={() => setStatus(c, "PAUSED")} disabled={acting === `${c.id}-PAUSED`} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50" title="Pause">
                            {acting === `${c.id}-PAUSED` ? <Loader2 size={10} className="animate-spin" /> : <Pause size={10} />} Pause
                          </button>
                        )}
                        {(isRunning || isPaused) && (
                          <button onClick={() => setStatus(c, "STOPPED")} disabled={acting === `${c.id}-STOPPED`} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50" title="Stop">
                            {acting === `${c.id}-STOPPED` ? <Loader2 size={10} className="animate-spin" /> : <Square size={10} />} Stop
                          </button>
                        )}
                        <a
                          href={`https://app.smartlead.ai/app/email-campaign/${c.id}/analytics`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] px-2 py-1 text-[10px] font-bold text-[#1f5bff] hover:bg-[#f7faff]"
                        >
                          Open <ExternalLink size={10} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
