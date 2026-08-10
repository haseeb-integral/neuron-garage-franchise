import { useEffect, useRef, useState } from "react";
import { Candidate, QualificationScores } from "@/data/pipelineData";
import { StarRating } from "./StarRating";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { computeComposite, getEffectivePillarScores } from "@/lib/candidateScoring";

interface Props {
  candidate: Candidate;
  onScoresReplace?: (scores: QualificationScores) => void;
}

const CRITERIA: { key: keyof QualificationScores; label: string }[] = [
  { key: "teaching", label: "Responsiveness" },
  { key: "leadership", label: "Experience with Elementary Age Children" },
  { key: "financial", label: "Ability & Willingness to Follow Our Process" },
  { key: "marketFit", label: "Philosophical Alignment" },
  { key: "cultureFit", label: "Market Fit" },
];

export function QualificationSection({ candidate, onScoresReplace }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;

  const [scores, setScores] = useState<QualificationScores>(candidate.qualificationScores);
  const [composite, setComposite] = useState<number>(computeComposite(candidate.qualificationScores));
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());

  const upsertPayload = (s: QualificationScores) => ({
    candidate_id: dbId,
    teaching_experience: s.teaching,
    leadership: s.leadership,
    financial_readiness: s.financial,
    market_fit: s.marketFit,
    culture_fit: s.cultureFit,
  });

  const saveNotes = async (next: Record<string, string>) => {
    setNotes(next);
    if (!dbId) return;
    const { error } = await supabase
      .from("candidate_qualification")
      .upsert({ ...upsertPayload(scores), pillar_notes: next } as any, { onConflict: "candidate_id" });
    if (error) {
      console.error("Failed to save note", error);
      toast.error("Couldn't save note", { description: error.message });
    }
  };

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
        const eff = getEffectivePillarScores(data as any);
        setScores(eff.raw);
        setComposite(computeComposite(eff.raw));
        setNotes(((data as any).pillar_notes ?? {}) as Record<string, string>);
        const needsSync = (Object.keys(eff.raw) as (keyof QualificationScores)[])
          .some((k) => candidate.qualificationScores[k] !== eff.raw[k]);
        if (needsSync) onScoresReplace?.(eff.raw);
      } else {
        setScores(candidate.qualificationScores);
        setNotes({});
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
    setScores(next);
    const newComposite = computeComposite(next);
    setComposite(newComposite);
    onScoresReplace?.(next);

    if (!dbId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("candidate_qualification")
        .upsert({ ...upsertPayload(next), composite_score: newComposite } as any, { onConflict: "candidate_id" });
      if (error) {
        console.error("Failed to save qualification", error);
        toast.error("Couldn't save qualification", { description: error.message });
      } else {
        toast.success("Qualification saved");
      }
    }, 500);
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm" style={{ color: "#07142f" }}>Composite Score</h4>
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

      <div className="bg-white rounded-lg p-3 space-y-4" style={{ border: "1px solid #e3e8ef" }}>
        {CRITERIA.map((c) => {
          const noteVal = notes[c.key] ?? "";
          const open = openNotes.has(c.key as string);
          return (
            <div key={c.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{c.label}</div>
                <StarRating value={scores[c.key]} onChange={(v) => handleChange(c.key, v)} />
              </div>

              {open ? (
                <Textarea
                  autoFocus
                  rows={2}
                  placeholder="Why this rating?"
                  className="text-sm"
                  value={noteVal}
                  onChange={(e) => setNotes((n) => ({ ...n, [c.key]: e.target.value }))}
                  onBlur={() => {
                    saveNotes({ ...notes, [c.key]: noteVal });
                    setOpenNotes((s) => {
                      const nextSet = new Set(s);
                      nextSet.delete(c.key as string);
                      return nextSet;
                    });
                  }}
                />
              ) : noteVal.trim() ? (
                <button
                  type="button"
                  className="flex items-start gap-1.5 text-left text-xs hover:underline"
                  style={{ color: "#6c757d" }}
                  onClick={() => setOpenNotes((s) => new Set(s).add(c.key as string))}
                >
                  <Pencil size={12} className="mt-0.5 shrink-0" />
                  <span>{noteVal}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="text-xs hover:underline"
                  style={{ color: "#003c7e" }}
                  onClick={() => setOpenNotes((s) => new Set(s).add(c.key as string))}
                >
                  + Add note
                </button>
              )}
            </div>
          );
        })}
        {!loaded && <div className="text-xs" style={{ color: "#6c757d" }}>Loading saved scores…</div>}
      </div>
    </div>
  );
}
