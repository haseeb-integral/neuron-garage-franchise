import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Mail, Plus, AlertCircle, Flame, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", { body: { endpoint, method, payload } });
  if (error) throw new Error(error.message ?? String(error));
  if (data?.ok === false) throw new Error(data?.error ?? "SmartLead error");
  return data;
}

type Account = {
  id: number | string;
  from_email?: string;
  from_name?: string;
  username?: string;
  smtp_host?: string;
  daily_sent_count?: number;
  message_per_day?: number;
  warmup_details?: { status?: string; total_sent_count?: number } | null;
  is_smtp_success?: boolean;
};

export function EmailAccountsPanel() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const raw = await callProxy("/email-accounts", "GET");
      const list: Account[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.email_accounts ?? []);
      setAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load email accounts");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const toggleWarmup = async (acc: Account) => {
    const currentlyOn = (acc.warmup_details?.status ?? "").toLowerCase() === "active";
    try {
      await callProxy(`/email-accounts/${acc.id}/warmup`, "POST", { warmup_enabled: !currentlyOn });
      toast.success(`Warmup ${!currentlyOn ? "enabled" : "disabled"} for ${acc.from_email ?? acc.id}`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle warmup");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center rounded-xl border border-[#e7edf5] bg-white py-16"><Loader2 className="mr-2 h-5 w-5 animate-spin text-[#174be8]" /><span className="text-sm text-[#526078]">Loading email accounts…</span></div>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-700"><AlertCircle size={16} /><span className="text-sm font-bold">Could not load email accounts</span></div>
        <p className="mt-2 text-xs text-red-700">{error}</p>
        <button onClick={() => void load()} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Email Accounts</h2>
          <p className="text-xs text-[#526078]">Sending accounts connected to SmartLead. Warmup status and daily limits shown live.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 py-2 text-xs font-bold text-[#174be8]"><RefreshCw size={12} /> Refresh</button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-3 py-2 text-xs font-bold text-white"><Plus size={12} /> Add SMTP</button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-[#e7edf5] bg-white p-10 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-[#174be8]" />
          <h3 className="text-base font-black">No email accounts connected</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#526078]">Connect a sending mailbox to SmartLead before starting a campaign. We recommend warming each account for 2 weeks before sending.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-3 py-2 text-xs font-bold text-white"><Plus size={14} /> Add SMTP Account</button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const warmOn = (a.warmup_details?.status ?? "").toLowerCase() === "active";
            const dailyUsed = a.daily_sent_count ?? 0;
            const dailyMax = a.message_per_day ?? 50;
            const pct = Math.min(100, (dailyUsed / Math.max(1, dailyMax)) * 100);
            return (
              <div key={a.id} className="rounded-xl border border-[#e7edf5] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black">{a.from_name ?? a.username ?? "Unnamed"}</div>
                    <div className="truncate text-xs text-[#526078]">{a.from_email ?? a.username}</div>
                    <div className="mt-1 truncate text-[10px] text-[#8794ab]">{a.smtp_host ?? "SMTP"}</div>
                  </div>
                  <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-bold ${a.is_smtp_success === false ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {a.is_smtp_success === false ? "Issue" : "Healthy"}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#34445f]"><span>Daily sent</span><span>{dailyUsed} / {dailyMax}</span></div>
                  <div className="h-1.5 rounded-full bg-[#edf2f8]"><div className="h-1.5 rounded-full bg-[#174be8]" style={{ width: `${pct}%` }} /></div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg border border-[#edf2f8] bg-[#fbfdff] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs"><Flame size={13} className={warmOn ? "text-[#b7791f]" : "text-[#8794ab]"} /><span className="font-bold">Warmup</span><span className="text-[#526078]">{warmOn ? "Active" : "Off"}</span></div>
                  <button onClick={() => toggleWarmup(a)} className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${warmOn ? "border border-[#dbe4f2] text-[#526078]" : "bg-[#174be8] text-white"}`}>{warmOn ? "Disable" : "Enable"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddSmtpModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); void load(); }} />}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
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
