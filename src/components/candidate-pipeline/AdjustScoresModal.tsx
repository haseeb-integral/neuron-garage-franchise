import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PILLAR_KEYS,
  PILLAR_LABEL,
  PILLAR_DB_COL,
  PILLAR_OVERRIDE_COL,
  computeComposite,
  type PillarKey,
} from "@/lib/candidateScoring";
import type { QualificationScores } from "@/data/pipelineData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  rawScores: QualificationScores;
  currentOverrides: Partial<Record<PillarKey, number>>;
  onSaved: () => void;
}

export function AdjustScoresModal({
  open, onOpenChange, candidateId, rawScores, currentOverrides, onSaved,
}: Props) {
  const [values, setValues] = useState<QualificationScores>(rawScores);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Seed sliders with current effective values (override ?? raw)
    setValues({
      teaching: currentOverrides.teaching ?? rawScores.teaching,
      leadership: currentOverrides.leadership ?? rawScores.leadership,
      financial: currentOverrides.financial ?? rawScores.financial,
      marketFit: currentOverrides.marketFit ?? rawScores.marketFit,
      cultureFit: currentOverrides.cultureFit ?? rawScores.cultureFit,
    });
    setReason("");
  }, [open, candidateId]);

  const composite = computeComposite(values);
  const canSave = reason.trim().length >= 3 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? null;

      // Build update payload: each pillar's override col + reason + who/when + new composite
      const updates: Record<string, any> = {
        candidate_id: candidateId,
        override_reason: reason.trim(),
        override_by: email,
        override_at: new Date().toISOString(),
        composite_score: composite,
        // also ensure raw cols exist so upsert row is valid
        teaching_experience: rawScores.teaching,
        leadership: rawScores.leadership,
        financial_readiness: rawScores.financial,
        market_fit: rawScores.marketFit,
        culture_fit: rawScores.cultureFit,
      };
      for (const k of PILLAR_KEYS) {
        updates[PILLAR_OVERRIDE_COL[k]] = values[k];
      }

      const { error } = await supabase
        .from("candidate_qualification")
        .upsert(updates as any, { onConflict: "candidate_id" });
      if (error) throw error;

      // Audit one row per changed pillar
      const auditRows = PILLAR_KEYS
        .filter((k) => values[k] !== (currentOverrides[k] ?? rawScores[k]))
        .map((k) => ({
          candidate_id: candidateId,
          action: "set",
          field: PILLAR_DB_COL[k],
          old_value: currentOverrides[k] ?? rawScores[k],
          new_value: values[k],
          reason: reason.trim(),
          changed_by: email,
        }));
      if (auditRows.length > 0) {
        const { error: auditErr } = await supabase
          .from("candidate_score_overrides_history")
          .insert(auditRows);
        if (auditErr) console.error("Audit insert failed", auditErr);
      }

      toast.success("Scores adjusted");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't save adjustments", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Pillar Scores</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Overrides replace the calculated pillar score. The composite is recomputed automatically.
            A reason is required and every change is logged.
          </p>

          {PILLAR_KEYS.map((k) => {
            const v = values[k];
            const original = rawScores[k];
            const changed = v !== original;
            return (
              <div key={k} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <Label className="font-medium">{PILLAR_LABEL[k]}</Label>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums w-6 text-right">{v}</span>
                    <span className="text-xs text-muted-foreground">/ 5</span>
                    {changed && (
                      <Badge variant="secondary" className="text-[10px]">
                        was {original}
                      </Badge>
                    )}
                  </div>
                </div>
                <Slider
                  min={0}
                  max={5}
                  step={1}
                  value={[v]}
                  onValueChange={([nv]) => setValues((s) => ({ ...s, [k]: nv }))}
                />
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-medium">New composite</span>
            <span className="text-lg font-bold tabular-nums">{composite}</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="override-reason" className="text-sm">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="override-reason"
              placeholder="e.g. Demonstrated strong leadership during FDD review"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving…" : "Save adjustments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
