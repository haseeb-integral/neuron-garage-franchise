import type { PortalFormDef } from "./types";

/** Format an FDD issuance date (YYYY-MM-DD) as "March 1, 2026"; never invent a date. */
export function formatFddIssuance(date: string | null | undefined): string {
  if (!date) return "date not on file";
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "date not on file";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** The three sellers on the receipt, ticked. Skyler uses the same address and phone as Sam and Kaylie. */
export const ITEM23_SELLER_LINES = [
  "[x] Sam Reed, 150 S. Willow Street #2125, Telluride, CO 81435; (970) 239-1054",
  "[x] Kaylie Reed, 150 S. Willow Street #2125, Telluride, CO 81435; (970) 239-1054",
  "[x] Skyler Bossen, 150 S. Willow Street #2125, Telluride, CO 81435; (970) 239-1054",
];

const EXHIBITS =
  "A. List of State Administrators; B. List of Agents For Service of Process; C. Opening Balance Sheet; " +
  "D. Franchise Agreement; E. Neuron Garage® Standards Manual Table of Contents; F. Facility Use Agreement Addendum; " +
  "G. Form of General Release.";

/** The Item 23 receipt, word for word from the paper form. The FDD date names the version the prospect received. */
export function item23Receipt(issuanceDate: string | null | undefined): { preText: string; signedText: string } {
  const date = formatFddIssuance(issuanceDate);
  const preText = [
    "RECEIPT",
    "",
    "This Disclosure Document summarizes certain provisions of the Franchise Agreement and other information in plain language. Read this Disclosure Document and all agreements carefully.",
    "",
    "If Neuron Garage Franchise Support, LLC offers you a franchise, it must provide this Disclosure Document to you 14 calendar days before you sign a binding agreement with, or make a payment to, the franchisor or an affiliate in connection with the proposed franchise sale.",
    "",
    "New York requires that we give you this Disclosure Document at the earlier of the first personal meeting or 10 business days before the execution of the franchise or other agreement or the payment of any consideration that relates to the franchise relationship.",
    "",
    "Michigan requires that we give you this Disclosure Document at least 10 business days before the execution of any binding franchise or other agreement or the payment of any consideration, whichever occurs first.",
    "",
    "If Neuron Garage Franchise Support, LLC does not deliver this Disclosure Document on time or if it contains a false or misleading statement, or a material omission, a violation of federal and state law may have occurred and should be reported to the Federal Trade Commission, Washington, D.C. 20580 and the State Administrator listed in Exhibit A.",
    "",
    "The franchisor is Neuron Garage Franchise Support, LLC located at 150 S. Willow Street #2125, Telluride, CO 81435. Its telephone number is (970) 239-1054.",
    "",
    `Issuance Date: ${date}`,
    "",
    "Following is information about the franchise seller(s) involved in this transaction (check applicable boxes):",
    ...ITEM23_SELLER_LINES,
    "",
    "Neuron Garage Franchise Support, LLC authorizes the respective state agencies identified on Exhibit B to receive service of process for it in a particular state.",
  ].join("\n");
  const signedText = `I have received a Franchise Disclosure Document dated ${date}, that included the following exhibits: ${EXHIBITS}`;
  return { preText, signedText };
}

export const ITEM23_FORM: PortalFormDef = {
  key: "item23",
  version: "1",
  title: "FDD Item 23 Receipt",
  stepNum: 2,
  itemKey: "item23",
  esignConsent: true,
  pdf: { category: "general", itemKey: "item23" },
  intro:
    "This is the receipt for the Franchise Disclosure Document (FDD) you received. Please read it, fill in your details, and sign. On paper this form has two copies; here one signature does both — we keep the signed PDF, and you can download the same PDF as your copy.",
  dueText:
    "Please submit this before our next call. Questions? Contact Skyler Bossen at 512-593-2750.",
  nameKeys: { first: "first_name", last: "last_name" },
  sections: [
    {
      id: "info",
      title: "Your Information",
      fields: [
        { key: "last_name", label: "Print Name — Last Name", type: "text", width: "third" },
        { key: "first_name", label: "Print Name — First Name", type: "text", width: "third" },
        { key: "street", label: "Street Address", type: "text", width: "half" },
        { key: "city", label: "City", type: "text", width: "third" },
        { key: "state", label: "State", type: "state", width: "third" },
        { key: "zip", label: "Zip", type: "text", width: "third" },
        { key: "phone", label: "Telephone", type: "tel", width: "half" },
      ],
    },
    {
      id: "franchise",
      title: "Franchise (optional)",
      intro:
        'On the paper form this line reads: "Individually and as an officer, partner or member of a ________ which has been or will be formed to act as franchisee." Fill these in only if you have formed, or plan to form, a company.',
      fields: [
        { key: "franchise_name", label: "Company name", type: "text", optional: true, width: "half" },
        { key: "entity_type", label: "Company type (such as LLC)", type: "text", optional: true, width: "half" },
      ],
    },
  ],
  signature: {
    heading: "Signature",
    text: "I have received a Franchise Disclosure Document.",
    note: "When completing this form electronically, typing your full name counts as your signature. The receipt names the exact FDD version you received.",
  },
  dynamicSignedText: item23Receipt,
};
