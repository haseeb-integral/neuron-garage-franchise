import { useEffect, useMemo, useRef, useState } from "react";
import { Candidate, stateRequiresRegistration } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
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
  { key: "answered_questions", label: "Answered all relevant questions" },
  { key: "prospect_summarized", label: "Prospect summarized key takeaways" },
  { key: "asked_move_forward", label: "Asked if they want to move forward" },
  { key: "scheduled_next_call", label: "Scheduled next call with clear agenda" },
  { key: "assigned_homework", label: "Assigned homework" },
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
    goal: "20–30 min phone call. Quickly determine if the prospect is a viable fit. Assert process leadership.",
    trialClose: true,
    postCall: [
      { key: "asked_move_forward", label: "Asked if they want to move forward with our process" },
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
    postCall: [
      { key: "perform_bg_credit", label: "Performed background + credit check after submission" },
      { key: "uploaded_results", label: "Uploaded results to Franchise contact card (Documents tab)" },
    ],
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
    fields: [
      { key: "fdd_sent_date", label: "FDD sent date", type: "date", hint: "Signing call cannot be scheduled until 16 days after this date" },
    ],
  },
  {
    num: 5,
    title: "Business Immersion & Evaluation",
    goal: "Show full Neuron Garage owner experience: day-in-the-life, support systems, meet a growth guide. Prep for Selection Committee.",
    trialClose: true,
    postCall: [
      { key: "shared_with_committee", label: "Shared prospect's file with the Selection Committee (vote in Committee Votes tab)" },
    ],
    homework: [
      { key: "facility_form", label: "Facility prospect form — primary + backup locations (attach to contact card)" },
      { key: "marketing_plan", label: "Local marketing plan summary (attach to contact card)" },
    ],
    fields: [
      { key: "reference_1", label: "Reference Check #1 (~20 min)", type: "textarea" },
      { key: "reference_2", label: "Reference Check #2 (~20 min)", type: "textarea" },
      { key: "reference_3", label: "Reference Check #3 (~20 min)", type: "textarea" },
    ],
  },
  {
    num: 6,
    title: "Confirmation Call",
    goal: "Final alignment + commitment. 'The selection committee approved your award of a franchise.' First half = franchisor commitments. Second half = prospect Q&A.",
    trialClose: true,
    postCall: [
      { key: "overnight_pen", label: "Overnighted a personalized Neuron Garage pen with their franchise $ on it" },
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

const stepProgress = (s: StepDef, row: StepRow): { done: number; total: number } => {
  const checklists: [boolean, { key: string }[], ChecklistMap][] = [
    [s.trialClose, TRIAL_CLOSE_ITEMS, row.trial_close],
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

export function ProcessTab({ candidate }: Props) {
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
            <strong>Franchisee Qualification Process.</strong> Fill these in during/after each call. Steps are freely navigable — nothing is locked. Step 1 lead details live in the <em>Lead Sheet</em> tab; checkbox progress here drives the <em>Homework</em> tab.
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
                    {row.completed && <CheckCircle2 size={14} style={{ color: "#20c997" }} />}
                    <span className="text-[11px]" style={{ color: "#526078" }}>{done}/{total} · {pct}%</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-xs mb-3" style={{ color: "#526078" }}>{step.goal}</p>

                {step.num === 1 && (
                  <div className="rounded-md p-2 mb-3 text-xs" style={{ backgroundColor: "#f6f9ff", border: "1px solid #dbe6ff", color: "#003c7e" }}>
                    Lead details (name, contact, role, location, desired market, timeline, source, investment capacity, motivation) live in the <strong>Lead Sheet</strong> tab — edits there are the source of truth.
                  </div>
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

                {step.num === 4 && earliestSignDate && (
                  <div className="rounded-md p-2 mb-3 text-xs" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                    Earliest signing date: <strong>{earliestSignDate.toLocaleDateString()}</strong> (FDD sent + 16 days)
                  </div>
                )}

                {step.trialClose && (
                  <ChecklistBlock
                    title="Trial Close (5 components)"
                    items={TRIAL_CLOSE_ITEMS}
                    state={row.trial_close}
                    onToggle={(k, v) => toggleChecklist(step.num, "trial_close", k, v)}
                  />
                )}

                {step.postCall.length > 0 && (
                  <ChecklistBlock
                    title="Post-Call Actions"
                    items={step.postCall}
                    state={row.post_call_actions}
                    onToggle={(k, v) => toggleChecklist(step.num, "post_call_actions", k, v)}
                  />
                )}

                {step.homework.length > 0 && (
                  <ChecklistBlock
                    title="Assign & Track Homework"
                    items={step.homework}
                    state={row.homework}
                    onToggle={(k, v) => toggleChecklist(step.num, "homework", k, v)}
                  />
                )}

                {step.num === 7 && (
                  <div className="rounded-md p-2 mt-3 text-xs" style={{ backgroundColor: "#fff4e5", border: "1px solid #ffd591", color: "#7a4a00" }}>
                    <strong>Note for recruiter:</strong> When signing is complete, manually move this candidate from the Pipeline into Onboarding. No auto-advance happens here.
                  </div>
                )}

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
}: {
  title: string;
  items: { key: string; label: string }[];
  state: ChecklistMap;
  onToggle: (key: string, value: boolean) => void;
}) {
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold mb-2" style={{ color: "#003c7e" }}>{title}</div>
      <div className="space-y-1.5">
        {items.map((i) => (
          <label key={i.key} className="flex items-start gap-2 cursor-pointer text-sm" style={{ color: "#07142f" }}>
            <Checkbox
              checked={!!state?.[i.key]}
              onCheckedChange={(v) => onToggle(i.key, !!v)}
              className="mt-0.5"
            />
            <span>{i.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
