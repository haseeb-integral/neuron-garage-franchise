import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** A private, data-free doorbell. The existing RPC remains the only path read. */
export function usePortalPathRefresh(userId: string | undefined, candidateId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId || !candidateId) return;
    let active = true;
    const refresh = () => {
      if (!active) return;
      void qc.invalidateQueries({ queryKey: ["portal-path", candidateId] });
      void qc.invalidateQueries({ queryKey: ["portal-fdd-access", candidateId] });
      void qc.invalidateQueries({ queryKey: ["portal-fdd-version", candidateId] });
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    const channel = supabase.channel(`portal-path:${userId}`, { config: { private: true } })
      .on("broadcast", { event: "path-changed" }, refresh)
      .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", visible);
      void supabase.removeChannel(channel);
    };
  }, [userId, candidateId, qc]);
}