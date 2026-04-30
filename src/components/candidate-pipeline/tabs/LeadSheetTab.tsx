import { useEffect, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
}

interface ProfileForm {
  background: string;
  motivation: string;
  liquid_capital: string;
  net_worth: string;
  timeline: string;
  partner_involved: boolean;
  location_preferences: string;
  additional_notes: string;
}

const empty: ProfileForm = {
  background: "",
  motivation: "",
  liquid_capital: "",
  net_worth: "",
  timeline: "",
  partner_involved: false,
  location_preferences: "",
  additional_notes: "",
};

export function LeadSheetTab({ candidate }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const [form, setForm] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!dbId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("candidate_id", dbId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setForm({
          background: data.background ?? "",
          motivation: data.motivation ?? "",
          liquid_capital: data.liquid_capital != null ? String(data.liquid_capital) : "",
          net_worth: data.net_worth != null ? String(data.net_worth) : "",
          timeline: data.timeline ?? "",
          partner_involved: !!data.partner_involved,
          location_preferences: data.location_preferences ?? "",
          additional_notes: data.additional_notes ?? "",
        });
      } else {
        setForm(empty);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dbId]);

  const update = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!dbId) {
      toast.error("Cannot save: candidate not linked to database.");
      return;
    }
    setSaving(true);
    const payload = {
      candidate_id: dbId,
      background: form.background || null,
      motivation: form.motivation || null,
      liquid_capital: form.liquid_capital ? Number(form.liquid_capital) : null,
      net_worth: form.net_worth ? Number(form.net_worth) : null,
      timeline: form.timeline || null,
      partner_involved: form.partner_involved,
      location_preferences: form.location_preferences || null,
      additional_notes: form.additional_notes || null,
    };
    const { error } = await supabase
      .from("candidate_profiles")
      .upsert(payload, { onConflict: "candidate_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save lead sheet: " + error.message);
    } else {
      toast.success("Lead sheet saved");
    }
  };

  if (loading) {
    return <div className="py-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="ls-background">Background</Label>
        <Textarea id="ls-background" rows={3} value={form.background}
          onChange={(e) => update("background", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ls-motivation">Motivation</Label>
        <Textarea id="ls-motivation" rows={3} value={form.motivation}
          onChange={(e) => update("motivation", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ls-liquid">Liquid Capital ($)</Label>
          <Input id="ls-liquid" type="number" inputMode="decimal" value={form.liquid_capital}
            onChange={(e) => update("liquid_capital", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ls-networth">Net Worth ($)</Label>
          <Input id="ls-networth" type="number" inputMode="decimal" value={form.net_worth}
            onChange={(e) => update("net_worth", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ls-timeline">Timeline</Label>
        <Input id="ls-timeline" value={form.timeline}
          onChange={(e) => update("timeline", e.target.value)}
          placeholder="e.g. Open in 6 months" />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label htmlFor="ls-partner" className="cursor-pointer">Partner Involved</Label>
          <p className="text-xs text-muted-foreground">Spouse or business partner participating</p>
        </div>
        <Switch id="ls-partner" checked={form.partner_involved}
          onCheckedChange={(v) => update("partner_involved", v)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ls-location">Location Preferences</Label>
        <Textarea id="ls-location" rows={2} value={form.location_preferences}
          onChange={(e) => update("location_preferences", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ls-notes">Additional Notes</Label>
        <Textarea id="ls-notes" rows={3} value={form.additional_notes}
          onChange={(e) => update("additional_notes", e.target.value)} />
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving || !dbId}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
