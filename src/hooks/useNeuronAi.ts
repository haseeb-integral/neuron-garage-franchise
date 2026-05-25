import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// useNeuronAi — calls neuron-ai + neuron-ai-confirm.
// v2: persists threads to ai_threads / ai_thread_messages, restores last
// thread on mount, supports "new chat".
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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Restore the most recent thread on mount (per signed-in user).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      setLoadingHistory(true);
      try {
        const { data: threads } = await supabase
          .from("ai_threads")
          .select("id")
          .order("last_message_at", { ascending: false })
          .limit(1);
        const t = threads?.[0];
        if (!t || cancelled) return;
        const { data: rows } = await supabase
          .from("ai_thread_messages")
          .select("role, content")
          .eq("thread_id", t.id)
          .order("created_at", { ascending: true });
        if (cancelled || !rows) return;
        const restored: ThreadMsg[] = rows.map((r) => {
          const c = (r.content ?? {}) as Record<string, unknown>;
          if (r.role === "user") {
            return { role: "user", content: String(c.text ?? "") };
          }
          const reply = c as unknown as AssistantReply;
          return { role: "assistant", content: reply?.summary ?? "", reply };
        });
        setMessages(restored);
        setThreadId(t.id);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
          threadId,
        },
      });
      if (error) {
        const msg = error.message ?? "Neuron AI failed.";
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}`, error: true }]);
        return null;
      }
      const { threadId: newThreadId, ...replyRaw } = (data as AssistantReply & { threadId?: string });
      if (newThreadId && newThreadId !== threadId) setThreadId(newThreadId);
      const reply = replyRaw as AssistantReply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply?.summary ?? "", reply }]);
      return reply;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Neuron AI failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}`, error: true }]);
      return null;
    } finally {
      setSending(false);
    }
  }, [messages, threadId]);

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

  const reset = useCallback(() => {
    setMessages([]);
    setThreadId(null);
  }, []);

  return { messages, sending, confirming, loadingHistory, send, confirm, reset };
}
