import { useEffect, useMemo, useRef, useState } from "react";
import { Candidate, stateRequiresRegistration } from "@/data/pipelineData";
import { CandidateScheduleSection } from "@/components/candidate-pipeline/CandidateScheduleSection";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { ContactIntakeSection, LeadSourceCard, MailingAddressCard } from "./step1/ContactIntakeSection";
import { LeadSheetSection } from "./LeadSheetSection";
import { HomeworkUploadButton } from "../HomeworkUploadButton";
import { SIGNAL_QUESTIONS, SIGNAL_NOTES_KEY, countRedFlags } from "@/lib/candidateStepSignals";

interface TeamMember { email: string; firstName: string; }

interface Props {
  candidate: Candidate;
  teamMembers?: TeamMember[];
  onSaveProfile?: (patch: Record<string, any>, localPatch: Partial<Candidate>) => Promise<void> | void;
}

type ChecklistMap = Record<string, boolean>;

interface StepRow {
  id?: string;
  candidate_id: string;
  step_number: number;
  trial_close: ChecklistMap;
  post_call_actions: ChecklistMap;
  homework: ChecklistMap;
  data: Record<string, any>;
  notes: string | null;
  completed: boolean;
}

const TRIAL_CLOSE_ITEMS: { key: string; label: string }[] = [
  { key: "answered_questions", label: "Are there any other questions I can answer for you?" },
  { key: "prospect_summarized", label: "Will you please summarize your key takeaways from today's call?" },
  { key: "asked_move_forward", label: "Would you like to move forward with our process?" },
  { key: "scheduled_next_call", label: "Scheduled next call with clear agenda" },
  { key: "assigned_homework", label: "Assigned homework" },
];

/** Homework items that do not require the candidate to send a document back. */
const NO_UPLOAD_HOMEWORK = new Set(["mvs_site_share", "read_mindset"]);

const TIMEZONES = [
  "ET (Eastern)",
  "CT (Central)",
  "MT (Mountain)",
  "PT (Pacific)",
  "AKT (Alaska)",
  "HT (Hawaii)",
];

interface StepDef {
  num: number;
  title: string;
  goal: string;
  trialClose: boolean;
  postCall: { key: string; label: string }[];
  homework: { key: string; label: string }[];
  fields?: { key: string; label: string; type: "text" | "number" | "date" | "textarea"; hint?: string }[];
}

