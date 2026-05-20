// Reusable per-screen "Ask" assistant.
// Phase 1: read-only Q&A. Slim top-bar input → streams answer in collapsible panel.
// Usage: <AskAssistant screen="email" />
//
// AGENTS.md "Show the math": every answer reveals which tools were called.

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, ChevronDown, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Screen = "email"; // | "city" | "teacher" | "pipeline" — wire later

type ToolCall = { name: string; args: unknown; result: unknown };
type Answer = { answer: string; toolCalls: ToolCall[]; model: string };

const PLACEHOLDERS: Record<Screen, string> = {
  email: "Ask about queue, replies, campaigns, batches… (e.g. \"how many positive replies today?\")",
};

export function AskAssistant({ screen }: { screen: Screen }) {
  const [question, setQuestion] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Answer | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function ask() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setOpen(true);
    setSourcesOpen(false);
    try {
      const { data, error: invErr } = await supabase.functions.invoke("ask", {
        body: { screen, question: q },
      });
      if (invErr) throw new Error(invErr.message ?? String(invErr));
      if (data?.error) throw new Error(data.error);
      setResult(data as Answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
    setSourcesOpen(false);
  }

  return (
    <div className="mb-3">
      {/* Input bar */}
      <div className="flex items-center gap-2 rounded-xl border border-[#dbe4f2] bg-gradient-to-r from-[#f5f8ff] to-white px-3 py-1.5 focus-within:border-[#174be8] focus-within:ring-2 focus-within:ring-[#174be8]/15 transition">
        <Sparkles size={14} className="shrink-0 text-[#174be8]" />
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ask();
            }
            if (e.key === "Escape") close();
          }}
          placeholder={PLACEHOLDERS[screen]}
          className="h-7 min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#8794ab]"
          disabled={loading}
        />
        <span className="hidden text-[10px] font-bold uppercase tracking-wide text-[#8794ab] sm:inline">
          Ask · read-only
        </span>
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="inline-flex h-6 items-center gap-1 rounded-md bg-[#174be8] px-2 text-[10px] font-bold text-white disabled:opacity-40"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : "Ask"}
        </button>
      </div>

      {/* Answer panel */}
      {open && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-[#e7edf5] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-[#eef2f8] px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#526078]">
              <Sparkles size={11} className="text-[#174be8]" />
              {loading ? "Thinking…" : error ? "Error" : "Answer"}
              {result?.model && !loading && !error && (
                <span className="font-normal normal-case text-[#8794ab]">· {result.model}</span>
              )}
            </div>
            <button
              onClick={close}
              className="rounded p-0.5 text-[#8794ab] hover:bg-[#f5f8ff] hover:text-[#07142f]"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>

          <div className="px-3 py-2.5">
            {loading && (
              <div className="flex items-center gap-2 text-[12px] text-[#526078]">
                <Loader2 size={13} className="animate-spin" />
                Reading your data…
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-[#fee2e2] bg-[#fef2f2] px-2.5 py-2 text-[12px] text-[#991b1b]">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {result && (
              <>
                <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-[#07142f] [&_p]:my-1.5 [&_table]:text-[11px] [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:border [&_th]:border [&_td]:border [&_th]:border-[#e7edf5] [&_td]:border-[#e7edf5] [&_th]:bg-[#f5f8ff] [&_code]:rounded [&_code]:bg-[#f5f8ff] [&_code]:px-1 [&_ul]:my-1.5 [&_ol]:my-1.5">
                  <ReactMarkdown>{result.answer || "_(no answer)_"}</ReactMarkdown>
                </div>
                {result.toolCalls.length > 0 && (
                  <div className="mt-2.5 rounded-lg border border-[#eef2f8] bg-[#fafbfd]">
                    <button
                      onClick={() => setSourcesOpen((s) => !s)}
                      className="flex w-full items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#526078] hover:text-[#07142f]"
                    >
                      {sourcesOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      Show data sources · {result.toolCalls.length} {result.toolCalls.length === 1 ? "query" : "queries"}
                    </button>
                    {sourcesOpen && (
                      <div className="space-y-2 border-t border-[#eef2f8] px-2.5 py-2">
                        {result.toolCalls.map((tc, i) => (
                          <div key={i} className="rounded border border-[#e7edf5] bg-white">
                            <div className="border-b border-[#eef2f8] bg-[#f5f8ff] px-2 py-1 font-mono text-[10px] font-bold text-[#174be8]">
                              {tc.name}({JSON.stringify(tc.args)})
                            </div>
                            <pre className="max-h-60 overflow-auto px-2 py-1.5 text-[10px] leading-snug text-[#526078]">
                              {JSON.stringify(tc.result, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
