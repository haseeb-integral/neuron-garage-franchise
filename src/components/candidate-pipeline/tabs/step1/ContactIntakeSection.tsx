import { useEffect, useRef, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Home, Users, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SaveFn = (dbPatch: Record<string, any>, localPatch: Partial<Candidate>) => Promise<void> | void;

interface TeamMember { email: string; firstName: string; }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCE_OPTIONS = ["Referral", "Web Form", "LinkedIn", "Discovery Day", "Event", "Outbound", "Other"];

const inputCls =
  "w-full text-sm rounded-md border px-2 py-1.5 focus:outline-none focus:ring-2 disabled:bg-[#f8f9fa]";

function CardShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: "#07142f" }} />
        <h4 className="font-semibold text-sm" style={{ color: "#07142f" }}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs" style={{ color: "#526078" }}>{label}</div>
      {children}
    </div>
  );
}

export function ContactIntakeSection({
  candidate,
  teamMembers = [],
  onSave,
}: {
  candidate: Candidate;
  teamMembers?: TeamMember[];
  onSave?: SaveFn;
}) {
  const readOnly = !onSave;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const splitName = (full: string) => {
    const parts = (full ?? "").trim().split(/\s+/);
    const first = parts.shift() ?? "";
    return { first, last: parts.join(" ") };
  };

  const initial = splitName(candidate.name);
  const [firstName, setFirstName] = useState(initial.first);
  const [lastName, setLastName] = useState(initial.last);
  const [email, setEmail] = useState(candidate.email ?? "");
  const [otherEmail, setOtherEmail] = useState(candidate.otherEmail ?? "");
  const [phone, setPhone] = useState(candidate.phone ?? "");
  const [city, setCity] = useState(candidate.city ?? "");
  const [state, setState] = useState(candidate.state ?? "");
  const [assignedTo, setAssignedTo] = useState(candidate.assignedTo ?? "");
  const [source, setSource] = useState(candidate.source ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const n = splitName(candidate.name);
    setFirstName(n.first);
    setLastName(n.last);
    setEmail(candidate.email ?? "");
    setOtherEmail(candidate.otherEmail ?? "");
    setPhone(candidate.phone ?? "");
    setCity(candidate.city ?? "");
    setState(candidate.state ?? "");
    setAssignedTo(candidate.assignedTo ?? "");
    setSource(candidate.source ?? "");
  }, [candidate.id]);

  const emailLocked = candidate.emailSource !== "manual";

  const dirty =
    firstName !== initial.first ||
    lastName !== initial.last ||
    (!emailLocked && email !== (candidate.email ?? "")) ||
    otherEmail !== (candidate.otherEmail ?? "") ||
    phone !== (candidate.phone ?? "") ||
    city !== (candidate.city ?? "") ||
    state !== (candidate.state ?? "") ||
    assignedTo !== (candidate.assignedTo ?? "") ||
    source !== (candidate.source ?? "");

  const reset = () => {
    const n = splitName(candidate.name);
    setFirstName(n.first); setLastName(n.last);
    setEmail(candidate.email ?? ""); setOtherEmail(candidate.otherEmail ?? "");
    setPhone(candidate.phone ?? ""); setCity(candidate.city ?? "");
    setState(candidate.state ?? ""); setAssignedTo(candidate.assignedTo ?? "");
    setSource(candidate.source ?? "");
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    if (!onSave) return;
    if (!firstName.trim()) { toast.error("First name cannot be empty"); return; }
    if (!emailLocked && email.trim() && !EMAIL_RE.test(email.trim())) {
      toast.error("Enter a valid email address"); return;
    }
    if (otherEmail.trim() && !EMAIL_RE.test(otherEmail.trim())) {
      toast.error("Enter a valid alternate email address"); return;
    }
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const dbPatch: Record<string, any> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      other_email: otherEmail.trim() || null,
      phone: phone.trim() || null,
      city: city.trim() || null,
      state: state.trim().toUpperCase() || null,
      assigned_to: assignedTo.trim() || null,
      source: source.trim() || null,
    };
    const localPatch: Partial<Candidate> = {
      name: fullName,
      otherEmail: otherEmail.trim(),
      phone: phone.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      assignedTo: assignedTo.trim(),
      source: source.trim(),
    };
    if (!emailLocked) {
      dbPatch.email = email.trim();
      localPatch.email = email.trim();
    }
    setSaving(true);
    try {
      await onSave(dbPatch, localPatch);
      if (!opts?.silent) toast.success("Contact details saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when the user leaves a field with unsaved changes.
  const handleAutoSave = () => {
    if (readOnly || saving || !dirty) return;
    void handleSave({ silent: true });
  };


  const savePatch = async (dbPatch: Record<string, any>, localPatch: Partial<Candidate>) => {
    if (!onSave) return;
    try {
      await onSave(dbPatch, localPatch);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  return (
    <div className="space-y-3 mb-4">
      <CardShell icon={User} title="Contact & Basics">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group rounded-full focus:outline-none"
            aria-label="Upload candidate photo"
            title="Click to upload photo"
            type="button"
          >
            <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} size={56} />
            <span
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            >
              <Camera size={18} className="text-white" />
            </span>
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium hover:underline block"
              style={{ color: "#07142f" }}
            >
              {candidate.photoUrl ? "Change photo" : "Upload photo"}
            </button>
            <div className="text-[11px] mt-0.5" style={{ color: "#8893a7" }}>JPG or PNG. Auto-fits to circle.</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              if (!e.target.files?.[0]) return;
              toast.info("Photo upload coming soon");
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" onBlur={handleAutoSave}>
          <Field label="First Name">
            <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
              value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last Name">
            <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
              value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field label={emailLocked ? "Verified Email (locked)" : "Contact Email"}>
            <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly || emailLocked}
              title={emailLocked ? "This is the email used in outreach. It cannot be changed." : undefined}
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Other Email">
            <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
              placeholder="Add alternate email…"
              value={otherEmail} onChange={(e) => setOtherEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Location">
            <div className="flex gap-2">
              <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
                placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              <input className={cn(inputCls, "w-16")} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
                placeholder="ST" maxLength={2} value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())} />
            </div>
          </Field>
          <Field label="Assigned To">
            {teamMembers.length > 0 ? (
              <select className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
                value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.email} value={m.email}>{m.firstName} ({m.email})</option>
                ))}
              </select>
            ) : (
              <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
                value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
            )}
          </Field>
        </div>

        {!readOnly && dirty && (
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>
            <Button size="sm" className="text-white" style={{ backgroundColor: "#07142f" }}
              onClick={() => handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </CardShell>

      <MailingAddressCard candidate={candidate} readOnly={readOnly} onSave={savePatch} />
      <PartnerCard candidate={candidate} readOnly={readOnly} onSave={savePatch} />
    </div>
  );
}

function MailingAddressCard({
  candidate, readOnly, onSave,
}: { candidate: Candidate; readOnly: boolean; onSave: SaveFn }) {
  const [street, setStreet] = useState(candidate.mailingStreet ?? "");
  const [city, setCity] = useState(candidate.mailingCity ?? "");
  const [state, setState] = useState(candidate.mailingState ?? "");
  const [zip, setZip] = useState(candidate.mailingZip ?? "");

  useEffect(() => {
    setStreet(candidate.mailingStreet ?? "");
    setCity(candidate.mailingCity ?? "");
    setState(candidate.mailingState ?? "");
    setZip(candidate.mailingZip ?? "");
  }, [candidate.id]);

  const dirty =
    (candidate.mailingStreet ?? "") !== street ||
    (candidate.mailingCity ?? "") !== city ||
    (candidate.mailingState ?? "") !== state ||
    (candidate.mailingZip ?? "") !== zip;

  const persist = () =>
    onSave(
      {
        mailing_street: street.trim() || null,
        mailing_city: city.trim() || null,
        mailing_state: state.trim() || null,
        mailing_zip: zip.trim() || null,
      },
      {
        mailingStreet: street.trim(),
        mailingCity: city.trim(),
        mailingState: state.trim(),
        mailingZip: zip.trim(),
      },
    );

  // Auto-save when the user leaves a field with unsaved changes.
  const handleAutoSave = () => {
    if (readOnly || !dirty) return;
    void persist();
  };

  return (
    <CardShell icon={Home} title="Mailing Address">
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-2" onBlur={handleAutoSave}>
        <input className={cn(inputCls, "sm:col-span-6")} placeholder="Street address" disabled={readOnly}
          value={street} onChange={(e) => setStreet(e.target.value)} style={{ borderColor: "#e3e8ef" }} />
        <input className={cn(inputCls, "sm:col-span-3")} placeholder="City" disabled={readOnly}
          value={city} onChange={(e) => setCity(e.target.value)} style={{ borderColor: "#e3e8ef" }} />
        <input className={cn(inputCls, "sm:col-span-1")} placeholder="ST" maxLength={2} disabled={readOnly}
          value={state} onChange={(e) => setState(e.target.value.toUpperCase())} style={{ borderColor: "#e3e8ef" }} />
        <input className={cn(inputCls, "sm:col-span-2")} placeholder="ZIP" disabled={readOnly}
          value={zip} onChange={(e) => setZip(e.target.value)} style={{ borderColor: "#e3e8ef" }} />
      </div>
      {!readOnly && dirty && (
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            setStreet(candidate.mailingStreet ?? "");
            setCity(candidate.mailingCity ?? "");
            setState(candidate.mailingState ?? "");
            setZip(candidate.mailingZip ?? "");
          }}>Cancel</Button>
          <Button size="sm" className="text-white" style={{ backgroundColor: "#07142f" }}
            onClick={() => persist()}
          >Save</Button>
        </div>
      )}
    </CardShell>
  );
}

