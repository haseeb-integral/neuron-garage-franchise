import { useEffect, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  desired_market_city: string;
  desired_market_state: string;
  additional_notes: string;
  // new (Google Form Step 1)
  role: Role;
  role_other: string;
  married: YesNo;
  city: string;
  state: string;
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
  desired_market_city: "",
  desired_market_state: "",
  additional_notes: "",
  role: "",
  role_other: "",
  married: "",
  city: "",
  state: "",
  discovery_source: "",
  can_invest_min: "",
  sweat_equity_ok: "",
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

const toYesNo = (v: boolean | null | undefined): YesNo =>
  v === true ? "yes" : v === false ? "no" : "";
const fromYesNo = (v: YesNo): boolean | null =>
  v === "yes" ? true : v === "no" ? false : null;

const FIELD_LABELS: Record<keyof ProfileForm, string> = {
  background: "Background",
  motivation: "Motivation",
  liquid_capital: "Liquid capital",
  net_worth: "Net worth",
  timeline: "Timeline",
  partner_involved: "Partner involved",
  location_preferences: "Desired market",
  desired_market_city: "Desired market city",
  desired_market_state: "Desired market state",
  additional_notes: "Additional notes",
  role: "Role",
  role_other: "Role (other)",
  married: "Married",
  city: "City",
  state: "State",
  discovery_source: "Discovery source",
  can_invest_min: "Can invest minimum",
  sweat_equity_ok: "Sweat equity OK",
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
          liquid_capital: p.liquid_capital != null ? String(p.liquid_capital) : "",
          net_worth: p.net_worth != null ? String(p.net_worth) : "",
          timeline: p.timeline ?? "",
          partner_involved: !!candidateData?.partner_involved,
          location_preferences: p.location_preferences ?? "",
          desired_market_city: p.desired_market_city ?? "",
          desired_market_state: p.desired_market_state ?? "",
          additional_notes: p.additional_notes ?? "",
          role: (p.role as Role) ?? "",
          role_other: p.role_other ?? "",
          married: toYesNo(p.married),
          city: p.city ?? "",
          state: p.state ?? "",
          discovery_source: p.discovery_source ?? "",
          can_invest_min: toYesNo(p.can_invest_min),
          sweat_equity_ok: toYesNo(p.sweat_equity_ok),
          other_opportunities: p.other_opportunities ?? "",
        };
        setForm(loaded);
        setSnapshot(loaded);
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
      liquid_capital: current.liquid_capital ? Number(current.liquid_capital) : null,
      net_worth: current.net_worth ? Number(current.net_worth) : null,
      timeline: current.timeline || null,
      desired_market_city: current.desired_market_city || null,
      desired_market_state: current.desired_market_state || null,
      // Keep the legacy combined text in sync so exports keep working.
      location_preferences:
        [current.desired_market_city.trim(), current.desired_market_state.trim()]
          .filter(Boolean)
          .join(", ") || null,
      additional_notes: current.additional_notes || null,
      role: current.role || null,
      role_other: current.role === "other" ? (current.role_other || null) : null,
      married: fromYesNo(current.married),
      city: current.city || null,
      state: current.state || null,
      discovery_source: current.discovery_source || null,
      can_invest_min: fromYesNo(current.can_invest_min),
      sweat_equity_ok: fromYesNo(current.sweat_equity_ok),
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
      {/* Role */}
      <div className="space-y-2">
        <Label>What would be your role in Neuron Garage?</Label>
        <RadioGroup
          value={form.role}
          onValueChange={(v) => updateAndSave("role", v as Role)}
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
          onValueChange={(v) => updateAndSave("married", v as YesNo)}
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
              const prev = form.partner_involved;
              update("partner_involved", v);
              const patch = v
                ? { partner_involved: true }
                : { partner_involved: false, partner_name: null, partner_email: null };
              if (!v) { setPartnerFirst(""); setPartnerLast(""); setPartnerEmail(""); }
              const { error } = await supabase
                .from("candidates")
                .update(patch)
                .eq("id", dbId);
              if (error) {
                update("partner_involved", prev);
                toast.error("Failed to save: " + error.message);
              }
            }}
          />
        </div>

        {form.partner_involved && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" onBlur={savePartner}>
            <Input placeholder="Partner first name" value={partnerFirst}
              onChange={(e) => setPartnerFirst(e.target.value)} />
            <Input placeholder="Partner last name" value={partnerLast}
              onChange={(e) => setPartnerLast(e.target.value)} />
            <Input type="email" placeholder="Partner email" value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)} />
          </div>
        )}
      </div>


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
            Can you invest ~$1,000 franchise fee + ~$15,000 working capital?
          </Label>
          <RadioGroup
            value={form.can_invest_min}
            onValueChange={(v) => updateAndSave("can_invest_min", v as YesNo)}
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
          <Label className="text-sm">Can you commit one summer of sweat equity?</Label>
          <RadioGroup
            value={form.sweat_equity_ok}
            onValueChange={(v) => updateAndSave("sweat_equity_ok", v as YesNo)}
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

    </div>
  );
}
