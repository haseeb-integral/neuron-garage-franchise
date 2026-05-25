import { HistoryRow } from "@/lib/dbHealth/history";
import { statusColor } from "@/lib/dbHealth/thresholds";

interface Props {
  rows: HistoryRow[];
  width?: number;
  height?: number;
}

/**
 * Tiny status sparkline — one colored tick per snapshot, oldest at left.
 * Pure SVG, no chart library.
 */
export function Sparkline({ rows, width = 220, height = 24 }: Props) {
  if (rows.length === 0) {
    return <div className="text-[10px] text-[#94a3b8]">no history yet</div>;
  }
  const n = rows.length;
  const tickW = Math.max(1, Math.floor(width / Math.max(n, 1)));
  return (
    <svg width={width} height={height} role="img" aria-label="status history">
      {rows.map((r, i) => (
        <rect
          key={r.id}
          x={i * tickW}
          y={0}
          width={Math.max(tickW - 1, 1)}
          height={height}
          fill={statusColor(r.status)}
          opacity={0.85}
        >
          <title>
            {new Date(r.ts).toLocaleString()} · {r.metric} · {r.status}
          </title>
        </rect>
      ))}
    </svg>
  );
}
