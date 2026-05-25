import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, X, CornerDownLeft, ArrowRight, Check } from "lucide-react";
import { useNeuronAi as useNeuronAiCtx } from "./NeuronAiProvider";
import { useNeuronAi, type AssistantReply } from "@/hooks/useNeuronAi";

const NAVY = "#003c7e";
const BLUE = "#0757ff";
const PURPLE = "#7c3aed";
const INK = "#0b1a36";

// Slash command discoverability — clickable chips that pre-fill the input.
const SLASH_COMMANDS = [
  { cmd: "/find", desc: "find cities, teachers, or candidates", prompt: "/find " },
  { cmd: "/why", desc: "explain a score or a tier", prompt: "/why is " },
  { cmd: "/explain", desc: "walk me through a feature", prompt: "/explain " },
  { cmd: "/add", desc: "add to watchlist or a campaign", prompt: "/add " },
  { cmd: "/stage", desc: "change a candidate's pipeline stage", prompt: "/stage " },
];

export function NeuronAiPanel() {
  const navigate = useNavigate();
  const { open, setOpen, screenContext } = useNeuronAiCtx();
  const { messages, sending, confirming, send, confirm, reset } = useNeuronAi();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return;
    setInput("");
    const reply = await send(text.trim(), {
      route: screenContext.route,
      screenState: screenContext.state,
    });
    // Auto-execute navigate replies (no Confirm needed for reads).
    if (reply?.kind === "navigate_and_apply") {
      navigate(reply.route);
      // Pages own the state-apply via the screenContext mechanism; here we
      // store apply on window so the page can read it on next mount.
      // Lightweight, no global store needed for v1.
      (window as unknown as { __neuronAiApply?: unknown }).__neuronAiApply = {
        route: reply.route, apply: reply.apply, ts: Date.now(),
      };
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        {/* Header */}
        <SheetHeader
          className="space-y-0 px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 60%, ${PURPLE} 100%)`,
            color: "white",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <Sparkles size={17} />
              </span>
              <div className="text-left">
                <SheetTitle className="text-[15px] font-bold text-white">Neuron AI</SheetTitle>
                <div className="text-[11px] opacity-80">
                  on {screenContext.route === "/" ? "Dashboard" : screenContext.route}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  className="rounded-md px-2 py-1 text-[11px] text-white/85 hover:bg-white/10"
                  title="Start a new chat"
                >
                  New chat
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ background: "#fbfbff" }}>
          {messages.length === 0 ? (
            <div className="space-y-5">
              <div>
                <p className="text-[15px] font-semibold" style={{ color: INK }}>
                  👋 Hi, I'm Neuron AI.
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: "#3a4a66" }}>
                  I can help you across the whole app — find cities, explain scores,
                  navigate between screens, and take actions on your behalf.
                </p>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: PURPLE }}>
                  Try one of these
                </div>
                <div className="space-y-1.5">
                  {SLASH_COMMANDS.map((s) => (
                    <button
                      key={s.cmd}
                      onClick={() => {
                        setInput(s.prompt);
                        inputRef.current?.focus();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-[#e6ecf8] bg-white px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-[#d6cdf5]"
                    >
                      <code className="rounded bg-[#f1ecff] px-1.5 py-0.5 text-[11px] font-mono font-semibold" style={{ color: PURPLE }}>
                        {s.cmd}
                      </code>
                      <span className="text-[12.5px]" style={{ color: INK }}>{s.desc}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[12px]" style={{ color: "#8794ab" }}>
                  Or just type your question.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <MessageBubble
                  key={idx}
                  role={m.role}
                  content={m.content}
                  reply={m.reply}
                  onConfirm={async (action) => {
                    const ok = await confirm(action, screenContext.route);
                    return ok;
                  }}
                  onChip={(text) => handleSend(text)}
                  confirming={confirming}
                />
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px]" style={{ border: "1px solid #e6ecf8", color: "#5a6a85" }}>
                    <Loader2 size={14} className="animate-spin" /> Thinking…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex items-center gap-2 border-t border-[#eef2f7] bg-white px-4 py-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Neuron AI…"
            disabled={sending}
            className="h-10 border-[#e6ecf8] text-[13.5px]"
          />
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-10 px-3"
            style={{ background: PURPLE, color: "white" }}
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function MessageBubble({
  role, content, reply, onConfirm, onChip, confirming,
}: {
  role: "user" | "assistant";
  content: string;
  reply?: AssistantReply;
  onConfirm: (action: { action_type: string; payload: Record<string, unknown> }) => Promise<boolean>;
  onChip: (text: string) => void;
  confirming: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className={`flex flex-col ${role === "user" ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={
          role === "user"
            ? { background: PURPLE, color: "white" }
            : { background: "white", color: INK, border: "1px solid #e6ecf8" }
        }
      >
        {role === "assistant" ? (
          <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
      </div>

      {/* Action cards on the assistant message */}
      {role === "assistant" && reply?.kind === "navigate_and_apply" && (
        <div className="mt-2 max-w-[88%] flex items-center gap-1.5 text-[11px]" style={{ color: "#5a6a85" }}>
          <ArrowRight size={11} /> Navigated to {reply.route}
        </div>
      )}

      {role === "assistant" && reply?.kind === "propose_action" && !dismissed && (
        <div className="mt-2 max-w-[88%] rounded-xl border border-[#d6cdf5] bg-[#fbfaff] p-3">
          <div className="mb-2 text-[12.5px] font-medium" style={{ color: INK }}>
            {reply.preview_text}
          </div>
          {confirmed ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#0ea66e]">
              <Check size={12} /> Confirmed
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={confirming}
                onClick={async () => {
                  const ok = await onConfirm({ action_type: reply.action_type, payload: reply.payload });
                  if (ok) setConfirmed(true);
                }}
                className="h-7 px-3 text-[11px]"
                style={{ background: PURPLE, color: "white" }}
              >
                {confirming ? <Loader2 size={11} className="animate-spin" /> : "Confirm"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDismissed(true)}
                className="h-7 px-3 text-[11px]"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {role === "assistant" && reply?.kind === "clarify" && (
        <div className="mt-2 max-w-[88%] space-y-1.5">
          <div className="text-[12px] font-medium" style={{ color: INK }}>{reply.question}</div>
          <div className="flex flex-wrap gap-1.5">
            {reply.chip_suggestions.map((c) => (
              <button
                key={c}
                onClick={() => onChip(c)}
                className="rounded-full border border-[#d6cdf5] bg-white px-2.5 py-1 text-[11px] font-medium hover:bg-[#f4f0ff]"
                style={{ color: PURPLE }}
              >
                <CornerDownLeft size={9} className="inline mr-1" />
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {role === "assistant" && reply?.kind === "answer" && reply.followups && reply.followups.length > 0 && (
        <div className="mt-2 max-w-[88%] flex flex-wrap gap-1.5">
          {reply.followups.slice(0, 3).map((f) => (
            <button
              key={f}
              onClick={() => onChip(f)}
              className="rounded-full border border-[#e6ecf8] bg-white px-2.5 py-1 text-[11px] hover:border-[#d6cdf5] hover:bg-[#f4f0ff]"
              style={{ color: "#5b3fbf" }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
