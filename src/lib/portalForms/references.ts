import type { PortalFormDef } from "./types";

export const REFERENCES_SECTION = {
  id: "references",
  title: "References",
  intro: "Please share three people who know you well, ideally someone who has seen you work with children and someone who has seen you lead.",
  repeater: {
    key: "references", itemLabel: "Reference", startWith: 3, max: 3, requiredCount: 3,
    fields: [
      { key: "name", label: "Name", type: "text", width: "half" },
      { key: "relationship", label: "Relationship to You", type: "text", width: "half" },
      { key: "email", label: "Email", type: "email", width: "half" },
      { key: "phone", label: "Phone", type: "tel", width: "half" },
    ],
  },
} satisfies PortalFormDef["sections"][number];

export const REFERENCES_FORM: PortalFormDef = {
  key: "references", version: "1", title: "References", stepNum: 3, itemKey: "references",
  intro: REFERENCES_SECTION.intro,
  dueText: "Please complete this before your next call.",
  noSignature: true,
  nameKeys: { first: "first_name", last: "last_name" },
  pdf: { category: "general", itemKey: "references" },
  sections: [
    { id: "identity", title: "Your Information", fields: [
      { key: "first_name", label: "First Name", type: "text", width: "half", hideWhenKnown: true },
      { key: "last_name", label: "Last Name", type: "text", width: "half", hideWhenKnown: true },
      { key: "email", label: "Email Address", type: "email", hideWhenKnown: true },
    ] },
    REFERENCES_SECTION,
  ],
};