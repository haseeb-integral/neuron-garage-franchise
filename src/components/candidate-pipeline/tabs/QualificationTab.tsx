import { useEffect, useRef, useState } from "react";
import { Candidate, QualificationScores } from "@/data/pipelineData";
import { StarRating } from "../StarRating";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
  onScoreChange: (key: keyof QualificationScores, value: number) => void;
}

const CRITERIA: { key: keyof QualificationScores; label: string; hint?: string }[] = [
  { key: "teaching", label: "Teaching Experience" },
  { key: "leadership", label: "Leadership" },
  { key: "financial", label: "Financial Readiness", hint: "Confirm $1K initial + $15K working capital minimum" },
  { key: "marketFit", label: "Market Fit" },
  { key: "cultureFit", label: "Culture Fit" },
];

// Map between local UI keys and DB column names
const COLUMN_BY_KEY: Record<keyof QualificationScores, string> = {
  teaching: "teaching_experience",
  leadership: "leadership",
  financial: "financial_readiness",
  marketFit: "market_fit",
  cultureFit: "culture_fit",
};

const KEY_BY_COLUMN: Record<string, keyof QualificationScores> = {
  teaching_experience: "teaching",
  leadership: "leadership",
  financial_readiness: "financial",
  market_fit: "marketFit",
  culture_fit: "cultureFit",
};

function computeComposite(scores: QualificationScores): number {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return Math.round((total / 25) * 100);
}

export function QualificationTab({ candidate, onScoreChange }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const [scores, setScores] = useState<QualificationScores>(candidate.qualificationScores);
  const [composite, setComposite] = useState<number>(computeComposite(candidate.qualificationScores));
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Load from DB on mount / candidate change
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    if (!dbId) {
      setScores(candidate.qualificationScores);
      setComposite(computeComposite(candidate.qualificationScores));
      setLoaded(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("candidate_qualification")
        .select("*")
        .eq("candidate_id", dbId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Failed to load qualification", error);
        setLoaded(true);
        return;
      }
      if (data) {
        const next: QualificationScores = {
          teaching: data.teaching_experience ?? 0,
          leadership: data.leadership ?? 0,
          financial: data.financial_readiness ?? 0,
          marketFit: data.market_fit ?? 0,
          cultureFit: data.culture_fit ?? 0,
        };
        setScores(next);
        setComposite(data.composite_score ?? computeComposite(next));
        // Sync into in-memory candidate so other tabs see it
        (Object.keys(next) as (keyof QualificationScores)[]).forEach((k) => {
          if (candidate.qualificationScores[k] !== next[k]) onScoreChange(k, next[k]);
        });
      } else {
        setScores(candidate.qualificationScores);
        setComposite(computeComposite(candidate.qualificationScores));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId]);

  const handleChange = (key: keyof QualificationScores, value: number) => {
    const next = { ...scores, [key]: value };
    const newComposite = computeComposite(next);
    setScores(next);
    setComposite(newComposite);
    onScoreChange(key, value);

    if (!dbId) return;

    // Debounce save so quick clicks coalesce
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("candidate_qualification")
        .upsert(
          {
            candidate_id: dbId,
            teaching_experience: next.teaching,
            leadership: next.leadership,
            financial_readiness: next.financial,
            market_fit: next.marketFit,
            culture_fit: next.cultureFit,
            composite_score: newComposite,
          },
          { onConflict: "candidate_id" }
        );
      if (error) {
        console.error("Failed to save qualification", error);
        toast.error("Couldn't save qualification", { description: error.message });
      } else {
        toast.success("Qualification saved");
      }
    }, 500);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Composite Score</h4>
          <span className="text-2xl font-bold" style={{ color: "#003c7e" }}>{composite}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#e9ecef" }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${composite}%`,
              backgroundColor: composite >= 80 ? "#20c997" : composite >= 50 ? "#ffca28" : "#ff4438",
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 space-y-4" style={{ border: "1px solid #dee2e6" }}>
        {CRITERIA.map((c) => (
          <div key={c.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{c.label}</div>
              {c.hint && <div className="text-xs" style={{ color: "#6c757d" }}>{c.hint}</div>}
            </div>
            <StarRating
              value={scores[c.key]}
              onChange={(v) => handleChange(c.key, v)}
            />
          </div>
        ))}
        {!loaded && (
          <div className="text-xs" style={{ color: "#6c757d" }}>Loading saved scores…</div>
        )}
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: "#e7f1ff", border: "1px solid #b6d4fe" }}>
        <div className="flex items-start gap-2">
          <Sparkles size={16} style={{ color: "#003c7e" }} className="mt-0.5" />
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: "#003c7e" }}>AI Reasoning</div>
            <p className="text-sm" style={{ color: "#003c7e" }}>
              Strong teaching credentials and proven leadership in elementary settings. Financial profile meets minimums but recommend confirming working capital reserves before FDD. Market analysis shows favorable demand in target territory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
