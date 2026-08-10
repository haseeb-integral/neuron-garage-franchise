import { useEffect, useRef, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { Button } from "@/components/ui/button";
import { Camera, User, Tag } from "lucide-react";
import { useCandidateSourceOptions } from "@/hooks/useCandidateSourceOptions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SaveFn = (dbPatch: Record<string, any>, localPatch: Partial<Candidate>) => Promise<void> | void;

interface TeamMember { email: string; firstName: string; }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [mStreet, setMStreet] = useState(candidate.mailingStreet ?? "");
  const [mCity, setMCity] = useState(candidate.mailingCity ?? "");
  const [mState, setMState] = useState(candidate.mailingState ?? "");
  const [mZip, setMZip] = useState(candidate.mailingZip ?? "");
  const [assignedTo, setAssignedTo] = useState(candidate.assignedTo ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const n = splitName(candidate.name);
    setFirstName(n.first);
    setLastName(n.last);
    setEmail(candidate.email ?? "");
    setOtherEmail(candidate.otherEmail ?? "");
    setPhone(candidate.phone ?? "");
    setMStreet(candidate.mailingStreet ?? "");
    setMCity(candidate.mailingCity ?? "");
    setMState(candidate.mailingState ?? "");
    setMZip(candidate.mailingZip ?? "");
    setAssignedTo(candidate.assignedTo ?? "");
  }, [candidate.id]);

  const emailLocked = candidate.emailSource !== "manual";

  const dirty =
    firstName !== initial.first ||
    lastName !== initial.last ||
    (!emailLocked && email !== (candidate.email ?? "")) ||
    otherEmail !== (candidate.otherEmail ?? "") ||
    phone !== (candidate.phone ?? "") ||
    mStreet !== (candidate.mailingStreet ?? "") ||
    mCity !== (candidate.mailingCity ?? "") ||
    mState !== (candidate.mailingState ?? "") ||
    mZip !== (candidate.mailingZip ?? "") ||
    assignedTo !== (candidate.assignedTo ?? "");

  const reset = () => {
    const n = splitName(candidate.name);
    setFirstName(n.first); setLastName(n.last);
    setEmail(candidate.email ?? ""); setOtherEmail(candidate.otherEmail ?? "");
    setPhone(candidate.phone ?? "");
    setAssignedTo(candidate.assignedTo ?? "");
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
      assigned_to: assignedTo.trim() || null,
    };
    const localPatch: Partial<Candidate> = {
      name: fullName,
      otherEmail: otherEmail.trim(),
      phone: phone.trim(),
      assignedTo: assignedTo.trim(),
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

    </div>
  );
}

export function LeadSourceCard({
  candidate,
  onSave,
}: {
  candidate: Candidate;
  onSave?: SaveFn;
}) {
  const readOnly = !onSave;
  const savePatch = async (dbPatch: Record<string, any>, localPatch: Partial<Candidate>) => {
    if (!onSave) return;
    try {
      await onSave(dbPatch, localPatch);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };
  return <SourceCard candidate={candidate} readOnly={readOnly} onSave={savePatch} />;
}

function SourceCard({
  candidate, readOnly, onSave,
}: { candidate: Candidate; readOnly: boolean; onSave: SaveFn }) {
  const { types, namesFor } = useCandidateSourceOptions();
  const [type, setType] = useState(candidate.sourceType ?? "");
  const [name, setName] = useState(candidate.sourceName ?? "");
  const [campaign, setCampaign] = useState(candidate.sourceCampaign ?? "");
  const [notes, setNotes] = useState(candidate.sourceNotes ?? "");

  useEffect(() => {
    setType(candidate.sourceType ?? "");
    setName(candidate.sourceName ?? "");
    setCampaign(candidate.sourceCampaign ?? "");
    setNotes(candidate.sourceNotes ?? "");
  }, [candidate.id]);

  const dirty =
    (candidate.sourceType ?? "") !== type ||
    (candidate.sourceName ?? "") !== name ||
    (candidate.sourceCampaign ?? "") !== campaign ||
    (candidate.sourceNotes ?? "") !== notes;

  const persist = (over?: { type?: string; name?: string }) => {
    const t = over?.type ?? type;
    const n = over?.name ?? name;
    return onSave(
      {
        source_type: t.trim() || null,
        source_name: n.trim() || null,
        source_campaign: campaign.trim() || null,
        source_notes: notes.trim() || null,
      },
      {
        sourceType: t.trim(),
        sourceName: n.trim(),
        sourceCampaign: campaign.trim(),
        sourceNotes: notes.trim(),
      },
    );
  };

  // Auto-save when the user leaves a field with unsaved changes.
  const handleAutoSave = () => {
    if (readOnly || !dirty) return;
    void persist();
  };

  const names = namesFor(type);

  return (
    <CardShell icon={Tag} title="Lead Source">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" onBlur={handleAutoSave}>
        <Field label="Source Type">
          <select className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
            value={type}
            onChange={(e) => {
              const t = e.target.value;
              setType(t);
              setName("");
              if (!readOnly) void persist({ type: t, name: "" });
            }}>
            <option value="">—</option>
            {types.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </Field>
        <Field label="Source Name">
          <select className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly || !type}
            value={name}
            onChange={(e) => {
              const n = e.target.value;
              setName(n);
              if (!readOnly) void persist({ name: n });
            }}>
            <option value="">{type ? "—" : "Pick a type first"}</option>
            {names.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </Field>
        <Field label="Campaign (optional)">
          <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
            placeholder="e.g. Houston Teachers – Apr 2026"
            value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Source notes (optional)">
            <input className={inputCls} style={{ borderColor: "#e3e8ef" }} disabled={readOnly}
              placeholder="Anything that does not fit the lists"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>
      {!readOnly && dirty && (
        <div className="mt-2 flex justify-end">
          <Button size="sm" className="text-white" style={{ backgroundColor: "#07142f" }}
            onClick={() => persist()}>Save</Button>
        </div>
      )}
    </CardShell>
  );
}
