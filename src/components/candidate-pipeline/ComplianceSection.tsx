import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, ChevronDown, ChevronRight, AlertTriangle, Lock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { CandidateFileDropzone, type CandidateFileRow } from "./CandidateFileDropzone";
import type { StageId } from "@/data/pipelineData";
import { isEnabled } from "@/lib/featureFlags";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import {
  FDD_WAIT_DAYS,
  daysRemaining,
  earliestSigningDate,
  fddEffectiveDate,
  formatDay,
  signingTooEarly,
} from "@/lib/fddCompliance";
import { buildCompliancePacketPdf } from "./compliancePacketPdf";


interface ComplianceRow {
  candidate_id: string;
  fdd_sent_at: string | null;
  fdd_received_at: string | null;
  fa_signed_at: string | null;
  fdd_proof_file_id: string | null;
  fa_proof_file_id: string | null;
  compliance_override: boolean;
  override_reason: string | null;
  override_by: string | null;
  override_at: string | null;
}

interface AuditRow {
  id: string;
  field: string;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  changed_at: string;
}

interface Props {
  candidateDbId: string;
  stage: StageId;
}

function toLocalDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromDateInput(v: string): string | null {
  if (!v) return null;
  return new Date(v + "T12:00:00").toISOString();
}

/**
 * FDD / FA compliance tracker with the 16-day waiting-period guardrail.
 * Reads/writes `candidate_compliance`; audit rows written by DB trigger.
 */
export function ComplianceSection({ candidateDbId, stage }: Props) {
  if (!isEnabled("FF_COMPLIANCE")) return null;
  if (stage !== "fdd_review" && stage !== "signing") return null;
  return <ComplianceSectionInner candidateDbId={candidateDbId} stage={stage} />;
}

