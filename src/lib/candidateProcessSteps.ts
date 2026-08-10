/** Step titles from the Qualification Process tab, used for scheduling call types. */
export const PROCESS_STEP_TITLES: { num: number; title: string }[] = [
  { num: 1, title: "Initial Qualification" },
  { num: 2, title: "Business Overview Call" },
  { num: 3, title: "Internal: Background & Credit Check" },
  { num: 4, title: "FDD & Franchise Agreement Review" },
  { num: 5, title: "Business Immersion & Evaluation" },
  { num: 6, title: "Confirmation Call" },
  { num: 7, title: "Signing Call" },
];

/** Options for the "Type" picker in the schedule dialog. */
export const EVENT_TYPE_OPTIONS: { value: string; label: string; kind: "call" | "follow_up" }[] = [
  ...PROCESS_STEP_TITLES.map((s) => ({
    value: `step-${s.num}`,
    label: `Step ${s.num} — ${s.title}`,
    kind: "call" as const,
  })),
  { value: "other-call", label: "Other call", kind: "call" },
  { value: "follow-up", label: "Follow-up reminder", kind: "follow_up" },
];

export function optionLabelForTitle(title: string): string | null {
  const opt = EVENT_TYPE_OPTIONS.find(
    (o) => o.label === title || o.label.split(" — ")[1] === title,
  );
  return opt ? opt.value : null;
}
