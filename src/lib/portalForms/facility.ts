import type { PortalFormDef } from "./types";

/** Facility Prospect Form — text word for word from the PDF (email line adapted for the web). No signature line on the paper form, so none here. */
export const FACILITY_FORM: PortalFormDef = {
  key: "facility",
  version: "1",
  title: "Facility Prospect Form",
  stepNum: 3,
  itemKey: "facility_form",
  noSignature: true,
  intro:
    "This form helps you start picturing where your camp could live, and helps us understand your market. You don't need to contact any schools yet. Online research and what you already know about your community are plenty.",
  dueText:
    "Please submit this at least two days before our next call. Questions? Contact Skyler Bossen at 512-593-2750. All information you share remains confidential.",
  nameKeys: { first: "first_name", last: "last_name" },
  pdf: { category: "general", itemKey: "facility_form" },
  sections: [
    {
      id: "info",
      title: "Your Information",
      fields: [
        { key: "last_name", label: "Last Name", type: "text", width: "third" },
        { key: "first_name", label: "First Name", type: "text", width: "third" },
        { key: "email", label: "Email Address", type: "email", width: "third" },
      ],
    },
    {
      id: "market",
      title: "Your Market",
      fields: [
        { key: "city", label: "City", type: "text", width: "third" },
        { key: "county", label: "County", type: "text", width: "third" },
        { key: "state", label: "State", type: "state", width: "third" },
        { key: "neighborhood", label: "Which neighborhood or part of town would you most like your camp to be in, and why?", type: "textarea" },
        { key: "other_camps", label: "What other summer camps operate in your area, and where do they hold camp?", type: "textarea" },
      ],
    },
    {
      id: "schools",
      title: "Prospect Schools",
      intro:
        "List at least 3 schools, up to 10. Elementary schools (public, private, or charter) are a natural fit, and so are schools that already host summer camps. If you already have a strong lead, such as a school where you work or one you're confident would host, list it first and add at least one backup option. Even great leads can fall through, so it's always smart to have a Plan B.",
      repeater: {
        key: "schools", itemLabel: "School", startWith: 3, max: 10, requiredCount: 3, addLabel: "Add another school",
        fields: [
          { key: "name", label: "School Name", type: "text", width: "third" },
          { key: "address", label: "Address or Nearest Cross Streets", type: "text", width: "third" },
          { key: "grades", label: "Grades Served", type: "text", width: "third" },
          { key: "type", label: "School Type", type: "radio", options: ["Public", "Private", "Charter", "Other"], width: "half" },
          { key: "hosts_program", label: "Already hosts a summer program?", type: "radio", options: ["Yes", "No", "Not sure"], width: "half" },
          {
            key: "good_fit",
            label: "Why it might be a good fit (check all that apply)",
            type: "checkboxes",
            options: [
              "Within about 5 miles of neighborhoods with young children",
              "Along a commuter route",
              "Near large office parks",
              "I have a strong reason to believe this school would host",
            ],
          },
          { key: "connection", label: "Your connection to this school (if any), and any other notes", type: "textarea", optional: true },
        ],
      },
    },
    {
      id: "top",
      title: "Your Top Choices",
      fields: [
        { key: "top_choices", label: "Which two or three schools would you approach first, and why?", type: "textarea" },
      ],
    },
  ],
};
