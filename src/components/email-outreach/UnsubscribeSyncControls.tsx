import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { syncCooldownSeconds, unsubscribeSyncMessage, type UnsubscribeSyncResult } from "@/lib/unsubscribeSync";

// This timestamp is the last new suppression, not the last job run.
export function UnsubscribeSyncControls() {
  const [busy, setBusy] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [lastAddedError, setLastAddedError] = useState(false);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultFailed, setResultFailed] = useState(false);
  const cooldown = syncCooldownSeconds(lastAttempt, now);

  const loadLastAdded = async () => {
    const { data, error } = await supabase.from("suppressed_emails")
      .select("created_at").contains("metadata", { source: "smartlead_unsubscribe_sync" })
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setLastAddedError(Boolean(error));
    if (!error) setLastAdded(data?.created_at ?? null);
  };

  useEffect(() => { void loadLastAdded(); }, []);
  useEffect(() => {
    if (lastAttempt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lastAttempt]);

  const sync = async () => {
    if (busy || syncCooldownSeconds(lastAttempt, Date.now()) > 0) return;
    const started = Date.now();
    setLastAttempt(started); setNow(started); setBusy(true); setResultMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke<UnsubscribeSyncResult>("smartlead-unsubscribe-sync", { body: {} });
      if (error) throw new Error("Unsubscribe sync could not finish. Check the SmartLead connection and try again.");
      if (!data || !Array.isArray(data.failed_campaigns) || typeof data.new_suppressions_added !== "number") {
        throw new Error("Unsubscribe sync returned no result. Try again.");
      }
      const message = unsubscribeSyncMessage(data);
      const failed = !data.ok || data.failed_campaigns.length > 0;
      setResultMessage(message); setResultFailed(failed);
      if (failed) toast.error(message);
      else { toast.success(message); setLastCompleted(new Date().toISOString()); }
      await loadLastAdded();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unsubscribe sync failed. Try again.";
      setResultMessage(message); setResultFailed(true); toast.error(message);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-1 border-b border-border pb-3" aria-label="Unsubscribe sync">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          <p>Last new unsubscribe: {lastAddedError ? "Unavailable" : lastAdded ? formatDistanceToNow(new Date(lastAdded), { addSuffix: true }) : "Never"}</p>
          {lastCompleted && <p>Last manual sync: {formatDistanceToNow(new Date(lastCompleted), { addSuffix: true })}</p>}
        </div>
        <Button variant="outline" size="sm" disabled={busy || cooldown > 0} onClick={() => void sync()}>
          {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          {busy ? "Syncing…" : cooldown > 0 ? `Sync Unsubscribes (${cooldown}s)` : "Sync Unsubscribes"}
        </Button>
      </div>
      {resultMessage && <p role="status" className={`text-xs ${resultFailed ? "text-destructive" : "text-foreground"}`}>{resultMessage}</p>}
    </div>
  );
}