function PartnerCard({
  candidate, readOnly, onSave,
}: { candidate: Candidate; readOnly: boolean; onSave: SaveFn }) {
  const [involved, setInvolved] = useState(!!candidate.partnerInvolved);
  const [name, setName] = useState(candidate.partnerName ?? "");
  const [email, setEmail] = useState(candidate.partnerEmail ?? "");
  const [phone, setPhone] = useState(candidate.partnerPhone ?? "");
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    setInvolved(!!candidate.partnerInvolved);
    setName(candidate.partnerName ?? "");
    setEmail(candidate.partnerEmail ?? "");
    setPhone(candidate.partnerPhone ?? "");
  }, [candidate.id, candidate.partnerInvolved, candidate.partnerName, candidate.partnerEmail, candidate.partnerPhone]);

  const dirty =
    !!candidate.partnerInvolved !== involved ||
    (candidate.partnerName ?? "") !== name ||
    (candidate.partnerEmail ?? "") !== email ||
    (candidate.partnerPhone ?? "") !== phone;

  const handleSave = () => {
    if (involved && email && !EMAIL_RE.test(email)) {
      toast.error("Enter a valid partner email address");
      return;
    }
    const dbPatch = involved
      ? {
          partner_involved: true,
          partner_name: name.trim() || null,
          partner_email: email.trim() || null,
          partner_phone: phone.trim() || null,
        }
      : { partner_involved: false, partner_name: null, partner_email: null, partner_phone: null };
    const localPatch: Partial<Candidate> = involved
      ? { partnerInvolved: true, partnerName: name.trim(), partnerEmail: email.trim(), partnerPhone: phone.trim() }
      : { partnerInvolved: false, partnerName: "", partnerEmail: "", partnerPhone: "" };
    onSave(dbPatch, localPatch);
  };

  // Auto-save when the user leaves a field with unsaved changes.
  const handleAutoSave = () => {
    if (readOnly || !dirty) return;
    handleSave();
  };


  return (
    <CardShell icon={Users} title="Spouse / Partner">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={involved}
          disabled={readOnly || savingToggle}
          onCheckedChange={async (v) => {
            const next = !!v;
            const prev = { involved, name, email, phone };
            setInvolved(next);
            const dbPatch = next
              ? { partner_involved: true }
              : { partner_involved: false, partner_name: null, partner_email: null, partner_phone: null };
            const localPatch: Partial<Candidate> = next
              ? { partnerInvolved: true }
              : { partnerInvolved: false, partnerName: "", partnerEmail: "", partnerPhone: "" };
            if (!next) { setName(""); setEmail(""); setPhone(""); }
            setSavingToggle(true);
            try {
              await onSave(dbPatch, localPatch);
            } catch (e: any) {
              setInvolved(prev.involved); setName(prev.name); setEmail(prev.email); setPhone(prev.phone);
              toast.error(e?.message ?? "Failed to save");
            } finally {
              setSavingToggle(false);
            }
          }}
        />
        <span className="text-sm">Partner is involved in this decision</span>
      </label>

      {involved && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3" onBlur={handleAutoSave}>
          <input className={inputCls} placeholder="Partner name" disabled={readOnly}
            value={name} onChange={(e) => setName(e.target.value)} style={{ borderColor: "#e3e8ef" }} />
          <input type="email" className={inputCls} placeholder="Partner email" disabled={readOnly}
            value={email} onChange={(e) => setEmail(e.target.value)} style={{ borderColor: "#e3e8ef" }} />
          <input className={inputCls} placeholder="Partner phone" disabled={readOnly}
            value={phone} onChange={(e) => setPhone(e.target.value)} style={{ borderColor: "#e3e8ef" }} />
        </div>
      )}
      {!readOnly && dirty && (
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            setInvolved(!!candidate.partnerInvolved);
            setName(candidate.partnerName ?? "");
            setEmail(candidate.partnerEmail ?? "");
            setPhone(candidate.partnerPhone ?? "");
          }}>Cancel</Button>
          <Button size="sm" className="text-white" style={{ backgroundColor: "#07142f" }} onClick={handleSave}>Save</Button>
        </div>
      )}
    </CardShell>
  );
}
