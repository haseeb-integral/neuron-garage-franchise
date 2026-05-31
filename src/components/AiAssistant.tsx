import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Volume2, VolumeX, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { stripMarkdownForSpeech } from "@/lib/stripMarkdown";
import { useToast } from "@/hooks/use-toast";

const NAVY = "#003c7e";
const BLUE = "#0757ff";
const YELLOW = "#FFD400";
const INK = "#0b1a36";

type Msg = { role: "user" | "assistant"; content: string; followups?: string[] };

export type AssistantContext = "general" | "city-search" | "teacher-search" | "email-outreach" | "candidate-pipeline";

const SUGGESTIONS: Record<AssistantContext, { title: string; prompts: string[] }> = {
  general: {
    title: "Try asking",
    prompts: [
      "Where should I start as a new staff member?",
      "Walk me through the four features in order.",
      "What is Neuron AI and how do I open it?",
      "Are we emailing teachers yet?",
      "What's coming in Phase 2?",
    ],
  },
  "city-search": {
    title: "About City Search",
    prompts: [
      "How is a city's score calculated?",
      "What does Tier A, B, C, D mean?",
      "What is 'one calibrated number everywhere'?",
      "Why do I see Total Score and Weighted Composite Index?",
      "How do I compare cities side-by-side?",
    ],
  },
  "teacher-search": {
    title: "About Teacher Search",
    prompts: [
      "How is a teacher's fit score calculated?",
      "What is the Market Context Banner?",
      "How do Saved Lists work?",
      "What does 'Promote' actually do?",
      "What's in the Outreach Intelligence panel?",
    ],
  },
  "email-outreach": {
    title: "About Email Outreach",
    prompts: [
      "What's the difference between Master Pool and SmartLead?",
      "Are we emailing teachers yet?",
      "What do the seven reply buckets mean?",
      "How does the CSV import + AI mapping work?",
      "How does AI personalization work?",
    ],
  },
  "candidate-pipeline": {
    title: "About Candidate Pipeline",
    prompts: [
      "What are the 7 pipeline stages?",
      "Why can't I drop a card into Signing?",
      "What is the 16-day FDD gate?",
      "What's in the Documents tab?",
      "How does Export Packet work?",
    ],
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AssistantContext;
}

export function AiAssistant({ open, onOpenChange, context }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const suggestions = SUGGESTIONS[context] ?? SUGGESTIONS.general;

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("users-guide-ai", {
        body: { messages: next },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "Sorry — I didn't catch a response.";
      const followups = (data as { followups?: string[] })?.followups ?? [];
      const newMessages: Msg[] = [...next, { role: "assistant" as const, content: reply, followups }];
      setMessages(newMessages);
      if (voiceOn) playTts(reply, newMessages.length - 1);
    } catch (err) {
      console.error(err);
      toast({
        title: "Couldn't reach the assistant",
        description: String((err as Error)?.message ?? err),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const playTts = async (text: string, idx: number) => {
    try {
      audioRef.current?.pause();
      setSpeakingIdx(idx);
      const { data, error } = await supabase.functions.invoke("deepgram-tts", {
        body: { text },
      });
      if (error) throw error;
      const { audio, mime } = data as { audio: string; mime: string };
      const url = `data:${mime};base64,${audio}`;
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => setSpeakingIdx(null);
      a.onerror = () => setSpeakingIdx(null);
      await a.play();
    } catch (err) {
      console.error("TTS error", err);
      setSpeakingIdx(null);
    }
  };

  const stopSpeaking = () => {
    audioRef.current?.pause();
    setSpeakingIdx(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[460px]"
      >
        {/* Header */}
        <SheetHeader
          className="space-y-0 px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
            color: "white",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: YELLOW, color: INK }}
              >
                <Sparkles size={17} />
              </span>
              <div className="text-left">
                <SheetTitle className="text-[15px] font-bold text-white">
                  AI Assistant
                </SheetTitle>
                <div className="text-[11px] opacity-80">Neuron Garage helper</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (speakingIdx !== null) stopSpeaking();
                  setVoiceOn((v) => !v);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
                aria-label={voiceOn ? "Turn voice off" : "Turn voice on"}
                title={voiceOn ? "Voice on" : "Voice off"}
              >
                {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ background: "#f8faff" }}>
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-[13.5px] leading-relaxed" style={{ color: "#3a4a66" }}>
                Hi! I'm your assistant for the Neuron Garage console. Ask me anything about
                <strong> City Search</strong>, <strong>Teacher Search</strong>, <strong>Email Outreach</strong>,
                or the <strong>Candidate Pipeline</strong> — or pick one below to get started.
              </p>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: NAVY }}>
                  {suggestions.title}
                </div>
                <div className="space-y-2">
                  {suggestions.prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="group flex w-full items-start gap-2 rounded-xl bg-white px-3.5 py-2.5 text-left text-[13px] transition-all hover:-translate-y-0.5"
                      style={{ color: INK, border: "1px solid #e6ecf8", boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}
                    >
                      <Sparkles size={13} style={{ color: BLUE }} className="mt-0.5 flex-shrink-0" />
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                  style={
                    m.role === "user"
                      ? { background: BLUE, color: "white" }
                      : { background: "white", color: INK, border: "1px solid #e6ecf8" }
                  }
                >
                  <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                    {m.role === "assistant" ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                  {m.role === "assistant" && (
                    <div className="mt-2 flex items-center gap-2">
                      {speakingIdx === idx ? (
                        <button
                          onClick={stopSpeaking}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold"
                          style={{ color: BLUE }}
                        >
                          <VolumeX size={12} /> Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => playTts(stripMarkdownForSpeech(m.content), idx)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold opacity-70 hover:opacity-100"
                          style={{ color: NAVY }}
                        >
                          <Volume2 size={12} /> Play
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {m.role === "assistant" && idx === messages.length - 1 && !sending && m.followups && m.followups.length > 0 && (
                  <div className="mt-2 max-w-[88%] space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: NAVY, opacity: 0.7 }}>
                      Suggested follow-ups
                    </div>
                    {m.followups.map((f) => (
                      <button
                        key={f}
                        onClick={() => send(f)}
                        className="flex w-full items-start gap-2 rounded-lg bg-white px-3 py-2 text-left text-[12.5px] transition-all hover:-translate-y-0.5"
                        style={{ color: INK, border: "1px solid #e6ecf8", boxShadow: "0 2px 6px rgba(15,23,42,0.04)" }}
                      >
                        <Sparkles size={12} style={{ color: BLUE }} className="mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px]" style={{ border: "1px solid #e6ecf8", color: "#5a6a85" }}>
                  <Loader2 size={14} className="animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-[#eef2f7] bg-white px-4 py-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about the console…"
            disabled={sending}
            className="h-10 border-[#e6ecf8] text-[13.5px]"
          />
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-10 px-3"
            style={{ background: BLUE, color: "white" }}
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
