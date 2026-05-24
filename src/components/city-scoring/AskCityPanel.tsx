import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  cityId: string | null;
  cityName: string;
  stateName: string;
  totalScore: number;
}

export function AskCityPanel({ cityId, cityName, stateName, totalScore }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggested = [
    `Why is ${cityName} scored ${totalScore}/100?`,
    `What would have to change for ${cityName} to move up a tier?`,
    `Who are the realistic competitors I'd face here?`,
    `Compare ${cityName} to a Tier-A alternative.`,
    `What teachers should I recruit first in ${cityName}?`,
  ];

  useEffect(() => {
    setMessages([]);
  }, [cityId]);

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
        body: JSON.stringify({ cityId, messages: nextMessages }),
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-[#eef2f7] px-3 py-2"
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
    </section>
  );
}
