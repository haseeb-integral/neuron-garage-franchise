import { toast } from "sonner";
import type { Stats } from "@/hooks/useTeacherProspectsData";

interface TeacherSidebarProps {
  stats: Stats | null;
  statsError: string | null;
  onRefresh: () => void;
  onRetryStats: () => void;
}

export const TeacherSidebar = ({ stats, statsError, onRefresh, onRetryStats }: TeacherSidebarProps) => {
  return (
    <aside className="space-y-3">
      <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Sources</div>
          <button onClick={onRefresh} className="text-[10.5px] font-bold text-[#174be8] hover:underline">Refresh</button>
        </div>
        {stats === null && !statsError ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs">
                  <div className="h-3 w-24 animate-pulse rounded bg-[#edf2f8]" />
                  <div className="h-3 w-14 animate-pulse rounded bg-[#edf2f8]" />
                </div>
                <div className="mt-1 h-1.5 w-full animate-pulse rounded-full bg-[#edf2f8]" />
              </div>
            ))}
          </div>
        ) : statsError ? (
          <div className="text-xs text-[#b7791f]" title={statsError}>— <button onClick={onRetryStats} className="ml-1 font-bold text-[#174be8] hover:underline">Retry</button></div>
        ) : stats!.bySource.length === 0 ? (
          <div className="text-xs text-[#8794ab]">No data yet.</div>
        ) : (
          <div className="space-y-3">
            {stats!.bySource.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#07142f]">{s.label}</span>
                  <span className="font-bold text-[#07142f]">{s.count.toLocaleString()} · {s.pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#edf2f8]">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.key === "smartlead" ? "#0a8f5a" : s.key === "linkedin" ? "#1e6fb8" : "#8794ab" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Quick Stats</div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#526078]">Cities</span>
            {stats === null && !statsError ? <div className="h-3 w-8 animate-pulse rounded bg-[#edf2f8]" /> : <span className="font-bold text-[#07142f]">{stats?.cities.toLocaleString() ?? "—"}</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#526078]">Email-ready</span>
            {stats === null && !statsError ? <div className="h-3 w-10 animate-pulse rounded bg-[#edf2f8]" /> : <span className="font-bold text-[#07142f]">{stats?.withEmail.toLocaleString() ?? "—"}</span>}
          </div>
          <div>
            <div className="mb-1 text-xs text-[#526078]">Avg Fit Score</div>
            <button onClick={() => toast.info("AI Fit Scoring (Task 14) — coming soon.")} className="w-full rounded-md border border-dashed border-[#dbe4f2] px-2 py-1.5 text-xs font-medium text-[#8794ab] hover:bg-[#f4f7ff] hover:text-[#174be8]">— Run AI Scoring</button>
          </div>
          <div>
            <div className="mb-1 text-xs text-[#526078]">Response Rate</div>
            <button onClick={() => toast.info("SmartLead reply tracking (Task B6) — coming soon.")} className="w-full rounded-md border border-dashed border-[#dbe4f2] px-2 py-1.5 text-xs font-medium text-[#8794ab] hover:bg-[#f4f7ff] hover:text-[#174be8]">— Connect SmartLead</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e7edf5] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Status Legend</div>
        <ul className="space-y-2.5 text-[12px] text-[#34445f]">
          {[
            { dot: "#0a8f5a", label: "SmartLead · Verified", desc: "safe to send today" },
            { dot: "#b7791f", label: "SmartLead · Unverified", desc: "excluded from campaigns" },
            { dot: "#8794ab", label: "SmartLead · No Email", desc: "needs enrichment" },
            { dot: "#1e6fb8", label: "LinkedIn Import", desc: "needs email enrichment" },
          ].map((s) => (
            <li key={s.label} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
              <div className="min-w-0">
                <div className="font-bold text-[#07142f]">{s.label}</div>
                <div className="text-[11px] text-[#66728a]">{s.desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
