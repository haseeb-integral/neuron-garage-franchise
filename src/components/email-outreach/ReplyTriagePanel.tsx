import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, Pause, UserX, UserPlus, CalendarClock, Send, ChevronDown, Inbox, FlaskConical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORY_META, REPLY_CATEGORIES, isAutoPromotable, type ReplyCategory } from "@/lib/replyCategories";
import { ReplyCategoryChip, SourceBadge, type ReplyChipData } from "./ReplyCategoryChip";
import { SmartLeadInboxPanel } from "./SmartLeadInboxPanel";
import { SimulateReplyDialog } from "./SimulateReplyDialog";

interface TriageCard {
  queueId: string;
  prospectId: string;
  campaignId: string | null;
  state: string;
  name: string;
  email: string;
  school: string | null;
  city: string | null;
  st: string | null;
  reply: ReplyChipData;
  receivedAt: string;
  simulated: boolean;
}

type FilterKey = "all" | "needs_action" | "promotable" | "handled";

/**
 * Decision-savvy alternative to the dense Outreach Queue table.
 * One card per reply, with only the actions that make sense for that category.
 * Backed by the same outreach_queue + smartlead_events tables — no schema changes.
 */
export function ReplyTriagePanel() {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<TriageCard[]>([]);
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<FilterKey>("needs_action");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("outreach_queue")
      .select("id, state, campaign_id, teacher_prospect_id, teacher_prospects(name,email,school,city,state)")
      .order("added_at", { ascending: false })
      .limit(500);
    if (error) { toast.error(`Could not load triage: ${error.message}`); setLoading(false); return; }
    const emails = Array.from(new Set((rows ?? []).map((r) => (r.teacher_prospects as { email?: string } | null)?.email?.toLowerCase()).filter((x): x is string => !!x)));
    if (!emails.length) { setCards([]); setLoading(false); return; }
    const { data: events } = await supabase
      .from("smartlead_events")
      .select("lead_email, reply_intent, reply_intent_confidence, reply_intent_reason, reply_intent_overridden_by, reply_message, received_at, payload")
      .eq("event_type", "EMAIL_REPLIED")
      .in("lead_email", emails)
      .order("received_at", { ascending: false })
      .limit(1000);
    const latest = new Map<string, NonNullable<typeof events>[number]>();
    for (const ev of events ?? []) {
      const k = (ev.lead_email ?? "").toLowerCase();
      if (k && !latest.has(k)) latest.set(k, ev);
    }
    const built: TriageCard[] = [];
    for (const r of rows ?? []) {
      const tp = r.teacher_prospects as { name?: string; email?: string; school?: string; city?: string; state?: string } | null;
      const email = tp?.email?.toLowerCase();
      if (!email) continue;
      const ev = latest.get(email);
      if (!ev) continue; // triage only shows leads that actually replied
      const payload = (ev.payload ?? {}) as { source?: string };
      built.push({
        queueId: r.id,
        prospectId: r.teacher_prospect_id,
        campaignId: r.campaign_id,
        state: r.state,
        name: tp?.name ?? "—",
        email: tp?.email ?? "",
        school: tp?.school ?? null,
        city: tp?.city ?? null,
        st: tp?.state ?? null,
        reply: {
          category: (ev.reply_intent ?? null) as ReplyCategory | null,
          confidence: ev.reply_intent_confidence,
          reason: ev.reply_intent_reason,
          overriddenBy: ev.reply_intent_overridden_by,
          message: ev.reply_message,
          receivedAt: ev.received_at,
        },
        receivedAt: ev.received_at,
        simulated: payload?.source === "simulated",
      });
    }
    // Sort: needs-action first, then promotable, then handled.
    const rank = (c: TriageCard) => {
      if (["promoted", "snoozed", "suppressed"].includes(c.state)) return 3;
      if (c.reply.category === "INFO_REQUEST") return 0;
      if (isAutoPromotable(c.reply.category, c.reply.confidence)) return 1;
      return 2;
    };
    built.sort((a, b) => rank(a) - rank(b) || b.receivedAt.localeCompare(a.receivedAt));
    setCards(built);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("triage-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "smartlead_events" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_queue" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const counts = useMemo(() => ({
    all: cards.length,
    needs_action: cards.filter((c) => c.reply.category === "INFO_REQUEST" || (c.reply.confidence ?? 0) < 0.6).length,
    promotable: cards.filter((c) => isAutoPromotable(c.reply.category, c.reply.confidence) && !["promoted", "snoozed", "suppressed"].includes(c.state)).length,
    handled: cards.filter((c) => ["promoted", "snoozed", "suppressed"].includes(c.state)).length,
  }), [cards]);

  const visible = cards.filter((c) => {
    if (filter === "all") return true;
    if (filter === "needs_action") return c.reply.category === "INFO_REQUEST" || (c.reply.confidence ?? 0) < 0.6;
    if (filter === "promotable") return isAutoPromotable(c.reply.category, c.reply.confidence) && !["promoted", "snoozed", "suppressed"].includes(c.state);
    if (filter === "handled") return ["promoted", "snoozed", "suppressed"].includes(c.state);
    return true;
  });

  const setBusy = (id: string, v: boolean) => setActing((p) => { const n = { ...p }; if (v) n[id] = true; else delete n[id]; return n; });

  const promote = async (c: TriageCard, opts: { meeting?: boolean; manual?: boolean } = {}) => {
    setBusy(c.queueId, true);
    try {
      const [first, ...rest] = (c.name ?? "").split(/\s+/);
      const last = rest.join(" ") || first || "—";
      const { error } = await supabase.from("candidates").insert({
        first_name: first || c.name || "—",
        last_name: last,
        email: c.email,
        city: c.city ?? "",
        state: c.st ?? "",
        prospect_id: c.prospectId,
        current_stage: "new_lead",
        status: "active",
        fit_tag: opts.meeting ? "Meeting Requested" : "Interested",
        assigned_to: opts.meeting ? "needs_meeting" : opts.manual ? "manual_promote" : "auto_promote",
      });
      if (error) throw error;
      await supabase.from("outreach_queue").update({ state: "promoted" }).eq("id", c.queueId);
      toast.success(`Promoted ${c.name}`);
      load();
    } catch (e) {
      toast.error(`Promote failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(c.queueId, false); }
  };

  const snooze = async (c: TriageCard, months: number) => {
    setBusy(c.queueId, true);
    const until = new Date(); until.setMonth(until.getMonth() + months);
    const { error } = await supabase.from("outreach_queue").update({ state: "snoozed", snoozed_until: until.toISOString() }).eq("id", c.queueId);
    setBusy(c.queueId, false);
    if (error) toast.error(`Snooze failed: ${error.message}`); else { toast.success(`Snoozed ${months} months`); load(); }
  };

  const suppress = async (c: TriageCard) => {
    setBusy(c.queueId, true);
    const { error } = await supabase.from("outreach_queue").update({ state: "suppressed" }).eq("id", c.queueId);
    setBusy(c.queueId, false);
    if (error) toast.error(`Suppress failed: ${error.message}`); else { toast.success("Suppressed"); load(); }
  };

  const overrideCategory = async (c: TriageCard, cat: ReplyCategory) => {
    setBusy(c.queueId, true);
    const { error } = await supabase.from("smartlead_events").insert({
      event_type: "EMAIL_REPLIED",
      campaign_id: c.campaignId,
      lead_email: c.email.toLowerCase(),
      reply_message: c.reply.message ?? null,
      reply_intent: cat,
      reply_intent_confidence: 1.0,
      reply_intent_reason: `manual override (was ${c.reply.category ?? "—"})`,
      reply_intent_overridden_by: "user",
      reply_intent_overridden_at: new Date().toISOString(),
      payload: { source: "triage_override" },
    });
    setBusy(c.queueId, false);
    if (error) toast.error(`Override failed: ${error.message}`); else { toast.success(`Set to ${CATEGORY_META[cat].label}`); load(); }
  };

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f8] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#7c3aed]" />
          <h3 className="text-sm font-black text-[#07142f]">Reply Triage</h3>
          <span className="text-xs text-[#66728a]">decision view — one card per reply, only actions that fit the category</span>
        </div>
        <button onClick={load} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#174be8]">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {(["needs_action", "promotable", "handled", "all"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${filter === k ? "bg-[#174be8] text-white" : "bg-[#eef2f7] text-[#526078] hover:bg-[#dbe4f2]"}`}>
            {k.replace("_", " ")} · {counts[k]}
          </button>
        ))}
      </div>

      <div className="space-y-2 p-4">
        {loading ? (
          <div className="py-10 text-center text-sm text-[#8794ab]"><Loader2 className="mx-auto mb-2 animate-spin" size={16} /> Loading replies…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dbe4f2] bg-[#fbfdff] py-10 text-center text-sm text-[#5a6b85]">
            {cards.length === 0
              ? "No replies yet. Once teachers respond, their messages will appear here, auto-classified into one of 7 buckets."
              : "Nothing in this filter — try another tab."}
          </div>
        ) : visible.map((c) => (
          <TriageCardRow
            key={c.queueId}
            card={c}
            busy={!!acting[c.queueId]}
            onPromote={(meeting) => promote(c, { meeting })}
            onManualPromote={() => promote(c, { manual: true })}
            onSnooze={(m) => snooze(c, m)}
            onSuppress={() => suppress(c)}
            onOverride={(cat) => overrideCategory(c, cat)}
          />
        ))}
      </div>
    </div>
  );
}

