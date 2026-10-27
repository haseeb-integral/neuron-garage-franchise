import type { Answers, FormField, FormSection, PortalFormDef } from "./types";
import { RFC_FORM } from "./rfc";
import { BGCF_FORM } from "./bgcf";
import { ITEM23_FORM } from "./item23";
import { FACILITY_FORM } from "./facility";

export const PORTAL_FORMS: PortalFormDef[] = [RFC_FORM, BGCF_FORM, ITEM23_FORM, FACILITY_FORM];
export const getPortalForm = (key: string) => PORTAL_FORMS.find((f) => f.key === key);
export const formForItem = (step: number, itemKey: string) =>
  PORTAL_FORMS.find((f) => f.stepNum === step && f.itemKey === itemKey);

const filled = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : typeof v === "boolean" ? v : v != null && String(v).trim() !== "";

const isRequired = (f: FormField, a: Answers) => (f.requiredWhen ? f.requiredWhen(a) : !f.optional);

export interface Missing { sectionIndex: number; label: string }

/** Every required box that is still empty, in form order. */
export function missingRequired(form: PortalFormDef, a: Answers): Missing[] {
  const out: Missing[] = [];
  form.sections.forEach((s, si) => {
    for (const f of s.fields ?? []) if (isRequired(f, a) && !filled(a[f.key])) out.push({ sectionIndex: si, label: f.label });
    if (s.repeater) {
      const items = (a[s.repeater.key] as Answers[] | undefined) ?? [];
      for (let i = 0; i < s.repeater.requiredCount; i++) {
        for (const f of s.repeater.fields) {
          if (!f.optional && !filled(items[i]?.[f.key])) out.push({ sectionIndex: si, label: `${s.repeater.itemLabel} ${i + 1}: ${f.label}` });
        }
      }
    }
  });
  return out;
}

export function requiredCount(form: PortalFormDef, a: Answers): number {
  let n = 0;
  for (const s of form.sections) {
    for (const f of s.fields ?? []) if (isRequired(f, a)) n++;
    if (s.repeater) n += s.repeater.requiredCount * s.repeater.fields.filter((f) => !f.optional).length;
  }
  return n;
}

/** Percent of required boxes filled, 0–100. */
export function formProgress(form: PortalFormDef, a: Answers): number {
  const total = requiredCount(form, a);
  if (!total) return 100;
  return Math.round(((total - missingRequired(form, a).length) / total) * 100);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** Typed signature must match the first + last name on the form (case and spaces ignored). */
export function signatureMatches(typed: string, first: unknown, last: unknown): boolean {
  const t = norm(typed);
  const f = norm(String(first ?? ""));
  const l = norm(String(last ?? ""));
  return !!f && !!l && t.startsWith(f) && t.endsWith(l) && t.length >= f.length + l.length;
}

export const sectionHasRepeater = (s: FormSection) => !!s.repeater;