const STEPS: StepDef[] = [
  {
    num: 1,
    title: "Initial Qualification",
    goal: "20–30 min phone call. Quickly determine if the prospect is a viable fit. This is more of a disqualification call. Assert process leadership -- our process has been designed very deliberately to maximize exposure to our business model so you and we can make an informed decision.",
    trialClose: true,
    postCall: [
      { key: "update_qualification_scores", label: "Update the qualification scores on the Overview tab" },
    ],
    homework: [
      { key: "rfc_part1", label: "Complete Request for Consideration – Part 1 (non-financial), due 2 days before next call" },
    ],
  },
  {
    num: 2,
    title: "Business Overview Call",
    goal: "Provide deeper understanding including unit economics. Review financial forecasting template.",
    trialClose: true,
    postCall: [
      { key: "mvs_site_run", label: 'Ran "Market Validation" + "Site Analysis" on desired location, sent reports + uploaded to contact card' },
      { key: "sent_mindset", label: "Sent franchisee candidate the Mindset book" },
      { key: "sent_bg_auth", label: "Sent Background and Credit Check authorization" },
    ],
    homework: [
      { key: "mvs_site_share", label: "Candidate to review Market Validation + Site Analysis" },
      { key: "rfc_part2", label: "Complete Request for Consideration – Part 2 (financial)" },
      { key: "read_mindset", label: "Read Mindset by Carol Dweck" },
      { key: "provide_bg_auth", label: "Provide authorization for Background + Credit check" },
    ],
  },
  {
    num: 3,
    title: "Internal: Background & Credit Check",
    goal: "Background = recency, decency, frequency (did they learn their lesson). Credit = ability to run a personal business. National avg 683; target 720+. Exceptions: divorce, catastrophic health events.",
    trialClose: false,
    postCall: [],
    homework: [],
    fields: [
      { key: "credit_score", label: "Credit score", type: "number", hint: "Target 720+ (national avg 683)" },
      { key: "background_result", label: "Background check summary", type: "textarea" },
    ],
  },
  {
    num: 4,
    title: "FDD & Franchise Agreement Review",
    goal: "Educate and reinforce that franchises are awarded, not sold. Google Meet covering FDD + key agreement terms.",
    trialClose: true,
    postCall: [
      { key: "sent_fdd", label: "Sent FDD and saved/uploaded proof of date sent" },
    ],
    homework: [
      { key: "signed_item23", label: "Sign and return Item 23 of the FDD" },
      { key: "personality_profile", label: "Complete personality profile assessment" },
    ],
    fields: [],
  },
  {
    num: 5,
    title: "Business Immersion & Evaluation",
    goal: "Show full Neuron Garage owner experience: day-in-the-life, support systems, meet a growth guide. Prep for Selection Committee.",
    trialClose: true,
    postCall: [
      { key: "shared_with_committee", label: "Shared prospect's file with the Selection Committee (vote in Committee Votes tab)" },
      { key: "reference_checks_done", label: "Completed candidate reference checks" },
    ],
    homework: [
      { key: "facility_form", label: "Facility prospect form — primary + backup locations (attach to contact card)" },
      { key: "marketing_plan", label: "Local marketing plan summary (attach to contact card)" },
    ],
  },
  {
    num: 6,
    title: "Confirmation Call",
    goal: "Final alignment + commitment. 'The selection committee approved your award of a franchise.' First half = franchisor commitments. Second half = prospect Q&A.",
    trialClose: true,
    postCall: [
      { key: "overnight_pen", label: "Overnighted a personalized Neuron Garage pen with their franchise number on it." },
    ],
    homework: [],
  },
  {
    num: 7,
    title: "Signing Call",
    goal: "Finalize agreement. Conducted 48 hours after Step 6. Prospect signs Franchise Agreement + all required exhibits.",
    trialClose: false,
    postCall: [
      { key: "begin_onboarding", label: "Began on-boarding process (email, phone #, file access, etc.)" },
      { key: "donuts_delivered", label: "Box of local donuts delivered with challenge donut description inside" },
    ],
    homework: [],
  },
];

/** Steps with no homework should not show the "Assigned homework" trial-close item. */
const trialCloseItemsFor = (s: StepDef) =>
  s.homework.length > 0
    ? TRIAL_CLOSE_ITEMS
    : TRIAL_CLOSE_ITEMS.filter((i) => i.key !== "assigned_homework");

const stepProgress = (s: StepDef, row: StepRow): { done: number; total: number } => {
  const checklists: [boolean, { key: string }[], ChecklistMap][] = [
    [s.trialClose, trialCloseItemsFor(s), row.trial_close],
    [true, s.postCall, row.post_call_actions],
    [true, s.homework, row.homework],
  ];
  let done = 0;
  let total = 0;
  for (const [enabled, items, map] of checklists) {
    if (!enabled) continue;
    for (const i of items) {
      total++;
      if (map?.[i.key]) done++;
    }
  }
  return { done, total };
};

const emptyRow = (candidateId: string, step: number): StepRow => ({
  candidate_id: candidateId,
  step_number: step,
  trial_close: {},
  post_call_actions: {},
  homework: {},
  data: {},
  notes: null,
  completed: false,
});

