import { useEffect, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  candidate: Candidate;
}

const stageLabels: Record<string, string> = {
  new_lead: "New Lead",
  initial_qualification: "Initial Qualification",
  business_overview: "Business Overview",
  fdd_review: "FDD Review",
  immersion: "Immersion",
  confirmation: "Confirmation",
  signing: "Signing",
  disqualified: "Disqualified",
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).replace(",", " ·");
};

export function StageHistoryTab({ candidate }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!dbId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("candidate_stage_history")
        .select("*")
        .eq("candidate_id", dbId)
        .order("changed_at", { ascending: false });
      if (cancelled) return;
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dbId]);

  return (
    <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #e3e8ef" }}>
      <h4 className="font-semibold text-sm mb-3" style={{ color: "#003c7e" }}>Stage History</h4>
      {loading ? (
        <p className="text-xs" style={{ color: "#6c757d" }}>Loading…</p>
      ) : !rows.length ? (
        <p className="text-xs" style={{ color: "#6c757d" }}>No stage changes recorded yet.</p>
      ) : (
      <ol className="relative border-l border-border ml-3 space-y-5">
        {rows.map((r) => (
          <li key={r.id} className="ml-4">
            <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            <div className="text-xs text-muted-foreground">{fmtDate(r.changed_at)}</div>
            <div className="mt-0.5 text-sm font-medium" style={{ color: "#003c7e" }}>
              {r.from_stage ? stageLabels[r.from_stage] ?? r.from_stage : "—"}
              {" → "}
              {stageLabels[r.to_stage] ?? r.to_stage}
            </div>
            {r.changed_by && (
              <div className="text-xs text-muted-foreground mt-0.5">by {r.changed_by}</div>
            )}
            {r.notes && (
              <div className="text-sm mt-1 text-foreground/80">{r.notes}</div>
            )}
          </li>
        ))}
      </ol>
      )}
    </div>
  );
}
