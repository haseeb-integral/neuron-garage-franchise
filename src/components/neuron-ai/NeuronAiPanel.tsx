import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, ArrowUp, X, CornerDownLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useNeuronAi as useNeuronAiCtx } from "./NeuronAiProvider";
import { useNeuronAi, type AssistantReply } from "@/hooks/useNeuronAi";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// Neuron AI Panel — ChatGPT-grade chat surface.
// Clean white header, sparkle avatars, typing dots, rounded composer with
// send-inside-input. No more navy→purple gradient blast.
// ============================================================================

const PURPLE = "#7c3aed";
const INK = "#0b1a36";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/city-scoring": "City Search",
  "/teacher-prospects": "Teacher Search",
  "/email-outreach": "Email Outreach",
  "/candidate-pipeline": "Candidate Pipeline",
  "/observability": "Data Observability",
};

// Route-aware suggestions. Each is a ready-to-send prompt that exercises the
// AI's real lookup tools — not generic slash placeholders.
const ROUTE_SUGGESTIONS: Record<string, { label: string; prompt: string }[]> = {
  "/city-scoring": [
    { label: "Top 5 cities right now", prompt: "What are the top 5 cities by composite score right now?" },
    { label: "Best Texas markets", prompt: "Show me the best Texas cities for a franchise." },
    { label: "Explain a city's score", prompt: "Explain Frisco TX's composite score and pillar breakdown." },
    { label: "What can you do here?", prompt: "/help" },
  ],
  "/teacher-search": [
    { label: "Open Teacher Search", prompt: "Take me to Teacher Search." },
    { label: "What can you do here?", prompt: "/help" },
  ],
  "/email-outreach": [
    { label: "List active campaigns", prompt: "List active email campaigns and their status." },
    { label: "What can you do here?", prompt: "/help" },
  ],
  "/candidate-pipeline": [
    { label: "Count by stage", prompt: "How many candidates are in each pipeline stage?" },
    { label: "Who's in confirmation?", prompt: "List candidates currently in the confirmation stage." },
    { label: "What can you do here?", prompt: "/help" },
  ],
};

const DEFAULT_SUGGESTIONS = [
  { label: "Top cities right now", prompt: "What are the top 5 cities by composite score?" },
  { label: "Pipeline overview", prompt: "How many candidates are in each pipeline stage?" },
  { label: "What can you do?", prompt: "/help" },
];

