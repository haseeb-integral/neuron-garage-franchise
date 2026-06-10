/**
 * Inline "Sample data" chip used to mark hardcoded values on Phase 2 mockup
 * pages. Pair with any number a reader might mistake for live data.
 */
export function SampleDataBadge({ label = "Sample" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: "rgba(253,126,20,0.12)", color: "#a35200" }}
    >
      {label}
    </span>
  );
}
