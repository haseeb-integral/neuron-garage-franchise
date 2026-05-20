import { StatusBadge, StatusTone } from "@/lib/teacherSourceLabels";

const toneClasses: Record<StatusTone, string> = {
  emerald: "bg-[#e6f7ef] text-[#0a8f5a]",
  amber:   "bg-[#fff4df] text-[#b7791f]",
  slate:   "bg-[#eef2f7] text-[#526078]",
  sky:     "bg-[#e6f3ff] text-[#1e6fb8]",
  indigo:  "bg-[#eef0ff] text-[#4f46e5]",
};

interface Props {
  badge: StatusBadge;
  className?: string;
}

export function SourceBadge({ badge, className = "" }: Props) {
  return (
    <span
      title={badge.title}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold leading-4 ${toneClasses[badge.tone]} ${className}`}
    >
      {badge.label}
    </span>
  );
}
