import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, MailPlus, ExternalLink } from "lucide-react";

interface QueueRow {
  id: string;
  state: string;
  campaign_id: string | null;
  added_at: string;
  notes: string | null;
  teacher_prospect_id: string;
  teacher_prospects: { name: string | null; email: string | null; school: string | null; city: string | null; state: string | null } | null;
}

const stateTone: Record<string, string> = {
  queued: "bg-[#eef4ff] text-[#174be8]",
  assigned: "bg-[#fff4df] text-[#b7791f]",
  sending: "bg-[#fff4df] text-[#b7791f]",
  sent: "bg-[#e6f7ef] text-[#0a8f5a]",
  failed: "bg-[#fee2e2] text-[#b91c1c]",
};

export function OutreachQueuePanel() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "queued" | "sent" | "failed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("outreach_queue")
      .select("id, state, campaign_id, added_at, notes, teacher_prospect_id, teacher_prospects(name,email,school,city,state), campaign_cache(name)")
      .order("added_at", { ascending: false })
      .limit(500);
    if (error) toast.error(`Couldn't load outreach queue: ${error.message}`);
    else setRows((data ?? []) as unknown as QueueRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = rows.filter((r) => filter === "all" ? true : filter === "failed" ? r.state === "failed" : r.state === filter);

  const remove = async (id: string) => {
    const { error } = await supabase.from("outreach_queue").delete().eq("id", id);
    if (error) { toast.error(`Couldn't remove: ${error.message}`); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removed from outreach queue");
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
          <span className="text-xs text-[#66728a]">teachers added from Teacher Search — not yet pushed to SmartLead</span>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="h-8 rounded-lg border-[#dbe4f2] bg-white text-xs text-[#174be8]"><RefreshCw size={12} /> Refresh</Button>
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
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-[#edf2f8] last:border-0 hover:bg-[#fafbfd]">
                    <td className="py-2 pr-3 font-semibold">{r.teacher_prospects?.name ?? "—"}</td>
                    <td className="py-2 pr-3 text-[#526078]">{r.teacher_prospects?.email || <span className="italic text-[#b0bbd0]">no email</span>}</td>
                    <td className="py-2 pr-3 text-[#526078]">
                      <div>{r.teacher_prospects?.school ?? "—"}</div>
                      <div className="text-[11px] text-[#8794ab]">{r.teacher_prospects?.city}{r.teacher_prospects?.state ? `, ${r.teacher_prospects.state}` : ""}</div>
                    </td>
                    <td className="py-2 pr-3 text-[#526078]">
                      {r.campaign_cache?.name ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#eef4ff] px-2 py-0.5 text-xs font-bold text-[#174be8]">{r.campaign_cache.name}</span>
                      ) : r.campaign_id ? (
                        <span className="text-xs text-[#8794ab]">{r.campaign_id}</span>
                      ) : (
                        <span className="italic text-[#b0bbd0]">draft (no campaign yet)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-[#526078]">{new Date(r.added_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2 pr-3"><span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${stateTone[r.state] ?? "bg-[#eef2f7] text-[#526078]"}`}>{r.state}</span></td>
                    <td className="py-2 pr-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => toast.info("Push to SmartLead — coming soon (Task B5). For now this row sits in our internal queue.")}
                          className="rounded-md border border-[#dbe4f2] bg-white px-2 py-1 text-[11px] font-bold text-[#174be8] hover:bg-[#eef4ff]"
                          title="Push to SmartLead — coming soon"
                        >
                          <ExternalLink size={11} className="-mt-0.5 inline" /> Push
                        </button>
                        <button onClick={() => remove(r.id)} className="rounded-md p-1 text-[#ef4444] hover:bg-[#fee2e2]" aria-label="Remove">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
