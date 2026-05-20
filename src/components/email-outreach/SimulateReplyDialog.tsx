import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2 } from "lucide-react";

interface QOption { id: string; email: string; name: string; campaignId: string | null }

const PRESETS = [
  { label: "Interested", text: "Yes, this sounds interesting. Tell me more about the franchise opportunity." },
  { label: "Meeting request", text: "Sure, I'd love to chat. Can we set up a quick call next week? My calendar is open Tue/Wed afternoon." },
  { label: "Info request", text: "Could you share more details on the upfront cost and territory model before we go further?" },
  { label: "Soft no", text: "Not the right time for me — maybe revisit in 6 months." },
  { label: "Wrong person", text: "I'm not the decision maker, please remove me from your list." },
  { label: "OOO", text: "I'm out of the office until next Monday. Will reply on return." },
];

export function SimulateReplyDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const [options, setOptions] = useState<QOption[]>([]);
  const [pickedId, setPickedId] = useState<string>("");
  const [text, setText] = useState(PRESETS[0].text);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("outreach_queue")
        .select("id, campaign_id, teacher_prospects(name,email)")
        .order("added_at", { ascending: false })
        .limit(200);
      const opts: QOption[] = [];
      for (const r of data ?? []) {
        const tp = r.teacher_prospects as { name?: string; email?: string } | null;
        if (!tp?.email) continue;
        opts.push({ id: r.id, email: tp.email, name: tp.name ?? "—", campaignId: r.campaign_id });
      }
      setOptions(opts);
      if (opts.length && !pickedId) setPickedId(opts[0].id);
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const picked = useMemo(() => options.find((o) => o.id === pickedId), [options, pickedId]);

  const submit = async () => {
    if (!picked) { toast.error("Pick a recipient first."); return; }
    if (!text.trim()) { toast.error("Enter reply text."); return; }
    setSubmitting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartlead-webhook`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "EMAIL_REPLIED",
          campaign_id: picked.campaignId,
          lead_email: picked.email,
          reply_message: text,
          source: "simulated",
        }),
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
      toast.success("Simulated reply scored — see Reply Triage");
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(`Simulation failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const clearAll = async () => {
    setClearing(true);
    const { error, count } = await supabase
      .from("smartlead_events")
      .delete({ count: "exact" })
      .filter("payload->>source", "eq", "simulated");
    setClearing(false);
    if (error) toast.error(`Clear failed: ${error.message}`);
    else { toast.success(`Cleared ${count ?? 0} simulated replies`); onDone?.(); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles size={16} className="text-[#7c3aed]" /> Simulate Reply (QA only)</DialogTitle>
          <DialogDescription>
            Runs the real AI classifier against fake reply text so you can verify scoring without waiting for a teacher.
            Rows are tagged <code className="rounded bg-[#eef2f7] px-1 text-[10px]">source=simulated</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold">Pretend reply is from</Label>
            <select
              value={pickedId}
              onChange={(e) => setPickedId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[#dbe4f2] bg-white px-2 text-sm"
            >
              {options.length === 0 && <option value="">No queue rows yet — add a teacher first</option>}
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name} · {o.email}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-bold">Preset</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setText(p.text)}
                  className="rounded-full border border-[#dbe4f2] bg-white px-2.5 py-1 text-[11px] font-bold text-[#526078] hover:bg-[#f7faff]"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold">Reply text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="mt-1 text-sm" />
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={clearing} className="text-[11px] text-[#b91c1c] hover:text-[#7f1d1d]">
            {clearing ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Trash2 size={12} className="mr-1" />}
            Clear all simulated
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="button" size="sm" onClick={submit} disabled={submitting || !picked}>
              {submitting ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Sparkles size={12} className="mr-1" />}
              Score it
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
