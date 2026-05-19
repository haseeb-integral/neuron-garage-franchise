import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function callProxy(endpoint: string, method = "GET", payload?: unknown) {
  const { data, error } = await supabase.functions.invoke("smartlead-proxy", { body: { endpoint, method, payload } });
  if (error) throw new Error(error.message ?? String(error));
  if (data?.ok === false) throw new Error(data?.error ?? "SmartLead error");
  return data;
}

type SequenceStep = { day: number; subject: string; body: string };

export function NewCampaignDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<string | number | null>(null);

  // Step 1
  const [name, setName] = useState("");
  // Step 2
  const [timezone, setTimezone] = useState("America/Chicago");
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("18:00");
  const [days, setDays] = useState<string[]>(["1", "2", "3", "4", "5"]);
  // Step 3
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);
  const [stopOnReply, setStopOnReply] = useState(true);
  // Step 4
  const [sequences, setSequences] = useState<SequenceStep[]>([
    { day: 1, subject: "Quick question, {{first_name}}", body: "Hi {{first_name}},\n\n…" },
    { day: 3, subject: "Following up", body: "Just wanted to bump this." },
    { day: 7, subject: "Last note", body: "Closing the loop." },
  ]);

  const reset = () => {
    setStep(1); setBusy(false); setCreatedId(null); setName("");
    setTimezone("America/Chicago"); setStartHour("09:00"); setEndHour("18:00"); setDays(["1", "2", "3", "4", "5"]);
    setTrackOpens(true); setTrackClicks(true); setStopOnReply(true);
    setSequences([
      { day: 1, subject: "Quick question, {{first_name}}", body: "Hi {{first_name}},\n\n…" },
      { day: 3, subject: "Following up", body: "Just wanted to bump this." },
      { day: 7, subject: "Last note", body: "Closing the loop." },
    ]);
  };

  if (!open) return null;

  const toggleDay = (d: string) => setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());

  const submit = async () => {
    if (!name.trim()) { toast.error("Campaign name required"); return; }
    setBusy(true);
    try {
      const created = await callProxy("/campaigns/create", "POST", { name: name.trim() });
      const id = created?.id ?? created?.campaign_id ?? created?.data?.id;
      if (!id) throw new Error("SmartLead did not return a campaign id");
      setCreatedId(id);

      try {
        await callProxy(`/campaigns/${id}/schedule`, "POST", {
          timezone, days_of_the_week: days.map(Number),
          start_hour: startHour, end_hour: endHour,
          min_time_btw_emails: 10, max_new_leads_per_day: 20,
        });
      } catch (e) { console.warn("schedule failed", e); }

      try {
        // SmartLead uses a negative list: include a DONT_* flag to DISABLE tracking.
        const track_settings = [
          !trackOpens ? "DONT_TRACK_EMAIL_OPEN" : null,
          !trackClicks ? "DONT_TRACK_LINK_CLICK" : null,
        ].filter(Boolean);
        await callProxy(`/campaigns/${id}/settings`, "POST", {
          track_settings,
          stop_lead_settings: stopOnReply ? "REPLY_TO_AN_EMAIL" : "CLICK_ON_A_LINK",
        });
      } catch (e) { console.warn("settings failed", e); }

      try {
        await callProxy(`/campaigns/${id}/sequences`, "POST", {
          sequences: sequences.map((s, i) => ({
            seq_number: i + 1, seq_delay_details: { delay_in_days: s.day },
            subject: s.subject, email_body: s.body,
          })),
        });
      } catch (e) { console.warn("sequences failed", e); }

      toast.success(`Campaign "${name}" created in SmartLead`);
      onCreated?.();
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-[560px] overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2f8] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-black">New Campaign</h2>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#526078]">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={`flex items-center gap-1 ${step >= n ? "text-[#174be8]" : ""}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step > n ? "bg-[#0a8f5a] text-white" : step === n ? "bg-[#174be8] text-white" : "bg-[#eef2f7] text-[#8794ab]"}`}>{step > n ? <Check size={11} /> : n}</span>
                  {n < 4 && <span className="text-[#cbd5e1]">—</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[#526078] hover:bg-[#f7faff]"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-base font-black">1. Create campaign</h3>
              <label className="block">
                <span className="text-xs font-bold text-[#34445f]">Campaign name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Austin TX — Spring 2026" className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3 outline-none" />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-base font-black">2. Schedule</h3>
              <label className="block">
                <span className="text-xs font-bold text-[#34445f]">Timezone</span>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3">
                  {["America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-bold text-[#34445f]">Start hour</span><input value={startHour} onChange={(e) => setStartHour(e.target.value)} placeholder="09:00" className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
                <label className="block"><span className="text-xs font-bold text-[#34445f]">End hour</span><input value={endHour} onChange={(e) => setEndHour(e.target.value)} placeholder="18:00" className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
              </div>
              <div>
                <span className="text-xs font-bold text-[#34445f]">Sending days</span>
                <div className="mt-1 flex gap-1.5">
                  {[["1", "M"], ["2", "T"], ["3", "W"], ["4", "T"], ["5", "F"], ["6", "S"], ["0", "S"]].map(([d, lbl]) => (
                    <button key={d} onClick={() => toggleDay(d)} className={`h-9 w-9 rounded-lg border text-xs font-bold ${days.includes(d) ? "border-[#174be8] bg-[#174be8] text-white" : "border-[#dbe4f2] bg-white text-[#526078]"}`}>{lbl}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-base font-black">3. Settings</h3>
              {[["Track opens", trackOpens, setTrackOpens], ["Track clicks", trackClicks, setTrackClicks], ["Stop sequence on reply", stopOnReply, setStopOnReply]].map(([label, val, set]) => (
                <label key={label as string} className="flex items-center justify-between rounded-lg border border-[#dbe4f2] px-3 py-2.5">
                  <span className="text-sm font-bold">{label as string}</span>
                  <input type="checkbox" checked={val as boolean} onChange={(e) => (set as (v: boolean) => void)(e.target.checked)} />
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-base font-black">4. Sequences</h3>
              {sequences.map((s, i) => (
                <div key={i} className="rounded-lg border border-[#dbe4f2] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#34445f]">Step {i + 1} · Day</span>
                    <input type="number" min={1} value={s.day} onChange={(e) => { const v = Number(e.target.value || 1); setSequences((prev) => prev.map((x, idx) => idx === i ? { ...x, day: v } : x)); }} className="h-8 w-16 rounded-lg border border-[#dbe4f2] px-2 text-xs" />
                  </div>
                  <input value={s.subject} onChange={(e) => setSequences((prev) => prev.map((x, idx) => idx === i ? { ...x, subject: e.target.value } : x))} placeholder="Subject" className="mb-2 h-9 w-full rounded-lg border border-[#dbe4f2] px-3 text-sm" />
                  <textarea value={s.body} onChange={(e) => setSequences((prev) => prev.map((x, idx) => idx === i ? { ...x, body: e.target.value } : x))} placeholder="Email body" className="min-h-[80px] w-full rounded-lg border border-[#dbe4f2] p-3 text-sm" />
                </div>
              ))}
              <button onClick={() => setSequences((prev) => [...prev, { day: (prev[prev.length - 1]?.day ?? 1) + 3, subject: "", body: "" }])} className="text-xs font-bold text-[#174be8]">+ Add step</button>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-[#edf2f8] bg-white px-5 py-3">
          <button onClick={() => (step === 1 ? onClose() : setStep(step - 1))} disabled={busy} className="rounded-lg border border-[#dbe4f2] px-4 py-2 text-xs font-bold text-[#526078]">{step === 1 ? "Cancel" : "Back"}</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && !name.trim()} className="rounded-lg bg-[#174be8] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Next</button>
          ) : (
            <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {busy && <Loader2 size={12} className="animate-spin" />} Create in SmartLead
            </button>
          )}
        </div>
        {createdId && <div className="px-5 pb-4 text-[11px] text-[#0a8f5a]">Created campaign id: {String(createdId)}</div>}
      </aside>
    </div>
  );
}
