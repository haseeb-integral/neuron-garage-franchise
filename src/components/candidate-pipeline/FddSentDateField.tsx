import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { earliestSigningDate, formatDay } from "@/lib/fddCompliance";

interface Props {
  candidateDbId: string;
  /** Legacy value stored on the process step row, used only as a fallback. */
  fallbackDate?: string;
  /** Mirror the value back into the process step row so old readers stay in sync. */
  onMirror?: (value: string) => void;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromDateInput(v: string): string | null {
  if (!v) return null;
  return new Date(v + "T12:00:00").toISOString();
}

/**
 * Step 4 "FDD sent date" — writes straight to `candidate_compliance.fdd_sent_at`,
 * which is the single source the 16-day signing lock reads from.
 */
export function FddSentDateField({ candidateDbId, fallbackDate, onMirror }: Props) {
  const [value, setValue] = useState("");
  const [received, setReceived] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionId, setVersionId] = useState<string>("");
  const [versions, setVersions] = useState<{ id: string; file_name: string; fdd_issuance_date: string | null; created_at: string }[]>([]);
  const [log, setLog] = useState<{ event: string; at: string; actor_email: string | null; fdd_file_id: string | null }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("candidate_compliance")
      .select("fdd_sent_at, fdd_received_at, fdd_file_id")
      .eq("candidate_id", candidateDbId)
      .maybeSingle();
    const [{ data: v }, { data: ev }] = await Promise.all([
      supabase.from("portal_step_files").select("id, file_name, fdd_issuance_date, created_at").eq("is_fdd", true).order("created_at", { ascending: false }),
      supabase.from("fdd_delivery_events").select("event, at, actor_email, fdd_file_id").eq("candidate_id", candidateDbId).order("at", { ascending: false }).limit(50),
    ]);
    setVersions(v ?? []);
    setLog(ev ?? []);
    setVersionId(data?.fdd_file_id ?? "");
    setReceived(data?.fdd_received_at ?? null);
    setValue(toDateInput(data?.fdd_sent_at ?? null) || (fallbackDate ?? ""));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateDbId]);

  useEffect(() => { void load(); }, [load]);

  const save = async (next: string, ver = versionId) => {
    setValue(next);
    setVersionId(ver);
    setSaving(true);
    // With a version picked, log it in the permanent FDD delivery log; otherwise just save the date.
    const { error } = next && ver
      ? await supabase.rpc("log_fdd_emailed", { _candidate_id: candidateDbId, _fdd_file_id: ver, _sent_at: fromDateInput(next)! })
      : await supabase
          .from("candidate_compliance")
          .upsert({ candidate_id: candidateDbId, fdd_sent_at: fromDateInput(next) }, { onConflict: "candidate_id" });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save the FDD sent date", { description: error.message });
      return;
    }
    onMirror?.(next);
    toast.success(next ? (ver ? "FDD sent date and version logged" : "FDD sent date saved") : "FDD sent date cleared");
    void load();
  };

  const earliest = earliestSigningDate(fromDateInput(value), received);

  return (
    <div className="mt-3 rounded-md p-3" style={{ backgroundColor: "#f7faff", border: "1px solid #dee2e6" }}>
      <Label className="text-xs" style={{ color: "#07142f" }}>FDD sent date</Label>
      <Input
        type="date"
        value={value}
        disabled={loading || saving}
        onChange={(e) => void save(e.target.value)}
        className="mt-1 text-sm max-w-[220px]"
      />
      <Label className="text-xs mt-3 block" style={{ color: "#07142f" }}>FDD version sent</Label>
      <select
        className="mt-1 h-9 w-full max-w-md rounded-md border border-input bg-background px-2 text-sm"
        value={versionId}
        disabled={loading || saving}
        onChange={(e) => void save(value, e.target.value)}
      >
        <option value="">{versions.length ? "Pick the FDD version you emailed" : "No FDD uploaded in Portal files yet"}</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            Issued {v.fdd_issuance_date ? new Date(v.fdd_issuance_date + "T12:00:00").toLocaleDateString("en-US") : "(date not recorded)"} · {v.file_name}
          </option>
        ))}
      </select>
      {value && !versionId && (
        <div className="text-[11px] mt-1 font-semibold" style={{ color: "#b45309" }}>Version not recorded — pick the FDD version so the audit trail is complete.</div>
      )}
      <div className="text-[11px] mt-1" style={{ color: "#8893a7" }}>
        Upload the proof of sending above, then enter the date here. This is the same date the
        compliance lock uses — signing cannot happen until 16 days after it.
      </div>
      {log.length > 0 && (
        <details className="mt-2 text-[11px]" style={{ color: "#526078" }}>
          <summary className="cursor-pointer font-semibold">FDD delivery log ({log.length})</summary>
          <ul className="mt-1 space-y-0.5 pl-4 list-disc">
            {log.map((e, i) => {
              const v = versions.find((x) => x.id === e.fdd_file_id);
              const label = { made_available: "Made available in portal", downloaded: "Downloaded by prospect", emailed: "Emailed by staff", receipt_signed: "Item 23 receipt signed" }[e.event] ?? e.event;
              return <li key={i}>{new Date(e.at).toLocaleString()} — {label}{v?.fdd_issuance_date ? ` · FDD issued ${new Date(v.fdd_issuance_date + "T12:00:00").toLocaleDateString("en-US")}` : ""}{e.actor_email ? ` · ${e.actor_email}` : ""}</li>;
            })}
          </ul>
        </details>
      )}
      {earliest && (
        <div className="rounded-md p-2 mt-2 text-xs" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
          Earliest signing date: <strong>{formatDay(earliest)}</strong> (FDD sent + 16 days)
        </div>
      )}
    </div>
  );
}
