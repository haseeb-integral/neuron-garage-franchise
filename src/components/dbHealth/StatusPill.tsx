import { HealthStatus, statusColor, statusLabel } from "@/lib/dbHealth/thresholds";

interface Props {
  status: HealthStatus;
  label: string;
  /** Optional onClick to scroll to the domain. */
  onClick?: () => void;
  /** Compact = used in the top status row. */
  compact?: boolean;
}

/** Round pill that shows a domain or metric's health at a glance. */
export function StatusPill({ status, label, onClick, compact }: Props) {
  const color = statusColor(status);
  const inner = (
    <>
      <span
        className="inline-block rounded-full"
        style={{
          width: compact ? 8 : 10,
          height: compact ? 8 : 10,
          background: color,
          boxShadow: `0 0 0 3px ${color}22`,
        }}
        aria-hidden
      />
      <span className="font-bold text-[#0b1a36]">{label}</span>
      <span className="text-[#526078]">· {statusLabel(status)}</span>
    </>
  );
  const cls =
    "inline-flex items-center gap-2 rounded-full border border-[#eef2f7] bg-white px-3 py-1.5 text-[12px]";
  if (onClick) {
    return (
      <button onClick={onClick} className={`${cls} hover:bg-[#f7faff] transition-colors`}>
        {inner}
      </button>
    );
  }
  return <span className={cls}>{inner}</span>;
}
