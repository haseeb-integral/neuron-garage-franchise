import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { sampleCandidates, STAGES } from "@/data/pipelineData";
import { sampleTeachers } from "@/data/teacherData";
import { sampleCities } from "@/data/cityData";

interface ResultItem {
  key: string;
  label: string;
  sub: string;
  onSelect: () => void;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const candidateMatches: ResultItem[] = sampleCandidates
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => {
        const stageLabel = STAGES.find((s) => s.id === c.stage)?.short ?? c.stage;
        return {
          key: `c-${c.id}`,
          label: c.name,
          sub: `${stageLabel} stage · ${c.city}, ${c.state}`,
          onSelect: () => navigate(`/candidate-pipeline?candidate=${c.id}`),
        };
      });

    const prospectMatches: ResultItem[] = sampleTeachers
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        key: `p-${p.id}`,
        label: p.name,
        sub: `${p.city}, ${p.state} · Score ${p.fitScore}`,
        onSelect: () => navigate(`/teacher-prospects?prospect=${p.id}`),
      }));

    const cityMatches: ResultItem[] = sampleCities
      .filter((c) => c.city.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({
        key: `city-${c.id}`,
        label: `${c.city}, ${c.state}`,
        sub: `Score: ${c.compositeScore} · Tier ${c.tier}`,
        onSelect: () => navigate(`/city-scoring?city=${c.id}`),
      }));

    return { candidateMatches, prospectMatches, cityMatches };
  }, [query, navigate]);

  const totalCount = groups
    ? groups.candidateMatches.length + groups.prospectMatches.length + groups.cityMatches.length
    : 0;

  const handleSelect = (item: ResultItem) => {
    item.onSelect();
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[440px]">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "#6c757d" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          placeholder="Search candidates, prospects, cities…"
          className="w-full rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
          style={{
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            color: "#212529",
            ["--tw-ring-color" as never]: "#003c7e",
          }}
        />
      </div>

      {open && groups && query.trim() && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-md shadow-lg z-50 overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6" }}
        >
          {totalCount === 0 ? (
            <div className="px-3 py-4 text-sm text-center" style={{ color: "#6c757d" }}>
              No results for "{query}"
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto py-1">
              <ResultGroup title="Candidates" items={groups.candidateMatches} onSelect={handleSelect} />
              <ResultGroup title="Teacher Prospects" items={groups.prospectMatches} onSelect={handleSelect} />
              <ResultGroup title="Cities" items={groups.cityMatches} onSelect={handleSelect} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: ResultItem[];
  onSelect: (i: ResultItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="py-1">
      <div
        className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "#6c757d" }}
      >
        {title}
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item)}
          className="w-full text-left px-3 py-2 hover:bg-[#f1f3f5] flex flex-col"
        >
          <span className="text-sm font-medium" style={{ color: "#212529" }}>{item.label}</span>
          <span className="text-xs" style={{ color: "#6c757d" }}>{item.sub}</span>
        </button>
      ))}
    </div>
  );
}
