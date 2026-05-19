import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Inbox, Mail, AlertTriangle, UserMinus, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EventRow {
  id: string;
  event_type: string;
  campaign_id: string | null;
  lead_email: string | null;
  reply_message: string | null;
  received_at: string;
}

const iconForEvent = (type: string) => {
  if (type === "EMAIL_REPLIED") return <Mail size={14} className="text-emerald-600" />;
  if (type === "EMAIL_BOUNCED") return <AlertTriangle size={14} className="text-red-600" />;
  if (type === "LEAD_UNSUBSCRIBED") return <UserMinus size={14} className="text-amber-600" />;
  if (type === "LEAD_CATEGORY_UPDATED") return <Tag size={14} className="text-blue-600" />;
  return <Mail size={14} className="text-slate-600" />;
};

export function SmartLeadInboxPanel() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("smartlead_events")
      .select("id, event_type, campaign_id, lead_email, reply_message, received_at")
      .order("received_at", { ascending: false })
      .limit(100);
    setEvents(data ?? []);
    setLoading(false);
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

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#07142f]">Inbox</h2>
          <p className="mt-0.5 text-xs text-[#5a6b85]">
            Live feed of replies, bounces, unsubscribes and category updates from SmartLead.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#eef2f7] bg-white px-3 py-1.5 text-xs font-medium text-[#14233b] hover:bg-[#f7faff]"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh
        </button>
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
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 p-3 hover:bg-[#f7faff]">
              <div className="mt-0.5">{iconForEvent(e.event_type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-[#07142f]">{e.event_type}</span>
                    {e.lead_email && (
                      <span className="truncate text-[#5a6b85]">· {e.lead_email}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-[#8794ab]">
                    {new Date(e.received_at).toLocaleString()}
                  </span>
                </div>
                {e.reply_message && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#34445f]">{e.reply_message}</p>
                )}
                {e.campaign_id && (
                  <div className="mt-1 text-[10px] text-[#8794ab]">Campaign {e.campaign_id}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
