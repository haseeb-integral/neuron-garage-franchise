import type { Answers, PortalFormDef } from "./types";

export interface KnownProfile {
  first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null;
  street?: string | null; city?: string | null; state?: string | null; zip?: string | null;
}

const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && !v.trim());

/**
 * Starting values for a form from what we already know. Earlier form answers (Request for
 * Consideration) win over the pipeline record, because the prospect may have fixed a typo there.
 * Only fills blank boxes — never overwrites what the prospect typed.
 */
export function buildPrefill(form: PortalFormDef, existing: Answers, profile: KnownProfile | null, rfc: Answers | null, accountEmail?: string | null): Answers {
  const p = profile ?? {}, r = rfc ?? {};
  const isFacility = form.key === "facility";
  const known: Record<string, string | undefined> = {
    first_name: s(r.first_name) ?? s(p.first_name),
    last_name: s(r.last_name) ?? s(p.last_name),
    email: s(r.email) ?? s(accountEmail) ?? s(p.email),
    phone: s(r.cell) ?? s(p.phone),
    cell: s(r.cell) ?? s(p.phone),
    street: s(r.street) ?? s(p.street),
    zip: s(r.zip) ?? s(p.zip),
    // Facility form asks about the camp market, not home address.
    city: isFacility ? s(r.camp_city) : s(r.city) ?? s(p.city),
    state: isFacility ? s(r.camp_state) : s(r.state) ?? s(p.state),
    county: isFacility ? s(r.camp_county) : undefined,
  };
  if (form.key === "rfc") { known.city = s(p.city); known.state = s(p.state); known.street = s(p.street); known.zip = s(p.zip); known.cell = s(p.phone); known.first_name = s(p.first_name); known.last_name = s(p.last_name); known.email = s(accountEmail) ?? s(p.email); }
  const keys = new Set(form.sections.flatMap((sec) => (sec.fields ?? []).map((f) => f.key)));
  const out: Answers = { ...existing };
  for (const k of keys) if (blank(out[k]) && known[k]) out[k] = known[k];
  return out;
}

/** Fields marked hideWhenKnown that already have a value — shown as "Submitting as" instead of boxes. */
export function hiddenKnownKeys(form: PortalFormDef, a: Answers): Set<string> {
  const out = new Set<string>();
  for (const sec of form.sections) for (const f of sec.fields ?? []) if (f.hideWhenKnown && !blank(a[f.key])) out.add(f.key);
  return out;
}
