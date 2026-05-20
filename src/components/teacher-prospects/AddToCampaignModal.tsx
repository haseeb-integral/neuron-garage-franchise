import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Plus } from "lucide-react";

interface Campaign { id: string; name: string; status: string | null }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectUuids: string[];          // one or many
  prospectNames: string[];          // for display
  onAdded?: (uuids: string[]) => void;
}

export function AddToCampaignModal({ open, onOpenChange, prospectUuids, prospectNames, onAdded }: Props) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [jumpAfter, setJumpAfter] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingCampaigns(true);
      const { data, error } = await supabase
        .from("campaign_cache")
        .select("id, name, status")
        .order("last_synced", { ascending: false })
        .limit(50);
      if (!error && data) {
        setCampaigns(data as Campaign[]);
        if (data.length && !selectedCampaign) setSelectedCampaign(data[0].id);
      }
      setLoadingCampaigns(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const headline = prospectUuids.length === 1
    ? `Add ${prospectNames[0]} to a campaign`
    : `Add ${prospectUuids.length.toLocaleString()} prospects to a campaign`;

  const handleSubmit = async () => {
    if (!prospectUuids.length) return;
    const campaignId = mode === "existing" ? (selectedCampaign || null) : null;
    const campaignLabel = mode === "existing"
      ? (campaigns.find((c) => c.id === selectedCampaign)?.name ?? "selected campaign")
      : (newCampaignName.trim() || "draft campaign");

    if (mode === "new" && !newCampaignName.trim()) {
      toast.error("Give the new campaign a name first.");
      return;
    }

    setSubmitting(true);
    try {
      // Optional dedupe: drop uuids already queued in an active state
      let toInsert = prospectUuids;
      if (skipDuplicates) {
        const { data: existing } = await supabase
          .from("outreach_queue")
          .select("teacher_prospect_id")
          .in("teacher_prospect_id", prospectUuids)
          .in("state", ["queued", "assigned", "sending"]);
        const dup = new Set((existing ?? []).map((r) => r.teacher_prospect_id));
        toInsert = prospectUuids.filter((u) => !dup.has(u));
      }

      if (toInsert.length === 0) {
        toast.info("All selected prospects are already in an active campaign.");
        setSubmitting(false);
        onOpenChange(false);
        return;
      }

      const rows = toInsert.map((uuid) => ({
        teacher_prospect_id: uuid,
        campaign_id: campaignId,
        state: campaignId ? "assigned" : "queued",
        notes: mode === "new" ? `Draft campaign: ${newCampaignName.trim()}` : null,
      }));

      const { error: insertErr } = await supabase
        .from("outreach_queue")
        .upsert(rows, { onConflict: "teacher_prospect_id,campaign_id" });
      if (insertErr) throw insertErr;

      // Mark teacher status
      const { error: updErr } = await supabase
        .from("teacher_prospects")
        .update({ status: "in_outreach" })
        .in("id", toInsert);
      if (updErr) throw updErr;

      toast.success(`${toInsert.length.toLocaleString()} added to ${campaignLabel}`, {
        description: campaignId ? "Will appear in Email Outreach → campaign queue." : "Queued unassigned — pick a SmartLead campaign in Email Outreach.",
        action: { label: "View Outreach", onClick: () => navigate("/email-outreach") },
      });
      onAdded?.(toInsert);
      onOpenChange(false);
      if (jumpAfter) navigate("/email-outreach");
    } catch (e) {
      toast.error(`Failed to add: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#07142f]">
            <Mail size={18} className="text-[#174be8]" /> {headline}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-lg bg-[#f1f5f9] p-1">
            <button
              onClick={() => setMode("existing")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${mode === "existing" ? "bg-white text-[#07142f] shadow-sm" : "text-[#526078]"}`}
            >Existing campaign</button>
            <button
              onClick={() => setMode("new")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition ${mode === "new" ? "bg-white text-[#07142f] shadow-sm" : "text-[#526078]"}`}
            >+ New campaign</button>
          </div>

          {mode === "existing" ? (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#526078]">Campaign</label>
              {loadingCampaigns ? (
                <div className="flex h-10 items-center gap-2 rounded-lg border border-[#dbe4f2] bg-white px-3 text-sm text-[#8794ab]">
                  <Loader2 size={14} className="animate-spin" /> Loading campaigns…
                </div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#dbe4f2] bg-[#fafbfd] px-3 py-3 text-xs text-[#526078]">
                  No SmartLead campaigns synced yet. Switch to <button onClick={() => setMode("new")} className="font-bold text-[#174be8]">+ New campaign</button> to queue as a draft.
                </div>
              ) : (
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#dbe4f2] bg-white px-3 text-sm text-[#07142f] focus:outline-none focus:ring-1 focus:ring-[#174be8]"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.status ? `· ${c.status}` : ""}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#526078]">New campaign name (draft)</label>
              <Input
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="e.g. Bay Area Elementary — Spring 2026"
                className="h-10 border-[#dbe4f2] bg-white text-sm focus-visible:ring-1 focus-visible:ring-[#174be8] focus-visible:ring-offset-0"
              />
              <p className="mt-1.5 text-[11px] text-[#8794ab]">
                Queued without a SmartLead campaign id. Assign to a real campaign later from Email Outreach.
              </p>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-[#e7edf5] bg-[#fafbfd] p-3">
            <label className="flex cursor-pointer items-start gap-2 text-xs text-[#34445f]">
              <Checkbox checked={skipDuplicates} onCheckedChange={(v) => setSkipDuplicates(!!v)} className="mt-0.5 border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" />
              <span>Skip prospects already in an active campaign <span className="text-[#8794ab]">(recommended)</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs text-[#34445f]">
              <Checkbox checked={jumpAfter} onCheckedChange={(v) => setJumpAfter(!!v)} className="mt-0.5 border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" />
              <span>Open Email Outreach after adding</span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#dbe4f2] text-[#526078]">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[#174be8] text-white hover:bg-[#123fc5]">
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : <><Plus size={14} /> Add to campaign</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
