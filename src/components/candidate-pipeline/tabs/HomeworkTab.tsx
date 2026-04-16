import { Candidate, STAGE_HOMEWORK, TrialClose } from "@/data/pipelineData";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, BookOpen } from "lucide-react";

interface Props {
  candidate: Candidate;
  onTrialCloseChange: (key: keyof TrialClose, value: boolean) => void;
}

const TRIAL_ITEMS: { key: keyof TrialClose; label: string }[] = [
  { key: "answeredQuestions", label: "Answered all questions" },
  { key: "prospectSummarized", label: "Prospect summarized key takeaways" },
  { key: "askedToMoveForward", label: "Asked if they want to move forward" },
  { key: "scheduledNextCall", label: "Scheduled next call" },
  { key: "assignedHomework", label: "Assigned homework" },
];

export function HomeworkTab({ candidate, onTrialCloseChange }: Props) {
  const homework = STAGE_HOMEWORK[candidate.stage] ?? [];
  const showFddLock = candidate.stage === "fdd_review" && candidate.fddSentDate;

  let daysRemaining = 0;
  if (showFddLock && candidate.fddSentDate) {
    const sent = new Date(candidate.fddSentDate).getTime();
    const unlock = sent + 16 * 24 * 60 * 60 * 1000;
    daysRemaining = Math.max(0, Math.ceil((unlock - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} style={{ color: "#003c7e" }} />
          <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Stage Homework</h4>
        </div>
        {homework.length === 0 ? (
          <p className="text-sm" style={{ color: "#6c757d" }}>No homework assigned for this stage.</p>
        ) : (
          <ul className="space-y-2">
            {homework.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: "#fd7e14" }}>•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showFddLock && (
        <div
          className="rounded-lg p-4 flex items-start gap-2"
          style={{ backgroundColor: "#fff4d1", border: "1px solid #ffca28" }}
        >
          <Lock size={16} style={{ color: "#7a5a00" }} className="mt-0.5" />
          <div>
            <div className="font-semibold text-sm mb-1" style={{ color: "#7a5a00" }}>Stage 4 FDD Lock</div>
            <p className="text-sm" style={{ color: "#7a5a00" }}>
              Cannot advance past Stage 4 until 16 days after FDD sent date.
            </p>
            <p className="text-sm font-semibold mt-1" style={{ color: "#7a5a00" }}>
              {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining` : "Lock period complete — eligible to advance"}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Trial Close Checklist</h4>
        <p className="text-xs mb-3" style={{ color: "#6c757d" }}>
          All items must be checked before advancing to next stage.
        </p>
        <div className="space-y-2">
          {TRIAL_ITEMS.map((item) => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={candidate.trialClose[item.key]}
                onCheckedChange={(v) => onTrialCloseChange(item.key, !!v)}
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
