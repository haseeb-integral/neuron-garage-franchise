import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

/**
 * Feature 1B — Site Analysis progress checklist for Brett.
 * Update items below as work lands. Keep entries short and plain-English.
 * Last updated: 2026-06-16
 */

type Item = { label: string; status: "done" | "todo" | "blocked"; note?: string };

const ITEMS: Item[] = [
  { label: "Live scoring engine (compute-sas) wired end-to-end", status: "done" },
  { label: "Every score on this page now comes from the live engine (no demo numbers)", status: "done" },
  { label: "One input surface: Live Engine box is the only place to type inputs; cards are read-only", status: "done" },
  { label: "Save to slot — Live Engine result becomes a card (no second engine call, exact same numbers)", status: "done" },
  { label: "Card titles wrap fully (no more 'Trinity C…' / 'Leaf…')", status: "done" },
  { label: "Rich card UI: summary line, drive-time map, 6 metric tiles, Show all formulas toggle", status: "done" },
  { label: "Calibration anchors auto-run once on mount with frozen inputs (reproducible delta)", status: "done" },
  { label: "Compare up to 4 sites side-by-side · Decision summary · Export decision pack — all live", status: "done" },
  {
    label: "All silent fake-number fallbacks removed — engine refuses to score on missing data",
    status: "done",
    note: "Killed: road/highway 70 default, enrollment 60 default, school-type 30 / grade-band 50 defaults, ACS '|| 0' coalescing, nearby-schools enrollment fallback. If any live lookup fails (Overpass, Mapbox, Census, school profile), the analysis is marked failed with an explicit error — no fabricated score is ever shown.",
  },
  {
    label: "Drive-to-highway + drive-to-major-road tiles (engine v0.2)",
    status: "done",
    note: "Real Mapbox Directions driving miles, gated behind Overpass node lookup. Shown on the Live Engine card and persisted on signals.accessibility.",
  },
  {
    label: "Calibration gate (Trinity vs LeafSpring) — currently FAILING",
    status: "blocked",
    note: "Trinity 51.1 vs LeafSpring 43.52 with the frozen anchor inputs (private elementary vs closed daycare). Gap is 7.6, gate requires ≥20. Needs Brett input on which signal(s) to recalibrate (likely add a 'closed/inactive site' penalty or rebalance density/accessibility weights).",
  },
  { label: "Parking tile (engine v0.2)", status: "todo" },
  { label: "Real Mapbox tiles + isochrone overlay (schematic shown today)", status: "todo" },
  { label: "Persist analyzed slots across reloads", status: "todo" },
];

function Icon({ status }: { status: Item["status"] }) {
  if (status === "done") return <CheckCircle2 size={14} style={{ color: "#1f9d55", marginTop: 2 }} />;
  if (status === "blocked") return <AlertTriangle size={14} style={{ color: "#c92a2a", marginTop: 2 }} />;
  return <Circle size={14} style={{ color: "#8a8a8a", marginTop: 2 }} />;
}

export function Feature1BStatus() {
  const done = ITEMS.filter((i) => i.status === "done").length;
  const total = ITEMS.length;

  return (
    <div
      className="mb-5 rounded-lg border px-4 py-3"
      style={{ backgroundColor: "rgba(31,157,85,0.06)", borderColor: "rgba(31,157,85,0.30)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-bold" style={{ color: "#1a5e34" }}>
            Feature 1B — Site Analysis · progress for Brett
          </div>
          <div className="mt-0.5 text-[12px]" style={{ color: "#3a3a3a" }}>
            {done} of {total} items complete. One item is blocked and needs your input — see the red row.
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: "#1f9d55", color: "white" }}
        >
          {done}/{total}
        </span>
      </div>

      <ul className="mt-2 space-y-1">
        {ITEMS.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-[12px]" style={{ color: "#2a2a2a" }}>
            <Icon status={item.status} />
            <div className="flex-1">
              <span style={{ fontWeight: item.status === "blocked" ? 700 : 500 }}>{item.label}</span>
              {item.note && (
                <div className="mt-0.5 text-[11px]" style={{ color: "#7a1f1f" }}>
                  {item.note}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 text-[11px]" style={{ color: "#5a5a5a" }}>
        Worth Brett's look: the calibration gate failure. Everything else is live and testable now.
      </div>
    </div>
  );
}
