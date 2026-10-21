import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Mail, Plus, AlertCircle, Flame, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UnsubscribeSyncControls } from "./UnsubscribeSyncControls";

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", { body: { endpoint, method, payload } });
  if (error) throw new Error(error.message ?? String(error));
  if (data?.ok === false) throw new Error(data?.error ?? "SmartLead error");
  return data;
}

type Account = {
  id: string;
  smartlead_id: number;
  email: string;
  provider: string | null;
  warmup_enabled: boolean;
  warmup_reputation: number | null;
  daily_limit: number | null;
  daily_sent: number;
  last_synced_at: string | null;
};
type CampaignLink = { email_account_smartlead_id: number; campaign_cache_id: string };

function timeAgo(iso: string | null): string {
  if (!iso) return "Never synced";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Last synced: just now";
  if (mins < 60) return `Last synced: ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `Last synced: ${hrs} hr ago`;
  return `Last synced: ${Math.round(hrs / 24)} days ago`;
}

export function EmailAccountsPanel() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [campaignsBy, setCampaignsBy] = useState<Record<number, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Reads the app's saved copy — works even when SmartLead is down.
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [acc, links, camps] = await Promise.all([
        supabase.from("email_accounts").select("*").order("email"),
        supabase.from("campaign_mailbox_assignments").select("email_account_smartlead_id,campaign_cache_id"),
        supabase.from("campaign_cache").select("id,name"),
      ]);
      if (acc.error) throw acc.error;
      if (links.error) throw links.error;
      const names = new Map((camps.data ?? []).map((c) => [String(c.id), c.name ?? `Campaign ${c.id}`]));
      const by: Record<number, string[]> = {};
      for (const l of (links.data ?? []) as CampaignLink[]) {
        (by[l.email_account_smartlead_id] ??= []).push(names.get(l.campaign_cache_id) ?? `Campaign ${l.campaign_cache_id}`);
      }
      setAccounts((acc.data ?? []) as Account[]);
      setCampaignsBy(by);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mailboxes");
    } finally { setLoading(false); }
  };

  const sync = async () => {
    setSyncing(true); setSyncError(null);
    try {
      const { data, error } = await supabase.functions.invoke("smartlead-sync-mailboxes", { body: {} });
      if (error) {
        let msg = error.message;
        try { const b = await (error as { context?: Response }).context?.json(); if (b?.error) msg = b.error; } catch { /* keep msg */ }
        throw new Error(msg);
      }
      if (data?.ok === false) throw new Error(data.error ?? "Sync failed");
      toast.success(`Synced ${data.mailboxes} mailboxes`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setSyncError(msg); toast.error(msg);
    } finally { setSyncing(false); }
  };

  useEffect(() => { void load(); }, []);

  const toggleWarmup = async (acc: Account) => {
    try {
      await callProxy(`/email-accounts/${acc.smartlead_id}/warmup`, "POST", { warmup_enabled: !acc.warmup_enabled });
      toast.success(`Warmup ${!acc.warmup_enabled ? "enabled" : "disabled"} for ${acc.email}`);
      void sync();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle warmup");
    }
  };

  const lastSynced = accounts.reduce<string | null>((m, a) => (a.last_synced_at && (!m || a.last_synced_at > m) ? a.last_synced_at : m), null);

  return (
    <div className="space-y-2">
      <UnsubscribeSyncControls />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wide text-[#07142f]">Mailboxes</h2>
          <p className="text-[11px] text-[#526078]">Saved copy of your SmartLead mailboxes. {timeAgo(lastSynced)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void sync()} disabled={syncing} className="inline-flex items-center gap-1 rounded-lg border border-[#dbe4f2] bg-white px-2 py-1 text-[11px] font-bold text-[#174be8] disabled:opacity-60">
            {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Refresh Mailboxes
          </button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#174be8] px-2 py-1 text-[11px] font-bold text-white"><Plus size={11} /> Add SMTP</button>
        </div>
      </div>

      {syncError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <AlertCircle size={13} /> Could not refresh from SmartLead: {syncError} Showing the last saved copy.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-[#e7edf5] bg-white py-10"><Loader2 className="mr-2 h-5 w-5 animate-spin text-[#174be8]" /><span className="text-sm text-[#526078]">Loading mailboxes…</span></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700"><AlertCircle size={16} /><span className="text-sm font-bold">Could not load mailboxes</span></div>
          <p className="mt-1 text-xs text-red-700">{error}</p>
          <button onClick={() => void load()} className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700">Retry</button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-[#e7edf5] bg-white p-6 text-center">
          <Mail className="mx-auto mb-2 h-8 w-8 text-[#174be8]" />
          <h3 className="text-sm font-black">No mailboxes saved yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#526078]">Press "Refresh Mailboxes" to copy them from SmartLead. Warm each new mailbox for about 2 weeks before sending.</p>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const dailyMax = a.daily_limit ?? 50;
            const pct = Math.min(100, (a.daily_sent / Math.max(1, dailyMax)) * 100);
            const rep = a.warmup_reputation;
            const repCls = rep === null ? "text-[#8794ab]" : rep >= 80 ? "text-emerald-700" : rep >= 50 ? "text-amber-700" : "text-red-700";
            const camps = campaignsBy[a.smartlead_id] ?? [];
            return (
              <div key={a.id} className="rounded-xl border border-[#e7edf5] bg-white p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-black leading-tight">{a.email}</div>
                    <div className="text-[11px] capitalize leading-tight text-[#526078]">{a.provider ?? "smtp"}</div>
                  </div>
                  <span className={`text-[11px] font-black tabular-nums ${repCls}`} title="Warmup reputation">{rep === null ? "—" : `${rep}%`}</span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-[#34445f]">
                  <span className="shrink-0">Sent today</span>
                  <div className="h-1 flex-1 rounded-full bg-[#edf2f8]"><div className="h-1 rounded-full bg-[#174be8]" style={{ width: `${pct}%` }} /></div>
                  <span className="shrink-0 tabular-nums">{a.daily_sent}/{dailyMax}</span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1"><Flame size={11} className={a.warmup_enabled ? "text-[#b7791f]" : "text-[#8794ab]"} /><span className="font-bold">Warmup</span><span className="text-[#526078]">{a.warmup_enabled ? "On" : "Off"}</span></span>
                  <button onClick={() => toggleWarmup(a)} className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${a.warmup_enabled ? "border border-[#dbe4f2] text-[#526078]" : "bg-[#174be8] text-white"}`}>{a.warmup_enabled ? "Turn off" : "Turn on"}</button>
                </div>

                <div className="mt-1.5 text-[10px] text-[#526078]">
                  <span className="font-bold text-[#34445f]">Campaigns: </span>
                  {camps.length ? camps.join(", ") : "Not on any campaign"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddSmtpModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); void sync(); }} />}
    </div>
  );
}

function AddSmtpModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    from_name: "", from_email: "", username: "", password: "",
    smtp_host: "", smtp_port: "587",
    imap_host: "", imap_port: "993",
    max_email_per_day: "50",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.from_email || !form.smtp_host) { toast.error("From email and SMTP host required"); return; }
    setBusy(true);
    try {
      await callProxy("/email-accounts/save", "POST", {
        from_name: form.from_name, from_email: form.from_email,
        user_name: form.username || form.from_email, password: form.password,
        smtp_host: form.smtp_host, smtp_port: Number(form.smtp_port),
        imap_host: form.imap_host || form.smtp_host, imap_port: Number(form.imap_port),
        max_email_per_day: Number(form.max_email_per_day),
      });
      toast.success("Email account saved");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save account");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#edf2f8] p-4">
          <h3 className="text-base font-black">Add SMTP Account</h3>
          <button onClick={onClose} className="rounded-full p-1 text-[#526078]"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 text-sm">
          <label className="col-span-2 block"><span className="text-xs font-bold text-[#34445f]">From name</span><input value={form.from_name} onChange={set("from_name")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="col-span-2 block"><span className="text-xs font-bold text-[#34445f]">From email</span><input value={form.from_email} onChange={set("from_email")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="block"><span className="text-xs font-bold text-[#34445f]">Username</span><input value={form.username} onChange={set("username")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="block"><span className="text-xs font-bold text-[#34445f]">Password</span><input type="password" value={form.password} onChange={set("password")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="block"><span className="text-xs font-bold text-[#34445f]">SMTP host</span><input value={form.smtp_host} onChange={set("smtp_host")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="block"><span className="text-xs font-bold text-[#34445f]">SMTP port</span><input value={form.smtp_port} onChange={set("smtp_port")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="block"><span className="text-xs font-bold text-[#34445f]">IMAP host</span><input value={form.imap_host} onChange={set("imap_host")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="block"><span className="text-xs font-bold text-[#34445f]">IMAP port</span><input value={form.imap_port} onChange={set("imap_port")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
          <label className="col-span-2 block"><span className="text-xs font-bold text-[#34445f]">Max emails per day</span><input value={form.max_email_per_day} onChange={set("max_email_per_day")} className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f8] p-3">
          <button onClick={onClose} className="rounded-lg border border-[#dbe4f2] px-3 py-2 text-xs font-bold text-[#526078]">Cancel</button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save</button>
        </div>
      </div>
    </div>
  );
}
