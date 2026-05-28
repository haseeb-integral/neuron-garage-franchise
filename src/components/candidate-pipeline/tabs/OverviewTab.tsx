import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { Candidate, STAGES, stateRequiresRegistration } from "@/data/pipelineData";
import { AlertTriangle, Mail, Phone, MapPin, Calendar, User, Tag, Camera, Pencil, Check, X, Lock } from "lucide-react";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { toast } from "sonner";

interface TeamMember { email: string; firstName: string; }

interface Props {
  candidate: Candidate;
  teamMembers?: TeamMember[];
  onSave?: (patch: Record<string, any>, localPatch: Partial<Candidate>) => Promise<void> | void;
}

type FieldKey = "name" | "otherEmail" | "phone" | "location" | "assignedTo" | "source";

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
              <span className="truncate">{displayValue || <span style={{ color: "#adb5bd" }}>—</span>}</span>
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
          {/* Verified Email — LOCKED. This is the address Smartlead used for cold outreach.
              Editing it would risk duplicate sends to two addresses for the same person. */}
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
          {renderRow("otherEmail", Mail, "Other Email", candidate.otherEmail ?? "")}
          {renderRow("phone", Phone, "Phone", candidate.phone)}
          {renderRow("location", MapPin, "Location", `${candidate.city}${candidate.state ? `, ${candidate.state}` : ""}`)}
          {renderRow("assignedTo", User, "Assigned To", candidate.assignedTo)}
          {renderRow("source", Tag, "Source", candidate.source)}
          <div className="flex items-start gap-2">
            <Calendar size={14} style={{ color: "#6c757d" }} className="mt-1" />
            <div>
              <div className="text-xs" style={{ color: "#6c757d" }}>Created</div>
              <div className="text-sm font-medium">{candidate.createdDate}</div>
            </div>
          </div>
        </div>
      </div>

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
