import { Candidate } from "@/data/pipelineData";

interface Props {
  candidates: Candidate[];
}

export function PipelineAnalyticsBar({ candidates }: Props) {
  const active = candidates.filter((c) => c.stage !== "disqualified");
  const total = active.length;
  const avgDays = total > 0 ? Math.round(active.reduce((s, c) => s + c.daysInStage, 0) / total) : 0;
  const qualified = candidates.filter((c) => c.stage === "signing").length;
  const conversion = total > 0 ? Math.round((qualified / candidates.length) * 100) : 0;
  const thisWeek = candidates.reduce(
    (s, c) => s + c.activity.filter((a) => a.timestamp >= "2025-04-09").length,
    0,
  );

  const stats = [
    { label: "Total in Pipeline", value: total },
    { label: "Avg Days per Stage", value: avgDays },
    { label: "Conversion Rate", value: `${conversion}%` },
    { label: "This Week's Activity", value: thisWeek },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-lg p-4"
          style={{ border: "1px solid #dee2e6" }}
        >
          <div className="text-xs mb-1" style={{ color: "#6c757d" }}>{s.label}</div>
          <div className="text-2xl font-bold" style={{ color: "#003c7e" }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
