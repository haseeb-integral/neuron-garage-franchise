import { useEffect, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
}

type StartTiming = "this_summer" | "next_summer" | "other" | "";

interface ProfileForm {
  // existing
  background: string;
  motivation: string;
  experience_with_children: string;
  interest_in_neuron_garage: string;
  educational_philosophy: string;
  timeline: string;
  owner_operator_explained: boolean;
  general_timeline_explained: boolean;
  partner_involved: boolean;
  location_preferences: string;
  desired_market_city: string;
  desired_market_state: string;
  additional_notes: string;
  city: string;
  state: string;
  discovery_source: string;
  other_opportunities: string;
}

const empty: ProfileForm = {
  background: "",
  motivation: "",
  experience_with_children: "",
  interest_in_neuron_garage: "",
  educational_philosophy: "",
  timeline: "",
  owner_operator_explained: false,
  general_timeline_explained: false,
  partner_involved: false,
  location_preferences: "",
  desired_market_city: "",
  desired_market_state: "",
  additional_notes: "",
  city: "",
  state: "",
  discovery_source: "",
  other_opportunities: "",
};

const REGISTRATION_STATE_ABBRS = [
  "CA", "HI", "IL", "IN", "MD", "MI", "MN", "ND", "NY", "RI", "SD", "VA", "WA", "WI",
];

const REGISTRATION_STATE_NAMES: Record<string, string> = {
  california: "CA", hawaii: "HI", illinois: "IL", indiana: "IN", maryland: "MD",
  michigan: "MI", minnesota: "MN", "north dakota": "ND", "new york": "NY",
  "rhode island": "RI", "south dakota": "SD", virginia: "VA", washington: "WA",
  wisconsin: "WI",
};

// Look for a registration state inside free text like "Nashville, TN" or "Chicago, Illinois".
function findRegistrationState(text: string): string | null {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return null;
  for (const [name, abbr] of Object.entries(REGISTRATION_STATE_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(t)) return abbr;
  }
  const upper = (text ?? "").toUpperCase();
  for (const abbr of REGISTRATION_STATE_ABBRS) {
    if (new RegExp(`\\b${abbr}\\b`).test(upper)) return abbr;
  }
  return null;
}

const REGISTRATION_NOTE =
  "NOTE: If the prospect is located in a registration state, we need to politely end the call and let them know that we will reach out to them once we are properly registered to do franchise recruitment in their state.";

const REGISTRATION_STATES_LABEL =
  "Registration states (pause call if prospect is in one): CA, HI, IL, IN, MD, MI, MN, ND, NY, RI, SD, VA, WA, WI";

const FIELD_LABELS: Record<keyof ProfileForm, string> = {
  background: "Background",
  motivation: "Motivation",
  experience_with_children: "Experience working with children",
  interest_in_neuron_garage: "Interest in Neuron Garage",
  educational_philosophy: "Educational philosophy",
  timeline: "Ideal start time",
  owner_operator_explained: "Owner/operator explanation",
  general_timeline_explained: "General timeline explanation",
  partner_involved: "Partner involved",
  location_preferences: "Desired market",
  desired_market_city: "Desired market city",
  desired_market_state: "Desired market state",
  additional_notes: "Additional notes",
  city: "City",
  state: "State",
  discovery_source: "Discovery source",
  other_opportunities: "Other opportunities",
};

const truncate = (s: string, n = 40) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;

const diffForm = (a: ProfileForm, b: ProfileForm) => {
  const changes: { key: keyof ProfileForm; label: string; from: string; to: string }[] = [];
  (Object.keys(FIELD_LABELS) as (keyof ProfileForm)[]).forEach((k) => {
    const av = a[k];
    const bv = b[k];
    if (av !== bv) {
      changes.push({
        key: k,
        label: FIELD_LABELS[k],
        from: truncate(String(av ?? "")),
        to: truncate(String(bv ?? "")),
      });
    }
  });
  return changes;
};

