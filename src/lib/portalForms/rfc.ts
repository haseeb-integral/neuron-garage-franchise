import type { PortalFormDef } from "./types";

/** Request for Consideration — text word for word from the PDF (email line adapted for the web). */
export const RFC_FORM: PortalFormDef = {
  key: "rfc",
  version: "2",
  title: "Request for Consideration",
  stepNum: 1,
  itemKey: "rfc",
  intro:
    "Thanks for your interest in owning a Neuron Garage franchise. Please complete this form so we can get to know you before our next conversation. It's non-financial, and it doesn't commit you (or us) to anything. You can learn more at neurongarage.com and neurongaragefranchise.com.",
  dueText:
    "Please submit this at least one day before our next call. Questions? Contact Skyler Bossen at 512-593-2750. All information you share remains confidential.",
  nameKeys: { first: "first_name", last: "last_name" },
  sections: [
    {
      id: "personal",
      title: "Personal Information",
      fields: [
        { key: "last_name", label: "Last Name", type: "text", width: "third" },
        { key: "first_name", label: "First Name", type: "text", width: "third" },
        { key: "preferred_name", label: "Preferred Name", type: "text", width: "third", optional: true },
        { key: "street", label: "Current Street Address", type: "text", width: "half" },
        { key: "unit", label: "Apartment/Unit #", type: "text", width: "half", optional: true },
        { key: "city", label: "City", type: "text", width: "third" },
        { key: "state", label: "State", type: "state", width: "third" },
        { key: "zip", label: "Zip", type: "text", width: "third" },
        { key: "cell", label: "Cell Phone", type: "tel", width: "half" },
        { key: "email", label: "Email Address", type: "email", width: "half" },
        { key: "occupation", label: "Current Occupation", type: "text", width: "half" },
        { key: "years_in_position", label: "Years in Position", type: "text", width: "half" },
      ],
    },
    {
      id: "partner",
      title: "Spouse or Partner",
      fields: [
        { key: "marital", label: "Are you married or in a domestic partnership?", type: "radio", options: ["Married", "Domestic partnership", "Neither"] },
        { key: "partner_name", label: "Spouse/Partner Name (if applicable)", type: "text", width: "half", optional: true },
        { key: "partner_occupation", label: "Spouse/Partner Occupation", type: "text", width: "half", optional: true },
        { key: "partner_involved", label: "Will your spouse/partner be involved in the business?", type: "radio", options: ["Yes", "No", "Not applicable"] },
      ],
    },
    {
      id: "market",
      title: "Where You'd Like to Run Camp",
      fields: [
        { key: "camp_city", label: "City", type: "text", width: "third" },
        { key: "camp_county", label: "County", type: "text", width: "third" },
        { key: "camp_state", label: "State", type: "state", width: "third" },
        { key: "open_when", label: "If this turns out to be a good fit, when would you ideally like to open?", type: "radio", options: ["This coming summer", "The following summer", "Not sure yet"] },
      ],
    },
    {
      id: "work",
      title: "Work Experience",
      intro: "Most recent first.",
      repeater: {
        key: "jobs", itemLabel: "Job", startWith: 1, max: 3, requiredCount: 1, addLabel: "Add another job",
        fields: [
          { key: "employer", label: "Employer or Organization", type: "text", width: "third" },
          { key: "title", label: "Position/Title", type: "text", width: "third" },
          { key: "dates", label: "Dates", type: "text", width: "third" },
          { key: "responsibilities", label: "Main responsibilities, including any work with children or leading others", type: "textarea" },
        ],
      },
    },
    {
      id: "education",
      title: "Education",
      repeater: {
        key: "schools", itemLabel: "School", startWith: 1, max: 2, requiredCount: 1, addLabel: "Add another school",
        fields: [
          { key: "school", label: "Name of School", type: "text", width: "third" },
          { key: "degree", label: "Degree/Diploma", type: "text", width: "third" },
          { key: "dates", label: "Dates", type: "text", width: "third" },
        ],
      },
    },
    {
      id: "certs",
      title: "Certifications and About You",
      fields: [
        { key: "certifications", label: "Teaching certifications or licenses (if any)", type: "textarea", optional: true },
        { key: "work_auth", label: "Are you legally authorized to work in the US?", type: "radio", options: ["Yes", "No"], width: "half" },
        { key: "bankruptcy", label: "Have you ever filed for bankruptcy?", type: "radio", options: ["Yes", "No"], width: "half" },
        { key: "felony", label: "Have you ever been convicted of a felony?", type: "radio", options: ["Yes", "No"], width: "half" },
        { key: "defendant", label: "Are you currently a defendant in any legal action?", type: "radio", options: ["Yes", "No"], width: "half" },
        {
          key: "yes_explain",
          label: "If you answered yes to any of these, please explain. A yes doesn't automatically rule you out.",
          type: "textarea", optional: true,
          requiredWhen: (a) => a.work_auth === "No" || a.bankruptcy === "Yes" || a.felony === "Yes" || a.defendant === "Yes",
        },
      ],
    },
    {
      id: "experience",
      title: "Your Experience",
      fields: [
        { key: "exp_children", label: "Tell us about your experience working with children: in a classroom, at camp, coaching, or anywhere else.", type: "textarea" },
        { key: "exp_lead", label: "Tell us about a time you led or mentored other adults, such as a team, a student teacher, or a committee.", type: "textarea" },
        { key: "exp_business", label: "Have you ever owned a business or run a program of your own? If yes, describe it, your role, and how it went.", type: "textarea" },
      ],
    },
    {
      id: "interest",
      title: "Your Interest in Neuron Garage",
      fields: [
        { key: "interest_most", label: "What interests you most about owning a Neuron Garage franchise?", type: "textarea" },
        { key: "growth_mindset", label: "What does \"growth mindset\" mean to you?", type: "textarea" },
        { key: "family_involved", label: "Will family or friends be involved in your business? If yes, who, and how?", type: "textarea" },
        { key: "anything_else", label: "Is there anything else you'd like us to know about you?", type: "textarea", optional: true },
      ],
    },
    {
      id: "references",
      title: "References",
      intro: "Please share three people who know you well, ideally someone who has seen you work with children and someone who has seen you lead. We'll let you know before we contact them.",
      repeater: {
        key: "references", itemLabel: "Reference", startWith: 3, max: 3, requiredCount: 3,
        fields: [
          { key: "name", label: "Name", type: "text", width: "half" },
          { key: "relationship", label: "Relationship to You", type: "text", width: "half" },
          { key: "email", label: "Email", type: "email", width: "half" },
          { key: "phone", label: "Phone", type: "tel", width: "half" },
        ],
      },
    },
  ],
  signature: {
    heading: "Acknowledgment and Signature",
    text:
      "By signing, I confirm that the information I've shared is complete and accurate to the best of my knowledge. I understand that this form is not a contract or an offer to sell a franchise, that completing it creates no obligation for either party, and that any offer can be made only through a Franchise Disclosure Document. I also understand that, before any franchise is awarded, Neuron Garage Franchise Support, LLC will conduct credit and criminal background checks, and I'll be asked to provide the information and authorization needed to run them.",
    note: "When completing this form electronically, typing your full name counts as your signature.",
  },
};