export function ProcessTab({ candidate, teamMembers = [], onSaveProfile }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const [rows, setRows] = useState<Record<number, StepRow>>({});
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Record<number, number>>({});
  const needsReg = stateRequiresRegistration(candidate.state);

  useEffect(() => {
    let cancelled = false;
    if (!dbId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("candidate_process_steps")
        .select("*")
        .eq("candidate_id", dbId);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load process steps", error);
        toast.error("Couldn't load process data", { description: error.message });
        setLoading(false);
        return;
      }
      const next: Record<number, StepRow> = {};
      for (const s of STEPS) next[s.num] = emptyRow(dbId, s.num);
      for (const r of data ?? []) {
        next[r.step_number] = {
          id: r.id,
          candidate_id: r.candidate_id,
          step_number: r.step_number,
          trial_close: (r.trial_close as ChecklistMap) ?? {},
          post_call_actions: (r.post_call_actions as ChecklistMap) ?? {},
          homework: (r.homework as ChecklistMap) ?? {},
          data: (r.data as Record<string, any>) ?? {},
          notes: r.notes,
          completed: r.completed,
        };
      }
      setRows(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dbId]);

  const persist = (
    stepNum: number,
    row: StepRow,
    change?: { description: string; metadata: Record<string, any> },
  ) => {
    if (!dbId) return;
    if (saveTimers.current[stepNum]) window.clearTimeout(saveTimers.current[stepNum]);
    saveTimers.current[stepNum] = window.setTimeout(async () => {
      const payload = {
        candidate_id: dbId,
        step_number: stepNum,
        trial_close: row.trial_close,
        post_call_actions: row.post_call_actions,
        homework: row.homework,
        data: row.data,
        notes: row.notes,
        completed: row.completed,
        completed_at: row.completed ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from("candidate_process_steps")
        .upsert(payload as any, { onConflict: "candidate_id,step_number" });
      if (error) {
        console.error("Failed to save process step", error);
        toast.error("Couldn't save step", { description: error.message });
      } else {
        const { logActivity } = await import("@/lib/candidateActivity");
        const stepDef = STEPS.find((s) => s.num === stepNum);
        const stepTitle = stepDef ? stepDef.title : `Step ${stepNum}`;
        const description =
          change?.description ?? `Step ${stepNum} (${stepTitle}) — updated`;
        logActivity(
          dbId,
          "process_step_updated",
          description,
          { step_number: stepNum, step_title: stepTitle, ...(change?.metadata ?? {}) },
        );
      }
    }, 450);
  };

  const updateStep = (
    stepNum: number,
    patch: Partial<StepRow>,
    change?: { description: string; metadata: Record<string, any> },
  ) => {
    setRows((prev) => {
      const cur = prev[stepNum] ?? emptyRow(dbId ?? "", stepNum);
      const next = { ...cur, ...patch };
      persist(stepNum, next, change);
      return { ...prev, [stepNum]: next };
    });
  };

  const groupLabel = (group: "trial_close" | "post_call_actions" | "homework") =>
    group === "trial_close" ? "Trial Close" : group === "post_call_actions" ? "Post-Call Action" : "Homework";

  const itemLabel = (
    stepNum: number,
    group: "trial_close" | "post_call_actions" | "homework",
    key: string,
  ): string => {
    const s = STEPS.find((x) => x.num === stepNum);
    if (!s) return key;
    const list =
      group === "trial_close" ? TRIAL_CLOSE_ITEMS : group === "post_call_actions" ? s.postCall : s.homework;
    return list.find((i) => i.key === key)?.label ?? key;
  };

  const toggleChecklist = (stepNum: number, group: "trial_close" | "post_call_actions" | "homework", key: string, value: boolean) => {
    const cur = rows[stepNum] ?? emptyRow(dbId ?? "", stepNum);
    const stepDef = STEPS.find((s) => s.num === stepNum);
    const stepTitle = stepDef?.title ?? `Step ${stepNum}`;
    const label = itemLabel(stepNum, group, key);
    const description = `Step ${stepNum} (${stepTitle}) — ${groupLabel(group)}: ${label} ${value ? "✓ checked" : "✗ unchecked"}`;
    updateStep(
      stepNum,
      { [group]: { ...cur[group], [key]: value } } as Partial<StepRow>,
      { description, metadata: { group, item_key: key, item_label: label, value } },
    );
  };

  const updateField = (stepNum: number, key: string, value: any) => {
    const cur = rows[stepNum] ?? emptyRow(dbId ?? "", stepNum);
    const stepDef = STEPS.find((s) => s.num === stepNum);
    const stepTitle = stepDef?.title ?? `Step ${stepNum}`;
    const fieldLabel = stepDef?.fields?.find((f) => f.key === key)?.label ?? key;
    const display = typeof value === "string" && value.length > 40 ? value.slice(0, 39) + "…" : String(value ?? "");
    const description = `Step ${stepNum} (${stepTitle}) — ${fieldLabel}: ${display || "(cleared)"}`;
    updateStep(
      stepNum,
      { data: { ...cur.data, [key]: value } },
      { description, metadata: { field_key: key, field_label: fieldLabel, value } },
    );
  };



  const earliestSignDate = useMemo(() => {
    const sent = rows[4]?.data?.fdd_sent_date as string | undefined;
    if (!sent) return null;
    const d = new Date(sent);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 16);
    return d;
  }, [rows]);

  if (!dbId) {
    return (
      <div className="pt-4 text-sm" style={{ color: "#526078" }}>
        This candidate isn't yet linked to a database record, so the process workflow can't be saved.
      </div>
    );
  }

  if (loading) {
    return <div className="pt-4 text-sm" style={{ color: "#526078" }}>Loading process…</div>;
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#eef4ff", border: "1px solid #c7d8ff", color: "#003c7e" }}>
        <div className="flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          <div>
            <strong>Franchisee Qualification Process.</strong> Fill these in during/after each call. Steps are freely navigable — nothing is locked. All candidate details are entered in Step 1 below; checkbox progress here drives the <em>Homework</em> tab.
          </div>
        </div>
      </div>

      {needsReg && (
        <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#fff4e5", border: "1px solid #ffd591", color: "#7a4a00" }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              <strong>{candidate.state} is a franchise registration state.</strong> Confirm registration status before continuing. Per the Step 1 script, you may need to politely end the call and reach back out once registered.
            </div>
          </div>
        </div>
      )}

      <CandidateScheduleSection candidate={candidate} />

      <LeadSourceCard candidate={candidate} onSave={onSaveProfile} />


      <Accordion type="multiple" defaultValue={STEPS.map((s) => `step-${s.num}`)} className="space-y-2">
        {STEPS.map((step) => {
          const row = rows[step.num] ?? emptyRow(dbId, step.num);
          const { done, total } = stepProgress(step, row);
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);

          return (
            <AccordionItem
              key={step.num}
              value={`step-${step.num}`}
              className="rounded-lg border-b-0 bg-white"
              style={{ border: "1px solid #e3e8ef" }}
            >
              <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                <div className="flex-1 flex items-center justify-between gap-3 pr-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-semibold rounded px-2 py-0.5" style={{ backgroundColor: "#eef4ff", color: "#174be8" }}>
                      Step {step.num}
                    </span>
                    <span className="text-sm font-semibold truncate" style={{ color: "#07142f" }}>{step.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {countRedFlags(row.data) > 0 && (
                      <span
                        className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                        style={{ backgroundColor: "#fdeaea", color: "#c0392b" }}
                      >
                        {countRedFlags(row.data)} flag{countRedFlags(row.data) === 1 ? "" : "s"}
                      </span>
                    )}
                    {row.completed && <CheckCircle2 size={14} style={{ color: "#20c997" }} />}
                    <span className="text-[11px]" style={{ color: "#526078" }}>{done}/{total} · {pct}%</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-xs mb-3" style={{ color: "#526078" }}>{step.goal}</p>

                {step.num === 1 && (
                  <>
                    <ContactIntakeSection candidate={candidate} teamMembers={teamMembers} onSave={onSaveProfile} />
                    <div className="mb-4">
                      <LeadSheetSection candidate={candidate} />
                    </div>
                  </>
                )}

                {step.fields && step.fields.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {step.fields.map((f) => (
                      <div key={f.key}>
                        <Label className="text-xs" style={{ color: "#07142f" }}>{f.label}</Label>
                        {f.type === "textarea" ? (
                          <Textarea
                            value={(row.data?.[f.key] as string) ?? ""}
                            onChange={(e) => updateField(step.num, f.key, e.target.value)}
                            className="mt-1 text-sm"
                            rows={3}
                          />
                        ) : (
                          <Input
                            type={f.type}
                            value={(row.data?.[f.key] as string | number) ?? ""}
                            onChange={(e) => updateField(step.num, f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                            className="mt-1 text-sm"
                          />
                        )}
                        {f.hint && <div className="text-[11px] mt-1" style={{ color: "#8893a7" }}>{f.hint}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {step.num === 2 && (
                  <MailingAddressCard candidate={candidate} onSave={onSaveProfile} />
                )}

                {step.trialClose && (
                  <TrialCloseBlock
                    nameKey={`step-${step.num}`}
                    items={trialCloseItemsFor(step)}
                    state={row.trial_close}
                    data={row.data ?? {}}
                    onToggle={(k, v) => toggleChecklist(step.num, "trial_close", k, v)}
                    onField={(k, v) => updateField(step.num, k, v)}
                  />
                )}

                {step.postCall.length > 0 && (
                  <ChecklistBlock
                    title="Post-Call Actions"
                    items={step.postCall}
                    state={row.post_call_actions}
                    onToggle={(k, v) => toggleChecklist(step.num, "post_call_actions", k, v)}
                    renderAction={
                      step.num === 4
                        ? (item) =>
                            item.key === "sent_fdd" ? (
                              <HomeworkUploadButton
                                candidateDbId={dbId}
                                itemKey="sent_fdd"
                                itemLabel="FDD sent — proof of date sent"
                                category="fdd_proof"
                              />
                            ) : null
                        : undefined
                    }
                  />
                )}

                {step.num === 4 && (
                  <div className="mt-3 rounded-md p-3" style={{ backgroundColor: "#f7faff", border: "1px solid #dee2e6" }}>
                    <Label className="text-xs" style={{ color: "#07142f" }}>FDD sent date</Label>
                    <Input
                      type="date"
                      value={(row.data?.fdd_sent_date as string) ?? ""}
                      onChange={(e) => updateField(4, "fdd_sent_date", e.target.value)}
                      className="mt-1 text-sm max-w-[220px]"
                    />
                    <div className="text-[11px] mt-1" style={{ color: "#8893a7" }}>
                      Upload the proof of sending above, then enter the date here. Signing call cannot be scheduled until 16 days after this date.
                    </div>
                    {earliestSignDate && (
                      <div className="rounded-md p-2 mt-2 text-xs" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                        Earliest signing date: <strong>{earliestSignDate.toLocaleDateString()}</strong> (FDD sent + 16 days)
                      </div>
                    )}
                  </div>
                )}


                {step.num === 5 && (
                  <ReferencesBlock
                    data={row.data ?? {}}
                    onField={(k, v) => updateField(step.num, k, v)}
                  />
                )}



                {step.homework.length > 0 && (
                  <ChecklistBlock
                    title="Track Homework"
                    items={step.homework}
                    state={row.homework}
                    onToggle={(k, v) => toggleChecklist(step.num, "homework", k, v)}
                    renderAction={(item) =>
                      NO_UPLOAD_HOMEWORK.has(item.key) ? null : (
                        <HomeworkUploadButton
                          candidateDbId={dbId}
                          itemKey={item.key}
                          itemLabel={item.label}
                        />
                      )
                    }
                  />
                )}


                {step.num === 7 && (
                  <div className="rounded-md p-2 mt-3 text-xs" style={{ backgroundColor: "#fff4e5", border: "1px solid #ffd591", color: "#7a4a00" }}>
                    <strong>Note for recruiter:</strong> When signing is complete, manually move this candidate from the Pipeline into Onboarding. No auto-advance happens here.
                  </div>
                )}

                {step.num !== 3 && step.num !== 7 && (
                  <SignalsBlock
                    nameKey={`step-${step.num}`}
                    data={row.data ?? {}}
                    onField={(k, v) => updateField(step.num, k, v)}
                  />
                )}

                {step.num !== 3 && (
                  <div className="mt-4">
                    <Label className="text-xs" style={{ color: "#07142f" }}>Recruiter notes</Label>
                    <Textarea
                      value={row.notes ?? ""}
                      onChange={(e) => updateStep(
                        step.num,
                        { notes: e.target.value },
                        {
                          description: `Step ${step.num} (${step.title}) — recruiter notes edited`,
                          metadata: { field: "notes", length: e.target.value.length },
                        },
                      )}
                      className="mt-1 text-sm"
                      rows={2}
                      placeholder="Add any context, objections uncovered, follow-ups…"
                    />
                  </div>
                )}


                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id={`step-${step.num}-done`}
                    checked={row.completed}
                    onCheckedChange={(v) => updateStep(
                      step.num,
                      { completed: !!v },
                      {
                        description: `Step ${step.num} (${step.title}) — ${v ? "marked complete ✓" : "marked incomplete"}`,
                        metadata: { field: "completed", value: !!v },
                      },
                    )}
                  />
                  <Label htmlFor={`step-${step.num}-done`} className="text-xs cursor-pointer" style={{ color: "#07142f" }}>
                    Mark Step {step.num} complete
                  </Label>
                  {row.completed && <Badge variant="secondary" className="text-[10px]">Done</Badge>}
                </div>

              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function ChecklistBlock({
  title,
  items,
  state,
  onToggle,
  renderAction,
}: {
  title: string;
  items: { key: string; label: string }[];
  state: ChecklistMap;
  onToggle: (key: string, value: boolean) => void;
  /** Optional trailing control per item (used for homework uploads). */
  renderAction?: (item: { key: string; label: string }) => React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold mb-2" style={{ color: "#003c7e" }}>{title}</div>
      <div className="space-y-1.5">
        {items.map((i) => (
          <div key={i.key} className="flex items-start gap-2 text-sm" style={{ color: "#07142f" }}>
            <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
              <Checkbox
                checked={!!state?.[i.key]}
                onCheckedChange={(v) => onToggle(i.key, !!v)}
                className="mt-0.5"
              />
              <span>{i.label}</span>
            </label>
            {renderAction?.(i)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrialCloseBlock({
  nameKey,
  items,
  state,
  data,
  onToggle,
  onField,
}: {
  nameKey: string;
  items: { key: string; label: string }[];
  state: ChecklistMap;
  data: Record<string, any>;
  onToggle: (key: string, value: boolean) => void;
  onField: (key: string, value: any) => void;
}) {
  const sub = "ml-6 mt-1.5 space-y-1.5";
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold mb-2" style={{ color: "#003c7e" }}>Trial Close ({items.length} components)</div>
      <div className="space-y-2.5">
        {items.map((i) => (
          <div key={i.key} className="text-sm" style={{ color: "#07142f" }}>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={!!state?.[i.key]}
                onCheckedChange={(v) => onToggle(i.key, !!v)}
                className="mt-0.5"
              />
              <span>{i.label}</span>
            </label>

            {i.key === "answered_questions" && (
              <div className={sub}>
                <Textarea
                  value={(data.tc_other_questions as string) ?? ""}
                  onChange={(e) => onField("tc_other_questions", e.target.value)}
                  rows={2}
                  className="text-sm"
                  placeholder="Record any other questions they asked…"
                />
              </div>
            )}

            {i.key === "prospect_summarized" && (
              <div className={sub}>
                <Textarea
                  value={(data.tc_key_takeaways as string) ?? ""}
                  onChange={(e) => onField("tc_key_takeaways", e.target.value)}
                  rows={2}
                  className="text-sm"
                  placeholder="Record their key takeaways…"
                />
              </div>
            )}

            {i.key === "asked_move_forward" && (
              <div className={sub}>
                <div className="flex items-center gap-4">
                  {["yes", "no"].map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#07142f" }}>
                      <input
                        type="radio"
                        name={`tc_move_forward_${nameKey}`}
                        checked={data.tc_move_forward === opt}
                        onChange={() => onField("tc_move_forward", opt)}
                      />
                      {opt === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
                {data.tc_move_forward === "no" && (
                  <Textarea
                    value={(data.tc_move_forward_reason as string) ?? ""}
                    onChange={(e) => onField("tc_move_forward_reason", e.target.value)}
                    rows={2}
                    className="text-sm"
                    placeholder="Why not? Capture the reason…"
                  />
                )}
              </div>
            )}

            {i.key === "scheduled_next_call" && (
              <div className={`${sub} grid grid-cols-1 sm:grid-cols-3 gap-2`}>
                <div>
                  <Label className="text-[11px]" style={{ color: "#526078" }}>Date</Label>
                  <Input
                    type="date"
                    value={(data.tc_next_call_date as string) ?? ""}
                    onChange={(e) => onField("tc_next_call_date", e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px]" style={{ color: "#526078" }}>Time</Label>
                  <Input
                    type="time"
                    value={(data.tc_next_call_time as string) ?? ""}
                    onChange={(e) => onField("tc_next_call_time", e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px]" style={{ color: "#526078" }}>Time zone</Label>
                  <select
                    value={(data.tc_next_call_tz as string) ?? ""}
                    onChange={(e) => onField("tc_next_call_tz", e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const REFERENCE_FIELDS: { key: string; label: string; type: "text" | "email" | "tel" | "textarea" }[] = [
  { key: "first_name", label: "First name", type: "text" },
  { key: "last_name", label: "Last name", type: "text" },
  { key: "email", label: "Email address", type: "email" },
  { key: "phone", label: "Phone number", type: "tel" },
  { key: "relationship", label: "Relationship", type: "text" },
  { key: "notes", label: "Call notes", type: "textarea" },
];

function ReferencesBlock({
  data,
  onField,
}: {
  data: Record<string, any>;
  onField: (key: string, value: any) => void;
}) {
  return (
    <div className="mt-4 rounded-md p-3" style={{ backgroundColor: "#fafbfd", border: "1px solid #e3e8ef" }}>
      <div className="text-xs font-semibold mb-2" style={{ color: "#003c7e" }}>References</div>
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <div className="text-xs font-medium mb-1.5" style={{ color: "#07142f" }}>
              Reference Check #{n} (~20 min)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REFERENCE_FIELDS.filter((f) => f.type !== "textarea").map((f) => (
                <div key={f.key}>
                  <Label className="text-[11px]" style={{ color: "#526078" }}>{f.label}</Label>
                  <Input
                    type={f.type}
                    value={(data[`reference_${n}_${f.key}`] as string) ?? ""}
                    onChange={(e) => onField(`reference_${n}_${f.key}`, e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Label className="text-[11px]" style={{ color: "#526078" }}>Call notes</Label>
              <Textarea
                value={(data[`reference_${n}_notes`] as string) ?? (n === 1 ? ((data.reference_1 as string) ?? "") : (data[`reference_${n}`] as string) ?? "")}
                onChange={(e) => onField(`reference_${n}_notes`, e.target.value)}
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function SignalsBlock({
  nameKey,
  data,
  onField,
}: {
  nameKey: string;
  data: Record<string, any>;
  onField: (key: string, value: any) => void;
}) {
  const flags = countRedFlags(data);
  return (
    <div className="mt-4 rounded-md p-3" style={{ backgroundColor: "#fafbfd", border: "1px solid #e3e8ef" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "#003c7e" }}>Signals & Red Flags</div>
        {flags > 0 && (
          <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ backgroundColor: "#fdeaea", color: "#c0392b" }}>
            {flags} red flag{flags === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {SIGNAL_QUESTIONS.map((q) => (
          <div key={q.key}>
            <div className="text-xs mb-1" style={{ color: "#07142f" }}>{q.label}</div>
            <div className="flex flex-wrap items-center gap-3">
              {q.options.map((o) => {
                const selected = data[q.key] === o.value;
                const red = selected && o.red;
                return (
                  <label
                    key={o.value}
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                    style={{ color: red ? "#c0392b" : "#526078", fontWeight: red ? 600 : 400 }}
                  >
                    <input
                      type="radio"
                      name={`${q.key}_${nameKey}`}
                      checked={selected}
                      onChange={() => onField(q.key, o.value)}
                    />
                    {o.label}
                  </label>
                );
              })}
              {data[q.key] != null && data[q.key] !== "" && (
                <button
                  type="button"
                  className="text-[11px] underline"
                  style={{ color: "#8893a7" }}
                  onClick={() => onField(q.key, "")}
                >
                  clear
                </button>
              )}
            </div>
          </div>
        ))}

        <div>
          <Label className="text-xs" style={{ color: "#07142f" }}>Other red flag / notes</Label>
          <Textarea
            value={(data[SIGNAL_NOTES_KEY] as string) ?? ""}
            onChange={(e) => onField(SIGNAL_NOTES_KEY, e.target.value)}
            rows={2}
            className="mt-1 text-sm"
            placeholder="Anything else worth flagging from this call…"
          />
        </div>
      </div>
    </div>
  );
}
