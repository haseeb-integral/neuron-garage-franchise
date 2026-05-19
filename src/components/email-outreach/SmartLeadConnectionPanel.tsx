import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Link2, Trash2, AlertCircle, Info } from "lucide-react";
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
  campaign_id?: string | number;
}

interface Campaign {
  id: number | string;
  name?: string;
  status?: string;
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [webhooksByCampaign, setWebhooksByCampaign] = useState<Record<string, Webhook[]>>({});
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [recentEvents, setRecentEvents] = useState<
    Array<{ id: string; event_type: string; lead_email: string | null; received_at: string }>
  >([]);
  const [lastSuccessfulCall, setLastSuccessfulCall] = useState<string | null>(
    () => localStorage.getItem("smartlead_last_ok_call"),
  );
  const [webhookFired24h, setWebhookFired24h] = useState<boolean | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smartlead-webhook`;

  const testConnection = async () => {
    setState("testing");
    setErrorMsg(null);
    try {
      const camps = await callProxy("campaigns/");
      if (!Array.isArray(camps)) {
        throw new Error(typeof camps === "object" ? JSON.stringify(camps) : String(camps));
      }
      setCampaigns(camps as Campaign[]);

      const accounts = await callProxy("email-accounts/?limit=1");
      if (Array.isArray(accounts) && accounts[0]) {
        setAccountEmail(accounts[0].from_email ?? accounts[0].username ?? null);
        setAccountName(accounts[0].from_name ?? null);
      }
      const now = new Date().toISOString();
      localStorage.setItem("smartlead_last_ok_call", now);
      setLastSuccessfulCall(now);
      setState("ok");
    } catch (e) {
      setState("error");
      setErrorMsg(String(e instanceof Error ? e.message : e));
      toast.error("SmartLead connection failed");
    }
  };


  const loadWebhooksForAllCampaigns = async (camps: Campaign[]) => {
    setLoadingWebhooks(true);
    const result: Record<string, Webhook[]> = {};
    for (const c of camps) {
      try {
        const res = await callProxy(`campaigns/${c.id}/webhooks`);
        result[String(c.id)] = Array.isArray(res) ? res : [];
      } catch (e) {
        console.warn(`webhooks load failed for campaign ${c.id}`, e);
        result[String(c.id)] = [];
      }
    }
    setWebhooksByCampaign(result);
    setLoadingWebhooks(false);
  };

  const registerOnAllCampaigns = async () => {
    if (campaigns.length === 0) {
      toast.info("No campaigns yet — create a campaign in SmartLead first, then register the webhook.");
      return;
    }
    setRegistering(true);
    let success = 0;
    let skipped = 0;
    let failed = 0;
    for (const c of campaigns) {
      const existing = webhooksByCampaign[String(c.id)] ?? [];
      if (existing.some((w) => (w.webhook_url ?? w.url) === webhookUrl)) {
        skipped++;
        continue;
      }
      try {
        await callProxy(`campaigns/${c.id}/webhooks`, "POST", {
          name: "Neuron Garage app webhook",
          webhook_url: webhookUrl,
          event_types: EVENT_TYPES,
        });
        success++;
      } catch (e) {
        console.error(`register failed for campaign ${c.id}`, e);
        failed++;
      }
    }
    await loadWebhooksForAllCampaigns(campaigns);
    setRegistering(false);
    toast.success(`Webhook sync done — registered ${success}, already present ${skipped}, failed ${failed}`);
  };

  const deleteWebhook = async (campaignId: string | number, webhookId: string | number) => {
    try {
      await callProxy(`campaigns/${campaignId}/webhooks/${webhookId}`, "DELETE");
      toast.success("Webhook removed");
      await loadWebhooksForAllCampaigns(campaigns);
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
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("smartlead_events")
      .select("id", { count: "exact", head: true })
      .gte("received_at", cutoff);
    setWebhookFired24h((count ?? 0) > 0);
  };


  useEffect(() => {
    (async () => {
      await testConnection();
      await loadRecentEvents();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When campaigns load, fetch webhooks for each
  useEffect(() => {
    if (campaigns.length > 0) {
      loadWebhooksForAllCampaigns(campaigns);
    } else {
      setWebhooksByCampaign({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length]);

  const allWebhooks = Object.entries(webhooksByCampaign).flatMap(([cid, ws]) =>
    ws.map((w) => ({ ...w, campaign_id: cid })),
  );
  const ourRegisteredCount = allWebhooks.filter((w) => (w.webhook_url ?? w.url) === webhookUrl).length;

  return (
    <div className="rounded-2xl border border-[#eef2f7] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#07142f]">SmartLead Connection</h2>
          <p className="mt-0.5 text-xs text-[#5a6b85]">
            Live link between this app and SmartLead. Replies and bounces flow in via per-campaign webhooks.
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
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]">API status</div>
          <div className="flex items-center gap-2">
            {state === "ok" && <CheckCircle2 size={16} className="text-emerald-600" />}
            {state === "error" && <XCircle size={16} className="text-red-600" />}
            {state === "testing" && <Loader2 size={16} className="animate-spin text-[#0757ff]" />}
            {state === "idle" && <AlertCircle size={16} className="text-amber-600" />}
            <span className="text-sm font-medium text-[#07142f]">
              {state === "ok" && `Connected · ${campaigns.length} campaigns`}
              {state === "error" && "Failed"}
              {state === "testing" && "Testing…"}
              {state === "idle" && "Not tested"}
            </span>
          </div>
          {errorMsg && <div className="mt-1 break-words text-[11px] text-red-600">{errorMsg}</div>}
        </div>

        <div className="rounded-lg border border-[#eef2f7] bg-[#f7faff] p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]">Sending mailbox</div>
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
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#07142f]">Webhook</div>
            <div className="break-all font-mono text-[11px] text-[#5a6b85]">{webhookUrl}</div>
            <div className="mt-1 text-[11px] text-[#5a6b85]">
              {campaigns.length === 0
                ? "Registered on 0 of 0 campaigns"
                : `Registered on ${ourRegisteredCount} of ${campaigns.length} campaigns`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => loadWebhooksForAllCampaigns(campaigns)}
              disabled={loadingWebhooks || campaigns.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#eef2f7] bg-white px-2.5 py-1.5 text-xs font-medium text-[#14233b] hover:bg-[#f7faff] disabled:opacity-50"
            >
              {loadingWebhooks ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh
            </button>
            <button
              onClick={registerOnAllCampaigns}
              disabled={registering || campaigns.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1f5bff] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#0757ff] disabled:opacity-50"
            >
              {registering ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              Register on all campaigns
            </button>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-dashed border-[#dbe4f2] bg-[#fbfdff] p-3 text-xs text-[#5a6b85]">
            <Info size={14} className="mt-0.5 shrink-0 text-[#1f5bff]" />
            <span>
              SmartLead webhooks are attached <b>per campaign</b>, not globally. You have no
              campaigns yet — create one in SmartLead (or wait until Phase 4 of this app), then
              click <b>Register on all campaigns</b> to wire replies into the Inbox.
            </span>
          </div>
        ) : allWebhooks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#eef2f7] p-3 text-xs text-[#5a6b85]">
            No webhooks registered on any campaign yet. Click <b>Register on all campaigns</b> to
            attach this app's webhook URL to every campaign.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {allWebhooks.map((w, i) => {
              const id = w.id ?? w.webhook_id ?? i;
              const url = w.webhook_url ?? w.url ?? "";
              const events = w.event_types ?? [];
              const matchesOurs = url === webhookUrl;
              const campaign = campaigns.find((c) => String(c.id) === String(w.campaign_id));
              return (
                <li
                  key={`${w.campaign_id}-${id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#eef2f7] bg-white p-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      {matchesOurs ? (
                        <CheckCircle2 size={12} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={12} className="text-amber-600" />
                      )}
                      <span className="font-semibold text-[#14233b]">
                        {campaign?.name ?? `Campaign ${w.campaign_id}`}
                      </span>
                    </div>
                    <div className="mt-0.5 break-all font-mono text-[10px] text-[#5a6b85]">{url}</div>
                    {events.length > 0 && (
                      <div className="mt-0.5 text-[10px] text-[#5a6b85]">{events.join(" · ")}</div>
                    )}
                  </div>
                  {(w.id ?? w.webhook_id) !== undefined && w.campaign_id !== undefined && (
                    <button
                      onClick={() => deleteWebhook(w.campaign_id!, (w.id ?? w.webhook_id)!)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
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
