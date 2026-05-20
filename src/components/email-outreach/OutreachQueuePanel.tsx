import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RefreshCw, Trash2, MailPlus, ExternalLink, Loader2, AlertCircle, ChevronDown, Check, MoreHorizontal, Send, Pause, UserX, UserPlus, Sparkles, CalendarClock } from "lucide-react";
import { syncAndGetRealCampaigns, isRealCampaignId, type RealCampaign } from "@/lib/smartleadCampaigns";
import { CATEGORY_META, REPLY_CATEGORIES, categoryMeta, isAutoPromotable, type ReplyCategory } from "@/lib/replyCategories";

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
  snoozed_until: string | null;
  teacher_prospects: { name: string | null; email: string | null; school: string | null; city: string | null; state: string | null } | null;
}

interface LatestReply {
  reply_intent: ReplyCategory | null;
  reply_intent_confidence: number | null;
  reply_intent_reason: string | null;
  received_at: string;
}

const stateTone: Record<string, string> = {
  queued: "bg-[#eef4ff] text-[#174be8]",
  assigned: "bg-[#fff4df] text-[#b7791f]",
  sending: "bg-[#fff4df] text-[#b7791f]",
  sent: "bg-[#e6f7ef] text-[#0a8f5a]",
  failed: "bg-[#fee2e2] text-[#b91c1c]",
  snoozed: "bg-[#ffedd5] text-[#9a3412]",
  promoted: "bg-[#dcfce7] text-[#166534]",
  suppressed: "bg-[#eef2f7] text-[#526078]",
};

type CampaignOption = RealCampaign;

