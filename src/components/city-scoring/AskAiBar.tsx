import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, History, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshHistory = async () => {
    const { data, error } = await supabase
      .from("ai_query_history")
      .select("id, query, created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    if (!error) setHistory((data ?? []) as HistoryRow[]);
  };
  useEffect(() => { refreshHistory(); }, []);

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    // Keep the query visible in the input so the user sees what they asked.
    // Close the history popover and refresh the saved list right away.
    setOpen(false);
    refreshHistory();
    setTimeout(refreshHistory, 1500);
  };

  return (
    <div className="mb-4 bg-gradient-to-r from-[#f4f0ff] to-[#eaf0ff] rounded-xl p-4 border border-[#d6cdf5]">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-[#7c3aed]" />
        <span className="text-sm font-semibold text-[#343a40]">Ask AI</span>
        <span className="text-xs text-[#6c757d]">
          Natural-language search across 960 markets. Re-ranks live.
        </span>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(value);
              if (e.key === "Escape") { setValue(""); setOpen(false); }
            }}
            placeholder='e.g. "Top 10 Texas markets for young families with high incomes"'
            className="h-11 pr-10 bg-white"
            disabled={loading}
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6c757d] hover:text-[#343a40]"
                aria-label="Recent searches"
              >
                <History size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0">
              <div className="p-2 text-xs font-medium text-[#6c757d] border-b">
                Recent searches
              </div>
              <div className="max-h-72 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="p-4 text-sm text-[#8794ab]">No saved searches yet.</div>
                ) : (
                  history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => submit(h.query)}
                      className="w-full text-left px-3 py-2 hover:bg-[#f4f0ff] text-sm border-b last:border-b-0"
                    >
                      <div className="text-[#343a40] truncate">{h.query}</div>
                      <div className="text-[11px] text-[#8794ab]">
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
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
