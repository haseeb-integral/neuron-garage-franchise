import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, GitCompareArrows, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CityNarrative, CityNarrativeContext } from "@/lib/useCityNarrative";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface CityHit { id: string; city_name: string; state_abbr: string; }


interface Props {
  cityId: string | null;
  cityName: string;
  stateName: string;
  totalScore: number;
  narrativeContext?: CityNarrative | null;
  focusContext?: CityNarrativeContext | null;
}

export function AskCityPanel({ cityId, cityName, stateName, totalScore, narrativeContext, focusContext }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareHits, setCompareHits] = useState<CityHit[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggested = [
    `Why is ${cityName} scored ${totalScore}/100?`,
    `What would have to change for ${cityName} to move up a tier?`,
    `Who are the realistic competitors I'd face here?`,
    `What teachers should I recruit first in ${cityName}?`,
  ];

  useEffect(() => {
    setMessages([]);
    setCompareOpen(false);
    setCompareQuery("");
    setCompareHits([]);
  }, [cityId]);

  // Debounced city search for the "Compare to…" picker
  useEffect(() => {
    if (!compareOpen) return;
    const q = compareQuery.trim();
    if (q.length < 2) { setCompareHits([]); return; }
    let cancelled = false;
    setCompareLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("us_cities_scored")
        .select("id, city_name, state_abbr")
        .ilike("city_name", `${q}%`)
        .order("population", { ascending: false })
        .limit(8);
      if (!cancelled) {
        setCompareHits((data ?? []).filter((c) => c.id !== cityId) as CityHit[]);
        setCompareLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [compareQuery, compareOpen, cityId]);


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!cityId || !text.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-city`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ cityId, messages: nextMessages, narrativeContext, focusContext }),
      });
      if (!resp.ok || !resp.body) {
        const errText = await resp.text();
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: `Error: ${errText || resp.statusText}` };
          return copy;
        });
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `Error: ${e instanceof Error ? e.message : "request failed"}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <section className="rounded-lg border border-[#e5eaf2] bg-white">
      <div className="flex items-center gap-2 border-b border-[#eef2f7] px-4 py-3">
        <Sparkles size={14} className="text-[#174be8]" />
        <h3 className="text-[13px] font-bold text-[#07142f]">
          Ask AI about {cityName}, {stateName}
        </h3>
      </div>

      {messages.length === 0 && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[11px] text-[#8794ab]">Suggested questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-[#dbe4f2] bg-[#f7faff] px-2.5 py-1 text-[11px] text-[#174be8] hover:bg-[#eaf1ff]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-[480px] overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-lg bg-[#eaf1ff] px-3 py-2 text-[12.5px] text-[#07142f]"
                : "mr-2 rounded-lg bg-[#f7faff] border border-[#eef2f7] px-3 py-2 text-[12.5px] text-[#14233b] prose prose-sm max-w-none"
            }
          >
            {m.role === "assistant" ? (
              m.content ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                <span className="inline-flex items-center gap-2 text-[#8794ab]">
                  <Loader2 size={12} className="animate-spin" /> Thinking…
                </span>
              )
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>

      <div className="relative border-t border-[#eef2f7] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setCompareOpen((v) => !v)}
              disabled={streaming}
              className="inline-flex items-center gap-1 rounded-full border border-[#dbe4f2] bg-[#f7faff] px-2.5 py-1.5 text-[11px] font-semibold text-[#174be8] hover:bg-[#eaf1ff] disabled:opacity-50"
              title="Compare to another city"
            >
              <GitCompareArrows size={12} /> Compare to…
            </button>
            {compareOpen && (
              <div className="absolute bottom-full left-0 mb-2 z-20 w-72 rounded-lg border border-[#dbe4f2] bg-white shadow-lg">
                <div className="flex items-center gap-1 border-b border-[#eef2f7] px-2 py-1.5">
                  <input
                    autoFocus
                    value={compareQuery}
                    onChange={(e) => setCompareQuery(e.target.value)}
                    placeholder="Search city…"
                    className="flex-1 rounded px-1.5 py-1 text-[12px] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCompareOpen(false)}
                    className="rounded p-1 text-[#8794ab] hover:bg-[#f1f4f9]"
                    aria-label="Close"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {compareLoading && (
                    <p className="px-3 py-2 text-[11px] text-[#8794ab]">Searching…</p>
                  )}
                  {!compareLoading && compareQuery.trim().length < 2 && (
                    <p className="px-3 py-2 text-[11px] text-[#8794ab]">Type 2+ letters to find a city.</p>
                  )}
                  {!compareLoading && compareQuery.trim().length >= 2 && compareHits.length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-[#8794ab]">No matches.</p>
                  )}
                  {compareHits.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCompareOpen(false);
                        setCompareQuery("");
                        send(`Compare ${cityName}, ${stateName} to ${c.city_name}, ${c.state_abbr}.`);
                      }}
                      className="block w-full text-left px-3 py-1.5 text-[12px] text-[#07142f] hover:bg-[#f7faff]"
                    >
                      {c.city_name}, {c.state_abbr}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about ${cityName}…`}
              className="flex-1 rounded-md border border-[#dbe4f2] px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-[#174be8]"
              disabled={streaming}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="rounded-md bg-[#174be8] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              {streaming ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
