import { QualificationScores } from "@/data/pipelineData";

interface Props {
  scores: QualificationScores;
}

// Same formula as QualificationTab.computeComposite — kept in sync intentionally.
function computeComposite(scores: QualificationScores): number {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return Math.round((total / 25) * 100);
}

function tone(score: number): { bg: string; fg: string } {
  if (score >= 80) return { bg: "#d1f4e0", fg: "#0a6b3a" }; // green
  if (score >= 60) return { bg: "#fff3cd", fg: "#856404" }; // amber
  if (score > 0) return { bg: "#f8d7da", fg: "#842029" }; // red
  return { bg: "#e9ecef", fg: "#6c757d" }; // neutral / unscored
}

export function CompositeScoreBadge({ scores }: Props) {

  const value = computeComposite(scores);
  if (value <= 0) return null; // hide until candidate has been scored
  const { bg, fg } = tone(value);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ backgroundColor: bg, color: fg }}
      title={`Qualification composite score: ${value}/100`}
    >
      Qual {value}
    </span>
  );
}
