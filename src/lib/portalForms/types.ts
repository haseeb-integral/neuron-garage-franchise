export type Answers = Record<string, unknown>;

export interface FormField {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "radio" | "checkboxes" | "checkbox" | "state";
  options?: string[];
  /** Fields are required unless marked optional. */
  optional?: boolean;
  /** Required only when this returns true (overrides optional). */
  requiredWhen?: (a: Answers) => boolean;
  width?: "full" | "half" | "third";
  help?: string;
}

export interface FormRepeater {
  key: string;
  itemLabel: string;
  startWith: number;
  max: number;
  /** Items with index below this are required; later items are optional. */
  requiredCount: number;
  addLabel?: string;
  fields: FormField[];
}

export interface FormSection {
  id: string;
  title: string;
  intro?: string;
  fields?: FormField[];
  repeater?: FormRepeater;
}

export interface PortalFormDef {
  key: string;
  version: string;
  title: string;
  intro: string;
  dueText: string;
  stepNum: number;
  /** Checklist item key in PORTAL_STEPS that this form completes. */
  itemKey: string;
  sections: FormSection[];
  signature: { heading: string; text: string; note: string };
  /** Answer keys holding the signer's first and last name. */
  nameKeys: { first: string; last: string };
}
