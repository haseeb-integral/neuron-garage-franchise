/**
 * Amber pill rendered on Phase 2 demo pages when a sub-score's extraction
 * confidence falls below Sam's 0.7 threshold. Shares geometry with other meta chips.
 */
export function LowConfidenceBadge({
  level,
  note,
}: {
  level: "high" | "medium" | "low";
  note?: string;
}) {
  if (level === "high") return null;
  const palette =
    level === "low"
      ? { bg: "#fce7ec", fg: "#a3142b", label: "Low conf." }
      : { bg: "#fff1d6", fg: "#925100", label: "Med. conf." };
  return (
    <span
      className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      title={note ?? "Routed to human QA queue (confidence < 0.7)"}
    >
      ⚑ {palette.label}
    </span>
  );
}
