import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { redFlagLabels } from "@/lib/candidateStepSignals";

interface Props {
  candidateDbId?: string;
}

interface StepFlags {
  step: number;
  labels: string[];
}

/** Read-only rollup of red flags recorded across the Qualification Process steps. */
export function RedFlagsSummary({ candidateDbId }: Props) {
  const [flags, setFlags] = useState<StepFlags[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!candidateDbId) {
      setLoaded(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("candidate_process_steps")
        .select("step_number, data")
        .eq("candidate_id", candidateDbId);
      if (cancelled) return;
      if (error) {
        setLoaded(true);
        return;
      }
      const next = (data ?? [])
        .map((r) => ({ step: r.step_number, labels: redFlagLabels(r.data as any) }))
        .filter((r) => r.labels.length > 0)
        .sort((a, b) => a.step - b.step);
      setFlags(next);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateDbId]);

  if (!loaded) return null;

  const total = flags.reduce((n, f) => n + f.labels.length, 0);

  return (
    <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} style={{ color: total > 0 ? "#c0392b" : "#526078" }} />
        <h4 className="font-semibold text-sm" style={{ color: "#07142f" }}>Signals & Red Flags</h4>
      </div>
      {total === 0 ? (
        <div className="text-sm" style={{ color: "#8893a7" }}>No red flags recorded</div>
      ) : (
        <>
          <div className="text-sm font-medium mb-1.5" style={{ color: "#c0392b" }}>
            Red flags: {total} across {flags.length} step{flags.length === 1 ? "" : "s"}
          </div>
          <ul className="space-y-0.5">
            {flags.map((f) => (
              <li key={f.step} className="text-xs" style={{ color: "#526078" }}>
                <strong style={{ color: "#07142f" }}>Step {f.step}:</strong> {f.labels.join(", ")}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
