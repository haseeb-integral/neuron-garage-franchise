// useAskAi — natural-language search for /city-scoring.
//
// Owns: thread id, conversation turns, loading flag, token refresh + the
// edge-function call to `ai-city-query`. The page wires the returned
// AiResult into its filter + weight state (that part is page concern).
//
// On success the hook records the turn and the new threadId; the caller
// gets back the AiResult to act on, or null on failure.

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AiResult } from "@/components/city-scoring/AiAnswerCard";

export type AiTurn = { query: string; response: AiResult };

export function useAskAi() {
  const { session } = useAuth();
  const [aiThreadId, setAiThreadId] = useState<string | null>(null);
  const [aiTurns, setAiTurns] = useState<AiTurn[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const lastAiTurn = aiTurns[aiTurns.length - 1];

  const clearAi = useCallback(() => {
    setAiThreadId(null);
    setAiTurns([]);
  }, []);

  const ask = useCallback(async (query: string): Promise<AiResult | null> => {
    setAiLoading(true);
    try {
      const getValidAccessToken = async (): Promise<string> => {
        let token = session?.access_token ?? "";
        if (!token) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? "";
        }
        if (!token) return "";

        const { error: userError } = await supabase.auth.getUser(token);
        if (!userError) return token;

        const { data: refreshed } = await supabase.auth.refreshSession();
        return refreshed.session?.access_token ?? "";
      };

      const initialToken = await getValidAccessToken();
      if (!initialToken) {
        toast.error("Please sign in again to use AI search");
        return null;
      }

      // Explicit fetch (not supabase.functions.invoke) so the Authorization
      // header reliably reaches the edge function via the preview proxy.
      const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-city-query`;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const callOnce = async (token: string) => {
        const resp = await fetch(FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            query,
            threadId: aiThreadId,
            previousTurns: aiTurns.map((t) => ({ query: t.query, response: t.response })),
          }),
        });
        let bodyJson: unknown = null;
        try { bodyJson = await resp.json(); } catch { /* not json */ }
        return { resp, bodyJson: bodyJson as Record<string, unknown> | null };
      };

      let { resp, bodyJson } = await callOnce(initialToken);
      if (resp.status === 401) {
        const refreshedToken = await getValidAccessToken();
        ({ resp, bodyJson } = await callOnce(refreshedToken));
      }
      if (!resp.ok) {
        const msg = (bodyJson?.error ?? bodyJson?.detail) ?? `AI search failed (HTTP ${resp.status})`;
        toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
        return null;
      }
      const result = bodyJson?.result as AiResult | undefined;
      if (!result) {
        toast.error("AI returned no result");
        return null;
      }
      setAiThreadId((bodyJson?.threadId as string | null | undefined) ?? null);
      setAiTurns((prev) => [...prev, { query, response: result }]);
      return result;
    } catch (e) {
      console.error("askAi", e);
      toast.error(e instanceof Error ? e.message : "AI search failed");
      return null;
    } finally {
      setAiLoading(false);
    }
  }, [session, aiThreadId, aiTurns]);

  return { aiThreadId, aiTurns, aiLoading, lastAiTurn, clearAi, ask };
}
