import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// useNeuronAi — calls neuron-ai + neuron-ai-confirm via supabase.functions.invoke
// (which auto-refreshes the JWT, avoiding the stale-token "Not signed in" bug).
// Errors are surfaced as inline assistant messages (red), not corner toasts.
// ============================================================================

export type ActionType =
  | "navigate"
  | "apply_screen_state"
  | "add_to_watchlist"
  | "remove_from_watchlist"
  | "change_candidate_stage";

export type AssistantReply =
  | { kind: "answer"; summary: string; followups?: string[] }
  | {
      kind: "propose_action";
      summary: string;
      action_type: ActionType;
      payload: Record<string, unknown>;
      preview_text: string;
    }
  | { kind: "clarify"; summary: string; question: string; chip_suggestions: string[] };

export type ThreadMsg = {
  role: "user" | "assistant";
  content: string;
  reply?: AssistantReply;
  error?: boolean;
};

export function useNeuronAi() {
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const send = useCallback(async (
    text: string,
    ctx: { route: string; screenState: Record<string, unknown> },
  ): Promise<AssistantReply | null> => {
    const userMsg: ThreadMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("neuron-ai", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          route: ctx.route,
          screenState: ctx.screenState,
        },
      });
      if (error) {
        const msg = error.message ?? "Neuron AI failed.";
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}`, error: true }]);
        return null;
      }
      const reply = data as AssistantReply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply?.summary ?? "", reply }]);
      return reply;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neuron AI failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}`, error: true }]);
      return null;
    } finally {
      setSending(false);
    }
  }, [messages]);

  const confirm = useCallback(async (
    action: { action_type: string; payload: Record<string, unknown> },
    route: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("neuron-ai-confirm", {
        body: { ...action, route },
      });
      if (error) return { ok: false, message: error.message ?? "Confirm failed." };
      return { ok: true, message: (data as { message?: string })?.message };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Confirm failed." };
    } finally {
      setConfirming(false);
    }
  }, []);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, sending, confirming, send, confirm, reset };
}
