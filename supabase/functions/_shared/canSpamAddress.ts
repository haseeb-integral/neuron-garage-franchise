export const ADDRESS_REQUIRED_MESSAGE = "Configure your mailing address in Email Outreach settings before launching campaigns.";

export function isConfiguredAddress(address: string): boolean {
  return address.trim().length > 0 && !address.includes("[ADD MAILING ADDRESS]");
}

function normalize(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().toLowerCase();
}

export function hasMailingAddress(text: string, address: string): boolean {
  return isConfiguredAddress(address) && normalize(text).includes(normalize(address));
}

export function checkSequenceMailingAddress(sequences: unknown, address: string): string | null {
  if (!isConfiguredAddress(address)) return ADDRESS_REQUIRED_MESSAGE;
  if (!Array.isArray(sequences) || sequences.length === 0) return "Add at least one email step before launching or pushing leads.";
  const missing: string[] = [];
  sequences.forEach((seq, i) => {
    const s = (seq && typeof seq === "object" ? seq : {}) as Record<string, unknown>;
    const step = Number(s.seq_number ?? s.step_number ?? i + 1) || i + 1;
    const variants = Array.isArray(s.seq_variants) ? s.seq_variants : [];
    if (variants.length) {
      variants.forEach((v, j) => {
        const variant = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
        if (!hasMailingAddress(String(variant.email_body ?? ""), address)) {
          missing.push(`Step ${step}, Variant ${String(variant.variant_label ?? String.fromCharCode(65 + j))}`);
        }
      });
    } else {
      const body = [s.email_body, s.body, s.seq_delay_details_body].filter((v) => typeof v === "string").join("\n");
      if (!hasMailingAddress(body, address)) missing.push(`Step ${step}, Variant A`);
    }
  });
  return missing.length ? `The saved company mailing address is missing in: ${missing.join("; ")}. Add it to every email version before launching or pushing leads.` : null;
}