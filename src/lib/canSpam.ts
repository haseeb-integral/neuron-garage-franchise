// CAN-SPAM safety net for cold outreach.
// Every cold email step must carry an unsubscribe link and a real physical
// mailing address. A campaign cannot be activated until both are present.

export const UNSUBSCRIBE_TAG = "{{unsubscribe}}";

/**
 * Physical mailing address printed in every cold email footer.
 * Replace the placeholder with the real business address — while the
 * placeholder text is still present, campaign activation is blocked.
 */
export const MAILING_ADDRESS = "[ADD MAILING ADDRESS]";

export const ADDRESS_PLACEHOLDER = "[ADD MAILING ADDRESS]";

export function canSpamFooter(address: string = MAILING_ADDRESS) {
  return `\n\n—\nNeuron Garage\n${address}\nDon't want these emails? ${UNSUBSCRIBE_TAG}`;
}

/** True when the text already carries the unsubscribe merge tag. */
export function hasUnsubscribeTag(text: string) {
  return /\{\{\s*unsubscribe\s*\}\}/i.test(text);
}

/** True when the text carries a mailing address that is not the placeholder. */
export function hasMailingAddress(text: string, address: string = MAILING_ADDRESS) {
  if (address.includes(ADDRESS_PLACEHOLDER)) return false;
  return text.includes(address);
}

/**
 * Returns a human-readable problem, or null when the sequence is safe to send.
 * `requireAddress` is true only when the campaign is being activated.
 */
export function checkCanSpam(
  bodies: string[],
  opts: { requireAddress?: boolean; address?: string } = {},
): string | null {
  const { requireAddress = true, address = MAILING_ADDRESS } = opts;
  const missingUnsub = bodies.findIndex((b) => !hasUnsubscribeTag(b));
  if (missingUnsub !== -1) {
    return `Email step ${missingUnsub + 1} has no unsubscribe link. Add ${UNSUBSCRIBE_TAG} to the footer — the law requires it.`;
  }
  if (requireAddress) {
    if (address.includes(ADDRESS_PLACEHOLDER)) {
      return "The email footer still says [ADD MAILING ADDRESS]. Put the real business mailing address in every step before launching — the law requires it.";
    }
    const missingAddr = bodies.findIndex((b) => !hasMailingAddress(b, address));
    if (missingAddr !== -1) {
      return `Email step ${missingAddr + 1} has no physical mailing address in the footer. The law requires one in every cold email.`;
    }
  }
  return null;
}
