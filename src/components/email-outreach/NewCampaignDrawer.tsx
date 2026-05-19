import { useEffect, useState } from "react";
import { X, Loader2, Check, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { callSmartLeadProxy, getSmartLeadErrorMessage } from "@/components/email-outreach/smartleadErrors";

type SequenceStep = { day: number; subject: string; body: string };

export function NewCampaignDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<string | number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  // Test mode
  const [testMode, setTestMode] = useState(true);
  const [testOverride, setTestOverride] = useState("");
  const [testLeadCount, setTestLeadCount] = useState(5);
  // Step 2
  const detectedTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
  const allTimezones = (() => {
    try {
      // @ts-ignore - supportedValuesOf available in modern browsers
      const list: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
      return list.length ? list : ["UTC", "America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles", "Asia/Karachi", "Asia/Kolkata", "Europe/London"];
    } catch { return ["UTC", "America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles", "Asia/Karachi", "Asia/Kolkata", "Europe/London"]; }
  })();
  const [timezone, setTimezone] = useState(detectedTz);
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("18:00");
  const [days, setDays] = useState<string[]>(["1", "2", "3", "4", "5"]);
  const [dailyCap, setDailyCap] = useState(200);
  const [minGapMinutes, setMinGapMinutes] = useState(5);

  // Auto-generate a default campaign name on drawer open
  function defaultCampaignName() {
    const d = new Date();
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    let tzAbbr = "";
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(d);
      tzAbbr = parts.find((p) => p.type === "timeZoneName")?.value || "";
    } catch {}
    const seq = (Number(localStorage.getItem("ng_campaign_seq") || "0") || 0) + 1;
    localStorage.setItem("ng_campaign_seq", String(seq));
    return `Outreach · ${month}-${day} · ${hh}:${mm}${tzAbbr ? ` ${tzAbbr}` : ""} · v${seq}`;
  }
  useEffect(() => {
    if (open && !name.trim()) setName(defaultCampaignName());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Live clock in the selected timezone
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNowTick(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const tzNow = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", weekday: "short", month: "short", day: "numeric", hour12: false });
      return fmt.format(new Date(nowTick));
    } catch { return ""; }
  })();
  const tzHHMM = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
      return fmt.format(new Date(nowTick));
    } catch { return "09:00"; }
  })();
  const tzWeekday = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" });
      // 0=Sun..6=Sat to match SmartLead (0=Sun)
      const map: Record<string, string> = { Sun: "0", Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6" };
      return map[fmt.format(new Date(nowTick))] ?? "1";
    } catch { return "1"; }
  })();
  const setStartNow = () => {
    setStartHour(tzHHMM);
    // ensure today's weekday is enabled
    setDays((prev) => prev.includes(tzWeekday) ? prev : [...prev, tzWeekday].sort());
    // ensure end hour is after start
    const [h] = tzHHMM.split(":").map(Number);
    const endH = Math.min(23, h + 4);
    setEndHour(`${String(endH).padStart(2, "0")}:59`);
  };
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

  const profileEmail = profile?.email ?? user?.email ?? "";
  const effectiveTestRecipient = testOverride.trim() || profileEmail;

  useEffect(() => {
    if (!open) {
      setStep(1); setBusy(false); setCreatedId(null); setName("");
      setTestMode(true); setTestOverride(""); setTestLeadCount(5);
      setTimezone(detectedTz); setStartHour("09:00"); setEndHour("18:00");
      setDays(["1", "2", "3", "4", "5"]); setDailyCap(200); setMinGapMinutes(1);
      setTrackOpens(true); setTrackClicks(true); setStopOnReply(true);
      setSequences([
        { day: 1, subject: "Quick question, {{first_name}}", body: "Hi {{first_name}},\n\n…" },
        { day: 3, subject: "Following up", body: "Just wanted to bump this." },
        { day: 7, subject: "Last note", body: "Closing the loop." },
      ]);
    }
  }, [open]);

  if (!open) return null;

  const toggleDay = (d: string) => setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());

  const toMinutes = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const validate = () => {
    if (!name.trim()) return "Campaign name required.";
    if (testMode && !effectiveTestRecipient) return "Test mode needs a recipient email.";
    if (!days.length) return "Pick at least one sending day.";
    const startMinutes = toMinutes(startHour);
    const endMinutes = toMinutes(endHour);
    if (startMinutes === null || endMinutes === null) return "Start and end time must be in HH:MM format.";
    if (startMinutes >= endMinutes) return "End time must be after start time.";
    if (minGapMinutes > 180) return "Min gap can't exceed 180 minutes.";
    if (dailyCap < 1 || dailyCap > 200) return "Daily send cap must be between 1 and 200.";
    if (!sequences.length) return "Add at least one email step.";
    const badStep = sequences.find((sequence) => !sequence.subject.trim() || !sequence.body.trim() || sequence.day < 1);
    if (badStep) return "Each sequence step needs a valid day, subject, and body.";
    return null;
  };

  const submit = async (launch: boolean) => {
    const error = validate();
    if (error) {
      setValidationError(error);
      toast.error(error);
      return;
    }

    setValidationError(null);
    setBusy(true);
    try {
      const created = await callSmartLeadProxy("/campaigns/create", "POST", { name: testMode ? `[TEST] ${name.trim()}` : name.trim() });
      const id = created?.id ?? created?.campaign_id ?? created?.data?.id;
      if (!id) throw new Error("SmartLead did not return a campaign id");
      setCreatedId(id);

      const runStep = async (action: () => Promise<void>, fallbackLabel: string) => {
        if (launch) {
          await action();
          return;
        }
        try {
          await action();
        } catch (stepError) {
          console.warn(fallbackLabel, stepError);
        }
      };

      await runStep(async () => {
        await callSmartLeadProxy(`/campaigns/${id}/schedule`, "POST", {
          timezone, days_of_the_week: days.map(Number),
          start_hour: startHour, end_hour: endHour,
          min_time_btw_emails: Math.max(3, Math.min(180, minGapMinutes)),
          max_new_leads_per_day: Math.max(1, Math.min(200, dailyCap)),
        });
      }, "schedule failed");

      await runStep(async () => {
        const track_settings = [
          !trackOpens ? "DONT_TRACK_EMAIL_OPEN" : null,
          !trackClicks ? "DONT_TRACK_LINK_CLICK" : null,
        ].filter(Boolean);
        await callSmartLeadProxy(`/campaigns/${id}/settings`, "POST", {
          track_settings,
          stop_lead_settings: stopOnReply ? "REPLY_TO_AN_EMAIL" : "CLICK_ON_A_LINK",
        });
      }, "settings failed");

      await runStep(async () => {
        await callSmartLeadProxy(`/campaigns/${id}/sequences`, "POST", {
          sequences: sequences.map((s, i) => ({
            seq_number: i + 1, seq_delay_details: { delay_in_days: s.day },
            subject: s.subject, email_body: s.body,
          })),
        });
      }, "sequences failed");

      // Test Mode: push N safe recipients (gmail+aliases) as leads.
      if (testMode) {
        await runStep(async () => {
          const base = effectiveTestRecipient;
          const [local, domain] = base.split("@");
          const cleanLocal = (local ?? "").split("+")[0];
          const count = Math.max(1, Math.min(10, testLeadCount));
          const lead_list = Array.from({ length: count }, (_, i) => ({
            email: count === 1 ? base : `${cleanLocal}+test${i + 1}@${domain}`,
            first_name: `Test${i + 1}`,
            last_name: "Recipient",
            custom_fields: { test_mode: "true" },
          }));
          await callSmartLeadProxy(`/campaigns/${id}/leads`, "POST", { lead_list });
        }, "test lead push failed");
      }

      // Assign ALL connected email accounts to this campaign — SmartLead refuses to START without one.
      await runStep(async () => {
        const accounts = await callSmartLeadProxy("/email-accounts", "GET");
        const ids = (Array.isArray(accounts) ? accounts : [])
          .map((a: any) => a?.id)
          .filter((x: any) => typeof x === "number" || typeof x === "string");
        if (!ids.length) {
          throw new Error("No email accounts connected in SmartLead. Connect one in Email Accounts tab first.");
        }
        await callSmartLeadProxy(`/campaigns/${id}/email-accounts`, "POST", { email_account_ids: ids });
      }, "assign email accounts failed");

      if (launch) {
        await callSmartLeadProxy(`/campaigns/${id}/status`, "POST", { status: "START" });
      }

      toast.success(
        launch
          ? `Campaign "${name}" launched${testMode ? ` (TEST → ${effectiveTestRecipient})` : ""}`
          : `Campaign "${name}" created as draft in SmartLead`,
      );
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(getSmartLeadErrorMessage(e));
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

        {testMode && step === 1 && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs">
            <div className="font-bold text-amber-900">🧪 Test Mode is ON</div>
            <div className="mt-0.5 text-amber-800">
              This campaign will send <b>only to {effectiveTestRecipient || "(no email on file)"}</b> — no real teachers. Flip the toggle below to disable once you've verified the test.
            </div>
          </div>
        )}

        <div className="space-y-4 p-5 text-sm">
          {validationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {validationError}
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-black">1. Create campaign</h3>

              <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <div className="flex-1">
                  <div className="text-sm font-bold text-amber-900">🧪 Test Mode — send only to my inbox</div>
                  <div className="mt-0.5 text-xs text-amber-800">Replaces the recipient list with a single safe address. FROM stays unchanged (your SmartLead mailbox).</div>
                </div>
                <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="mt-1" />
              </label>

              {testMode && (
                <div className="rounded-lg border border-[#dbe4f2] bg-[#fbfdff] p-3">
                  <div className="text-xs font-bold text-[#34445f]">Test recipient</div>
                  <div className="mt-1 text-[11px] text-[#526078]">Defaults to your profile email. Override with a Gmail+alias (e.g. <code>you+test1@gmail.com</code>) or a mailinator address.</div>
                  <input
                    value={testOverride}
                    onChange={(e) => setTestOverride(e.target.value)}
                    placeholder={profileEmail || "your-email@example.com"}
                    className="mt-2 h-9 w-full rounded-lg border border-[#dbe4f2] px-3 text-sm outline-none"
                  />
                  <div className="mt-1 text-[11px] text-[#0a8f5a]">→ Base address: <b>{effectiveTestRecipient || "(empty)"}</b></div>

                  <div className="mt-3 border-t border-[#dbe4f2] pt-3">
                    <div className="text-xs font-bold text-[#34445f]">Test leads count (1–10)</div>
                    <div className="mt-1 text-[11px] text-[#526078]">Auto-generates <code>you+test1@…</code> … <code>you+testN@…</code> aliases. Combine with a short "Min gap" in Step 2 for rapid back-to-back sends.</div>
                    <input
                      type="number" min={1} max={10}
                      value={testLeadCount}
                      onChange={(e) => setTestLeadCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                      className="mt-2 h-9 w-full rounded-lg border border-[#dbe4f2] px-3 text-sm"
                    />
                    {effectiveTestRecipient.includes("@") && testLeadCount > 1 && (() => {
                      const [l, d] = effectiveTestRecipient.split("@");
                      const base = (l ?? "").split("+")[0];
                      return <div className="mt-1 text-[11px] text-[#0a8f5a]">→ Will create {testLeadCount} leads: <b>{base}+test1@{d}</b> … <b>{base}+test{testLeadCount}@{d}</b></div>;
                    })()}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="text-xs font-bold text-[#34445f]">Campaign name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Outreach · May-19 · 22:45 PKT · v1" className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3 outline-none" />
                {testMode && name && <div className="mt-1 text-[11px] text-amber-700">SmartLead name will be: <b>[TEST] {name}</b></div>}
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-base font-black">2. Schedule & send rate</h3>
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#34445f]">Timezone</span>
                  <button type="button" onClick={() => setTimezone(detectedTz)} className="text-[11px] font-bold text-[#174be8] hover:underline">Use my timezone ({detectedTz})</button>
                </div>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3">
                  {!allTimezones.includes(timezone) && <option value={timezone}>{timezone}</option>}
                  {allTimezones.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="mt-1 rounded-md bg-[#eef4ff] px-2 py-1.5 text-[11px] text-[#174be8]">
                  🕒 Now in <b>{timezone}</b>: <b>{tzNow}</b> — use this to pick a Start hour just after the current time.
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-bold text-[#34445f]">Start hour</span><input value={startHour} onChange={(e) => setStartHour(e.target.value)} placeholder="09:00" className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
                <label className="block"><span className="text-xs font-bold text-[#34445f]">End hour</span><input value={endHour} onChange={(e) => setEndHour(e.target.value)} placeholder="18:00" className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3" /></label>
              </div>
              <button type="button" onClick={setStartNow} className="rounded-lg border border-[#174be8] bg-white px-3 py-1.5 text-[11px] font-bold text-[#174be8] hover:bg-[#eef4ff]">
                ⚡ Send starting now ({tzHHMM} in {timezone}) — also enables today
              </button>
              <div>
                <span className="text-xs font-bold text-[#34445f]">Sending days</span>
                <div className="mt-1 flex gap-1.5">
                  {[["1", "M"], ["2", "T"], ["3", "W"], ["4", "T"], ["5", "F"], ["6", "S"], ["0", "S"]].map(([d, lbl]) => (
                    <button key={d} onClick={() => toggleDay(d)} className={`h-9 w-9 rounded-lg border text-xs font-bold ${days.includes(d) ? "border-[#174be8] bg-[#174be8] text-white" : "border-[#dbe4f2] bg-white text-[#526078]"}`}>{lbl}</button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-[#34445f]">Daily send cap (per mailbox)</span>
                <input type="number" min={1} max={200} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value) || 50)} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3" />
                <div className="mt-1 text-[11px] text-[#526078]">Hard limit 200/day. Default 50 protects deliverability and your domain reputation.</div>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[#34445f]">Min gap between emails (minutes)</span>
                <input type="number" min={3} max={180} value={minGapMinutes} onChange={(e) => setMinGapMinutes(Number(e.target.value) || 5)} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f2] px-3" />
                <div className="mt-1 text-[11px] text-[#526078]"><b>SmartLead minimum is 3 minutes.</b> Production: keep 10+ for deliverability.</div>
              </label>
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
            <div className="flex gap-2">
              <button onClick={() => submit(false)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-4 py-2 text-xs font-bold text-[#174be8] disabled:opacity-60">
                {busy && <Loader2 size={12} className="animate-spin" />} Save as Draft
              </button>
              <button onClick={() => submit(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
                {testMode ? "Create & Launch (TEST)" : "Create & Launch"}
              </button>
            </div>
          )}
        </div>
        {createdId && <div className="px-5 pb-4 text-[11px] text-[#0a8f5a]">Created campaign id: {String(createdId)}</div>}
      </aside>
    </div>
  );
}
