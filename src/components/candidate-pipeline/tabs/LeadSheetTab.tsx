import { useEffect, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
}

type Role = "operator" | "investor" | "other" | "";
type YesNo = "yes" | "no" | "";

interface ProfileForm {
  // existing
  background: string;
  motivation: string;
  liquid_capital: string;
  net_worth: string;
  timeline: string;
  partner_involved: boolean;
  location_preferences: string;
  additional_notes: string;
  // new (Google Form Step 1)
  role: Role;
  role_other: string;
  married: YesNo;
  city: string;
  discovery_source: string;
  can_invest_min: YesNo;
  sweat_equity_ok: YesNo;
  other_opportunities: string;
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
  role: "",
  role_other: "",
  married: "",
  city: "",
  discovery_source: "",
  can_invest_min: "",
  sweat_equity_ok: "",
  other_opportunities: "",
};

const REGISTRATION_STATES_LABEL =
  "Registration states (pause call if prospect is in one): CA, HI, IL, IN, MD, MI, MN, ND, NY, RI, SD, VA, WA, WI";

const toYesNo = (v: boolean | null | undefined): YesNo =>
  v === true ? "yes" : v === false ? "no" : "";
const fromYesNo = (v: YesNo): boolean | null =>
  v === "yes" ? true : v === "no" ? false : null;

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
        const p = profileData as any;
        setForm({
          background: p.background ?? "",
          motivation: p.motivation ?? "",
          liquid_capital: p.liquid_capital != null ? String(p.liquid_capital) : "",
          net_worth: p.net_worth != null ? String(p.net_worth) : "",
          timeline: p.timeline ?? "",
          partner_involved: !!candidateData?.partner_involved,
          location_preferences: p.location_preferences ?? "",
          additional_notes: p.additional_notes ?? "",
          role: (p.role as Role) ?? "",
          role_other: p.role_other ?? "",
          married: toYesNo(p.married),
          city: p.city ?? "",
          discovery_source: p.discovery_source ?? "",
          can_invest_min: toYesNo(p.can_invest_min),
          sweat_equity_ok: toYesNo(p.sweat_equity_ok),
          other_opportunities: p.other_opportunities ?? "",
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
      role: form.role || null,
      role_other: form.role === "other" ? (form.role_other || null) : null,
      married: fromYesNo(form.married),
      city: form.city || null,
      discovery_source: form.discovery_source || null,
      can_invest_min: fromYesNo(form.can_invest_min),
      sweat_equity_ok: fromYesNo(form.sweat_equity_ok),
      other_opportunities: form.other_opportunities || null,
    };
    // NOTE: partner_involved is owned by the Overview tab toggle (auto-saves on click).
    // Do NOT write it here or we'll clobber a fresh toggle with this form's stale value.
    const { error: profileError } = await supabase
      .from("candidate_profiles")
      .upsert(profilePayload, { onConflict: "candidate_id" });
    setSaving(false);
    if (profileError) {
      toast.error("Failed to save lead sheet: " + profileError.message);
    } else {
      toast.success("Lead sheet saved");
      if (dbId) {
        const { logActivity } = await import("@/lib/candidateActivity");
        logActivity(dbId, "lead_sheet_saved", "Lead sheet updated");
      }
    }
  };

  if (loading) {
    return <div className="py-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4 py-4">
      {/* Role */}
      <div className="space-y-2">
        <Label>Role in Neuron Garage</Label>
        <RadioGroup
          value={form.role}
          onValueChange={(v) => update("role", v as Role)}
          className="flex flex-wrap gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="operator" id="role-operator" />
            <span className="text-sm">Operator</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="investor" id="role-investor" />
            <span className="text-sm">Investor</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="other" id="role-other" />
            <span className="text-sm">Other</span>
          </label>
        </RadioGroup>
        {form.role === "other" && (
          <Input
            placeholder="Describe role"
            value={form.role_other}
            onChange={(e) => update("role_other", e.target.value)}
          />
        )}
      </div>

      {/* Married */}
      <div className="space-y-2">
        <Label>Are you married?</Label>
        <RadioGroup
          value={form.married}
          onValueChange={(v) => update("married", v as YesNo)}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="yes" id="married-yes" />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="no" id="married-no" />
            <span className="text-sm">No</span>
          </label>
        </RadioGroup>
      </div>

      {/* Partner */}
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label htmlFor="ls-partner" className="cursor-pointer">Will you have a partner in the business?</Label>
          <p className="text-xs text-muted-foreground">Spouse or business partner participating</p>
        </div>
        <Switch
          id="ls-partner"
          checked={form.partner_involved}
          onCheckedChange={async (v) => {
            if (!dbId) {
              toast.error("Cannot save: candidate not linked to database.");
              return;
            }
            const prev = form.partner_involved;
            update("partner_involved", v);
            const { error } = await supabase
              .from("candidates")
              .update({ partner_involved: v })
              .eq("id", dbId);
            if (error) {
              update("partner_involved", prev);
              toast.error("Failed to save: " + error.message);
            }
          }}
        />
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="ls-city">City you're located in</Label>
        <Input
          id="ls-city"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          placeholder="e.g. Nashville, TN"
        />
        <div
          className="flex items-start gap-2 rounded-md p-2 text-xs"
          style={{ backgroundColor: "#fff4e5", border: "1px solid #ffd591", color: "#7a4a00" }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{REGISTRATION_STATES_LABEL}</span>
        </div>
      </div>

      {/* Desired market */}
      <div className="space-y-2">
        <Label htmlFor="ls-location">Desired market</Label>
        <Textarea
          id="ls-location"
          rows={2}
          value={form.location_preferences}
          onChange={(e) => update("location_preferences", e.target.value)}
          placeholder="Where would they want to open?"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <Label htmlFor="ls-timeline">Desired timeline to start</Label>
        <Input
          id="ls-timeline"
          value={form.timeline}
          onChange={(e) => update("timeline", e.target.value)}
          placeholder='"In an ideal world, when would you want to start?"'
        />
      </div>

      {/* Discovery */}
      <div className="space-y-2">
        <Label htmlFor="ls-discovery">How did you discover Neuron Garage?</Label>
        <Textarea
          id="ls-discovery"
          rows={2}
          value={form.discovery_source}
          onChange={(e) => update("discovery_source", e.target.value)}
          placeholder="Capture as much detail as possible — helps our marketing"
        />
      </div>

      {/* Investment ability */}
      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium text-[#003c7e]">
          Low investment, but not no investment
        </legend>

        <div className="space-y-2">
          <Label className="text-sm">
            Can invest ~$1,000 franchise fee + ~$15,000 working capital?
          </Label>
          <RadioGroup
            value={form.can_invest_min}
            onValueChange={(v) => update("can_invest_min", v as YesNo)}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="yes" id="invest-yes" />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="no" id="invest-no" />
              <span className="text-sm">No</span>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Can commit 1 summer of sweat equity?</Label>
          <RadioGroup
            value={form.sweat_equity_ok}
            onValueChange={(v) => update("sweat_equity_ok", v as YesNo)}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="yes" id="sweat-yes" />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="no" id="sweat-no" />
              <span className="text-sm">No</span>
            </label>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-2">
            <Label htmlFor="ls-liquid">Liquid Capital ($) — optional</Label>
            <Input
              id="ls-liquid"
              type="number"
              inputMode="decimal"
              value={form.liquid_capital}
              onChange={(e) => update("liquid_capital", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ls-networth">Net Worth ($) — optional</Label>
            <Input
              id="ls-networth"
              type="number"
              inputMode="decimal"
              value={form.net_worth}
              onChange={(e) => update("net_worth", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* Motivation */}
      <div className="space-y-2">
        <Label htmlFor="ls-motivation">Why interested in owning a Neuron Garage franchise?</Label>
        <p className="text-xs text-muted-foreground">
          Uncover underlying pain or motivation. Financial / Undervalued / No agency / Legacy + mentorship / Other.
        </p>
        <Textarea
          id="ls-motivation"
          rows={3}
          value={form.motivation}
          onChange={(e) => update("motivation", e.target.value)}
        />
      </div>

      {/* Other opportunities */}
      <div className="space-y-2">
        <Label htmlFor="ls-other-opps">Other summer-income opportunities being considered?</Label>
        <Textarea
          id="ls-other-opps"
          rows={2}
          value={form.other_opportunities}
          onChange={(e) => update("other_opportunities", e.target.value)}
        />
      </div>

      {/* Background (recruiter context) */}
      <div className="space-y-2">
        <Label htmlFor="ls-background">Background (recruiter notes)</Label>
        <Textarea
          id="ls-background"
          rows={3}
          value={form.background}
          onChange={(e) => update("background", e.target.value)}
        />
      </div>

      {/* Additional notes */}
      <div className="space-y-2">
        <Label htmlFor="ls-notes">Additional notes</Label>
        <Textarea
          id="ls-notes"
          rows={3}
          value={form.additional_notes}
          onChange={(e) => update("additional_notes", e.target.value)}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving || !dbId}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
