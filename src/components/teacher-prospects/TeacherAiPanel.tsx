import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, Send, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

interface Context {
  cityFilters: string[];
  search: string;
  funnel: { found: number; enriched: number; emailReady: number; inOutreach: number } | null;
  topTeachers: Array<{ name: string; school: string; city: string; state: string; fitScore: number; status: string; hasEmail: boolean }>;
}

interface Props {
  context: Context;
}

const STORAGE_KEY = "tp:ai-panel-msgs-v1";
const SAMPLE_PROMPTS = [
  "Summarize the current filter in 3 bullets.",
  "Which schools have 3+ promising teachers?",
  "What should I do next to move this market forward?",
  "Top 10 teachers ranked by fit with reasoning.",
];

function loadMsgs(): Msg[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

export function TeacherAiPanel({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => loadMsgs());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-50)));
  }, [msgs]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, sending]);

  const send = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || sending) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("teacher-search-ai", {
        body: { messages: next, context },
      });
      if (error) throw new Error(error.message);
      const reply = (data as { reply?: string; error?: string })?.reply ?? "";
      const err = (data as { error?: string })?.error;
      if (err) throw new Error(err);
      setMsgs([...next, { role: "assistant", content: reply || "_(no response)_" }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const clear = () => {
    setMsgs([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#174be8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#174be8]/30 hover:bg-[#123fc5]"
          aria-label="Open AI assistant"
        >
          <Sparkles size={16} /> Ask AI
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b border-[#e7edf5] px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-[#07142f]">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[#174be8] text-white">
                <Sparkles size={14} />
              </span>
              Teacher Search Co-pilot
            </SheetTitle>
            {msgs.length > 0 && (
              <button onClick={clear} className="rounded-md p-1.5 text-[#66728a] hover:bg-[#f4f7ff] hover:text-[#174be8]" aria-label="Clear chat">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#66728a]">
            Grounded on your current filter ({context.funnel?.found.toLocaleString() ?? "—"} teachers
            {context.cityFilters.length ? ` in ${context.cityFilters.length} ${context.cityFilters.length === 1 ? "market" : "markets"}` : ""}).
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
          {msgs.length === 0 ? (
            <div className="space-y-2">
              <div className="text-[12px] text-[#526078]">Try one of these:</div>
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="block w-full rounded-lg border border-[#e7edf5] bg-white px-3 py-2 text-left text-[12px] text-[#07142f] hover:border-[#bfd0f0] hover:bg-[#f4f7ff]"
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#174be8] px-3 py-2 text-[13px] text-white">
                      {m.content}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-[13px] text-[#07142f] [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5 [&_code]:rounded [&_code]:bg-[#f0f4fb] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-[12px] text-[#66728a]">
                  <Loader2 size={12} className="animate-spin" /> Thinking…
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[#e7edf5] p-3">
          <div className="flex items-end gap-2 rounded-xl border border-[#dbe4f2] bg-white p-2 focus-within:border-[#174be8]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Ask about these teachers…"
              rows={1}
              disabled={sending}
              className="max-h-32 flex-1 resize-none bg-transparent text-[13px] text-[#07142f] placeholder:text-[#8794ab] focus:outline-none"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#174be8] text-white disabled:bg-[#bfd0f0]"
              aria-label="Send"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10.5px] text-[#8794ab]">Answers reflect your current filter. Not saved server-side.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
