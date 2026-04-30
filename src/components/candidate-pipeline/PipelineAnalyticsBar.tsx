interface Props {
  totalInPipeline: number;
  avgDaysPerStage: number;
  conversionRate: number;
  thisWeekActivity: number;
}

export function PipelineAnalyticsBar({
  totalInPipeline,
  avgDaysPerStage,
  conversionRate,
  thisWeekActivity,
}: Props) {
  const stats = [
    { label: "Total in Pipeline", value: totalInPipeline },
    { label: "Avg Days per Stage", value: avgDaysPerStage },
    { label: "Conversion Rate", value: `${conversionRate}%` },
    { label: "This Week's Activity", value: thisWeekActivity },
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
