import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// useNeuronAi — call neuron-ai + neuron-ai-confirm edge functions.
// ============================================================================

export type AssistantReply =
  | { kind: "answer"; summary: string; followups?: string[] }
  | { kind: "navigate_and_apply"; summary: string; route: string; apply: Record<string, unknown> }
  | {
      kind: "propose_action";
      summary: string;
      action_type: "add_to_watchlist" | "remove_from_watchlist" | "change_candidate_stage";
      payload: Record<string, unknown>;
      preview_text: string;
    }
  | { kind: "clarify"; summary: string; question: string; chip_suggestions: string[] };

export type ThreadMsg = { role: "user" | "assistant"; content: string; reply?: AssistantReply };

const FN = (path: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    apikey: ANON,
  };
}

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
      const resp = await fetch(FN("neuron-ai"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          route: ctx.route,
          screenState: ctx.screenState,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast.error(json?.error ?? `Neuron AI failed (${resp.status})`);
        return null;
      }
      const reply = json as AssistantReply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply.summary ?? "", reply }]);
      return reply;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Neuron AI failed");
      return null;
    } finally {
      setSending(false);
    }
  }, [messages]);

  const confirm = useCallback(async (
    action: { action_type: string; payload: Record<string, unknown> },
    route: string,
  ): Promise<boolean> => {
    setConfirming(true);
    try {
      const resp = await fetch(FN("neuron-ai-confirm"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ...action, route }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast.error(json?.error ?? `Confirm failed (${resp.status})`);
        return false;
      }
      toast.success(json?.message ?? "Done.");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Confirm failed");
      return false;
    } finally {
      setConfirming(false);
    }
  }, []);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, sending, confirming, send, confirm, reset };
}
