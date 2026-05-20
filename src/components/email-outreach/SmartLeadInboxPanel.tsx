import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Inbox, Mail, AlertTriangle, UserMinus, Tag, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CATEGORY_META, REPLY_CATEGORIES, type ReplyCategory } from "@/lib/replyCategories";
import { ReplyCategoryChip, SourceBadge } from "./ReplyCategoryChip";

interface EventRow {
  id: string;
  event_type: string;
  campaign_id: string | null;
  lead_email: string | null;
  reply_message: string | null;
  reply_intent: string | null;
  reply_intent_confidence: number | null;
  reply_intent_reason: string | null;
  reply_intent_overridden_by: string | null;
  received_at: string;
}

const iconForEvent = (type: string) => {
  if (type === "EMAIL_REPLIED") return <Mail size={14} className="text-emerald-600" />;
  if (type === "EMAIL_BOUNCED") return <AlertTriangle size={14} className="text-red-600" />;
  if (type === "LEAD_UNSUBSCRIBED") return <UserMinus size={14} className="text-amber-600" />;
  if (type === "LEAD_CATEGORY_UPDATED") return <Tag size={14} className="text-blue-600" />;
  return <Mail size={14} className="text-slate-600" />;
};

const LAST_VIEWED_KEY = "smartlead_inbox_last_viewed";

export function SmartLeadInboxPanel() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [lastViewed, setLastViewed] = useState<string>(
    () => localStorage.getItem(LAST_VIEWED_KEY) ?? new Date(0).toISOString(),
  );

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("smartlead_events")
      .select("id, event_type, campaign_id, lead_email, reply_message, reply_intent, reply_intent_confidence, reply_intent_reason, reply_intent_overridden_by, received_at")
      .order("received_at", { ascending: false })
      .limit(100);
    setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  };

  const markViewed = () => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_VIEWED_KEY, now);
    setLastViewed(now);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("smartlead_events_inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "smartlead_events" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const overrideCategory = async (row: EventRow, newCat: ReplyCategory) => {
    const { error } = await supabase
      .from("smartlead_events")
      .update({
        reply_intent: newCat,
        reply_intent_confidence: 1.0,
        reply_intent_reason: `manual override (was ${row.reply_intent ?? "—"})`,
        reply_intent_overridden_by: "user",
        reply_intent_overridden_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      toast.error(`Couldn't override: ${error.message}`);
      return;
    }
    setEvents((prev) => prev.map((e) => e.id === row.id ? { ...e, reply_intent: newCat, reply_intent_confidence: 1, reply_intent_overridden_by: "user" } : e));
    toast.success(`Category set to ${CATEGORY_META[newCat].label}`);
  };

  const unreadReplies = events.filter(
    (e) => e.event_type === "EMAIL_REPLIED" && e.received_at > lastViewed,
  ).length;

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#07142f]">Inbox</h2>
            {unreadReplies > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-bold text-white">
                {unreadReplies}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#5a6b85]">
            Live feed of replies, bounces, unsubscribes and category updates. Each reply is auto-classified into one of 7 buckets.
          </p>
        </div>
        <div className="flex gap-2">
          {unreadReplies > 0 && (
            <button
              onClick={markViewed}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#eef2f7] bg-white px-3 py-1.5 text-xs font-medium text-[#14233b] hover:bg-[#f7faff]"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => { load(); markViewed(); }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#eef2f7] bg-white px-3 py-1.5 text-xs font-medium text-[#14233b] hover:bg-[#f7faff]"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-[#5a6b85]">
          <Loader2 size={16} className="mr-2 animate-spin" /> Loading inbox…
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#dbe4f2] bg-[#fbfdff] py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4ff] text-[#1f5bff]">
            <Inbox size={22} />
          </div>
          <h3 className="text-base font-semibold text-[#07142f]">No replies yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#5a6b85]">
            Replies will appear here in real time once your campaigns are live. Make sure the
            webhook is registered in the SmartLead Connection panel above.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#eef2f7] rounded-xl border border-[#eef2f7]">
          {events.map((e) => {
            const isUnread = e.event_type === "EMAIL_REPLIED" && e.received_at > lastViewed;
            const isReply = e.event_type === "EMAIL_REPLIED";
            return (
              <li key={e.id} className={`flex items-start gap-3 p-3 hover:bg-[#f7faff] ${isUnread ? "bg-[#fbfdff]" : ""}`}>
                <div className="mt-0.5">{iconForEvent(e.event_type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-[#07142f]">{e.event_type}</span>
                      {isReply && e.reply_intent && (
                        <>
                          <ReplyCategoryChip data={{
                            category: e.reply_intent as ReplyCategory,
                            confidence: e.reply_intent_confidence,
                            reason: e.reply_intent_reason,
                            overriddenBy: e.reply_intent_overridden_by,
                            message: e.reply_message,
                            receivedAt: e.received_at,
                          }} />
                          <SourceBadge overriddenBy={e.reply_intent_overridden_by} />
                        </>
                      )}
                      {e.lead_email && (
                        <span className="truncate text-[#5a6b85]">· {e.lead_email}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] text-[#8794ab]">
                        {new Date(e.received_at).toLocaleString()}
                      </span>
                      {isReply && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="rounded p-1 text-[#8794ab] hover:bg-[#eef2f7] hover:text-[#07142f]" aria-label="Override category">
                            <MoreHorizontal size={14} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[220px]">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-[#8794ab]">
                              Override category
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {REPLY_CATEGORIES.map((cat) => {
                              const m = CATEGORY_META[cat];
                              const isCurrent = e.reply_intent === cat;
                              return (
                                <DropdownMenuItem key={cat} onSelect={() => !isCurrent && overrideCategory(e, cat)} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="flex items-center gap-2">
                                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: m.dot }} />
                                    {m.label}
                                  </span>
                                  {isCurrent && <span className="text-[9px] uppercase text-[#8794ab]">current</span>}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  {e.reply_message && (
                    <p className="mt-1 line-clamp-2 text-xs text-[#34445f]">{e.reply_message}</p>
                  )}
                  {e.reply_intent_reason && (
                    <div className="mt-1 text-[10px] italic text-[#8794ab]">
                      why: {e.reply_intent_reason}
                    </div>
                  )}
                  {e.campaign_id && (
                    <div className="mt-1 text-[10px] text-[#8794ab]">Campaign {e.campaign_id}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
