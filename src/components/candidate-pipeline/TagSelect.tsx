import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FIT_TAGS, FitTag, coerceFitTag } from "@/constants/fitTags";

/** Broadcast so the Kanban card updates without a full reload. */
export const CANDIDATE_TAG_EVENT = "candidate-tag-changed";

interface Props {
  candidateDbId?: string;
  value?: string;
}

export function TagSelect({ candidateDbId, value }: Props) {
  const [tag, setTag] = useState<FitTag>(coerceFitTag(value));
  const [saving, setSaving] = useState(false);

  const save = async (next: FitTag) => {
    const prev = tag;
    setTag(next);
    if (!candidateDbId) return;
    setSaving(true);
    const { error } = await supabase
      .from("candidates")
      .update({ fit_tag: next })
      .eq("id", candidateDbId);
    setSaving(false);
    if (error) {
      setTag(prev);
      toast.error("Could not save the tag");
      return;
    }
    window.dispatchEvent(
      new CustomEvent(CANDIDATE_TAG_EVENT, { detail: { dbId: candidateDbId, tag: next } }),
    );
  };

  return (
    <div>
      <div className="text-xs mb-1" style={{ color: "#526078" }}>Tag</div>
      <Select value={tag} onValueChange={(v) => save(v as FitTag)} disabled={saving}>
        <SelectTrigger className="h-8 w-[190px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIT_TAGS.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