function ComplianceSectionInner({ candidateDbId }: Props) {
  const { isAdmin } = useIsManager();

  const [row, setRow] = useState<ComplianceRow | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  // proof files, reported by the two dropzones
  const [fddProofFiles, setFddProofFiles] = useState<CandidateFileRow[]>([]);
  const [faProofFiles, setFaProofFiles] = useState<CandidateFileRow[]>([]);

  // local form state
  const [fddSent, setFddSent] = useState("");
  const [fddReceived, setFddReceived] = useState("");
  const [faSigned, setFaSigned] = useState("");
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase
        .from("candidate_compliance")
        .select("*")
        .eq("candidate_id", candidateDbId)
        .maybeSingle(),
      supabase
        .from("candidate_compliance_audit")
        .select("*")
        .eq("candidate_id", candidateDbId)
        .order("changed_at", { ascending: false })
        .limit(50),
    ]);
    const cur = (r as ComplianceRow | null) ?? null;
    setRow(cur);
    setAudit((a ?? []) as AuditRow[]);
    setFddSent(toLocalDateInput(cur?.fdd_sent_at ?? null));
    setFddReceived(toLocalDateInput(cur?.fdd_received_at ?? null));
    setFaSigned(toLocalDateInput(cur?.fa_signed_at ?? null));
    setOverride(cur?.compliance_override ?? false);
    setOverrideReason(cur?.override_reason ?? "");
    setLoading(false);
  }, [candidateDbId]);

  useEffect(() => { void load(); }, [load]);

  const dirty =
    toLocalDateInput(row?.fdd_sent_at ?? null) !== fddSent ||
    toLocalDateInput(row?.fdd_received_at ?? null) !== fddReceived ||
    toLocalDateInput(row?.fa_signed_at ?? null) !== faSigned ||
    (row?.compliance_override ?? false) !== override ||
    (row?.override_reason ?? "") !== overrideReason;

  const sentIso = fromDateInput(fddSent);
  const receivedIso = fromDateInput(fddReceived);
  const signedIso = fromDateInput(faSigned);

  const effective = useMemo(() => fddEffectiveDate(sentIso, receivedIso), [sentIso, receivedIso]);
  const earliest = useMemo(() => earliestSigningDate(sentIso, receivedIso), [sentIso, receivedIso]);
  const remaining = useMemo(() => daysRemaining(sentIso, receivedIso), [sentIso, receivedIso]);
  const tooEarly = signingTooEarly(sentIso, receivedIso, signedIso);

  // Legacy rows: a date already on file with no proof attached.
  const legacyFddProofMissing = !!row?.fdd_sent_at && fddProofFiles.length === 0;
  const legacyFaProofMissing = !!row?.fa_signed_at && faProofFiles.length === 0;

  const handleSave = async () => {
    if (override && !overrideReason.trim()) {
      toast.error("Override requires a reason");
      return;
    }
    if (override && !isAdmin) {
      toast.error("Only an admin can turn on the compliance override");
      return;
    }
    // Proof is required for a NEW date (legacy rows keep working).
    const newFddDate = fddSent && !row?.fdd_sent_at;
    if (newFddDate && fddProofFiles.length === 0) {
      toast.error("Proof required", {
        description: "Upload the screenshot or PDF of the FDD email before saving the FDD sent date.",
      });
      return;
    }
    const newFaDate = faSigned && !row?.fa_signed_at;
    if (newFaDate && faProofFiles.length === 0) {
      toast.error("Proof required", {
        description: "Upload the signed franchise agreement before saving the signing date.",
      });
      return;
    }
    if (tooEarly && !override) {
      toast.error("16-day FDD waiting period", {
        description: `Earliest allowed signing date is ${formatDay(earliest)}.`,
      });
      return;
    }

    setSaving(true);
    const payload = {
      candidate_id: candidateDbId,
      fdd_sent_at: sentIso,
      fdd_received_at: receivedIso,
      fa_signed_at: signedIso,
      fdd_proof_file_id: fddProofFiles[0]?.id ?? null,
      fa_proof_file_id: faProofFiles[0]?.id ?? null,
      compliance_override: override,
      override_reason: override ? overrideReason.trim() : null,
    };
    const { error } = await supabase
      .from("candidate_compliance")
      .upsert(payload, { onConflict: "candidate_id" });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save compliance", { description: error.message });
      return;
    }
    toast.success("Compliance saved");
    void load();
  };

  const [exporting, setExporting] = useState(false);
  const handleExportPacket = async () => {
    setExporting(true);
    try {
      const [{ data: cand }, { data: files }, { data: sess }] = await Promise.all([
        supabase
          .from("candidates")
          .select("first_name, last_name, email")
          .eq("id", candidateDbId)
          .maybeSingle(),
        supabase
          .from("candidate_files")
          .select("file_name, category, uploaded_by_email, created_at")
          .eq("candidate_id", candidateDbId)
          .in("category", ["fdd_proof", "fa_proof"])
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      const name = [cand?.first_name, cand?.last_name].filter(Boolean).join(" ") || "Unknown candidate";
      const pdf = buildCompliancePacketPdf({
        candidateName: name,
        candidateEmail: cand?.email ?? null,
        compliance: row,
        audit: audit.map((a) => ({
          field: a.field,
          old_value: a.old_value,
          new_value: a.new_value,
          changed_by: a.changed_by,
          changed_at: a.changed_at,
        })),
        proofFiles: (files ?? []) as any[],
        generatedBy: sess?.user?.email ?? null,
      });
      pdf.save(`compliance-packet-${name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch (e: any) {
      toast.error("Couldn't build the packet", { description: e?.message });
    } finally {
      setExporting(false);
    }
  };



  const fmtVal = (v: any) => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "on" : "off";
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return new Date(v).toLocaleDateString();
    }
    return String(v);
  };

  return (
    <div className="bg-white rounded-lg p-4 space-y-4" style={{ border: "1px solid #dee2e6" }}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} style={{ color: "#003c7e" }} />
        <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>FDD &amp; Agreement Compliance</h4>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-7 text-xs"
          onClick={handleExportPacket}
          disabled={exporting}
        >
          <Download size={12} className="mr-1" />
          {exporting ? "Building…" : "Compliance Packet"}
        </Button>
      </div>


      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">FDD sent date</label>
              <Input
                type="date"
                value={fddSent}
                onChange={(e) => setFddSent(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Day 1 of the waiting period.</p>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">FDD received / acknowledged</label>
              <Input
                type="date"
                value={fddReceived}
                onChange={(e) => setFddReceived(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Optional. Clock uses the later date.</p>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Franchise agreement signed</label>
              <Input
                type="date"
                value={faSigned}
                min={earliest && !override ? toLocalDateInput(earliest.toISOString()) : undefined}
                onChange={(e) => setFaSigned(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Countdown / status */}
          <div
            className="rounded-md border p-3 text-xs flex items-start gap-2"
            style={{ borderColor: "#dee2e6", background: "#f7faff" }}
          >
            <Lock size={13} className="mt-0.5" style={{ color: "#174be8" }} />
            <div className="space-y-0.5">
              <div className="font-medium">
                {FDD_WAIT_DAYS}-day waiting period (FTC minimum is 14 full days; we use {FDD_WAIT_DAYS} to be safe)
              </div>
              {effective ? (
                <>
                  <div>Clock starts: <strong>{formatDay(effective)}</strong> (day 1)</div>
                  <div>Earliest signing date: <strong>{formatDay(earliest)}</strong></div>
                  <div>
                    {remaining === 0
                      ? "Waiting period complete."
                      : `${remaining} day${remaining === 1 ? "" : "s"} remaining.`}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No FDD date on file yet.</div>
              )}
            </div>
          </div>

          {tooEarly && (
            <div className="rounded-md border p-3 text-xs flex items-start gap-2 bg-red-50" style={{ borderColor: "#fecaca" }}>
              <AlertTriangle size={13} className="mt-0.5 text-red-600" />
              <div className="text-red-700">
                This signing date is inside the waiting period. Earliest allowed date is{" "}
                <strong>{formatDay(earliest)}</strong>. Saving is blocked unless an admin turns on the override.
              </div>
            </div>
          )}

          {(legacyFddProofMissing || legacyFaProofMissing) && (
            <div className="rounded-md border p-3 text-xs bg-amber-50" style={{ borderColor: "#ffe5b4" }}>
              Legacy record — proof file missing for{" "}
              {[legacyFddProofMissing ? "FDD sent date" : null, legacyFaProofMissing ? "signing date" : null]
                .filter(Boolean)
                .join(" and ")}
              . Please upload it below so the audit trail is complete.
            </div>
          )}

          <div className="rounded-md border p-3 space-y-2 bg-amber-50/40" style={{ borderColor: "#ffe5b4" }}>
            <label className={`flex items-center gap-2 ${isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
              <Checkbox checked={override} disabled={!isAdmin} onCheckedChange={(v) => setOverride(!!v)} />
              <span className="text-sm font-medium">Compliance override (skip the waiting-period block)</span>
            </label>
            {!isAdmin && (
              <p className="text-[11px] text-muted-foreground">Admins only.</p>
            )}
            {override && (
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)…"
                className="text-sm min-h-[60px]"
              />
            )}
            {row?.override_by && row.compliance_override && (
              <div className="text-[11px] text-muted-foreground">
                Set by {row.override_by}
                {row.override_at ? ` · ${formatDistanceToNow(new Date(row.override_at), { addSuffix: true })}` : ""}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: "#dee2e6" }}>
            <div>
              <div className="text-xs font-medium mb-1">
                FDD proof of delivery <span className="text-red-600">*</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">
                Screenshot or PDF of the email you sent the FDD from, showing the date.
              </p>
              <CandidateFileDropzone
                candidateDbId={candidateDbId}
                category="fdd_proof"
                filterCategory="fdd_proof"
                compact
                onFilesChange={setFddProofFiles}
              />
            </div>
            <div>
              <div className="text-xs font-medium mb-1">
                FA signed copy <span className="text-red-600">*</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">
                Signed franchise agreement showing the signature date.
              </p>
              <CandidateFileDropzone
                candidateDbId={candidateDbId}
                category="fa_proof"
                filterCategory="fa_proof"
                compact
                onFilesChange={setFaProofFiles}
              />
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: "#dee2e6" }}>
            <button
              type="button"
              onClick={() => setAuditOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {auditOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Audit log ({audit.length})
            </button>
            {auditOpen && (
              audit.length === 0 ? (
                <p className="text-xs text-muted-foreground italic mt-2">No changes yet.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {audit.map((a) => (
                    <li key={a.id} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{a.field}</span>:{" "}
                      {fmtVal(a.old_value)} → {fmtVal(a.new_value)}
                      {a.changed_by ? ` · ${a.changed_by}` : ""}
                      {` · ${formatDistanceToNow(new Date(a.changed_at), { addSuffix: true })}`}
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
