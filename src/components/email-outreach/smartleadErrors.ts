import { supabase } from "@/integrations/supabase/client";

type ProxyPayload = unknown;

const isDebugEnabled = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("debug") === "1";
  } catch {
    return false;
  }
};

const debugLog = (phase: "request" | "response" | "error", detail: Record<string, unknown>) => {
  if (!isDebugEnabled()) return;
  const prefix = `[SmartLead ${phase}]`;
  if (phase === "error") {
    console.error(prefix, detail);
    return;
  }
  console.log(prefix, detail);
};

export async function callSmartLeadProxy(endpoint: string, method = "GET", payload?: ProxyPayload) {
  debugLog("request", { endpoint, method, payload });
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", {
    body: { endpoint, method, payload },
  });

  if (error) {
    debugLog("error", { endpoint, method, message: error.message ?? String(error) });
    throw new Error(error.message ?? String(error));
  }

  if (data && typeof data === "object" && (data as any).ok === false) {
    const d = data as any;
    const err = d.error;
    const msg = typeof err === "string"
      ? err
      : (err?.message || err?.error || err?.msg || JSON.stringify(err));
    debugLog("error", { endpoint, method, status: d.status, message: msg, raw: d });
    throw new Error(`SmartLead ${d.status ?? ""} on ${endpoint}: ${msg}`);
  }

  debugLog("response", { endpoint, method, data });
  return data;
}

export function getSmartLeadErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "Unknown error");
  if (/Cron Exp value is empty/i.test(raw)) {
    return "Schedule is missing on this campaign. Launch now auto-applies a default schedule, but if it still fails, open the campaign and set the schedule window first.";
  }
  if (/No email accounts connected/i.test(raw)) {
    return "No sending inbox is connected. Add one in the Email Accounts tab first.";
  }
  return raw.replace(/^Failed:\s*/i, "").trim();
}