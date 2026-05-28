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
      const [{ data: profileData }, { data: candidateData }] = await Promise.all([
        supabase.from("candidate_profiles").select("*").eq("candidate_id", dbId).maybeSingle(),
        supabase.from("candidates").select("partner_involved").eq("id", dbId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (profileData) {
        setForm({
          background: profileData.background ?? "",
          motivation: profileData.motivation ?? "",
          liquid_capital: profileData.liquid_capital != null ? String(profileData.liquid_capital) : "",
          net_worth: profileData.net_worth != null ? String(profileData.net_worth) : "",
          timeline: profileData.timeline ?? "",
          partner_involved: !!candidateData?.partner_involved,
          location_preferences: profileData.location_preferences ?? "",
          additional_notes: profileData.additional_notes ?? "",
        });
      } else {
        setForm({
          ...empty,
          partner_involved: !!candidateData?.partner_involved,
        });
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
    const profilePayload = {
      candidate_id: dbId,
      background: form.background || null,
      motivation: form.motivation || null,
      liquid_capital: form.liquid_capital ? Number(form.liquid_capital) : null,
      net_worth: form.net_worth ? Number(form.net_worth) : null,
      timeline: form.timeline || null,
      location_preferences: form.location_preferences || null,
      additional_notes: form.additional_notes || null,
    };
    const [{ error: profileError }, { error: candidateError }] = await Promise.all([
      supabase.from("candidate_profiles").upsert(profilePayload, { onConflict: "candidate_id" }),
      supabase.from("candidates").update({ partner_involved: form.partner_involved }).eq("id", dbId),
    ]);
    setSaving(false);
    if (profileError || candidateError) {
      toast.error("Failed to save lead sheet: " + (profileError?.message || candidateError?.message));
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
      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium text-[#003c7e]">
          Ability to Invest in Neuron Garage
        </legend>
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
      </fieldset>
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
        <Label htmlFor="ls-location">Desired Markets</Label>
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
