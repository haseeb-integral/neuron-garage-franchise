import { describe, it, expect } from "vitest";
import { FACILITY_FORM } from "./facility";
import { formForItem, missingRequired, formProgress } from "./logic";

const school = (n: number) => ({
  name: `School ${n}`, address: `${n} Main St`, grades: "K-5",
  type: "Public", hosts_program: "Yes", good_fit: ["Along a commuter route"],
});

describe("Facility Prospect Form", () => {
  it("attaches to the Step 3 'Complete the facility prospect form' checklist item", () => {
    expect(formForItem(3, "facility_form")?.key).toBe("facility");
    expect(FACILITY_FORM.stepNum).toBe(3);
  });

  it("has no signature line, like the paper form", () => {
    expect(FACILITY_FORM.noSignature).toBe(true);
    expect(FACILITY_FORM.signature).toBeUndefined();
  });

  it("starts with 3 school cards, allows up to 10, and requires the first 3", () => {
    const rep = FACILITY_FORM.sections.find((s) => s.id === "schools")!.repeater!;
    expect(rep.startWith).toBe(3);
    expect(rep.max).toBe(10);
    expect(rep.requiredCount).toBe(3);
  });

  it("requires all three school cards before submitting", () => {
    const base = {
      last_name: "Reed", first_name: "Sam", email: "sam@example.com",
      city: "Austin", county: "Travis", state: "TX",
      neighborhood: "Near downtown, close to families", other_camps: "YMCA camp at the rec center",
      top_choices: "School 1 first — I work there",
    };
    const with2 = { ...base, schools: [school(1), school(2)] };
    const labels2 = missingRequired(FACILITY_FORM, with2).map((m) => m.label);
    expect(labels2.some((l) => l.startsWith("School 3:"))).toBe(true);

    const with3 = { ...base, schools: [school(1), school(2), school(3)] };
    expect(missingRequired(FACILITY_FORM, with3)).toHaveLength(0);
    expect(formProgress(FACILITY_FORM, with3)).toBe(100);
  });

  it("school notes are optional and the good-fit checkboxes match the paper form", () => {
    const rep = FACILITY_FORM.sections.find((s) => s.id === "schools")!.repeater!;
    const notes = rep.fields.find((f) => f.key === "connection")!;
    expect(notes.optional).toBe(true);
    const fit = rep.fields.find((f) => f.key === "good_fit")!;
    expect(fit.options).toEqual([
      "Within about 5 miles of neighborhoods with young children",
      "Along a commuter route",
      "Near large office parks",
      "I have a strong reason to believe this school would host",
    ]);
  });
});
