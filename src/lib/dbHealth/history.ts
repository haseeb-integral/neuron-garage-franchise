// Wrappers around Tier 3 tables: history, incidents, subscriptions.
import { supabase } from "@/integrations/supabase/client";

export interface HistoryRow {
  id: string;
  ts: string;
  domain: string;
  metric: string;
  status: "green" | "yellow" | "red" | "unknown";
  value: Record<string, unknown> | null;
  error: string | null;
}

export interface IncidentRow {
  id: string;
  domain: string;
  metric: string;
  opened_at: string;
  closed_at: string | null;
  last_status: string;
  notes: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  rule_name: string | null;
  domain: string | null;
  channel: string;
  created_at: string;
}

export async function fetchHistory(domain: string, days = 30): Promise<HistoryRow[]> {
  const { data, error } = await supabase.rpc("db_health_history_for" as any, {
    _domain: domain,
    _days: days,
  });
  if (error) throw error;
  return (data ?? []) as unknown as HistoryRow[];
}

export async function fetchIncidents(): Promise<IncidentRow[]> {
  const { data, error } = await supabase
    .from("db_health_incidents" as any)
    .select("*")
    .order("opened_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as IncidentRow[];
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("db_health_subscriptions" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Subscription[];
}

export async function addSubscription(opts: {
  rule_name?: string | null;
  domain?: string | null;
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user?.id;
  if (!uid) throw new Error("not signed in");
  const { error } = await supabase
    .from("db_health_subscriptions" as any)
    .insert({
      user_id: uid,
      rule_name: opts.rule_name ?? null,
      domain: opts.domain ?? null,
      channel: "email",
    });
  if (error) throw error;
}

export async function removeSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from("db_health_subscriptions" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function runSnapshotNow(): Promise<void> {
  // The snapshot function is SECURITY DEFINER but only callable via SQL.
  // Expose via RPC; if not present, the cron job covers it within 6 hours.
  const { error } = await supabase.rpc("db_health_snapshot" as any);
  if (error) throw error;
}
