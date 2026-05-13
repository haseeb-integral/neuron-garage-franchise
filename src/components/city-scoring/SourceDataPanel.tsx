import { useEffect, useState } from "react";
import { ExternalLink, AlertCircle } from "lucide-react";
import { getCitySourceData, type CitySourceRow } from "@/lib/cityScoringLiveData";

interface Props {
  cityId: string | null | undefined;
  refreshKey?: number;
  onViewEvidence: () => void;
}

function relativeTime(iso: string | null) {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Just now";
  const min = Math.round(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.round(d / 30);
  return `${mo} mo ago`;
}

const STATUS_STYLES: Record<CitySourceRow["status"], string> = {
  success: "bg-[#e6f7ef] text-[#0a8f5a]",
  error: "bg-[#fee2e2] text-[#b91c1c]",
  running: "bg-[#fef3c7] text-[#92400e]",
  queued: "bg-[#eaf0ff] text-[#174be8]",
  never: "bg-[#eef2f7] text-[#8794ab]",
};

const STATUS_LABEL: Record<CitySourceRow["status"], string> = {
  success: "Connected",
  error: "Error",
  running: "Running",
  queued: "Queued",
  never: "Never",
};

export function SourceDataPanel({ cityId, refreshKey = 0, onViewEvidence }: Props) {
  const [rows, setRows] = useState<CitySourceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCitySourceData(cityId)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => console.error("getCitySourceData error", e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cityId, refreshKey]);

  return (
    <div className="rounded-lg bg-white border border-[#eef2f7] p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-[#07142f]">Source Data</h4>
        <button
          className="text-[10px] font-medium text-[#174be8] hover:underline"
          onClick={onViewEvidence}
        >
          View Evidence
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-[#8794ab]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#dbe4f2] bg-[#f7faff] px-3 py-4 text-center">
          <p className="text-[11px] text-[#526078]">No live data sources yet — click Refresh to fetch.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.source} className="flex items-center gap-2 text-[11px] text-[#14233b] min-w-0">
              <span className="truncate font-medium flex-1">{r.label}</span>
              {r.recordCount > 0 && (
                <span className="text-[9.5px] text-[#8794ab] tabular-nums">{r.recordCount} rows</span>
              )}
              <span className="text-[9.5px] text-[#8794ab] whitespace-nowrap" title={r.lastFetchedAt ?? "Never"}>
                {relativeTime(r.lastFetchedAt)}
              </span>
              <span className={`inline-flex items-center px-1.5 h-4 rounded-full text-[9px] font-semibold flex-shrink-0 ${STATUS_STYLES[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
              {r.sourceUrl && (
                <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-[#174be8] hover:text-[#1240c9] flex-shrink-0" title="Open source">
                  <ExternalLink size={11} />
                </a>
              )}
              {r.status === "error" && r.errorMessage && (
                <span title={r.errorMessage} className="text-[#b91c1c] flex-shrink-0">
                  <AlertCircle size={11} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
