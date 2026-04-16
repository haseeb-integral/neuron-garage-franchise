import { OnboardingStatus } from "@/data/onboardingData";

const CONFIG: Record<OnboardingStatus, { label: string; bg: string; color: string }> = {
  on_track: { label: "On Track", bg: "#20c997", color: "#ffffff" },
  stalled: { label: "Stalled", bg: "#ffca28", color: "#5c4400" },
  overdue: { label: "Overdue", bg: "#ff4438", color: "#ffffff" },
};

export function StatusBadge({ status }: { status: OnboardingStatus }) {
  const c = CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}
