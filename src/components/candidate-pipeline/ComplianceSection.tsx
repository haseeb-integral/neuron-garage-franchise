import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { CandidateFileDropzone } from "./CandidateFileDropzone";
import type { StageId } from "@/data/pipelineData";
import { isEnabled } from "@/lib/featureFlags";

interface ComplianceRow {
  candidate_id: string;
  fdd_sent_at: string | null;
  fa_signed_at: string | null;
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
  return new Date(iso).toISOString().slice(0, 10);
}

function fromDateInput(v: string): string | null {
  if (!v) return null;
  return new Date(v + "T12:00:00").toISOString();
}

/**
 * Phase C1: FDD / FA compliance tracker (no gating yet).
 * Reads/writes `candidate_compliance`; audit rows written by DB trigger.
 */
export function ComplianceSection({ candidateDbId, stage }: Props) {
  if (!isEnabled("FF_COMPLIANCE")) return null;
  if (stage !== "fdd_review" && stage !== "signing") return null;

  const [row, setRow] = useState<ComplianceRow | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  // local form state
  const [fddSent, setFddSent] = useState("");
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
    setFaSigned(toLocalDateInput(cur?.fa_signed_at ?? null));
    setOverride(cur?.compliance_override ?? false);
    setOverrideReason(cur?.override_reason ?? "");
    setLoading(false);
  }, [candidateDbId]);

  useEffect(() => { void load(); }, [load]);

  const dirty =
    toLocalDateInput(row?.fdd_sent_at ?? null) !== fddSent ||
    toLocalDateInput(row?.fa_signed_at ?? null) !== faSigned ||
    (row?.compliance_override ?? false) !== override ||
    (row?.override_reason ?? "") !== overrideReason;

  const handleSave = async () => {
    if (override && !overrideReason.trim()) {
      toast.error("Override requires a reason");
      return;
    }
    setSaving(true);
    const payload = {
      candidate_id: candidateDbId,
      fdd_sent_at: fromDateInput(fddSent),
      fa_signed_at: fromDateInput(faSigned),
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
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">FDD sent date</label>
              <Input
                type="date"
                value={fddSent}
                onChange={(e) => setFddSent(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Franchise agreement signed</label>
              <Input
                type="date"
                value={faSigned}
                onChange={(e) => setFaSigned(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2 bg-amber-50/40" style={{ borderColor: "#ffe5b4" }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={override} onCheckedChange={(v) => setOverride(!!v)} />
              <span className="text-sm font-medium">Compliance override (skip stage gates)</span>
            </label>
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
              <div className="text-xs font-medium mb-1">FDD proof of delivery</div>
              <CandidateFileDropzone
                candidateDbId={candidateDbId}
                category="fdd_proof"
                filterCategory="fdd_proof"
                compact
              />
            </div>
            <div>
              <div className="text-xs font-medium mb-1">FA signed copy</div>
              <CandidateFileDropzone
                candidateDbId={candidateDbId}
                category="fa_proof"
                filterCategory="fa_proof"
                compact
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
