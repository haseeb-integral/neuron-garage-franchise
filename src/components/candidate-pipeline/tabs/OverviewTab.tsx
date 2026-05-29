import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { Candidate, STAGES, stateRequiresRegistration } from "@/data/pipelineData";
import {
  AlertTriangle, Mail, Phone, MapPin, Calendar as CalendarIcon, User, Tag, Camera,
  Pencil, Check, X, Lock, Briefcase, Home, Users, ShieldCheck,
} from "lucide-react";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TeamMember { email: string; firstName: string; }

interface Props {
  candidate: Candidate;
  teamMembers?: TeamMember[];
  onSave?: (patch: Record<string, any>, localPatch: Partial<Candidate>) => Promise<void> | void;
}

type FieldKey = "name" | "email" | "otherEmail" | "phone" | "location" | "assignedTo" | "source";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SOURCE_OPTIONS = ["Referral", "Web Form", "LinkedIn", "Discovery Day", "Event", "Outbound", "Other"];

export function OverviewTab({ candidate, teamMembers = [], onSave }: Props) {
  const stage = STAGES.find((s) => s.id === candidate.stage);
  const needsReg = stateRequiresRegistration(candidate.state);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [draft2, setDraft2] = useState<string>(""); // for state when editing location
  const [saving, setSaving] = useState(false);
  const readOnly = !onSave;

  useEffect(() => { setEditing(null); }, [candidate.id]);

  const handlePickPhoto = () => fileInputRef.current?.click();
  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("Photo upload coming soon", {
      description: "We'll save it to the candidate record once Lovable Cloud is enabled.",
    });
    e.target.value = "";
  };

  const startEdit = (key: FieldKey) => {
    if (readOnly) return;
    setEditing(key);
    if (key === "name") setDraft(candidate.name);
    else if (key === "email") setDraft(candidate.email);
    else if (key === "otherEmail") setDraft(candidate.otherEmail ?? "");
    else if (key === "phone") setDraft(candidate.phone);
    else if (key === "location") { setDraft(candidate.city); setDraft2(candidate.state); }
    else if (key === "assignedTo") setDraft(candidate.assignedTo);
    else if (key === "source") setDraft(candidate.source);
  };

  const cancelEdit = () => { setEditing(null); setDraft(""); setDraft2(""); };

  const commit = async () => {
    if (!editing || !onSave) return;
    let dbPatch: Record<string, any> = {};
    let localPatch: Partial<Candidate> = {};
    const v = draft.trim();

    if (editing === "name") {
      if (!v) { toast.error("Name cannot be empty"); return; }
      const parts = v.split(/\s+/);
      const first = parts.shift() ?? "";
      const last = parts.join(" ");
      dbPatch = { first_name: first, last_name: last };
      localPatch = { name: v };
    } else if (editing === "email") {
      if (!v || !EMAIL_RE.test(v)) { toast.error("Enter a valid email address"); return; }
      dbPatch = { email: v }; localPatch = { email: v };
    } else if (editing === "otherEmail") {
      if (v && !EMAIL_RE.test(v)) { toast.error("Enter a valid email address"); return; }
      dbPatch = { other_email: v || null }; localPatch = { otherEmail: v };
    } else if (editing === "phone") {
      dbPatch = { phone: v || null }; localPatch = { phone: v };
    } else if (editing === "location") {
      const city = draft.trim();
      const st = draft2.trim().toUpperCase();
      dbPatch = { city: city || null, state: st || null };
      localPatch = { city, state: st };
    } else if (editing === "assignedTo") {
      dbPatch = { assigned_to: v || null }; localPatch = { assignedTo: v };
    } else if (editing === "source") {
      dbPatch = { source: v || null }; localPatch = { source: v };
    }

    setSaving(true);
    try {
      await onSave(dbPatch, localPatch);
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancelEdit();
  };

  // Generic save used by Tier-2 cards (Other Opportunities, Mailing, Partner, Compliance)
  const savePatch = async (dbPatch: Record<string, any>, localPatch: Partial<Candidate>) => {
    if (!onSave) return;
    try {
      await onSave(dbPatch, localPatch);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  const renderRow = (key: FieldKey, Icon: any, label: string, displayValue: string) => {
    const isEditing = editing === key;
    return (
      <div key={label} className="flex items-start gap-2 group">
        <Icon size={14} style={{ color: "#6c757d" }} className="mt-1" />
        <div className="min-w-0 flex-1">
          <div className="text-xs" style={{ color: "#6c757d" }}>{label}</div>
          {isEditing ? (
            <div className="flex items-center gap-1 mt-0.5">
              {key === "location" ? (
                <>
                  <input
                    autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
                    placeholder="City"
                    className="text-sm px-1.5 py-0.5 border rounded w-full min-w-0"
                    style={{ borderColor: "#003c7e" }}
                  />
                  <input
                    value={draft2} onChange={(e) => setDraft2(e.target.value)} onKeyDown={onKey}
                    placeholder="ST" maxLength={2}
                    className="text-sm px-1.5 py-0.5 border rounded w-12"
                    style={{ borderColor: "#003c7e" }}
                  />
                </>
              ) : key === "assignedTo" && teamMembers.length > 0 ? (
                <select
                  autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey as any}
                  className="text-sm px-1.5 py-0.5 border rounded w-full min-w-0"
                  style={{ borderColor: "#003c7e" }}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.email} value={m.email}>{m.firstName} ({m.email})</option>
                  ))}
                </select>
              ) : key === "source" ? (
                <select
                  autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey as any}
                  className="text-sm px-1.5 py-0.5 border rounded w-full min-w-0"
                  style={{ borderColor: "#003c7e" }}
                >
                  {SOURCE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              ) : (
                <input
                  autoFocus type={key === "otherEmail" ? "email" : "text"}
                  value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
                  placeholder={key === "otherEmail" ? "Add alternate email..." : undefined}
                  className="text-sm px-1.5 py-0.5 border rounded w-full min-w-0"
                  style={{ borderColor: "#003c7e" }}
                />
              )}
              <button onClick={commit} disabled={saving} aria-label="Save" className="p-1 rounded hover:bg-gray-100">
                <Check size={14} style={{ color: "#198754" }} />
              </button>
              <button onClick={cancelEdit} disabled={saving} aria-label="Cancel" className="p-1 rounded hover:bg-gray-100">
                <X size={14} style={{ color: "#dc3545" }} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startEdit(key)}
              disabled={readOnly}
              className="text-sm font-medium text-left w-full flex items-center gap-1.5 hover:underline disabled:no-underline disabled:cursor-default"
              title={readOnly ? "" : "Click to edit"}
            >
              <span className="truncate">
                {displayValue || (
                  <span style={{ color: "#adb5bd" }}>
                    {key === "otherEmail" ? "Add alternate email..." : "—"}
                  </span>
                )}
              </span>
              {!readOnly && (
                <Pencil size={11} className="opacity-0 group-hover:opacity-60 flex-shrink-0" style={{ color: "#6c757d" }} />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pt-4">
      {/* Photo / avatar block */}
      <div
        className="bg-white rounded-lg p-4 flex items-center gap-4"
        style={{ border: "1px solid #dee2e6" }}
      >
        <button
          onClick={handlePickPhoto}
          className="relative group rounded-full focus:outline-none"
          aria-label="Upload candidate photo"
          title="Click to upload photo"
        >
          <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} size={64} />
          <span
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <Camera size={20} className="text-white" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          {editing === "name" ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
                className="text-sm font-semibold px-1.5 py-0.5 border rounded w-full"
                style={{ borderColor: "#003c7e", color: "#003c7e" }}
              />
              <button onClick={commit} disabled={saving} aria-label="Save" className="p-1 rounded hover:bg-gray-100">
                <Check size={14} style={{ color: "#198754" }} />
              </button>
              <button onClick={cancelEdit} disabled={saving} aria-label="Cancel" className="p-1 rounded hover:bg-gray-100">
                <X size={14} style={{ color: "#dc3545" }} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startEdit("name")}
              disabled={readOnly}
              className="text-sm font-semibold flex items-center gap-1.5 hover:underline disabled:no-underline disabled:cursor-default"
              style={{ color: "#003c7e" }}
              title={readOnly ? "" : "Click to edit name"}
            >
              {candidate.name}
              {!readOnly && <Pencil size={11} className="opacity-60" />}
            </button>
          )}
          <button
            onClick={handlePickPhoto}
            className="text-xs font-medium mt-1 hover:underline block"
            style={{ color: "#003c7e" }}
          >
            {candidate.photoUrl ? "Change photo" : "Upload photo"}
          </button>
          <div className="text-[11px] mt-0.5" style={{ color: "#adb5bd" }}>
            JPG or PNG. Auto-fits to circle.
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileChosen}
        />
      </div>

      {needsReg && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{ backgroundColor: "#fff4d1", border: "1px solid #ffca28" }}
        >
          <AlertTriangle size={16} style={{ color: "#7a5a00" }} className="mt-0.5" />
          <div className="text-sm" style={{ color: "#7a5a00" }}>
            <strong>{candidate.state}</strong> is a franchise registration state. Confirm legal compliance before sending FDD.
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>
          Contact Information
          {!readOnly && (
            <span className="ml-2 text-[11px] font-normal" style={{ color: "#adb5bd" }}>
              Click any value to edit
            </span>
          )}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {/* Email — LOCKED only when sourced from outreach (Smartlead). Manually-added
              candidates show as editable, since there's no upstream verification to protect. */}
          {candidate.emailSource === "manual"
            ? renderRow("email", Mail, "Contact Email", candidate.email)
            : (
              <div className="flex items-start gap-2">
                <Mail size={14} style={{ color: "#6c757d" }} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs flex items-center gap-1" style={{ color: "#6c757d" }}>
                    Verified Email
                    <Lock
                      size={11}
                      style={{ color: "#adb5bd" }}
                      aria-label="Locked"
                    />
                  </div>
                  <div
                    className="text-sm font-medium truncate"
                    title="This is the email used in outreach. It cannot be changed to protect against duplicate sends."
                  >
                    {candidate.email || <span style={{ color: "#adb5bd" }}>—</span>}
                  </div>
                </div>
              </div>
            )}
          {renderRow("otherEmail", Mail, "Other Email", candidate.otherEmail ?? "")}
          {renderRow("phone", Phone, "Phone", candidate.phone)}
          {renderRow("location", MapPin, "Location", `${candidate.city}${candidate.state ? `, ${candidate.state}` : ""}`)}
          {renderRow("assignedTo", User, "Assigned To", candidate.assignedTo)}
          {renderRow("source", Tag, "Source", candidate.source)}
          <div className="flex items-start gap-2">
            <CalendarIcon size={14} style={{ color: "#6c757d" }} className="mt-1" />
            <div>
              <div className="text-xs" style={{ color: "#6c757d" }}>Created</div>
              <div className="text-sm font-medium">{candidate.createdDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* === Tier 2 cards === */}

      <OtherOpportunitiesCard
        candidate={candidate}
        readOnly={readOnly}
        onSave={savePatch}
      />

      <MailingAddressCard
        candidate={candidate}
        readOnly={readOnly}
        onSave={savePatch}
      />

      <PartnerCard
        candidate={candidate}
        readOnly={readOnly}
        onSave={savePatch}
      />

      <ComplianceAuditCard
        candidate={candidate}
        readOnly={readOnly}
        onSave={savePatch}
      />

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Pipeline Status</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs" style={{ color: "#6c757d" }}>Current Stage</div>
            <div className="text-sm font-medium">{stage?.label}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "#6c757d" }}>Days in Stage</div>
            <div className="text-sm font-medium">Day {candidate.daysInStage}</div>
          </div>
          {candidate.fddSentDate && (
            <div>
              <div className="text-xs" style={{ color: "#6c757d" }}>FDD Sent</div>
              <div className="text-sm font-medium">{candidate.fddSentDate}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2 sub-cards
// ─────────────────────────────────────────────────────────────────────────────

type SaveFn = (dbPatch: Record<string, any>, localPatch: Partial<Candidate>) => Promise<void> | void;

function CardShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: "#003c7e" }} />
        <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function OtherOpportunitiesCard({
  candidate, readOnly, onSave,
}: { candidate: Candidate; readOnly: boolean; onSave: SaveFn }) {
  const [value, setValue] = useState(candidate.otherOpportunities ?? "");
  useEffect(() => setValue(candidate.otherOpportunities ?? ""), [candidate.id]);
  const dirty = (candidate.otherOpportunities ?? "") !== value;

  return (
    <CardShell icon={Briefcase} title="Other Opportunities Being Considered">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={readOnly}
        rows={3}
        placeholder="e.g. other franchises, business ideas, or career moves they're evaluating…"
        className="w-full text-sm rounded-md border px-2 py-1.5 focus:outline-none focus:ring-2 disabled:bg-[#f8f9fa]"
        style={{ borderColor: "#dee2e6" }}
      />
      {!readOnly && dirty && (
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setValue(candidate.otherOpportunities ?? "")}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-white"
            style={{ backgroundColor: "#003c7e" }}
            onClick={() => onSave(
              { other_opportunities: value.trim() || null },
              { otherOpportunities: value.trim() },
            )}
          >
            Save
          </Button>
        </div>
      )}
    </CardShell>
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

  const inputCls = "w-full text-sm rounded-md border px-2 py-1.5 focus:outline-none focus:ring-2 disabled:bg-[#f8f9fa]";

  return (
    <CardShell icon={Home} title="Mailing Address">
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
        <input
          className={cn(inputCls, "sm:col-span-6")}
          placeholder="Street address"
          disabled={readOnly}
          value={street} onChange={(e) => setStreet(e.target.value)}
          style={{ borderColor: "#dee2e6" }}
        />
        <input
          className={cn(inputCls, "sm:col-span-3")}
          placeholder="City"
          disabled={readOnly}
          value={city} onChange={(e) => setCity(e.target.value)}
          style={{ borderColor: "#dee2e6" }}
        />
        <input
          className={cn(inputCls, "sm:col-span-1")}
          placeholder="ST" maxLength={2}
          disabled={readOnly}
          value={state} onChange={(e) => setState(e.target.value.toUpperCase())}
          style={{ borderColor: "#dee2e6" }}
        />
        <input
          className={cn(inputCls, "sm:col-span-2")}
          placeholder="ZIP"
          disabled={readOnly}
          value={zip} onChange={(e) => setZip(e.target.value)}
          style={{ borderColor: "#dee2e6" }}
        />
      </div>
      {!readOnly && dirty && (
        <div className="mt-2 flex justify-end gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => {
              setStreet(candidate.mailingStreet ?? "");
              setCity(candidate.mailingCity ?? "");
              setState(candidate.mailingState ?? "");
              setZip(candidate.mailingZip ?? "");
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm" className="text-white" style={{ backgroundColor: "#003c7e" }}
            onClick={() => onSave(
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
            )}
          >
            Save
          </Button>
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

  const inputCls = "w-full text-sm rounded-md border px-2 py-1.5 focus:outline-none focus:ring-2 disabled:bg-[#f8f9fa]";

  const handleSave = () => {
    if (involved && email && !EMAIL_RE.test(email)) {
      toast.error("Enter a valid partner email address");
      return;
    }
    // If toggle is off, clear partner fields.
    const dbPatch = involved
      ? {
          partner_involved: true,
          partner_name: name.trim() || null,
          partner_email: email.trim() || null,
          partner_phone: phone.trim() || null,
        }
      : {
          partner_involved: false,
          partner_name: null,
          partner_email: null,
          partner_phone: null,
        };
    const localPatch: Partial<Candidate> = involved
      ? { partnerInvolved: true, partnerName: name.trim(), partnerEmail: email.trim(), partnerPhone: phone.trim() }
      : { partnerInvolved: false, partnerName: "", partnerEmail: "", partnerPhone: "" };
    onSave(dbPatch, localPatch);
  };

  return (
    <CardShell icon={Users} title="Spouse / Partner">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={involved}
          disabled={readOnly || savingToggle}
          onCheckedChange={async (v) => {
            if (!onSave) return;
            const next = !!v;
            const prevInvolved = involved;
            const prevName = name;
            const prevEmail = email;
            const prevPhone = phone;
            setInvolved(next);
            // Auto-save toggle immediately so it survives stage moves / re-fetches.
            const dbPatch = next
              ? { partner_involved: true }
              : {
                  partner_involved: false,
                  partner_name: null,
                  partner_email: null,
                  partner_phone: null,
                };
            const localPatch: Partial<Candidate> = next
              ? { partnerInvolved: true }
              : { partnerInvolved: false, partnerName: "", partnerEmail: "", partnerPhone: "" };
            if (!next) {
              setName(""); setEmail(""); setPhone("");
            }
            setSavingToggle(true);
            try {
              await onSave(dbPatch, localPatch);
            } catch (e: any) {
              setInvolved(prevInvolved);
              setName(prevName);
              setEmail(prevEmail);
              setPhone(prevPhone);
              toast.error(e?.message ?? "Failed to save");
            } finally {
              setSavingToggle(false);
            }
          }}
        />
        <span className="text-sm">Partner is involved in this decision</span>
      </label>

      {involved && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <input
            className={inputCls}
            placeholder="Partner name"
            disabled={readOnly}
            value={name} onChange={(e) => setName(e.target.value)}
            style={{ borderColor: "#dee2e6" }}
          />
          <input
            type="email"
            className={inputCls}
            placeholder="Partner email"
            disabled={readOnly}
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ borderColor: "#dee2e6" }}
          />
          <input
            className={inputCls}
            placeholder="Partner phone"
            disabled={readOnly}
            value={phone} onChange={(e) => setPhone(e.target.value)}
            style={{ borderColor: "#dee2e6" }}
          />
        </div>
      )}
      {!readOnly && dirty && (
        <div className="mt-2 flex justify-end gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => {
              setInvolved(!!candidate.partnerInvolved);
              setName(candidate.partnerName ?? "");
              setEmail(candidate.partnerEmail ?? "");
              setPhone(candidate.partnerPhone ?? "");
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm" className="text-white" style={{ backgroundColor: "#003c7e" }}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      )}
    </CardShell>
  );
}

function DateField({
  label, value, onChange, disabled,
}: { label: string; value?: string; onChange: (iso: string | null) => void; disabled?: boolean }) {
  const date = value ? new Date(value) : undefined;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: "#6c757d" }}>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
            {date && !disabled && (
              <X
                className="ml-auto h-3.5 w-3.5 opacity-60 hover:opacity-100"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(null); }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ComplianceAuditCard({
  candidate, readOnly, onSave,
}: { candidate: Candidate; readOnly: boolean; onSave: SaveFn }) {
  return (
    <CardShell icon={ShieldCheck} title="Compliance Audit">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DateField
          label="Background check completed"
          value={candidate.backgroundCheckCompletedAt}
          disabled={readOnly}
          onChange={(iso) => onSave(
            { background_check_completed_at: iso },
            { backgroundCheckCompletedAt: iso ?? "" },
          )}
        />
        <DateField
          label="Credit check completed"
          value={candidate.creditCheckCompletedAt}
          disabled={readOnly}
          onChange={(iso) => onSave(
            { credit_check_completed_at: iso },
            { creditCheckCompletedAt: iso ?? "" },
          )}
        />
      </div>
    </CardShell>
  );
}
