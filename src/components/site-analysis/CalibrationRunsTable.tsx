import { CALIBRATION_RUNS, QUALITATIVE_CRITERION, type CalibrationRun } from "@/data/calibration-runs";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";

/**
 * Calibration evidence table — what Sam asked for: the named anchors plus
 * their live-engine composites side-by-side. No pass/fail number. The pass
 * line is the qualitative criterion from Sam's brief v2.2 p.12.
 */
export function CalibrationRunsTable() {
  const trinity = CALIBRATION_RUNS.find(
    (r) => r.type === "positive" && r.schoolName.toLowerCase().includes("trinity"),
  );
  const pending = CALIBRATION_RUNS.filter((r) => r.runDate === "pending").length;
  const ready = CALIBRATION_RUNS.length - pending;

  return (
    <section
      className="mb-4 rounded-lg border bg-white p-4"
      style={{ borderColor: BORDER }}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
            Calibration evidence ({ready}/{CALIBRATION_RUNS.length} anchors run)
          </h3>
          <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
            {QUALITATIVE_CRITERION}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: MUTED }}>
              <th className="py-1 text-left font-semibold">Anchor</th>
              <th className="py-1 text-left font-semibold">Type</th>
              <th className="py-1 text-right font-semibold">Composite</th>
              <th className="py-1 text-right font-semibold">Δ vs Trinity</th>
              <th className="py-1 text-left font-semibold">Run</th>
            </tr>
          </thead>
          <tbody>
            {CALIBRATION_RUNS.map((r) => (
              <Row key={r.schoolName} run={r} trinity={trinity} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ run, trinity }: { run: CalibrationRun; trinity?: CalibrationRun }) {
  const pending = run.runDate === "pending";
  const isTrinity = trinity?.schoolName === run.schoolName;
  const delta =
    !pending && trinity && !isTrinity ? +(run.composite - trinity.composite).toFixed(2) : null;
  const typeStyle =
    run.type === "positive"
      ? { bg: "#e3f3e7", fg: "#1d6b32", label: "Positive anchor" }
      : { bg: "#fce7ec", fg: "#a3142b", label: "Negative anchor" };

  return (
    <tr style={{ borderTop: `1px solid ${BORDER}`, color: NAVY }}>
      <td className="py-1.5 pr-2">
        <div className="font-semibold">{run.schoolName}</div>
        <div className="text-[10px]" style={{ color: MUTED }}>
          {run.address}
        </div>
        {run.note && (
          <div className="text-[10px] italic" style={{ color: MUTED }}>
            {run.note}
          </div>
        )}
      </td>
      <td className="py-1.5 pr-2">
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: typeStyle.bg, color: typeStyle.fg }}
        >
          {typeStyle.label}
        </span>
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums font-bold">
        {pending ? <span style={{ color: MUTED }}>—</span> : run.composite}
      </td>
      <td className="py-1.5 pr-2 text-right tabular-nums" style={{ color: MUTED }}>
        {pending || isTrinity || delta == null ? (
          "—"
        ) : (
          <span style={{ color: delta < 0 ? "#a3142b" : "#1d6b32" }}>
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </td>
      <td className="py-1.5 pr-2 text-[10px]" style={{ color: MUTED }}>
        {pending ? <em>pending</em> : run.runDate}
      </td>
    </tr>
  );
}
