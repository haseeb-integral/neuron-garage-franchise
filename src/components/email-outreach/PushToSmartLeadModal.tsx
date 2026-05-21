import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onPushed?: () => void;
  defaultState?: string;
  defaultCity?: string;
}

interface CampaignOption { id: string; name: string; status?: string }

export function PushToSmartLeadModal({ open, onClose, onPushed, defaultState, defaultCity }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [state, setState] = useState(defaultState ?? "");
  const [city, setCity] = useState(defaultCity ?? "");
  const [includeCatchAll, setIncludeCatchAll] = useState(false);
  const [limit, setLimit] = useState(500);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<{ candidates: number; would_push: number; already_in_campaign: number } | null>(null);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState(defaultState ?? "");
    setCity(defaultCity ?? "");
    setPreview(null);
    (async () => {
      const { data } = await supabase.from("campaign_cache").select("id, name, status").order("name");
      setCampaigns((data ?? []) as CampaignOption[]);
    })();
  }, [open, defaultState, defaultCity]);

  const runDryRun = async () => {
    if (!campaignId) { toast.error("Pick a campaign first"); return; }
    setLoadingPreview(true);
    const { data, error } = await supabase.functions.invoke("smartlead-push-leads", {
      body: { campaign_id: campaignId, state: state || null, city: city || null, include_catch_all: includeCatchAll, limit, dry_run: true },
    });
    setLoadingPreview(false);
    if (error) { toast.error(error.message); return; }
    setPreview(data);
  };

  const runPush = async () => {
    if (!campaignId) { toast.error("Pick a campaign first"); return; }
    setPushing(true);
    const { data, error } = await supabase.functions.invoke("smartlead-push-leads", {
      body: { campaign_id: campaignId, state: state || null, city: city || null, include_catch_all: includeCatchAll, limit },
    });
    setPushing(false);
    if (error) { toast.error(error.message); return; }
    const errs = (data as { errors?: string[] }).errors;
    if (errs?.length) toast.warning(`Pushed with ${errs.length} error(s)`);
    else toast.success(`Pushed ${(data as { pushed: number }).pushed.toLocaleString()} leads to SmartLead`);
    onPushed?.();
    onClose();
  };

  const selectedCampaign = useMemo(() => campaigns.find((c) => c.id === campaignId), [campaigns, campaignId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send size={16} className="text-[#174be8]" /> Push verified emails to SmartLead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <Label className="text-xs font-bold">Destination campaign</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a SmartLead campaign…" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} {c.status ? `· ${c.status}` : ""}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-bold">State filter (optional)</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. TX" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-bold">City filter (optional)</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Austin" className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="catchall" checked={includeCatchAll} onCheckedChange={(v) => setIncludeCatchAll(!!v)} />
            <Label htmlFor="catchall" className="cursor-pointer text-xs">Also include <strong>catch-all</strong> emails (lower deliverability)</Label>
          </div>
          <div>
            <Label className="text-xs font-bold">Max leads this push</Label>
            <Input type="number" min={1} max={5000} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 500)} className="mt-1" />
          </div>

          <div className="rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-2 text-[11px] text-[#9a3412]">
            <div className="flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5" />
              <span>Pushing is one-way from our side. To remove a lead later you must do it in SmartLead directly.</span>
            </div>
          </div>

          {preview && (
            <div className="rounded-lg border border-[#dbe4f2] bg-[#f7faff] p-2 text-xs">
              <div className="font-bold">Preview · {selectedCampaign?.name}</div>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <Stat label="Candidates" value={preview.candidates} />
                <Stat label="Already in campaign" value={preview.already_in_campaign} />
                <Stat label="Will push" value={preview.would_push} tone="primary" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={runDryRun} disabled={loadingPreview || pushing}>
            {loadingPreview ? <Loader2 size={14} className="mr-1 animate-spin" /> : null} Preview
          </Button>
          <Button onClick={runPush} disabled={pushing || !campaignId || (preview?.would_push === 0)} className="bg-[#174be8] hover:bg-[#0d3aa8]">
            {pushing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
            Push {preview?.would_push ? `${preview.would_push.toLocaleString()} ` : ""}leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "primary" }) {
  return (
    <div className={`rounded-md border p-1.5 ${tone === "primary" ? "border-[#174be8] bg-white" : "border-[#dbe4f2] bg-white"}`}>
      <div className="text-[9px] font-bold uppercase tracking-wide text-[#8794ab]">{label}</div>
      <div className={`text-sm font-black ${tone === "primary" ? "text-[#174be8]" : "text-[#07142f]"}`}>{value.toLocaleString()}</div>
    </div>
  );
}
