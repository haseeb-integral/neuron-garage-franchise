import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("candidate_compliance")
      .select("fdd_sent_at, fdd_received_at")
      .eq("candidate_id", candidateDbId)
      .maybeSingle();
    setReceived(data?.fdd_received_at ?? null);
    setValue(toDateInput(data?.fdd_sent_at ?? null) || (fallbackDate ?? ""));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateDbId]);

  useEffect(() => { void load(); }, [load]);

  const save = async (next: string) => {
    setValue(next);
    setSaving(true);
    const { error } = await supabase
      .from("candidate_compliance")
      .upsert(
        { candidate_id: candidateDbId, fdd_sent_at: fromDateInput(next) },
        { onConflict: "candidate_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Couldn't save the FDD sent date", { description: error.message });
      return;
    }
    onMirror?.(next);
    toast.success(next ? "FDD sent date saved" : "FDD sent date cleared");
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
      <div className="text-[11px] mt-1" style={{ color: "#8893a7" }}>
        Upload the proof of sending above, then enter the date here. This is the same date the
        compliance lock uses — signing cannot happen until 16 days after it.
      </div>
      {earliest && (
        <div className="rounded-md p-2 mt-2 text-xs" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
          Earliest signing date: <strong>{formatDay(earliest)}</strong> (FDD sent + 16 days)
        </div>
      )}
    </div>
  );
}
