interface Props {
  totalInPipeline: number;
  hotLeads: number;
  conversionRate: number;
  newThisWeek: number;
}

export function PipelineAnalyticsBar({
  totalInPipeline,
  hotLeads,
  conversionRate,
  newThisWeek,
}: Props) {
  const stats = [
    { label: "Total in Pipeline", value: totalInPipeline },
    { label: "Hot Leads (Fit ≥ 80)", value: hotLeads },
    { label: "Conversion Rate", value: `${conversionRate}%` },
    { label: "New This Week", value: newThisWeek },
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
