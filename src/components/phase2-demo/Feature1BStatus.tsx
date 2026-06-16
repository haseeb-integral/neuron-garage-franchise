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
    label: "Calibration anchors — qualitative criterion (per Sam brief v2.2 p.12 / SOW v2.2 p.509), awaiting Brett's call",
    status: "blocked",
    note:
      "Plain English for Brett: Lovable previously enforced a 'Trinity must beat LeafSpring by ≥20 pts' gate. That ≥20 number was Lovable-invented — it is NOT in Sam's brief or the SOW. It has been retracted.\n\nWhat Sam's brief v2.2 p.12 actually says (the only client-specified test): 'Does Feature 1B score the LeafSpring site materially lower than the Trinity site?' Qualitative — no number.\n\nCurrent live engine v0.3: Trinity 63.32, LeafSpring 45.96, gap +17.36 pt (Trinity higher). By Sam's qualitative criterion, that looks materially lower; by Lovable's retracted ≥20 rule it would have failed by 2.64 pt — but that rule no longer applies.\n\nThree doc-compliant options open to Brett (Sam's pillar weights 25/25/20/15/15 stay locked in all three):\n  (a) Accept v0.3 as calibrated and move on.\n  (b) Add a second anchor pair (Sam explicitly endorses this on p.12) to stress-test without touching weights.\n  (c) Authorize a weight rework — only Brett/Sam can; brief v2.2 p.12 reserves this decision for the client.\n\nLovable will not reweight or change anchors unilaterally. Waiting on Brett's pick.",
  },


  { label: "Parking tile (engine v0.2)", status: "todo" },
  { label: "Real Mapbox tiles + isochrone overlay (schematic shown today)", status: "todo" },
  { label: "Persist analyzed slots across reloads", status: "todo" },
];

function Icon({ status }: { status: Item["status"] }) {
  if (status === "done") return <CheckCircle2 size={14} style={{ color: "#1f9d55", marginTop: 2 }} />;
  if (status === "blocked") return <AlertTriangle size={14} style={{ color: "#b8860b", marginTop: 2 }} />;
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
            For Dev Purposes Only - Internal Team Status Update for This Feature
          </div>
          <div className="mt-0.5 text-[12px]" style={{ color: "#3a3a3a" }}>
            {done} of {total} items complete. One item awaits Brett's decision on the qualitative calibration criterion — see the highlighted row.
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
                <div className="mt-0.5 text-[11px]" style={{ color: item.status === "blocked" ? "#7a5800" : "#5a5a5a", whiteSpace: "pre-wrap" }}>
                  {item.note}
                </div>
              )}

            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 text-[11px]" style={{ color: "#5a5a5a" }}>
        For Brett: the calibration criterion is now Sam's qualitative test, not Lovable's retracted ≥20-pt gate. Pick one of the three options in the highlighted row.
      </div>

    </div>
  );
}