function TriageCardRow({ card, busy, onPromote, onManualPromote, onSnooze, onSuppress, onOverride }: {
  card: TriageCard;
  busy: boolean;
  onPromote: (meeting: boolean) => void;
  onManualPromote: () => void;
  onSnooze: (months: number) => void;
  onSuppress: () => void;
  onOverride: (cat: ReplyCategory) => void;
}) {
  const cat = card.reply.category;
  const handled = ["promoted", "snoozed", "suppressed"].includes(card.state);

  // Action set, scoped to the category
  const actions: { label: string; icon: React.ReactNode; tone: string; onClick: () => void; primary?: boolean }[] = [];
  if (!handled) {
    if (cat && isAutoPromotable(cat, card.reply.confidence)) {
      actions.push({
        label: cat === "MEETING_REQUEST" ? "Promote + Schedule" : "Promote to Pipeline",
        icon: cat === "MEETING_REQUEST" ? <CalendarClock size={12} /> : <Sparkles size={12} />,
        tone: "bg-[#16a34a] text-white hover:bg-[#15803d]",
        onClick: () => onPromote(cat === "MEETING_REQUEST"),
        primary: true,
      });
    }
    if (cat === "INFO_REQUEST") {
      actions.push({
        label: "Reply needed",
        icon: <Send size={12} />,
        tone: "bg-[#fde68a] text-[#92400e] hover:bg-[#fcd34d]",
        onClick: () => window.open(`mailto:${card.email}`, "_blank"),
        primary: true,
      });
    }
    if (cat === "SOFT_NO" || cat === "INFO_REQUEST") {
      actions.push({ label: "Snooze 6mo", icon: <Pause size={12} />, tone: "border border-[#fed7aa] bg-[#ffedd5] text-[#9a3412] hover:bg-[#fed7aa]", onClick: () => onSnooze(6) });
      actions.push({ label: "Snooze 3mo", icon: <Pause size={12} />, tone: "border border-[#fed7aa] bg-white text-[#9a3412] hover:bg-[#ffedd5]", onClick: () => onSnooze(3) });
    }
    if (cat === "WRONG_PERSON" || cat === "NOT_INTERESTED") {
      actions.push({ label: "Suppress", icon: <UserX size={12} />, tone: "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f1f5f9]", onClick: onSuppress });
    }
    if (cat !== "INTERESTED" && cat !== "MEETING_REQUEST") {
      actions.push({ label: "Manual promote", icon: <UserPlus size={12} />, tone: "border border-[#bbf7d0] bg-white text-[#166534] hover:bg-[#dcfce7]", onClick: onManualPromote });
    }
  }

  return (
    <div className="rounded-xl border border-[#eef2f7] bg-white p-3 transition hover:border-[#dbe4f2] hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#07142f]">{card.name}</span>
            <span className="text-xs text-[#526078]">· {card.email}</span>
            <ReplyCategoryChip data={card.reply} />
            <SourceBadge overriddenBy={card.reply.overriddenBy} />
            {handled && (
              <span className="rounded-md bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#475569]">{card.state}</span>
            )}
          </div>
          {(card.school || card.city) && (
            <div className="mt-0.5 text-[11px] text-[#8794ab]">
              {card.school ?? "—"}{card.city ? ` · ${card.city}${card.st ? `, ${card.st}` : ""}` : ""}
            </div>
          )}
          {card.reply.message && (
            <blockquote className="mt-2 border-l-2 border-[#dbe4f2] pl-2 text-xs italic text-[#34445f]">
              {card.reply.message.slice(0, 280)}{card.reply.message.length > 280 ? "…" : ""}
            </blockquote>
          )}
          {card.reply.reason && (
            <div className="mt-1 text-[10px] text-[#8794ab]">why: {card.reply.reason}</div>
          )}
        </div>
        <div className="text-right text-[10px] text-[#8794ab]">
          {new Date(card.receivedAt).toLocaleString()}
        </div>
      </div>

      {!handled && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#f1f5f9] pt-2.5">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              disabled={busy}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold disabled:opacity-50 ${a.tone}`}
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : a.icon}
              {a.label}
            </button>
          ))}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] bg-white px-2 py-1 text-[11px] font-bold text-[#526078] hover:bg-[#f7faff]">
                Override category <ChevronDown size={11} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-[#8794ab]">Reclassify as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REPLY_CATEGORIES.map((rc) => {
                  const m = CATEGORY_META[rc];
                  const isCurrent = rc === cat;
                  return (
                    <DropdownMenuItem key={rc} disabled={isCurrent} onSelect={() => !isCurrent && onOverride(rc)} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{ background: m.dot }} />{m.label}</span>
                      {isCurrent && <span className="text-[9px] uppercase text-[#8794ab]">current</span>}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
}
