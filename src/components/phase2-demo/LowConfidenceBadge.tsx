/**
 * Amber pill rendered on Phase 2 demo pages when a sub-score's extraction
 * confidence falls below Sam's 0.7 threshold. Mirrors the SOW gate that routes
 * low-confidence weeks to the human QA queue.
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
      ? { bg: "#fce7ec", fg: "#a3142b", label: "Low confidence" }
      : { bg: "#fff1d6", fg: "#925100", label: "Medium confidence" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      title={note ?? "Routed to human QA queue (confidence < 0.7)"}
    >
      ⚑ {palette.label}
    </span>
  );
}
