import { Candidate, QualificationScores } from "@/data/pipelineData";
import { StarRating } from "../StarRating";
import { Sparkles } from "lucide-react";

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

export function QualificationTab({ candidate, onScoreChange }: Props) {
  const total = Object.values(candidate.qualificationScores).reduce((a, b) => a + b, 0);
  const composite = Math.round((total / 25) * 100);

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
              value={candidate.qualificationScores[c.key]}
              onChange={(v) => onScoreChange(c.key, v)}
            />
          </div>
        ))}
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
