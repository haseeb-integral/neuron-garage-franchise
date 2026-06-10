import { AlertTriangle } from "lucide-react";

/**
 * Phase 2 — Week 2 banner. Sits at the top of every demo mockup page so it's
 * unmistakable that nothing on the page is connected to the backend yet.
 */
export function DemoBanner({ note }: { note?: string }) {
  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-lg border px-4 py-3"
      style={{ backgroundColor: "rgba(253,126,20,0.08)", borderColor: "rgba(253,126,20,0.35)" }}
      role="status"
      aria-live="polite"
    >
      <AlertTriangle size={18} strokeWidth={2} style={{ color: "#fd7e14", marginTop: 2 }} />
      <div className="flex-1">
        <div className="text-[13px] font-bold" style={{ color: "#a35200" }}>
          Demo Preview — Backend Coming Soon
        </div>
        <div className="mt-0.5 text-[12px]" style={{ color: "#7a4a16" }}>
          {note ??
            "Every number, table row, and badge on this page is hardcoded sample data. Nothing is read from the database. Layout is for review only — backend wiring lands in Week 3 of the Phase 2 build plan."}
        </div>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ backgroundColor: "#fd7e14", color: "white" }}
      >
        Phase 2 · Week 2
      </span>
    </div>
  );
}
