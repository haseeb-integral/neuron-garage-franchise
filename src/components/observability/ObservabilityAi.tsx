// ============================================================================
// Observability AI — context + slide-in chat sheet.
//
// One provider per /observability page. Any child can call openAi() to launch
// the assistant with a section + topic + suggested-questions payload. The
// agent knows which Ask-AI button was clicked thanks to that payload.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Sparkles, X, Loader2, AlertCircle, Send, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

export type AiSection = "global" | "status" | "accuracy" | "alerts" | "rule" | "domain";

interface OpenPayload {
  section: AiSection;
  /** Human-readable section/topic label shown in the header chip. */
  sectionLabel: string;
  /** Optional fine-grained context (rule name, domain key, etc.) passed to the model. */
  topic?: string;
  /** Pre-populated question chips. */
  suggestions?: string[];
}

interface Ctx {
  open: (payload: OpenPayload) => void;
}

const AiContext = createContext<Ctx | null>(null);

export function useObservabilityAi(): Ctx {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useObservabilityAi must be used inside <ObservabilityAiProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — owns sheet state, conversation, and the invoke loop.
// ---------------------------------------------------------------------------

type ChatMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCallTrace[] };

type ToolCallTrace = { name: string; args: unknown; result: unknown };

export function ObservabilityAiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<OpenPayload | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<Record<number, boolean>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const open = useCallback((p: OpenPayload) => {
    setPayload(p);
    setIsOpen(true);
    setMessages([]);
    setError(null);
    setQuestion("");
    setShowSources({});
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Auto-focus input + scroll to bottom on changes
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, payload]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || loading || !payload) return;
      setLoading(true);
      setError(null);
      setQuestion("");
      const nextHistory = [...messages, { role: "user", content: q } as ChatMsg];
      setMessages(nextHistory);

      // Conversation history we send the function — strip our local tool-call traces.
      const historyForApi = nextHistory.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const { data, error: invErr } = await supabase.functions.invoke("observability-ai", {
          body: {
            question: q,
            section: payload.section,
            topic: payload.topic ?? payload.sectionLabel,
            history: historyForApi,
          },
        });
        if (invErr) throw new Error(invErr.message ?? String(invErr));
        if ((data as any)?.error) throw new Error((data as any).error);
        const answer = String((data as any)?.answer ?? "");
        const toolCalls = (data as any)?.toolCalls as ToolCallTrace[] | undefined;
        setMessages((prev) => [...prev, { role: "assistant", content: answer, toolCalls }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, payload],
  );

  const ctxValue = useMemo<Ctx>(() => ({ open }), [open]);

  return (
    <AiContext.Provider value={ctxValue}>
      {children}

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-[#07142f]/30 backdrop-blur-[2px]"
          aria-hidden
        />
      )}

      {/* Sheet */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l border-[#eef2f7] bg-white shadow-2xl transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-[#eef2f7] px-4 py-3.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #003c7e 0%, #0757ff 100%)" }}
          >
            <Sparkles size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#526078]">
              Data Observability · Ask AI
            </div>
            <div className="mt-0.5 truncate text-[14px] font-black text-[#07142f]">
              {payload?.sectionLabel ?? "Observability"}
            </div>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-[#526078] hover:bg-[#f7faff] hover:text-[#07142f]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        {/* Body — conversation */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !loading && (
            <div className="space-y-3">
              <p className="text-[13px] leading-relaxed text-[#526078]">
                I'm scoped to <strong className="text-[#07142f]">{payload?.sectionLabel}</strong> right
                now, but I can read every part of the observability stack — rules, history, incidents,
                outliers, samples. Ask me anything, or start with a suggestion below.
              </p>
              {payload?.suggestions && payload.suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  {payload.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="group flex items-start gap-2 rounded-xl border border-[#eef2f7] bg-[#f7faff] px-3 py-2.5 text-left text-[13px] text-[#07142f] transition-colors hover:border-[#dbe4f2] hover:bg-white"
                    >
                      <Sparkles size={13} className="mt-0.5 shrink-0 text-[#174be8]" />
                      <span className="flex-1">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`mb-4 ${m.role === "user" ? "flex justify-end" : ""}`}>
              {m.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#174be8] px-3.5 py-2 text-[13px] leading-relaxed text-white">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-full">
                  <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-[#07142f] [&_p]:my-1.5 [&_table]:text-[11px] [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:border [&_th]:border [&_td]:border [&_th]:border-[#e7edf5] [&_td]:border-[#e7edf5] [&_th]:bg-[#f5f8ff] [&_code]:rounded [&_code]:bg-[#f5f8ff] [&_code]:px-1 [&_ul]:my-1.5 [&_ol]:my-1.5">
                    <ReactMarkdown>{m.content || "_(no answer)_"}</ReactMarkdown>
                  </div>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2 rounded-lg border border-[#eef2f8] bg-[#fafbfd]">
                      <button
                        onClick={() => setShowSources((p) => ({ ...p, [i]: !p[i] }))}
                        className="flex w-full items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#526078] hover:text-[#07142f]"
                      >
                        {showSources[i] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        Data sources · {m.toolCalls.length}{" "}
                        {m.toolCalls.length === 1 ? "query" : "queries"}
                      </button>
                      {showSources[i] && (
                        <div className="space-y-2 border-t border-[#eef2f8] px-2.5 py-2">
                          {m.toolCalls.map((tc, j) => (
                            <div key={j} className="rounded border border-[#e7edf5] bg-white">
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
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-[#526078]">
              <Loader2 size={13} className="animate-spin" /> Reading your data…
            </div>
          )}
          {error && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#fee2e2] bg-[#fef2f2] px-2.5 py-2 text-[12px] text-[#991b1b]">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-[#eef2f7] bg-white px-4 py-3">
          <div className="flex items-end gap-2 rounded-2xl border border-[#dbe4f2] bg-white px-3 py-2 focus-within:border-[#174be8] focus-within:ring-2 focus-within:ring-[#174be8]/15">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
                if (e.key === "Escape") close();
              }}
              placeholder="Ask anything about this data…"
              rows={1}
              className="max-h-32 min-h-[20px] flex-1 resize-none bg-transparent text-[13px] leading-snug outline-none placeholder:text-[#8794ab]"
              disabled={loading}
            />
            <button
              onClick={() => ask(question)}
              disabled={loading || !question.trim()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#174be8] text-white disabled:opacity-40"
              aria-label="Send"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#94a3b8]">
            Read-only · Powered by Lovable AI · Sees the same data you do
          </p>
        </div>
      </aside>
    </AiContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Reusable Ask-AI button
// ---------------------------------------------------------------------------

interface AskAiButtonProps {
  section: AiSection;
  sectionLabel: string;
  topic?: string;
  suggestions?: string[];
  variant?: "primary" | "ghost" | "subtle";
  label?: string;
  className?: string;
}

export function AskAiButton({
  section,
  sectionLabel,
  topic,
  suggestions,
  variant = "ghost",
  label = "Ask AI",
  className = "",
}: AskAiButtonProps) {
  const { open } = useObservabilityAi();
  const handle = () => open({ section, sectionLabel, topic, suggestions });

  if (variant === "primary") {
    return (
      <button
        onClick={handle}
        className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(7,87,255,0.25)] transition-transform hover:-translate-y-px ${className}`}
        style={{ background: "linear-gradient(135deg, #003c7e 0%, #0757ff 100%)" }}
      >
        <Sparkles size={13} />
        {label}
      </button>
    );
  }
  if (variant === "subtle") {
    return (
      <button
        onClick={handle}
        className={`inline-flex items-center gap-1 rounded-full bg-[#f5f8ff] px-2.5 py-1 text-[11px] font-bold text-[#174be8] hover:bg-[#e0ebff] ${className}`}
      >
        <Sparkles size={11} />
        {label}
      </button>
    );
  }
  return (
    <button
      onClick={handle}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#dbe4f2] bg-white px-3 py-1.5 text-[12px] font-bold text-[#174be8] hover:bg-[#f5f8ff] ${className}`}
    >
      <Sparkles size={12} />
      {label}
    </button>
  );
}
