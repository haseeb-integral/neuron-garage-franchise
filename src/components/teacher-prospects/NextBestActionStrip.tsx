import { useEffect, useMemo, useState } from "react";
import { X, Zap, MailPlus, Filter } from "lucide-react";

export type NbaAction =
  | { kind: "enrich"; count: number }
  | { kind: "promote_high_fit"; count: number }
  | { kind: "focus_school"; school: string; count: number };

interface Props {
  stats: { total: number; withEmail: number; needsEnrichment: number; cities: number } | null;
  visibleProspects: Array<{ uuid: string; school: string; fitScore: number; needsEmailEnrichment: boolean }>;
  promotedUuids: Set<string>;
  onEnrichBatch: () => void;
  onPromoteHighFit: () => void;
  onFocusSchool: (school: string) => void;
}

const DISMISS_KEY = "tp:nba-dismissed-v1";

function loadDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}"); } catch { return {}; }
}
function isFresh(ts: number) { return Date.now() - ts < 24 * 3600 * 1000; }

export function NextBestActionStrip({ stats, visibleProspects, promotedUuids, onEnrichBatch, onPromoteHighFit, onFocusSchool }: Props) {
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => loadDismissed());

  const cards = useMemo(() => {
    const out: { id: string; node: React.ReactNode }[] = [];
    if (!stats) return out;

    // Card 1 — needs enrichment in current filter
    if (stats.needsEnrichment >= 5) {
      out.push({
        id: "enrich",
        node: (
          <div className="flex items-start gap-3 rounded-lg border border-[#fcd9b4] bg-[#fff7ec] p-3">
            <div className="rounded-md bg-[#fde0c2] p-1.5 text-[#b7791f]"><Zap size={14} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-[#7a4a10]">{stats.needsEnrichment.toLocaleString()} teachers need email enrichment</div>
              <div className="text-[11px] text-[#8a6230]">Run enrichment on visible rows to make them sendable.</div>
              <button onClick={onEnrichBatch} className="mt-1.5 rounded-md bg-[#b7791f] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#9a6310]">Enrich visible page</button>
            </div>
          </div>
        ),
      });
    }

    // Card 2 — high-fit teachers not yet in outreach (fit >= 70)
    const highFitFree = visibleProspects.filter((p) => p.fitScore >= 70 && !promotedUuids.has(p.uuid));
    if (highFitFree.length >= 3) {
      out.push({
        id: "promote",
        node: (
          <div className="flex items-start gap-3 rounded-lg border border-[#bfead2] bg-[#ecf9f1] p-3">
            <div className="rounded-md bg-[#cdeed9] p-1.5 text-[#0a8f5a]"><MailPlus size={14} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-[#0a6442]">{highFitFree.length} high-fit teachers not in outreach</div>
              <div className="text-[11px] text-[#3a7a5a]">Fit score ≥ 70 and not in any active campaign.</div>
              <button onClick={onPromoteHighFit} className="mt-1.5 rounded-md bg-[#0a8f5a] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#076c44]">Add to outreach</button>
            </div>
          </div>
        ),
      });
    }

    // Card 3 — schools with 3+ prospects in current view
    const bySchool = new Map<string, number>();
    for (const p of visibleProspects) {
      if (!p.school || p.school === "—") continue;
      bySchool.set(p.school, (bySchool.get(p.school) ?? 0) + 1);
    }
    let topSchool: { name: string; count: number } | null = null;
    for (const [name, count] of bySchool.entries()) {
      if (count >= 3 && (!topSchool || count > topSchool.count)) topSchool = { name, count };
    }
    if (topSchool) {
      const t = topSchool;
      out.push({
        id: `school:${t.name}`,
        node: (
          <div className="flex items-start gap-3 rounded-lg border border-[#cfddf3] bg-[#eef4ff] p-3">
            <div className="rounded-md bg-[#d8e3f7] p-1.5 text-[#174be8]"><Filter size={14} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-[#0d2a73]">{t.count} prospects at {t.name}</div>
              <div className="text-[11px] text-[#3a4d80]">Warm-intro opportunity — focus on one school.</div>
              <button onClick={() => onFocusSchool(t.name)} className="mt-1.5 rounded-md bg-[#174be8] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#123fc5]">Filter to school</button>
            </div>
          </div>
        ),
      });
    }

    return out.filter((c) => !(dismissed[c.id] && isFresh(dismissed[c.id])));
  }, [stats, visibleProspects, promotedUuids, dismissed, onEnrichBatch, onPromoteHighFit, onFocusSchool]);

  // prune stale dismissals
  useEffect(() => {
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(dismissed)) if (isFresh(v)) cleaned[k] = v;
    if (Object.keys(cleaned).length !== Object.keys(dismissed).length) {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(cleaned));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Next best action</div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.id} className="relative">
            {c.node}
            <button
              onClick={() => {
                const next = { ...dismissed, [c.id]: Date.now() };
                setDismissed(next);
                localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
              }}
              className="absolute right-1.5 top-1.5 rounded p-1 text-[#8794ab] hover:bg-white/70"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
