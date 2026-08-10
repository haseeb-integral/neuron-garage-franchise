/**
 * Shared definition of the per-step "Signals & Red Flags" questions used on the
 * Qualification Process tab. Answers live inside the existing
 * `candidate_process_steps.data` JSON blob — no extra table needed.
 */

export interface SignalQuestion {
  key: string;
  label: string;
  options: { value: string; label: string; red?: boolean }[];
}

export const SIGNAL_QUESTIONS: SignalQuestion[] = [
  {
    key: "signal_on_time",
    label: "Was the prospect on time for this call?",
    options: [
      { value: "on_time", label: "On time" },
      { value: "late", label: "Late", red: true },
      { value: "no_show", label: "No-show", red: true },
    ],
  },
  {
    key: "signal_reschedule",
    label: "Did the prospect reschedule this call?",
    options: [
      { value: "none", label: "Not rescheduled" },
      { value: "once", label: "Rescheduled once" },
      { value: "multiple", label: "Rescheduled more than once", red: true },
    ],
  },
  {
    key: "signal_prepared",
    label: "Was the prospect prepared (homework done)?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "partly", label: "Partly" },
      { value: "no", label: "No", red: true },
    ],
  },
  {
    key: "signal_partner_engaged",
    label: "Was the spouse / partner engaged?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No", red: true },
      { value: "na", label: "Not applicable" },
    ],
  },
];

export const SIGNAL_NOTES_KEY = "signal_notes";

export function isRedAnswer(questionKey: string, value: unknown): boolean {
  const q = SIGNAL_QUESTIONS.find((x) => x.key === questionKey);
  if (!q) return false;
  return !!q.options.find((o) => o.value === value)?.red;
}

/** Labels of every red answer inside one step's `data` object. */
export function redFlagLabels(data: Record<string, any> | null | undefined): string[] {
  if (!data) return [];
  const out: string[] = [];
  for (const q of SIGNAL_QUESTIONS) {
    const opt = q.options.find((o) => o.value === data[q.key]);
    if (opt?.red) out.push(opt.label);
  }
  return out;
}

export function countRedFlags(data: Record<string, any> | null | undefined): number {
  return redFlagLabels(data).length;
}