export function OutreachQueuePanel() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>({});
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [latestReplyByEmail, setLatestReplyByEmail] = useState<Record<string, LatestReply>>({});
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState<Record<string, boolean>>({});
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "queued" | "sent" | "failed" | "replied">("all");
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
      .select("id, state, campaign_id, added_at, notes, teacher_prospect_id, smartlead_lead_id, pushed_at, last_error, snoozed_until, teacher_prospects(name,email,school,city,state)")
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
      setCampaignNames((prev) => ({ ...prev, ...map }));
    }

    // Pull latest reply event per email to drive category-based actions
    const emails = Array.from(new Set(queueRows.map((r) => r.teacher_prospects?.email?.toLowerCase()).filter((x): x is string => !!x)));
    if (emails.length) {
      const { data: events } = await supabase
        .from("smartlead_events")
        .select("lead_email, reply_intent, reply_intent_confidence, reply_intent_reason, received_at")
        .eq("event_type", "EMAIL_REPLIED")
        .in("lead_email", emails)
        .order("received_at", { ascending: false })
        .limit(500);
      const latest: Record<string, LatestReply> = {};
      for (const ev of events ?? []) {
        const k = (ev.lead_email ?? "").toLowerCase();
        if (!k || latest[k]) continue;
        latest[k] = {
          reply_intent: (ev.reply_intent ?? null) as ReplyCategory | null,
          reply_intent_confidence: ev.reply_intent_confidence,
          reply_intent_reason: ev.reply_intent_reason,
          received_at: ev.received_at,
        };
      }
      setLatestReplyByEmail(latest);
    } else {
      setLatestReplyByEmail({});
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

  const visible = useMemo(() => rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "failed") return r.state === "failed";
    if (filter === "replied") {
      const k = r.teacher_prospects?.email?.toLowerCase();
      return !!(k && latestReplyByEmail[k]);
    }
    return r.state === filter;
  }), [rows, filter, latestReplyByEmail]);

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
      if (data && data.ok === false) {
        throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      }
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

  const promoteToPipeline = async (r: QueueRow, opts?: { needsMeeting?: boolean; manual?: boolean }) => {
    const tp = r.teacher_prospects;
    const email = tp?.email?.trim();
    if (!email) { toast.error("No email — can't promote."); return; }
    setActing((p) => ({ ...p, [r.id]: true }));
    try {
      const [firstName, ...rest] = (tp?.name ?? "").split(/\s+/);
      const lastName = rest.join(" ") || firstName || "—";
      const tagNote = opts?.needsMeeting ? "needs_meeting" : opts?.manual ? "manual_promote" : "auto_promote";
      const { error } = await supabase.from("candidates").insert({
        first_name: firstName || tp?.name || "—",
        last_name: lastName,
        email,
        city: tp?.city ?? "",
        state: tp?.state ?? "",
        prospect_id: r.teacher_prospect_id,
        current_stage: "new_lead",
        status: "active",
        fit_tag: opts?.needsMeeting ? "Meeting Requested" : "Interested",
        assigned_to: tagNote,
      });
      if (error) throw error;
      await supabase.from("outreach_queue").update({ state: "promoted", notes: tagNote }).eq("id", r.id);
      setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, state: "promoted", notes: tagNote } : x));
      toast.success(`Promoted ${tp?.name ?? email} to Candidate Pipeline`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Promote failed: ${msg}`);
    } finally {
      setActing((p) => { const n = { ...p }; delete n[r.id]; return n; });
    }
  };

  const snooze = async (r: QueueRow, months: number) => {
    const until = new Date();
    until.setMonth(until.getMonth() + months);
    setActing((p) => ({ ...p, [r.id]: true }));
    const { error } = await supabase.from("outreach_queue")
      .update({ state: "snoozed", snoozed_until: until.toISOString() })
      .eq("id", r.id);
    setActing((p) => { const n = { ...p }; delete n[r.id]; return n; });
    if (error) { toast.error(`Snooze failed: ${error.message}`); return; }
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, state: "snoozed", snoozed_until: until.toISOString() } : x));
    toast.success(`Snoozed for ${months} months`);
  };

  const suppress = async (r: QueueRow) => {
    setActing((p) => ({ ...p, [r.id]: true }));
    const { error } = await supabase.from("outreach_queue").update({ state: "suppressed" }).eq("id", r.id);
    setActing((p) => { const n = { ...p }; delete n[r.id]; return n; });
    if (error) { toast.error(`Suppress failed: ${error.message}`); return; }
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, state: "suppressed" } : x));
    toast.success("Suppressed");
  };

  const captureReferral = async (r: QueueRow) => {
    const contact = window.prompt("Forwarded contact (email, name, or note):", "");
    if (contact == null) return;
    const trimmed = contact.trim();
    if (!trimmed) return;
    setActing((p) => ({ ...p, [r.id]: true }));
    const note = `referral: ${trimmed}`;
    const { error } = await supabase.from("outreach_queue")
      .update({ state: "suppressed", notes: note })
      .eq("id", r.id);
    setActing((p) => { const n = { ...p }; delete n[r.id]; return n; });
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, state: "suppressed", notes: note } : x));
    toast.success("Referral captured");
  };

  const counts = {
    all: rows.length,
    queued: rows.filter((r) => r.state === "queued").length,
    sent: rows.filter((r) => r.state === "sent").length,
    failed: rows.filter((r) => r.state === "failed").length,
    replied: rows.filter((r) => {
      const k = r.teacher_prospects?.email?.toLowerCase();
      return !!(k && latestReplyByEmail[k]);
    }).length,
  };

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f8] px-4 py-3">
        <div className="flex items-center gap-2">
          <MailPlus size={16} className="text-[#174be8]" />
          <h3 className="text-sm font-black text-[#07142f]">Outreach Queue</h3>
          <span className="text-xs text-[#66728a]">push to SmartLead — replies are auto-classified into 7 buckets, only Interested / Meeting trigger Promote</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => { load(); loadCampaignOptions(); }} className="h-8 rounded-lg border-[#dbe4f2] bg-white text-xs text-[#174be8]"><RefreshCw size={12} /> Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {(["all", "queued", "sent", "replied", "failed"] as const).map((k) => (
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
            {rows.length === 0 ? "No teachers added to outreach yet." : "No rows match this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="text-left text-[11px] font-bold uppercase tracking-wide text-[#66728a]">
                <tr className="border-b border-[#edf2f8]">
                  <th className="py-2 pr-3">Teacher</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">School / City</th>
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">State / Reply</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[#07142f]">
                {visible.map((r) => {
                  const realCampaign = isRealCampaignId(r.campaign_id);
                  const emailKey = r.teacher_prospects?.email?.toLowerCase();
                  const reply = emailKey ? latestReplyByEmail[emailKey] : undefined;
                  const meta = categoryMeta(reply?.reply_intent ?? null);
                  return (
                    <tr key={r.id} className="border-b border-[#edf2f8] last:border-0 hover:bg-[#fafbfd]">
                      <td className="py-2 pr-3 font-semibold">{r.teacher_prospects?.name ?? "—"}</td>
                      <td className="py-2 pr-3 text-[#526078]">{r.teacher_prospects?.email || <span className="italic text-[#b0bbd0]">no email</span>}</td>
                      <td className="py-2 pr-3 text-[#526078]">
                        <div>{r.teacher_prospects?.school ?? "—"}</div>
                        <div className="text-[11px] text-[#8794ab]">{r.teacher_prospects?.city}{r.teacher_prospects?.state ? `, ${r.teacher_prospects.state}` : ""}</div>
                      </td>
                      <td className="w-[220px] py-2 pr-3 text-[#526078]">
                        <CampaignPicker
                          assignedId={r.campaign_id}
                          assignedName={r.campaign_id ? campaignNames[r.campaign_id] : undefined}
                          realCampaign={realCampaign}
                          locked={["sent", "sending", "promoted"].includes(r.state)}
                          options={campaignOptions}
                          busy={!!assigning[r.id]}
                          syncing={syncingCampaigns}
                          onPick={(cid) => assignCampaign(r.id, cid)}
                          onSync={loadCampaignOptions}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold ${stateTone[r.state] ?? "bg-[#eef2f7] text-[#526078]"}`}>{r.state}</span>
                          {meta && (
                            <span
                              className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}
                              title={`${meta.description}${reply?.reply_intent_confidence != null ? ` · ${(reply.reply_intent_confidence * 100).toFixed(0)}% confidence` : ""}${reply?.reply_intent_reason ? ` · ${reply.reply_intent_reason}` : ""}`}
                            >
                              Replied · {meta.short}
                            </span>
                          )}
                          {r.state === "snoozed" && r.snoozed_until && (
                            <span className="text-[10px] text-[#8794ab]">until {new Date(r.snoozed_until).toLocaleDateString()}</span>
                          )}
                          {r.state === "failed" && r.last_error && (
                            <div className="max-w-[220px] truncate text-[10px] text-[#b91c1c]" title={r.last_error}>{r.last_error}</div>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">
                        <RowAction
                          row={r}
                          reply={reply}
                          realCampaign={realCampaign}
                          pushing={!!pushing[r.id]}
                          acting={!!acting[r.id]}
                          onPush={() => push(r)}
                          onPromote={(meeting) => promoteToPipeline(r, { needsMeeting: meeting })}
                          onManualPromote={() => promoteToPipeline(r, { manual: true })}
                          onSnooze={(m) => snooze(r, m)}
                          onSuppress={() => suppress(r)}
                          onCaptureReferral={() => captureReferral(r)}
                          onRemove={() => remove(r.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Per-category action button — NEVER auto-promote on raw reply.
// Auto-promote only when category is INTERESTED or MEETING_REQUEST
// AND confidence >= AUTO_PROMOTE_CONFIDENCE_THRESHOLD (0.7).
// Everything else gets a category-specific human action.
// ============================================================
function RowAction({
  row, reply, realCampaign, pushing, acting,
  onPush, onPromote, onManualPromote, onSnooze, onSuppress, onCaptureReferral, onRemove,
}: {
  row: QueueRow;
  reply: LatestReply | undefined;
  realCampaign: boolean;
  pushing: boolean;
  acting: boolean;
  onPush: () => void;
  onPromote: (needsMeeting: boolean) => void;
  onManualPromote: () => void;
  onSnooze: (months: number) => void;
  onSuppress: () => void;
  onCaptureReferral: () => void;
  onRemove: () => void;
}) {
  const cat = reply?.reply_intent ?? null;
  const conf = reply?.reply_intent_confidence ?? null;

  // Terminal states first
  const isTerminal = row.state === "promoted" || row.state === "suppressed" || row.state === "snoozed";
  let primary: { label: string; onClick: () => void; icon: React.ReactNode; tone: string; disabled?: boolean; title?: string } | null = null;

  if (row.state === "promoted") {
    primary = { label: "In Pipeline", onClick: () => {}, icon: <Sparkles size={11} />, tone: "border-[#bbf7d0] bg-[#dcfce7] text-[#166534] cursor-default", disabled: true };
  } else if (row.state === "suppressed") {
    primary = { label: "Suppressed", onClick: () => {}, icon: <UserX size={11} />, tone: "border-[#e2e8f0] bg-[#f1f5f9] text-[#475569] cursor-default", disabled: true };
  } else if (row.state === "snoozed") {
    primary = { label: "Snoozed", onClick: () => {}, icon: <Pause size={11} />, tone: "border-[#fed7aa] bg-[#ffedd5] text-[#9a3412] cursor-default", disabled: true };
  } else if (cat && isAutoPromotable(cat, conf)) {
    primary = {
      label: cat === "MEETING_REQUEST" ? "Promote + Schedule" : "Promote to Pipeline",
      onClick: () => onPromote(cat === "MEETING_REQUEST"),
      icon: cat === "MEETING_REQUEST" ? <CalendarClock size={11} /> : <Sparkles size={11} />,
      tone: "border-[#86efac] bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]",
    };
  } else if (cat === "INFO_REQUEST") {
    primary = {
      label: "Reply needed",
      onClick: () => window.open(row.teacher_prospects?.email ? `mailto:${row.teacher_prospects.email}` : "#", "_blank"),
      icon: <Send size={11} />,
      tone: "border-[#fde68a] bg-[#fef3c7] text-[#b45309] hover:bg-[#fde68a]",
      title: "Opens an email composer. Does NOT promote — they asked a question.",
    };
  } else if (cat === "SOFT_NO") {
    primary = {
      label: "Snooze 6mo",
      onClick: () => onSnooze(6),
      icon: <Pause size={11} />,
      tone: "border-[#fed7aa] bg-[#ffedd5] text-[#9a3412] hover:bg-[#fed7aa]",
      title: "Parks the lead until they're available again. Never promotes.",
    };
  } else if (cat === "WRONG_PERSON") {
    primary = {
      label: "Capture referral",
      onClick: onCaptureReferral,
      icon: <UserPlus size={11} />,
      tone: "border-[#f9a8d4] bg-[#fce7f3] text-[#9d174d] hover:bg-[#f9a8d4]",
      title: "Save the forwarded contact and suppress this lead.",
    };
  } else if (cat === "NOT_INTERESTED") {
    primary = {
      label: "Suppress",
      onClick: onSuppress,
      icon: <UserX size={11} />,
      tone: "border-[#cbd5e1] bg-[#eef2f7] text-[#475569] hover:bg-[#cbd5e1]",
      title: "Remove from all future sequences.",
    };
  } else if (cat === "OOO") {
    primary = {
      label: "Will retry",
      onClick: () => {},
      icon: <CalendarClock size={11} />,
      tone: "border-[#bfdbfe] bg-[#e6f0ff] text-[#1d4ed8] cursor-default",
      disabled: true,
      title: "SmartLead automatically retries after the OOO period.",
    };
  } else {
    // No reply yet → push to SmartLead
    const canPush = realCampaign && !!row.teacher_prospects?.email && row.state !== "sent" && row.state !== "sending";
    primary = {
      label: "Push",
      onClick: onPush,
      icon: pushing ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />,
      tone: "border-[#dbe4f2] bg-white text-[#174be8] hover:bg-[#eef4ff]",
      disabled: !canPush || pushing,
      title: !realCampaign ? "Assign a real SmartLead campaign first" : !row.teacher_prospects?.email ? "No email" : row.state === "sent" ? "Already pushed" : "Push to SmartLead",
    };
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={primary.onClick}
        disabled={primary.disabled || acting}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-60 ${primary.tone}`}
        title={primary.title}
      >
        {acting ? <Loader2 size={11} className="animate-spin" /> : primary.icon}
        {primary.label}
      </button>

      {/* Always-available human-in-the-loop menu */}
      {!isTerminal && (
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-md border border-[#dbe4f2] bg-white p-1 text-[#526078] hover:bg-[#eef4ff]" aria-label="More actions">
            <MoreHorizontal size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-[#8794ab]">
              Manual actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onManualPromote} className="gap-2 text-xs">
              <Sparkles size={12} className="text-[#166534]" /> Manual promote
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSnooze(3)} className="gap-2 text-xs">
              <Pause size={12} className="text-[#9a3412]" /> Snooze 3 months
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSnooze(6)} className="gap-2 text-xs">
              <Pause size={12} className="text-[#9a3412]" /> Snooze 6 months
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSuppress} className="gap-2 text-xs">
              <UserX size={12} className="text-[#475569]" /> Suppress
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-[#8794ab]">
              Override category
            </DropdownMenuLabel>
            {REPLY_CATEGORIES.map((c) => {
              const m = CATEGORY_META[c];
              return (
                <DropdownMenuItem key={c} onSelect={() => overrideQueueCategory(row, c)} className="flex items-center gap-2 text-xs">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: m.dot }} />
                  Set: {m.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRemove} className="gap-2 text-xs text-[#b91c1c]">
              <Trash2 size={12} /> Remove from queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isTerminal && (
        <button onClick={onRemove} className="rounded-md p-1 text-[#ef4444] hover:bg-[#fee2e2]" aria-label="Remove">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// Inserts an override event into smartlead_events so the inbox + queue agree.
async function overrideQueueCategory(row: QueueRow, cat: ReplyCategory) {
  const email = row.teacher_prospects?.email?.toLowerCase();
  if (!email) { toast.error("No email — can't tag a reply category."); return; }
  const { error } = await supabase.from("smartlead_events").insert({
    event_type: "EMAIL_REPLIED",
    campaign_id: row.campaign_id,
    lead_email: email,
    reply_message: null,
    reply_intent: cat,
    reply_intent_confidence: 1.0,
    reply_intent_reason: `manual override from queue (was: ${row.state})`,
    reply_intent_overridden_by: "user",
    reply_intent_overridden_at: new Date().toISOString(),
    payload: { source: "queue_override" },
  });
  if (error) { toast.error(`Override failed: ${error.message}`); return; }
  toast.success(`Reply tagged as ${CATEGORY_META[cat].label} — refresh to see new action`);
}

function CampaignPicker({
  assignedId, assignedName, realCampaign, locked, options, busy, syncing, onPick, onSync,
}: {
  assignedId: string | null;
  assignedName?: string;
  realCampaign: boolean;
  locked: boolean;
  options: RealCampaign[];
  busy: boolean;
  syncing: boolean;
  onPick: (id: string) => void;
  onSync: () => void;
}) {
  if (locked && realCampaign) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-[#eef4ff] px-2 py-1 text-xs font-bold text-[#174be8]" title={assignedName ?? `id ${assignedId}`}>
        <span className="truncate">{assignedName ?? `id ${assignedId}`}</span>
      </span>
    );
  }

  const triggerLabel = realCampaign
    ? (assignedName ?? `id ${assignedId}`)
    : assignedId
      ? "Invalid — pick one"
      : "Select campaign…";

  const triggerClass = realCampaign
    ? "border-[#dbe4f2] bg-[#eef4ff] text-[#174be8]"
    : assignedId
      ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
      : "border-[#dbe4f2] bg-white text-[#07142f]";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        className={`inline-flex h-7 w-full max-w-[200px] items-center justify-between gap-1 rounded-md border px-2 text-xs font-bold hover:bg-[#fafbfd] disabled:opacity-50 ${triggerClass}`}
        title={triggerLabel}
      >
        <span className="flex min-w-0 items-center gap-1">
          {!realCampaign && assignedId && <AlertCircle size={11} className="shrink-0" />}
          <span className="truncate">{triggerLabel}</span>
        </span>
        {busy ? <Loader2 size={11} className="shrink-0 animate-spin" /> : <ChevronDown size={12} className="shrink-0 opacity-60" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[300px] w-[280px] overflow-y-auto">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-[#8794ab]">
          {realCampaign ? "Change campaign" : "Pick a SmartLead campaign"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <div className="px-2 py-3 text-xs text-[#526078]">
            <div className="mb-2">No SmartLead campaigns loaded.</div>
            <button onClick={onSync} disabled={syncing} className="inline-flex items-center gap-1 rounded border border-[#dbe4f2] bg-white px-2 py-1 text-[11px] font-bold text-[#174be8] hover:bg-[#eef4ff] disabled:opacity-50">
              {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Sync now
            </button>
          </div>
        ) : (
          options.map((c) => {
            const isCurrent = c.id === assignedId;
            return (
              <DropdownMenuItem key={c.id} onSelect={() => !isCurrent && onPick(c.id)} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  {isCurrent && <Check size={12} className="shrink-0 text-[#174be8]" />}
                  <span className="truncate">{c.name}</span>
                </span>
                {c.status && <span className="shrink-0 text-[10px] uppercase text-[#8794ab]">{c.status}</span>}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
