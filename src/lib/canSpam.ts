// CAN-SPAM safety net for cold outreach.
// Every cold email step must carry an unsubscribe link and a real physical
// mailing address. A campaign cannot be activated until both are present.

import { ADDRESS_REQUIRED_MESSAGE, hasMailingAddress, isConfiguredAddress } from "../../supabase/functions/_shared/canSpamAddress";
export { ADDRESS_REQUIRED_MESSAGE, hasMailingAddress, checkSequenceMailingAddress } from "../../supabase/functions/_shared/canSpamAddress";

export const UNSUBSCRIBE_TAG = "{{unsubscribe}}";

export function canSpamFooter(address: string = "") {
  return `\n\n—\nNeuron Garage\n${address}\nDon't want these emails? ${UNSUBSCRIBE_TAG}`;
}

/** True when the text already carries the unsubscribe merge tag. */
export function hasUnsubscribeTag(text: string) {
  return /\{\{\s*unsubscribe\s*\}\}/i.test(text);
}

/**
 * Returns a human-readable problem, or null when the sequence is safe to send.
 * `requireAddress` is true only when the campaign is being activated.
 */
export function checkCanSpam(
  bodies: string[],
  opts: { requireAddress?: boolean; address?: string } = {},
): string | null {
  const { requireAddress = true, address = "" } = opts;
  if (requireAddress && !isConfiguredAddress(address)) return ADDRESS_REQUIRED_MESSAGE;
  const missingUnsub = bodies.findIndex((b) => !hasUnsubscribeTag(b));
  if (missingUnsub !== -1) {
    return `Email step ${missingUnsub + 1} has no unsubscribe link. Add ${UNSUBSCRIBE_TAG} to the footer — the law requires it.`;
  }
  if (requireAddress) {
    const missingAddr = bodies.findIndex((b) => !hasMailingAddress(b, address));
    if (missingAddr !== -1) {
      return `Email step ${missingAddr + 1} has no physical mailing address in the footer. The law requires one in every cold email.`;
    }
  }
  return null;
}

/**
 * SmartLead returns sequence steps in a few shapes. Pull the email body text
 * out of whichever field is present.
 */
export function sequenceBodyText(seq: unknown): string {
  if (!seq || typeof seq !== "object") return "";
  const s = seq as Record<string, unknown>;
  const variants = Array.isArray(s.seq_variants) ? s.seq_variants : [];
  const variantText = variants
    .map((v) => (v && typeof v === "object" ? String((v as Record<string, unknown>).email_body ?? "") : ""))
    .join("\n");
  return [s.email_body, s.body, s.seq_delay_details_body, variantText]
    .map((v) => (typeof v === "string" ? v : ""))
    .join("\n");
}

/**
 * Checks every A/B version of every step ON ITS OWN. Returns a list like
 * ["Step 2, Variant B"] for each version that lacks {{unsubscribe}}.
 * A tag in Variant A never hides a missing tag in Variant B.
 */
export function findMissingUnsubscribe(sequences: unknown): string[] {
  if (!Array.isArray(sequences)) return [];
  const out: string[] = [];
  sequences.forEach((seq, i) => {
    const s = (seq && typeof seq === "object" ? seq : {}) as Record<string, unknown>;
    const stepNo = Number(s.seq_number ?? s.step_number ?? i + 1) || i + 1;
    const variants = Array.isArray(s.seq_variants) ? s.seq_variants : [];
    if (variants.length > 0) {
      variants.forEach((v, j) => {
        const vo = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
        const label = String(vo.variant_label ?? String.fromCharCode(65 + j));
        const body = typeof vo.email_body === "string" ? vo.email_body : "";
        if (!hasUnsubscribeTag(body)) out.push(`Step ${stepNo}, Variant ${label}`);
      });
    } else {
      const body = [s.email_body, s.body, s.seq_delay_details_body]
        .map((x) => (typeof x === "string" ? x : ""))
        .join("\n");
      if (!hasUnsubscribeTag(body)) out.push(`Step ${stepNo}, Variant A`);
    }
  });
  return out;
}

/**
 * True when at least one version of any step has no unsubscribe tag.
 * An empty sequence list also counts as non-compliant.
 */
export function sequencesMissingUnsubscribe(sequences: unknown): boolean {
  if (!Array.isArray(sequences) || sequences.length === 0) return true;
  return findMissingUnsubscribe(sequences).length > 0;
}
