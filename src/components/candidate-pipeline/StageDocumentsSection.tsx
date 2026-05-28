import { FileText } from "lucide-react";
import { CandidateFileDropzone, type DocumentCategory } from "./CandidateFileDropzone";
import type { StageId } from "@/data/pipelineData";
import { isEnabled } from "@/lib/featureFlags";

interface SlotDef {
  category: DocumentCategory;
  label: string;
  hint: string;
}

const STAGE_SLOTS: Partial<Record<StageId, { flag: "FF_STEP2_UPLOADS" | "FF_STEP4_UPLOADS"; slots: SlotDef[] }>> = {
  business_overview: {
    flag: "FF_STEP2_UPLOADS",
    slots: [
      { category: "background_check", label: "Background check authorization / report", hint: "Signed authorization or completed report." },
      { category: "credit_check", label: "Credit check authorization / report", hint: "Signed authorization or completed report." },
    ],
  },
  immersion: {
    flag: "FF_STEP4_UPLOADS",
    slots: [
      { category: "facility_form", label: "Facility / location form", hint: "Site walk-through and facility details." },
      { category: "marketing_plan", label: "Marketing plan", hint: "Candidate's launch marketing plan." },
    ],
  },
};

interface Props {
  candidateDbId: string;
  stage: StageId;
}

/**
 * Stage-scoped document slots rendered inside the Homework tab.
 * Each slot is a compact reusable dropzone bound to a specific document category.
 * Entire section is hidden when the stage's feature flag is off.
 */
export function StageDocumentsSection({ candidateDbId, stage }: Props) {
  const config = STAGE_SLOTS[stage];
  if (!config || !isEnabled(config.flag)) return null;

  return (
    <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} style={{ color: "#003c7e" }} />
        <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Stage Documents</h4>
      </div>
      <div className="space-y-4">
        {config.slots.map((slot) => (
          <div key={slot.category}>
            <div className="mb-1.5">
              <div className="text-sm font-medium">{slot.label}</div>
              <div className="text-xs text-muted-foreground">{slot.hint}</div>
            </div>
            <CandidateFileDropzone
              candidateDbId={candidateDbId}
              category={slot.category}
              filterCategory={slot.category}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}
