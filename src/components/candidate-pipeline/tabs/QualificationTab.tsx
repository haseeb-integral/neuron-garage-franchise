import { useEffect, useRef, useState } from "react";
import { Candidate, QualificationScores } from "@/data/pipelineData";
import { StarRating } from "../StarRating";
import { Sparkles, SlidersHorizontal, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isEnabled } from "@/lib/featureFlags";
import {
  PILLAR_KEYS,
  PILLAR_OVERRIDE_COL,
  PILLAR_DB_COL,
  computeComposite,
  getEffectivePillarScores,
  type PillarKey,
} from "@/lib/candidateScoring";
import { AdjustScoresModal } from "../AdjustScoresModal";

interface Props {
  candidate: Candidate;
  onScoreChange: (key: keyof QualificationScores, value: number) => void;
  onScoresReplace?: (scores: QualificationScores) => void;
}

const CRITERIA: { key: keyof QualificationScores; label: string; hint?: string }[] = [
  { key: "teaching", label: "Teaching Experience" },
  { key: "leadership", label: "Leadership" },
  { key: "financial", label: "Ability to Invest in Neuron Garage", hint: "Confirm $1K initial + $15K working capital minimum" },
  { key: "marketFit", label: "Market Fit" },
  { key: "cultureFit", label: "Culture Fit" },
];

export function QualificationTab({ candidate, onScoreChange, onScoresReplace }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const overrideEnabled = isEnabled("FF_SCORE_OVERRIDE");

  const [scores, setScores] = useState<QualificationScores>(candidate.qualificationScores);
  const [overrides, setOverrides] = useState<Partial<Record<PillarKey, number>>>({});
  const [composite, setComposite] = useState<number>(computeComposite(candidate.qualificationScores));
  const [loaded, setLoaded] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const saveTimer = useRef<number | null>(null);

  const isAdjusted = Object.keys(overrides).length > 0;
  const adjustedKeys = new Set(
    PILLAR_KEYS.filter((k) => overrides[k] !== undefined && overrides[k] !== scores[k])
  );

  // Load from DB on mount / candidate change / after override save
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    if (!dbId) {
      setScores(candidate.qualificationScores);
      setOverrides({});
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
        const ovs: Partial<Record<PillarKey, number>> = {};
        for (const k of PILLAR_KEYS) {
          const v = (data as any)[PILLAR_OVERRIDE_COL[k]];
          if (v !== null && v !== undefined) ovs[k] = v as number;
        }
        setOverrides(ovs);
        setComposite(eff.composite);
        // Sync effective scores into in-memory candidate so other tabs/badge see them — batched in one update
        const needsSync = (Object.keys(eff.effective) as (keyof QualificationScores)[])
          .some((k) => candidate.qualificationScores[k] !== eff.effective[k]);
        if (needsSync) {
          if (onScoresReplace) onScoresReplace(eff.effective);
          else (Object.keys(eff.effective) as (keyof QualificationScores)[]).forEach((k) => {
            if (candidate.qualificationScores[k] !== eff.effective[k]) onScoreChange(k, eff.effective[k]);
          });
        }
      } else {
        setScores(candidate.qualificationScores);
        setOverrides({});
        setComposite(computeComposite(candidate.qualificationScores));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId, reloadKey]);

  const handleChange = (key: keyof QualificationScores, value: number) => {
    const next = { ...scores, [key]: value };
    setScores(next);
    // Editing a star clears any override on that pillar — the new raw value becomes the truth.
    const nextOverrides = { ...overrides };
    const hadOverride = nextOverrides[key as PillarKey] !== undefined;
    if (hadOverride) delete nextOverrides[key as PillarKey];
    setOverrides(nextOverrides);

    const effective: QualificationScores = { ...next };
    for (const k of PILLAR_KEYS) {
      if (nextOverrides[k] !== undefined) effective[k] = nextOverrides[k] as number;
    }
    const newComposite = computeComposite(effective);
    setComposite(newComposite);
    onScoreChange(key, effective[key]);

    if (!dbId) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const payload: Record<string, any> = {
        candidate_id: dbId,
        teaching_experience: next.teaching,
        leadership: next.leadership,
        financial_readiness: next.financial,
        market_fit: next.marketFit,
        culture_fit: next.cultureFit,
        composite_score: newComposite,
      };
      if (hadOverride) {
        payload[PILLAR_OVERRIDE_COL[key as PillarKey]] = null;
      }
      const { error } = await supabase
        .from("candidate_qualification")
        .upsert(payload as any, { onConflict: "candidate_id" });
      if (error) {
        console.error("Failed to save qualification", error);
        toast.error("Couldn't save qualification", { description: error.message });
      } else {
        toast.success("Qualification saved");
      }
    }, 500);
  };


  const handleReset = async () => {
    if (!dbId || !isAdjusted) return;
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email ?? null;

    const newComposite = computeComposite(scores);
    const { error } = await supabase
      .from("candidate_qualification")
      .update({
        teaching_experience_override: null,
        leadership_override: null,
        financial_readiness_override: null,
        market_fit_override: null,
        culture_fit_override: null,
        override_reason: null,
        override_by: email,
        override_at: new Date().toISOString(),
        composite_score: newComposite,
      } as any)
      .eq("candidate_id", dbId);

    if (error) {
      toast.error("Couldn't reset adjustments", { description: error.message });
      return;
    }

    // Audit: one reset row per pillar that had an override
    const auditRows = PILLAR_KEYS
      .filter((k) => overrides[k] !== undefined)
      .map((k) => ({
        candidate_id: dbId,
        action: "reset",
        field: PILLAR_DB_COL[k],
        old_value: overrides[k] ?? null,
        new_value: scores[k],
        reason: null,
        changed_by: email,
      }));
    if (auditRows.length > 0) {
      await supabase.from("candidate_score_overrides_history").insert(auditRows);
    }

    toast.success("Reset to calculated scores");
    setReloadKey((k) => k + 1);
  };

  // What we display per pillar = override if present, else raw
  const displayValue = (k: keyof QualificationScores): number =>
    overrides[k as PillarKey] !== undefined ? (overrides[k as PillarKey] as number) : scores[k];

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Composite Score</h4>
            {isAdjusted && (
              <Badge variant="secondary" className="text-[10px]">Adjusted</Badge>
            )}
          </div>
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
        {overrideEnabled && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdjustOpen(true)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              Adjust Scores
            </Button>
            {isAdjusted && (
              <Button size="sm" variant="ghost" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset to calculated
              </Button>
            )}
          </div>
        )}

      </div>

      <div className="bg-white rounded-lg p-4 space-y-4" style={{ border: "1px solid #dee2e6" }}>
        {CRITERIA.map((c) => (
          <div key={c.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <div className="text-sm font-medium">{c.label}</div>
                {c.hint && <div className="text-xs" style={{ color: "#6c757d" }}>{c.hint}</div>}
              </div>
              {adjustedKeys.has(c.key as PillarKey) && (
                <Badge variant="secondary" className="text-[10px]">Adjusted</Badge>
              )}
            </div>
            <StarRating
              value={displayValue(c.key)}
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

      {overrideEnabled && dbId && (
        <AdjustScoresModal
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          candidateId={dbId}
          rawScores={scores}
          currentOverrides={overrides}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}

    </div>
  );
}
