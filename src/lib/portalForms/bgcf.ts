import type { PortalFormDef } from "./types";

/** Background, Credit, and Funding — text word for word from the PDF (email line adapted for the web). */
export const BGCF_FORM: PortalFormDef = {
  key: "bgcf",
  version: "1",
  title: "Background, Credit, and Funding",
  stepNum: 2,
  itemKey: "bg_credit_funding",
  esignConsent: true,
  pdf: { category: "background_check", itemKey: "bgcf" },
  intro:
    "This form lets us complete two standard checks and understand how you're planning to fund the start of your business.",
  dueText:
    "Please submit this at least five days before our next call. Questions? Contact Skyler Bossen at 512-593-2750. All information you share remains confidential.",
  nameKeys: { first: "first_name", last: "last_name" },
  sections: [
    {
      id: "info",
      title: "Your Information",
      fields: [
        { key: "last_name", label: "Last Name", type: "text", width: "third", hideWhenKnown: true },
        { key: "first_name", label: "First Name", type: "text", width: "third", hideWhenKnown: true },
        { key: "middle_name", label: "Middle Name", type: "text", width: "third", optional: true },
        { key: "other_names", label: "Other names you've used (such as a maiden name)", type: "text", optional: true },
        { key: "cell", label: "Cell Phone", type: "tel", width: "half" },
        { key: "email", label: "Email Address", type: "email", width: "half", hideWhenKnown: true },
      ],
    },
    {
      id: "checks",
      title: "Background and Credit Checks",
      intro:
        "Because Neuron Garage owners lead camps for children, every owner completes a background check. A credit check gives us a snapshot of your personal finances. Life happens, and context matters to us, so if there's anything you'd like us to know before we run these, please share it below.",
      fields: [
        { key: "before_checks", label: "Is there anything you'd like us to know before we run these checks? (Optional)", type: "textarea", optional: true },
      ],
    },
    {
      id: "funding",
      title: "Your Funding Plan",
      intro:
        "Every new owner has some start-up costs before camp revenue begins. Item 7 of the Franchise Disclosure Document estimates the initial investment at $14,110 to $21,050.",
      fields: [
        { key: "funding_plan", label: "How do you plan to cover those initial costs until your camp starts generating revenue? For example: personal savings, support from a spouse or partner, a small loan, or a combination.", type: "textarea" },
      ],
    },
  ],
  signature: {
    heading: "Authorization",
    preText:
      "We use DISA to run both checks. After you sign below, you'll receive a secure link from them to provide the details they need, such as your date of birth and Social Security number, and to review their required disclosures. For your security, please share that information only through the provider's secure link.",
    text:
      "I authorize Neuron Garage Franchise Support, LLC and its screening provider to obtain a consumer report about me, including a criminal background check and a credit report, to evaluate my request to become a Neuron Garage franchise owner. I understand that I'll receive the provider's disclosures and that I may request a copy of any report obtained about me.",
    agreeLabel: "I authorize these checks, and I agree that typing my name is my electronic signature.",
    note: "When completing this form electronically, typing your full name counts as your signature.",
  },
};
