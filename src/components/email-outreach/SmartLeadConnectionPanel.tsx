import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Link2, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ConnState = "idle" | "testing" | "ok" | "error";

interface Webhook {
  id?: string | number;
  webhook_id?: string | number;
  webhook_url?: string;
  url?: string;
  event_types?: string[];
  name?: string;
}

const EVENT_TYPES = [
  "EMAIL_REPLIED",
  "EMAIL_BOUNCED",
  "LEAD_UNSUBSCRIBED",
  "LEAD_CATEGORY_UPDATED",
];

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
    body: { endpoint, method, payload },
  });
  if (error) throw new Error(error.message ?? String(error));
  return data;
}

export function SmartLeadConnectionPanel() {
  const [state, setState] = useState<ConnState>("idle");
  const [campaignCount, setCampaignCount] = useState<number | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [recentEvents, setRecentEvents] = useState<
    Array<{ id: string; event_type: string; lead_email: string | null; received_at: string }>
  >([]);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartlead-webhook`;

  const testConnection = async () => {
    setState("testing");
    setErrorMsg(null);
    try {
      const campaigns = await callProxy("campaigns/");
      if (!Array.isArray(campaigns)) {
        throw new Error(typeof campaigns === "object" ? JSON.stringify(campaigns) : String(campaigns));
      }
      setCampaignCount(campaigns.length);

      const accounts = await callProxy("email-accounts/?limit=1");
      if (Array.isArray(accounts) && accounts[0]) {
        setAccountEmail(accounts[0].from_email ?? accounts[0].username ?? null);
        setAccountName(accounts[0].from_name ?? null);
      }
      setState("ok");
      toast.success(`Connected — ${campaigns.length} campaign(s) found`);
    } catch (e) {
      setState("error");
      setErrorMsg(String(e instanceof Error ? e.message : e));
      toast.error("SmartLead connection failed");
    }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const res = await callProxy("webhooks");
      setWebhooks(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const registerWebhook = async () => {
    setRegistering(true);
    try {
      await callProxy("webhooks", "POST", {
        name: "Neuron Garage app webhook",
        webhook_url: webhookUrl,
        event_types: EVENT_TYPES,
      });
      toast.success("Webhook registered");
      await loadWebhooks();
    } catch (e) {
      toast.error(`Register failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setRegistering(false);
    }
  };

  const deleteWebhook = async (id: string | number) => {
    try {
      await callProxy(`webhooks/${id}`, "DELETE");
      toast.success("Webhook removed");
      await loadWebhooks();
    } catch (e) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  const loadRecentEvents = async () => {
    const { data } = await supabase
      .from("smartlead_events")
      .select("id, event_type, lead_email, received_at")
      .order("received_at", { ascending: false })
      .limit(5);
    setRecentEvents(data ?? []);
  };

  useEffect(() => {
    testConnection();
    loadWebhooks();
    loadRecentEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#07142f]">SmartLead Connection</h2>
          <p className="mt-0.5 text-xs text-[#5a6b85]">
            Live link between this app and SmartLead. Replies and bounces flow in via webhook.
          </p>
        </div>
        <button
          onClick={testConnection}
          disabled={state === "testing"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#eef2f7] bg-white px-3 py-1.5 text-xs font-medium text-[#14233b] hover:bg-[#f7faff]"
        >
          {state === "testing" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Test connection
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[#eef2f7] bg-[#f7faff] p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]">
            API status
          </div>
          <div className="flex items-center gap-2">
            {state === "ok" && <CheckCircle2 size={16} className="text-emerald-600" />}
            {state === "error" && <XCircle size={16} className="text-red-600" />}
            {state === "testing" && <Loader2 size={16} className="animate-spin text-[#0757ff]" />}
            {state === "idle" && <AlertCircle size={16} className="text-amber-600" />}
            <span className="text-sm font-medium text-[#07142f]">
              {state === "ok" && `Connected · ${campaignCount} campaigns`}
              {state === "error" && "Failed"}
              {state === "testing" && "Testing…"}
              {state === "idle" && "Not tested"}
            </span>
          </div>
          {errorMsg && <div className="mt-1 break-words text-[11px] text-red-600">{errorMsg}</div>}
        </div>

        <div className="rounded-lg border border-[#eef2f7] bg-[#f7faff] p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]">
            Sending mailbox
          </div>
          {accountEmail ? (
            <>
              <div className="text-sm font-medium text-[#07142f]">{accountName ?? "—"}</div>
              <div className="text-xs text-[#5a6b85]">{accountEmail}</div>
            </>
          ) : (
            <div className="text-sm text-[#5a6b85]">—</div>
          )}
        </div>

        <div className="rounded-lg border border-[#eef2f7] bg-[#f7faff] p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]">
            Recent webhook events
          </div>
          {recentEvents.length === 0 ? (
            <div className="text-sm text-[#5a6b85]">None yet</div>
          ) : (
            <ul className="space-y-0.5 text-xs text-[#14233b]">
              {recentEvents.map((e) => (
                <li key={e.id} className="truncate">
                  <span className="font-medium">{e.event_type}</span>
                  {e.lead_email ? ` · ${e.lead_email}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-[#eef2f7] pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#07142f]">Webhook</div>
            <div className="break-all font-mono text-[11px] text-[#5a6b85]">{webhookUrl}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadWebhooks}
              disabled={loadingWebhooks}
              className="inline-flex items-center gap-1 rounded-lg border border-[#eef2f7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#14233b] hover:bg-[#f7faff]"
            >
              {loadingWebhooks ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh
            </button>
            <button
              onClick={registerWebhook}
              disabled={registering}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1f5bff] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#0757ff] disabled:opacity-60"
            >
              {registering ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              Register in SmartLead
            </button>
          </div>
        </div>

        {webhooks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#eef2f7] p-3 text-xs text-[#5a6b85]">
            No webhooks registered yet. Click "Register in SmartLead" so replies flow into this app.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {webhooks.map((w, i) => {
              const id = w.id ?? w.webhook_id ?? i;
              const url = w.webhook_url ?? w.url ?? "";
              const events = w.event_types ?? [];
              const matchesOurs = url === webhookUrl;
              return (
                <li
                  key={String(id)}
                  className="flex items-center justify-between rounded-lg border border-[#eef2f7] bg-white p-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      {matchesOurs ? (
                        <CheckCircle2 size={12} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={12} className="text-amber-600" />
                      )}
                      <span className="break-all font-mono text-[11px] text-[#14233b]">{url}</span>
                    </div>
                    {events.length > 0 && (
                      <div className="mt-1 text-[10px] text-[#5a6b85]">{events.join(" · ")}</div>
                    )}
                  </div>
                  {(w.id ?? w.webhook_id) !== undefined && (
                    <button
                      onClick={() => deleteWebhook((w.id ?? w.webhook_id)!)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
