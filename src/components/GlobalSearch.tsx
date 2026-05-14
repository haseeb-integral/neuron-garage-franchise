import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { STAGES } from "@/data/pipelineData";
import { sampleTeachers } from "@/data/teacherData";
import { sampleCities } from "@/data/cityData";
import { supabase } from "@/integrations/supabase/client";

interface ResultItem { key: string; label: string; sub: string; onSelect: () => void; }
interface DbCandidate { id: string; first_name: string; last_name: string; city: string | null; state: string | null; current_stage: string; }
interface GlobalSearchProps { placeholder?: string; }

export function GlobalSearch({ placeholder = "Search candidates, prospects, cities, teachers..." }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbCandidates, setDbCandidates] = useState<DbCandidate[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      const dd = document.getElementById("global-search-dropdown");
      if (dd?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setDbCandidates([]); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, first_name, last_name, city, state, current_stage")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      if (!error && data) setDbCandidates(data as DbCandidate[]);
      setLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const candidateMatches: ResultItem[] = dbCandidates.map((c) => {
      const stageLabel = STAGES.find((s) => s.id === (c.current_stage as any))?.short ?? c.current_stage;
      const name = `${c.first_name} ${c.last_name}`.trim();
      const loc = [c.city, c.state].filter(Boolean).join(", ");
      return { key: `c-${c.id}`, label: name, sub: `${stageLabel} stage${loc ? ` · ${loc}` : ""}`, onSelect: () => navigate(`/candidate-pipeline?candidate=${c.id}`) };
    });
    const candNames = new Set(candidateMatches.map((c) => c.label.toLowerCase()));
    const prospectMatches: ResultItem[] = sampleTeachers
      .filter((p) => p.name.toLowerCase().includes(q) && !candNames.has(p.name.toLowerCase()))
      .slice(0, 5)
      .map((p) => ({ key: `p-${p.id}`, label: p.name, sub: `${p.city}, ${p.state} · Score ${p.fitScore}`, onSelect: () => navigate(`/teacher-prospects?prospect=${p.id}`) }));
    const cityMatches: ResultItem[] = sampleCities
      .filter((c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ key: `city-${c.id}`, label: `${c.city}, ${c.state}`, sub: `Score: ${c.compositeScore} · Tier ${c.tier}`, onSelect: () => navigate(`/city-scoring?city=${c.id}`) }));
    return { candidateMatches, prospectMatches, cityMatches };
  }, [query, dbCandidates, navigate]);

  const totalCount = groups ? groups.candidateMatches.length + groups.prospectMatches.length + groups.cityMatches.length : 0;
  const handleSelect = (item: ResultItem) => { item.onSelect(); setQuery(""); setOpen(false); };

  const dropdown = open && query.trim() && pos
    ? createPortal(
        <div id="global-search-dropdown" className="rounded-xl shadow-lg overflow-hidden" style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: "min(60vh, 480px)", backgroundColor: "#ffffff", border: "1px solid #d8e2ef", zIndex: 9999, display: "flex", flexDirection: "column" }}>
          {loading && (!groups || totalCount === 0) ? (
            <div className="px-3 py-4 text-sm text-center flex items-center justify-center gap-2" style={{ color: "#6c757d" }}><Loader2 size={14} className="animate-spin" /> Searching…</div>
          ) : !groups || totalCount === 0 ? (
            <div className="px-3 py-4 text-sm text-center" style={{ color: "#6c757d" }}>No results for "{query}"</div>
          ) : (
            <div className="overflow-y-auto py-1" style={{ flex: 1 }}>
              <ResultGroup title="Candidates" items={groups.candidateMatches} onSelect={handleSelect} />
              <ResultGroup title="Teacher Search" items={groups.prospectMatches} onSelect={handleSelect} />
              <ResultGroup title="Cities" items={groups.cityMatches} onSelect={handleSelect} />
            </div>
          )}
        </div>, document.body,
      )
    : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8794ab" }} />
        <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); (e.currentTarget as HTMLInputElement).blur(); } }} placeholder={placeholder} className="w-full rounded-xl py-0 pl-11 pr-4 text-sm focus:outline-none focus:ring-2" style={{ height: 40, backgroundColor: "#ffffff", border: "1px solid #d8e2ef", color: "#212529", ["--tw-ring-color" as never]: "#174be8" }} />
      </div>
      {dropdown}
    </div>
  );
}

function ResultGroup({ title, items, onSelect }: { title: string; items: ResultItem[]; onSelect: (i: ResultItem) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="py-1">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#6c757d" }}>{title}</div>
      {items.map((item) => (
        <button key={item.key} onClick={() => onSelect(item)} className="w-full text-left px-3 py-2 hover:bg-[#f1f3f5] flex flex-col">
          <span className="text-sm font-medium" style={{ color: "#212529" }}>{item.label}</span>
          <span className="text-xs" style={{ color: "#6c757d" }}>{item.sub}</span>
        </button>
      ))}
    </div>
  );
}
