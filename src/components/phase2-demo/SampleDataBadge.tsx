/**
 * Inline "Sample data" chip used to mark hardcoded values on Phase 2 mockup
 * pages. Shares geometry with other Phase 2 meta chips.
 */
export function SampleDataBadge({ label = "Sample" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: "rgba(253,126,20,0.12)", color: "#a35200" }}
    >
      {label}
    </span>
  );
}
