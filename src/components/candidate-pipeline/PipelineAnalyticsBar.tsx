import { Users, Flame, TrendingUp, Sparkles } from "lucide-react";

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
    { label: "Total in Pipeline", value: totalInPipeline, Icon: Users, tint: "#174be8" },
    { label: "Hot Leads (Fit ≥ 80)", value: hotLeads, Icon: Flame, tint: "#fd7e14" },
    { label: "Conversion Rate", value: `${conversionRate}%`, Icon: TrendingUp, tint: "#20c997" },
    { label: "New This Week", value: newThisWeek, Icon: Sparkles, tint: "#6f42c1" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {stats.map(({ label, value, Icon, tint }) => (
        <div
          key={label}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
          style={{ border: "1px solid #cfe0ff" }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${tint}14`, color: tint }}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div
              className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
              style={{ color: "#526078" }}
            >
              {label}
            </div>
            <div className="text-2xl font-bold leading-none" style={{ color: "#07142f" }}>
              {value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
