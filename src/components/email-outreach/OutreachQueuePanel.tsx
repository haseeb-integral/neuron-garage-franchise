import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, MailPlus, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { syncAndGetRealCampaigns, isRealCampaignId, type RealCampaign } from "@/lib/smartleadCampaigns";

interface QueueRow {
  id: string;
  state: string;
  campaign_id: string | null;
  added_at: string;
  notes: string | null;
  teacher_prospect_id: string;
  smartlead_lead_id: string | null;
  pushed_at: string | null;
  last_error: string | null;
  teacher_prospects: { name: string | null; email: string | null; school: string | null; city: string | null; state: string | null } | null;
}

const stateTone: Record<string, string> = {
  queued: "bg-[#eef4ff] text-[#174be8]",
  assigned: "bg-[#fff4df] text-[#b7791f]",
  sending: "bg-[#fff4df] text-[#b7791f]",
  sent: "bg-[#e6f7ef] text-[#0a8f5a]",
  failed: "bg-[#fee2e2] text-[#b91c1c]",
};

type CampaignOption = RealCampaign;

export function OutreachQueuePanel() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>({});
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState<Record<string, boolean>>({});
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "queued" | "sent" | "failed">("all");
  const [syncingCampaigns, setSyncingCampaigns] = useState(false);

  const loadCampaignOptions = useCallback(async () => {
    setSyncingCampaigns(true);
    const real = await syncAndGetRealCampaigns();
    setCampaignOptions(real);
    setCampaignNames((prev) => {
      const next = { ...prev };
      for (const c of real) next[c.id] = c.name;
      return next;
    });
    setSyncingCampaigns(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("outreach_queue")
      .select("id, state, campaign_id, added_at, notes, teacher_prospect_id, smartlead_lead_id, pushed_at, last_error, teacher_prospects(name,email,school,city,state)")
      .order("added_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(`Couldn't load outreach queue: ${error.message}`);
      setLoading(false);
      return;
    }
    const queueRows = (data ?? []) as unknown as QueueRow[];
    setRows(queueRows);

    const ids = Array.from(new Set(queueRows.map((r) => r.campaign_id).filter((x): x is string => !!x)));
    if (ids.length) {
      const { data: camps } = await supabase.from("campaign_cache").select("id,name").in("id", ids);
      const map: Record<string, string> = {};
      (camps ?? []).forEach((c) => { if (c.name) map[c.id] = c.name; });
      setCampaignNames(map);
    } else {
      setCampaignNames({});
    }
    setLoading(false);
  }, []);


  useEffect(() => { load(); loadCampaignOptions(); }, [load, loadCampaignOptions]);

  const assignCampaign = async (rowId: string, campaignId: string) => {
    if (!campaignId) return;
    setAssigning((p) => ({ ...p, [rowId]: true }));
    const { error } = await supabase
      .from("outreach_queue")
      .update({ campaign_id: campaignId, state: "assigned", last_error: null })
      .eq("id", rowId);
    if (error) {
      toast.error(`Couldn't assign: ${error.message}`);
    } else {
      setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, campaign_id: campaignId, state: "assigned", last_error: null } : r));
      const name = campaignOptions.find((c) => c.id === campaignId)?.name;
      if (name) setCampaignNames((m) => ({ ...m, [campaignId]: name }));
      toast.success(`Assigned to ${name ?? campaignId}`);
    }
    setAssigning((p) => { const n = { ...p }; delete n[rowId]; return n; });
  };



  const visible = rows.filter((r) => filter === "all" ? true : filter === "failed" ? r.state === "failed" : r.state === filter);

  const remove = async (id: string) => {
    const { error } = await supabase.from("outreach_queue").delete().eq("id", id);
    if (error) { toast.error(`Couldn't remove: ${error.message}`); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removed from outreach queue");
  };

  const push = async (r: QueueRow) => {
    if (!r.campaign_id || !isRealCampaignId(r.campaign_id)) {
      toast.error("This row has no real SmartLead campaign. Reassign it from Teacher Search → Add to Campaign.");
      return;
    }
    const email = r.teacher_prospects?.email?.trim();
    if (!email) {
      toast.error(`${r.teacher_prospects?.name ?? "Teacher"} has no email — can't push.`);
      return;
    }

    setPushing((p) => ({ ...p, [r.id]: true }));
    await supabase.from("outreach_queue").update({ state: "sending", last_error: null }).eq("id", r.id);

    const [firstName, ...rest] = (r.teacher_prospects?.name ?? "").split(/\s+/);
    const lastName = rest.join(" ");
    const lead = {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email,
      company_name: r.teacher_prospects?.school ?? undefined,
      location: r.teacher_prospects?.city ?? undefined,
    };

    try {
      const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
        body: {
          endpoint: `campaigns/${r.campaign_id}/leads`,
          method: "POST",
          payload: { lead_list: [lead] },
        },
      });
      if (error) throw error;
      // smartlead-proxy returns {ok:false,...} on upstream failure with status 200
      if (data && data.ok === false) {
        throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      }

      // SmartLead returns upload_count + per-lead ids; we don't always get a single id back.
      const leadId = data?.upload_count !== undefined ? String(data?.uploaded_leads?.[0]?.lead_id ?? "") : "";
      await supabase.from("outreach_queue").update({
        state: "sent",
        pushed_at: new Date().toISOString(),
        smartlead_lead_id: leadId || null,
        last_error: null,
      }).eq("id", r.id);

      toast.success(`Pushed ${r.teacher_prospects?.name ?? email} to SmartLead`);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("outreach_queue").update({ state: "failed", last_error: msg }).eq("id", r.id);
      toast.error(`Push failed: ${msg}`);
      load();
    } finally {
      setPushing((p) => { const n = { ...p }; delete n[r.id]; return n; });
    }
  };

  const counts = {
    all: rows.length,
    queued: rows.filter((r) => r.state === "queued").length,
    sent: rows.filter((r) => r.state === "sent").length,
    failed: rows.filter((r) => r.state === "failed").length,
  };

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f8] px-4 py-3">
        <div className="flex items-center gap-2">
          <MailPlus size={16} className="text-[#174be8]" />
          <h3 className="text-sm font-black text-[#07142f]">Outreach Queue</h3>
          <span className="text-xs text-[#66728a]">teachers added from Teacher Search — push to SmartLead when ready</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => { load(); loadCampaignOptions(); }} className="h-8 rounded-lg border-[#dbe4f2] bg-white text-xs text-[#174be8]"><RefreshCw size={12} /> Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {(["all", "queued", "sent", "failed"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${filter === k ? "bg-[#174be8] text-white" : "bg-[#eef2f7] text-[#526078] hover:bg-[#dbe4f2]"}`}>
            {k} · {counts[k]}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#8794ab]">Loading queue…</div>
        ) : visible.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#8794ab]">
            {rows.length === 0 ? "No teachers added to outreach yet. Add some from Teacher Search → ‘Add to Outreach’." : "No rows match this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-[11px] font-bold uppercase tracking-wide text-[#66728a]">
                <tr className="border-b border-[#edf2f8]">
                  <th className="py-2 pr-3">Teacher</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">School / City</th>
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Added</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[#07142f]">
                {visible.map((r) => {
                  const realCampaign = isRealCampaignId(r.campaign_id);
                  const canPush = realCampaign && !!r.teacher_prospects?.email && r.state !== "sent" && r.state !== "sending";
                  return (
                  <tr key={r.id} className="border-b border-[#edf2f8] last:border-0 hover:bg-[#fafbfd]">
                    <td className="py-2 pr-3 font-semibold">{r.teacher_prospects?.name ?? "—"}</td>
                    <td className="py-2 pr-3 text-[#526078]">{r.teacher_prospects?.email || <span className="italic text-[#b0bbd0]">no email</span>}</td>
                    <td className="py-2 pr-3 text-[#526078]">
                      <div>{r.teacher_prospects?.school ?? "—"}</div>
                      <div className="text-[11px] text-[#8794ab]">{r.teacher_prospects?.city}{r.teacher_prospects?.state ? `, ${r.teacher_prospects.state}` : ""}</div>
                    </td>
                    <td className="py-2 pr-3 text-[#526078]">
                      {realCampaign && r.state !== "sent" && r.state !== "sending" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#eef4ff] px-2 py-0.5 text-xs font-bold text-[#174be8]">{campaignNames[r.campaign_id!] ?? `id ${r.campaign_id}`}</span>
                          <select
                            value=""
                            onChange={(e) => assignCampaign(r.id, e.target.value)}
                            disabled={!!assigning[r.id] || campaignOptions.length === 0}
                            className="h-6 rounded border border-[#dbe4f2] bg-white px-1 text-[10px] text-[#526078] hover:bg-[#fafbfd]"
                            title="Change campaign"
                          >
                            <option value="">change…</option>
                            {campaignOptions.filter((c) => c.id !== r.campaign_id).map((c) => (
                              <option key={c.id} value={c.id}>{c.name}{c.status ? ` · ${c.status}` : ""}</option>
                            ))}
                          </select>
                        </div>
                      ) : realCampaign ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#eef4ff] px-2 py-0.5 text-xs font-bold text-[#174be8]">{campaignNames[r.campaign_id!] ?? `id ${r.campaign_id}`}</span>
                      ) : (
                        // Unassigned OR invalid synthetic id → show inline picker
                        <div className="flex flex-col gap-1">
                          {!r.campaign_id ? (
                            <span className="text-[11px] italic text-[#b0bbd0]">no campaign yet — pick one:</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b91c1c]">
                              <AlertCircle size={11} /> invalid — pick a real one:
                            </span>
                          )}
                          {campaignOptions.length === 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#8794ab]">No SmartLead campaigns loaded.</span>
                              <button onClick={loadCampaignOptions} disabled={syncingCampaigns} className="rounded border border-[#dbe4f2] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#174be8] hover:bg-[#eef4ff] disabled:opacity-50">
                                {syncingCampaigns ? <Loader2 size={9} className="-mt-0.5 inline animate-spin" /> : <RefreshCw size={9} className="-mt-0.5 inline" />} Sync now
                              </button>
                            </div>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => assignCampaign(r.id, e.target.value)}
                              disabled={!!assigning[r.id]}
                              className="h-7 max-w-[220px] rounded border border-[#dbe4f2] bg-white px-1.5 text-xs text-[#07142f] focus:outline-none focus:ring-1 focus:ring-[#174be8]"
                            >
                              <option value="">Select campaign…</option>
                              {campaignOptions.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}{c.status ? ` · ${c.status}` : ""}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-[#526078]">{new Date(r.added_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${stateTone[r.state] ?? "bg-[#eef2f7] text-[#526078]"}`}>{r.state}</span>
                      {r.state === "failed" && r.last_error && (
                        <div className="mt-1 max-w-[220px] truncate text-[10px] text-[#b91c1c]" title={r.last_error}>{r.last_error}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => push(r)}
                          disabled={!canPush || !!pushing[r.id]}
                          className="rounded-md border border-[#dbe4f2] bg-white px-2 py-1 text-[11px] font-bold text-[#174be8] hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-50"
                          title={!realCampaign ? "Assign a real SmartLead campaign first" : !r.teacher_prospects?.email ? "No email" : r.state === "sent" ? "Already pushed" : "Push to SmartLead"}
                        >
                          {pushing[r.id] ? <Loader2 size={11} className="-mt-0.5 inline animate-spin" /> : <ExternalLink size={11} className="-mt-0.5 inline" />} Push
                        </button>
                        <button onClick={() => remove(r.id)} className="rounded-md p-1 text-[#ef4444] hover:bg-[#fee2e2]" aria-label="Remove">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
