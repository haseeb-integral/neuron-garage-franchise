import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  clearDbQueryLog,
  DbQueryLogEntry,
  subscribeDbQueryLog,
} from "@/lib/dbHealth/queryLogger";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";

/**
 * Floating bottom-right widget that shows the most recent DB calls the
 * current page has made. Wired into hooks via withQueryLog / logDbQuery.
 * Manager+ only. Collapsed by default; persists open state in localStorage.
 */
export function DbDebugFooter() {
  const { isManager } = useIsManager();
  const [entries, setEntries] = useState<DbQueryLogEntry[]>([]);
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem("__lov_db_debug_open__") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => subscribeDbQueryLog(setEntries), []);

  useEffect(() => {
    try {
      localStorage.setItem("__lov_db_debug_open__", open ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [open]);

  if (!isManager) return null;

  const errorCount = entries.filter((e) => e.error).length;

  return (
    <div className="fixed bottom-3 right-3 z-50 max-w-[min(420px,calc(100vw-24px))]">
      <div className={`${open ? "rounded-xl" : "rounded-full"} border border-[#eef2f7] bg-white shadow-lg overflow-hidden`}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`w-full flex items-center justify-between ${open ? "px-3 py-1.5" : "px-2.5 py-1"} text-[11px] font-bold text-[#0b1a36] hover:bg-[#f7faff]`}
        >
          <span className="flex items-center gap-2">
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: errorCount > 0 ? "#dc2626" : entries.length > 0 ? "#16a34a" : "#94a3b8",
              }}
              aria-hidden
            />
            DB Debug · {entries.length} calls
            {errorCount > 0 && (
              <span className="text-[#dc2626]">· {errorCount} error{errorCount === 1 ? "" : "s"}</span>
            )}
          </span>
          {open ? <ChevronDown size={12} /> : <ChevronUp size={12} className="ml-1.5" />}
        </button>
        {open && (
          <div className="border-t border-[#eef2f7]">
            <div className="max-h-[40vh] overflow-y-auto">
              {entries.length === 0 ? (
                <div className="p-3 text-[11px] text-[#526078]">
                  No tracked DB calls on this page yet.
                </div>
              ) : (
                <ul className="divide-y divide-[#eef2f7]">
                  {entries.map((e) => (
                    <li key={e.id} className="px-3 py-2 text-[11px]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-[#0b1a36] truncate">{e.label}</span>
                        <span className="tabular-nums text-[#526078] shrink-0">{e.ms}ms</span>
                      </div>
                      <div className="text-[10px] text-[#526078] flex flex-wrap gap-x-2">
                        {e.table && <span>table: {e.table}</span>}
                        <span>rows: {e.rowCount ?? "—"}</span>
                        <span>{new Date(e.ts).toLocaleTimeString()}</span>
                      </div>
                      {e.error && (
                        <div className="text-[10px] text-[#dc2626] mt-0.5 break-words">
                          {e.error}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-[#eef2f7] px-3 py-1.5 flex items-center justify-between">
              <a
                href="/db-health"
                className="text-[10px] font-bold text-[#0757ff] hover:underline"
              >
                Open /db-health →
              </a>
              <button
                onClick={() => clearDbQueryLog()}
                className="inline-flex items-center gap-1 text-[10px] text-[#526078] hover:text-[#0b1a36]"
              >
                <Trash2 size={11} /> Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DbDebugFooter;