export function LeadSheetSection({ candidate }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const [form, setForm] = useState<ProfileForm>(empty);
  const [snapshot, setSnapshot] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startTiming, setStartTiming] = useState<StartTiming>("");
  const [partnerFirst, setPartnerFirst] = useState("");
  const [partnerLast, setPartnerLast] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  const savePartner = async () => {
    if (!dbId) return;
    const full = [partnerFirst.trim(), partnerLast.trim()].filter(Boolean).join(" ");
    const { error } = await supabase
      .from("candidates")
      .update({ partner_name: full || null, partner_email: partnerEmail.trim() || null })
      .eq("id", dbId);
    if (error) toast.error("Failed to save partner: " + error.message);
  };

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
        supabase.from("candidates").select("partner_involved, partner_name, partner_email").eq("id", dbId).maybeSingle(),
      ]);
      if (cancelled) return;
      const pname = (candidateData as any)?.partner_name ?? "";
      const parts = String(pname).trim().split(/\s+/).filter(Boolean);
      setPartnerFirst(parts.shift() ?? "");
      setPartnerLast(parts.join(" "));
      setPartnerEmail((candidateData as any)?.partner_email ?? "");
      if (profileData) {
        const p = profileData as any;
        const loaded: ProfileForm = {
          background: p.background ?? "",
          motivation: p.motivation ?? "",
          experience_with_children: p.experience_with_children ?? "",
          interest_in_neuron_garage: p.interest_in_neuron_garage ?? "",
          educational_philosophy: p.educational_philosophy ?? "",
          timeline: p.timeline ?? "",
          owner_operator_explained: !!p.owner_operator_explained,
          general_timeline_explained: !!p.general_timeline_explained,
          partner_involved: !!candidateData?.partner_involved,
          location_preferences: p.location_preferences ?? "",
          desired_market_city: p.desired_market_city ?? "",
          desired_market_state: p.desired_market_state ?? "",
          additional_notes: p.additional_notes ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          discovery_source: p.discovery_source ?? "",
          other_opportunities: p.other_opportunities ?? "",
        };
        setForm(loaded);
        setSnapshot(loaded);
        setStartTiming(
          loaded.timeline === "This coming Summer"
            ? "this_summer"
            : loaded.timeline === "Next Summer"
              ? "next_summer"
              : loaded.timeline
                ? "other"
                : "",
        );
      } else {
        const loaded = { ...empty, partner_involved: !!candidateData?.partner_involved };
        setForm(loaded);
        setSnapshot(loaded);
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dbId]);

  const update = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Change a field and immediately save (used for radio buttons, which never blur predictably).
  const updateAndSave = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      queueMicrotask(() => void saveForm(next, true));
      return next;
    });

  const saveForm = async (current: ProfileForm, silent = false) => {
    if (!dbId) {
      if (!silent) toast.error("Cannot save: candidate not linked to database.");
      return;
    }
    setSaving(true);
    const profilePayload = {
      candidate_id: dbId,
      background: current.background || null,
      motivation: current.motivation || null,
      experience_with_children: current.experience_with_children || null,
      interest_in_neuron_garage: current.interest_in_neuron_garage || null,
      educational_philosophy: current.educational_philosophy || null,
      timeline: current.timeline || null,
      owner_operator_explained: current.owner_operator_explained,
      general_timeline_explained: current.general_timeline_explained,
      desired_market_city: current.desired_market_city || null,
      desired_market_state: current.desired_market_state || null,
      // Keep the legacy combined text in sync so exports keep working.
      location_preferences:
        [current.desired_market_city.trim(), current.desired_market_state.trim()]
          .filter(Boolean)
          .join(", ") || null,
      additional_notes: current.additional_notes || null,
      city: current.city || null,
      state: current.state || null,
      discovery_source: current.discovery_source || null,
      other_opportunities: current.other_opportunities || null,
    };
    // NOTE: partner_involved is owned by the toggle below (auto-saves on click).
    const { error: profileError } = await supabase
      .from("candidate_profiles")
      .upsert(profilePayload, { onConflict: "candidate_id" });
    setSaving(false);
    if (profileError) {
      toast.error("Failed to save lead sheet: " + profileError.message);
      return;
    }
    if (!silent) toast.success("Lead sheet saved");
    const changes = diffForm(snapshot, current);
    const { logActivity } = await import("@/lib/candidateActivity");
    if (changes.length > 0) {
      const labels = changes.map((c) => c.label).join(", ");
      logActivity(
        dbId,
        "lead_sheet_saved",
        `Lead sheet updated — ${changes.length} field${changes.length === 1 ? "" : "s"} changed: ${labels}`,
        { changes },
      );
    } else if (!silent) {
      logActivity(dbId, "lead_sheet_saved", "Lead sheet saved (no field changes)", { changes: [] });
    }
    setSnapshot(current);
  };


  // Auto-save when the user leaves a field with unsaved changes.
  const handleAutoSave = () => {
    if (saving || !dbId) return;
    if (diffForm(snapshot, form).length === 0) return;
    void saveForm(form, true);
  };

  const regState =
    findRegistrationState(form.state) ??
    findRegistrationState(form.city) ??
    findRegistrationState(form.desired_market_state) ??
    findRegistrationState(form.desired_market_city);

  if (loading) {
    return <div className="py-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4 py-4" onBlur={handleAutoSave}>
      {/* Experience with children */}
      <div className="space-y-2">
        <Label htmlFor="ls-exp-children">What is their experience working with children?</Label>
        <Textarea
          id="ls-exp-children"
          rows={2}
          value={form.experience_with_children}
          onChange={(e) => update("experience_with_children", e.target.value)}
        />
      </div>

      {/* Interest in Neuron Garage */}
      <div className="space-y-2">
        <Label htmlFor="ls-interest">What interested them in Neuron Garage?</Label>
        <Textarea
          id="ls-interest"
          rows={2}
          value={form.interest_in_neuron_garage}
          onChange={(e) => update("interest_in_neuron_garage", e.target.value)}
        />
      </div>

      {/* Educational philosophy */}
      <div className="space-y-2">
        <Label htmlFor="ls-edu-phil">What is their educational philosophy?</Label>
        <Textarea
          id="ls-edu-phil"
          rows={2}
          value={form.educational_philosophy}
          onChange={(e) => update("educational_philosophy", e.target.value)}
        />
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={form.owner_operator_explained}
          onCheckedChange={(v) => updateAndSave("owner_operator_explained", !!v)}
          className="mt-0.5"
        />
        <span className="text-sm">I explained that the Owner has to also be the Operator</span>
      </label>


      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="ls-city">What city and state are you located in?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            id="ls-city"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="City (e.g. Nashville)"
          />
          <Input
            id="ls-state"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="State (e.g. TN)"
          />
        </div>
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
        <Label htmlFor="ls-market-city">Desired Market (city and state)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            id="ls-market-city"
            value={form.desired_market_city}
            onChange={(e) => update("desired_market_city", e.target.value)}
            placeholder="City (e.g. Nashville)"
          />
          <Input
            id="ls-market-state"
            value={form.desired_market_state}
            onChange={(e) => update("desired_market_state", e.target.value)}
            placeholder="State (e.g. TN)"
          />
        </div>
      </div>

      {regState && (
        <div
          className="flex items-start gap-2 rounded-md p-2 text-xs font-medium"
          style={{ backgroundColor: "#fff1f0", border: "1px solid #ffa39e", color: "#c0261c" }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{REGISTRATION_NOTE} (Detected: {regState})</span>
        </div>
      )}


      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={form.general_timeline_explained}
          onCheckedChange={(v) => updateAndSave("general_timeline_explained", !!v)}
          className="mt-0.5"
        />
        <span className="text-sm">Explained the general timeline of finding a facility, opening enrollment, start of camp.</span>
      </label>

      <div className="space-y-2">
        <Label>If this was a fit, when would they ideally like to begin?</Label>
        <Select
          value={startTiming || undefined}
          onValueChange={(value) => {
            const nextTiming = value as StartTiming;
            setStartTiming(nextTiming);
            const timeline = nextTiming === "this_summer"
              ? "This coming Summer"
              : nextTiming === "next_summer"
                ? "Next Summer"
                : "";
            updateAndSave("timeline", timeline);
          }}
        >
          <SelectTrigger aria-label="If this was a fit, when would they ideally like to begin?">
            <SelectValue placeholder="Select a time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_summer">This coming Summer</SelectItem>
            <SelectItem value="next_summer">Next Summer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {startTiming === "other" && (
          <Input
            aria-label="Other ideal start time"
            value={form.timeline}
            onChange={(e) => update("timeline", e.target.value)}
            placeholder="Enter their ideal start time"
          />
        )}
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

      {/* Motivation */}
      <div className="space-y-2">
        <Label htmlFor="ls-motivation">Why are you interested in owning your own garage franchise? What is intriguing to you about our model?</Label>
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
        <Label htmlFor="ls-other-opps">What other opportunities for summer income are you looking at or considering?</Label>
        <Textarea
          id="ls-other-opps"
          rows={2}
          value={form.other_opportunities}
          onChange={(e) => update("other_opportunities", e.target.value)}
        />
      </div>

      {/* Partner */}
      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="ls-partner" className="cursor-pointer">Will you have a partner in the business?</Label>
          <Switch
            id="ls-partner"
            checked={form.partner_involved}
            onCheckedChange={async (v) => {
              if (!dbId) {
                toast.error("Cannot save: candidate not linked to database.");
                return;
              }
              const previous = form.partner_involved;
              update("partner_involved", v);
              const patch = v
                ? { partner_involved: true }
                : { partner_involved: false, partner_name: null, partner_email: null };
              if (!v) {
                setPartnerFirst("");
                setPartnerLast("");
                setPartnerEmail("");
              }
              const { error } = await supabase.from("candidates").update(patch).eq("id", dbId);
              if (error) {
                update("partner_involved", previous);
                toast.error("Failed to save: " + error.message);
              }
            }}
          />
        </div>
        {form.partner_involved && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" onBlur={savePartner}>
            <Input placeholder="Partner first name" value={partnerFirst} onChange={(e) => setPartnerFirst(e.target.value)} />
            <Input placeholder="Partner last name" value={partnerLast} onChange={(e) => setPartnerLast(e.target.value)} />
            <Input type="email" placeholder="Partner email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} />
          </div>
        )}
      </div>

    </div>
  );
}
