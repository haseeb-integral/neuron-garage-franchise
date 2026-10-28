import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = { kind: "none" } | { kind: "invited"; at: string } | { kind: "active"; at: string };

/** "Invite to portal" button + status for one candidate (staff only). */
export function PortalInviteButton({ candidateDbId }: { candidateDbId?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!candidateDbId) return;
    const { data } = await supabase
      .from("candidate_portal_users")
      .select("invited_at, activated_at")
      .eq("candidate_id", candidateDbId)
      .maybeSingle();
    if (!data) setStatus({ kind: "none" });
    else if (data.activated_at) setStatus({ kind: "active", at: data.activated_at });
    else setStatus({ kind: "invited", at: data.invited_at });
  }, [candidateDbId]);

  useEffect(() => { load(); }, [load]);

  if (!candidateDbId || !status) return null;

  const send = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("portal-invite", {
      body: { candidate_id: candidateDbId, redirect_origin: window.location.origin },
    });
    setBusy(false);
    if (error || data?.error) {
      let msg = data?.error as string | undefined;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      toast.error(msg ?? "Could not send the invite");
      return;
    }
    toast.success(data?.status === "resent" ? "Portal link sent again" : "Portal invite sent");
    load();
  };

  const label =
    status.kind === "none" ? "Not invited"
    : status.kind === "invited" ? `Invited ${formatDistanceToNow(new Date(status.at))} ago`
    : "Portal active";

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        disabled={busy}
        onClick={send}
      >
        <Send size={13} />
        {busy ? "Sending…" : status.kind === "none" ? "Invite to portal" : "Resend portal link"}
      </Button>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