export function NeuronAiPanel() {
  const navigate = useNavigate();
  const { open, setOpen, screenContext } = useNeuronAiCtx();
  const { user } = useAuth();
  const { messages, sending, confirming, send, confirm, reset } = useNeuronAi();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const routeLabel = ROUTE_LABELS[screenContext.route] ?? "this page";
  const userInitial = (user?.email?.[0] ?? "U").toUpperCase();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  // Auto-grow textarea up to 4 lines (~120px).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return;
    setInput("");
    await send(text.trim(), {
      route: screenContext.route,
      screenState: screenContext.state,
    });
  };

  // Apply a nav/screen-state action after user confirms.
  const applyNavAction = (action_type: string, payload: Record<string, unknown>) => {
    const route = typeof payload.route === "string" ? payload.route : undefined;
    if (!route) return;
    navigate(route);
    if (action_type === "apply_screen_state" && payload.apply && typeof payload.apply === "object") {
      (window as unknown as { __neuronAiApply?: unknown }).__neuronAiApply = {
        route, apply: payload.apply as Record<string, unknown>, ts: Date.now(),
      };
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 border-l border-[#e8ecf3] bg-white p-0 sm:max-w-[520px]"
      >
        {/* Header — clean white with subtle border */}
        <div className="flex items-center justify-between border-b border-[#eef2f7] bg-white px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f4f0ff] to-[#eaf0ff] ring-1 ring-[#e0d6ff]">
              <Sparkles size={16} className="text-[#7c3aed]" />
            </span>
            <div className="text-left">
              <SheetTitle className="text-[14px] font-bold leading-tight text-[#0b1a36]">Neuron AI</SheetTitle>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-[#7a8aa6]">
                <span className="rounded-full bg-[#f4f0ff] px-1.5 py-px font-semibold text-[#7c3aed]">Gemini 2.5 Flash</span>
                <span>·</span>
                <span>on {routeLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={reset}
                className="rounded-md px-2 py-1 text-[11.5px] font-medium text-[#5a6a85] hover:bg-[#f4f0ff] hover:text-[#7c3aed]"
              >
                New chat
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5a6a85] hover:bg-[#f3f6fb]"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white px-5 py-6">
          {messages.length === 0 ? (
            <WelcomeState
              onPick={(prompt) => {
                setInput(prompt);
                inputRef.current?.focus();
              }}
              routeLabel={routeLabel}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => (
                <MessageRow
                  key={idx}
                  role={m.role}
                  content={m.content}
                  reply={m.reply}
                  isError={m.error}
                  userInitial={userInitial}
                  onConfirm={async (action) => {
                    if (action.action_type === "navigate" || action.action_type === "apply_screen_state") {
                      applyNavAction(action.action_type, action.payload);
                      return { ok: true };
                    }
                    const res = await confirm(action, screenContext.route);
                    return res;
                  }}
                  onChip={(text) => handleSend(text)}
                  confirming={confirming}
                />
              ))}
              {sending && <TypingIndicator />}
            </div>
          )}
        </div>

        {/* Composer — ChatGPT-style rounded input with send inside */}
        <div className="border-t border-[#eef2f7] bg-white px-4 pb-3 pt-3">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="relative flex items-end rounded-2xl border border-[#dde3ee] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-within:border-[#c5b8f5] focus-within:ring-2 focus-within:ring-[#efeaff]"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask Neuron AI anything…"
              disabled={sending}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-[#0b1a36] placeholder:text-[#9aa6bc] focus:outline-none disabled:opacity-60"
              style={{ maxHeight: 120 }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0b1a36] text-white transition-all hover:bg-black disabled:bg-[#cfd6e4]"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
            </button>
          </form>
          <p className="mt-2 text-center text-[10.5px] text-[#9aa6bc]">
            Neuron AI can make mistakes. Verify important info.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ----------------------------------------------------------------------------
// Welcome state
// ----------------------------------------------------------------------------
function WelcomeState({ onPick, routeLabel }: { onPick: (p: string) => void; routeLabel: string }) {
  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f4f0ff] to-[#eaf0ff] ring-1 ring-[#e0d6ff]">
          <Sparkles size={26} className="text-[#7c3aed]" />
        </div>
        <h2 className="text-[18px] font-bold text-[#0b1a36]">Hi, I'm Neuron AI</h2>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-[#5a6a85]">
          I can help across the whole app — find cities, explain scores, navigate
          between screens, and take actions on your behalf. I know you're on <b>{routeLabel}</b>.
        </p>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa6bc]">
          Try one of these
        </div>
        <div className="space-y-1.5">
          {SLASH_COMMANDS.map((s) => (
            <button
              key={s.cmd}
              onClick={() => onPick(s.prompt)}
              className="group flex w-full items-center gap-3 rounded-xl border border-[#eef2f7] bg-white px-3.5 py-2.5 text-left transition-all hover:-translate-y-px hover:border-[#d6cdf5] hover:shadow-[0_3px_10px_rgba(124,58,237,0.07)]"
            >
              <code className="rounded-md bg-[#f4f0ff] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#7c3aed]">
                {s.cmd}
              </code>
              <span className="flex-1 text-[12.5px] text-[#3a4a66]">{s.desc}</span>
              <ArrowRight size={13} className="text-[#c5cdde] transition-transform group-hover:translate-x-0.5 group-hover:text-[#7c3aed]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Typing indicator — three pulsing dots
// ----------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f4f0ff] to-[#eaf0ff] ring-1 ring-[#e0d6ff]">
        <Sparkles size={13} className="text-[#7c3aed]" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-[#f4f5f8] px-3.5 py-3">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="block h-1.5 w-1.5 rounded-full bg-[#9aa6bc]"
      style={{ animation: "neuron-dot 1.2s infinite ease-in-out", animationDelay: delay }}
    />
  );
}

// ----------------------------------------------------------------------------
// Message row — sparkle avatar for assistant, initial circle for user
// ----------------------------------------------------------------------------
function MessageRow({
  role, content, reply, isError, userInitial, onConfirm, onChip, confirming,
}: {
  role: "user" | "assistant";
  content: string;
  reply?: AssistantReply;
  isError?: boolean;
  userInitial: string;
  onConfirm: (action: { action_type: string; payload: Record<string, unknown> }) => Promise<{ ok: boolean; message?: string }>;
  onChip: (text: string) => void;
  confirming: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (role === "user") {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#0b1a36] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#174be8] text-[11px] font-bold text-white">
          {userInitial}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f4f0ff] to-[#eaf0ff] ring-1 ring-[#e0d6ff]">
        <Sparkles size={13} className="text-[#7c3aed]" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div
          className={`max-w-[92%] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
            isError
              ? "border border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
              : "bg-[#f4f5f8] text-[#0b1a36]"
          }`}
        >
          <div className="prose prose-sm max-w-none [&_*]:text-inherit [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_code]:rounded [&_code]:bg-white/70 [&_code]:px-1 [&_code]:py-0.5">
            <ReactMarkdown>{content || "…"}</ReactMarkdown>
          </div>
        </div>

        {reply?.kind === "propose_action" && !dismissed && (() => {
          const isNav = reply.action_type === "navigate" || reply.action_type === "apply_screen_state";
          const confirmLabel =
            reply.action_type === "navigate" ? "Show me"
            : reply.action_type === "apply_screen_state" ? "Apply filters"
            : "Confirm";
          const cancelLabel =
            reply.action_type === "navigate" ? "Stay here"
            : reply.action_type === "apply_screen_state" ? "Keep current view"
            : "Cancel";
          return (
          <div className="max-w-[92%] rounded-xl border border-[#d6cdf5] bg-[#fbfaff] p-3">
            <div className="mb-2 text-[12.5px] font-medium text-[#0b1a36]">{reply.preview_text}</div>
            {confirmed ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#0ea66e]">
                <Check size={12} /> {isNav ? "Done" : "Confirmed"}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <button
                    disabled={confirming}
                    onClick={async () => {
                      setConfirmError(null);
                      const res = await onConfirm({ action_type: reply.action_type, payload: reply.payload });
                      if (res.ok) setConfirmed(true);
                      else setConfirmError(res.message ?? "Action failed.");
                    }}
                    className="flex h-7 items-center gap-1 rounded-md bg-[#7c3aed] px-3 text-[11px] font-semibold text-white hover:bg-[#6b2ed1] disabled:opacity-60"
                  >
                    {confirming ? <Loader2 size={11} className="animate-spin" /> : confirmLabel}
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="h-7 rounded-md border border-[#dde3ee] px-3 text-[11px] font-medium text-[#5a6a85] hover:bg-[#f3f6fb]"
                  >
                    {cancelLabel}
                  </button>
                </div>
                {confirmError && (
                  <div className="mt-2 text-[11px] text-[#991b1b]">⚠️ {confirmError}</div>
                )}
              </>
            )}
          </div>
          );
        })()}

        {reply?.kind === "clarify" && (
          <div className="space-y-1.5">
            <div className="text-[12px] font-medium text-[#0b1a36]">{reply.question}</div>
            <div className="flex flex-wrap gap-1.5">
              {reply.chip_suggestions.map((c) => (
                <button
                  key={c}
                  onClick={() => onChip(c)}
                  className="flex items-center gap-1 rounded-full border border-[#d6cdf5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#7c3aed] hover:bg-[#f4f0ff]"
                >
                  <CornerDownLeft size={9} />
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {reply?.kind === "answer" && reply.followups && reply.followups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reply.followups.slice(0, 3).map((f) => (
              <button
                key={f}
                onClick={() => onChip(f)}
                className="rounded-full border border-[#eef2f7] bg-white px-2.5 py-1 text-[11px] text-[#5b3fbf] hover:border-[#d6cdf5] hover:bg-[#f4f0ff]"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// PURPLE/INK exports retained for any consumer that imports them.
export { PURPLE, INK };
