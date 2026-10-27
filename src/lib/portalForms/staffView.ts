import type { Tables } from "@/integrations/supabase/types";
import type { Answers, PortalFormDef } from "./types";

export type StaffFormRecord = Tables<"candidate_portal_forms">;
export type StaffSignatureRecord = Tables<"candidate_portal_signatures">;

export function staffFormView(candidateId: string, key: string, forms: StaffFormRecord[], signatures: StaffSignatureRecord[]) {
  const record = forms.find((r) => r.candidate_id === candidateId && r.form_key === key);
  const signature = record ? signatures.filter((s) => s.candidate_id === candidateId && s.form_id === record.id && s.form_key === key)
    .sort((a, b) => b.signed_at.localeCompare(a.signed_at))[0] : undefined;
  const submitted = record?.status === "submitted";
  const raw = submitted ? signature?.answers_snapshot : record?.answers;
  const answers: Answers | null = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Answers : null;
  return { record, signature: submitted ? signature : undefined, answers, submitted };
}

export function staffAnswerSections(form: PortalFormDef, answers: Answers) {
  return form.sections.map((section) => {
    const rows = (section.fields ?? []).filter((f) => !f.showWhen || f.showWhen(answers))
      .map((f) => ({ label: f.label, value: answers[f.key] }));
    const rep = section.repeater;
    const items = rep && Array.isArray(answers[rep.key]) ? answers[rep.key] as Answers[] : [];
    if (rep) items.forEach((item, i) => {
      rep.fields.filter((f) => !f.showWhen || f.showWhen(item)).forEach((f) => {
        rows.push({ label: `${rep.itemLabel} ${i + 1} — ${f.label}`, value: item[f.key] });
      });
    });
    return { title: section.title, rows };
  });
}

export function formCopyFilename(title: string, date: string) {
  return `${title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}-Submitted-${date.slice(0, 10)}.pdf`;
}