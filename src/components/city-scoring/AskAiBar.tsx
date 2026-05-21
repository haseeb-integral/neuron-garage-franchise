import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface AskAiBarProps {
  onSubmit: (query: string) => void;
  loading: boolean;
  hasResult: boolean;
  onClear: () => void;
}

type HistoryRow = { id: string; query: string; created_at: string };

export function AskAiBar({ onSubmit, loading, hasResult, onClear }: AskAiBarProps) {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshHistory = async () => {
    const { data, error } = await supabase
      .from("ai_query_history")
      .select("id, query, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (!error) {
      // De-dupe by query text so the dropdown reads like Google suggestions.
      const seen = new Set<string>();
      const rows: HistoryRow[] = [];
      (data ?? []).forEach((r: any) => {
        const q = (r.query ?? "").trim();
        if (!q || seen.has(q.toLowerCase())) return;
        seen.add(q.toLowerCase());
        rows.push(r as HistoryRow);
      });
      setHistory(rows);
    }
  };
  useEffect(() => { refreshHistory(); }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setValue(trimmed);
    onSubmit(trimmed);
    setFocused(false);
    setTimeout(refreshHistory, 1500);
  };

  const q = value.trim().toLowerCase();
  const suggestions = (q ? history.filter((h) => h.query.toLowerCase().includes(q)) : history).slice(0, 8);
  const showDropdown = focused && suggestions.length > 0;

  return (
    <div className="mb-4 bg-gradient-to-r from-[#f4f0ff] to-[#eaf0ff] rounded-xl p-4 border border-[#d6cdf5]">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-[#7c3aed]" />
        <span className="text-sm font-semibold text-[#343a40]">Ask AI</span>
        <span className="text-xs text-[#6c757d]">
          Natural-language search across 817 markets. Re-ranks live.
        </span>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1" ref={wrapRef}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(value);
              if (e.key === "Escape") { setFocused(false); }
            }}
            placeholder='e.g. "Top 10 Texas markets for young families with high incomes"'
            className="h-11 bg-white"
            disabled={loading}
          />
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[#e2e8f0] rounded-md shadow-lg overflow-hidden">
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-[#8794ab] border-b border-[#eef2f7]">
                Recent searches
              </div>
              <div className="max-h-72 overflow-y-auto">
                {suggestions.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); submit(h.query); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#f4f0ff] text-sm border-b border-[#f3f5f9] last:border-b-0 flex items-start gap-2"
                  >
                    <Clock size={13} className="mt-0.5 text-[#8794ab] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[#343a40] truncate">{h.query}</div>
                      <div className="text-[11px] text-[#8794ab]">
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={() => submit(value)}
          disabled={loading || !value.trim()}
          className={cn("h-11 px-5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white")}
        >
          {loading ? <Loader2 size={16} className="animate-spin mr-1" /> : <Sparkles size={16} className="mr-1" />}
          Ask
        </Button>
        {hasResult && (
          <Button variant="outline" className="h-11" onClick={onClear} title="Clear AI results">
            <X size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
