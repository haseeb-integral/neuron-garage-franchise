import { describe, expect, it } from "vitest";
import { QUALIFICATION_STEPS } from "../ProcessTab";
import { PROCESS_STEP_TITLES } from "@/lib/candidateProcessSteps";

describe("Qualification Process step 2 consolidation", () => {
  it("uses the same five step names in the process and calendar", () => {
    expect(QUALIFICATION_STEPS.map(({ num, title }) => ({ num, title }))).toEqual(PROCESS_STEP_TITLES);
    expect(PROCESS_STEP_TITLES).toHaveLength(5);
    expect(PROCESS_STEP_TITLES[1]?.title).toBe("Business Overview Call and FDD Review");
  });

  it("puts the required actions, homework, and result fields in step 2", () => {
    const step = QUALIFICATION_STEPS.find(({ num }) => num === 2);
    expect(step?.postCall.map(({ key }) => key)).toEqual([
      "mvs_site_run",
      "sent_bg_auth",
      "sent_rfc_part2",
      "sent_personality_profile_invite",
      "sent_fdd",
    ]);
    expect(step?.homework.map(({ key }) => key)).toEqual([
      "rfc_part2",
      "signed_item23",
      "personality_profile",
    ]);
    expect(step?.fields?.map(({ key }) => key)).toEqual(["credit_score", "background_result"]);
    expect(step?.goal).toBe(
      "Provide a deeper understanding of the business and camp. Review the FDD, and key Franchise Agreement terms.",
    );
    expect(step?.fields?.find(({ key }) => key === "background_result")?.hint).toBe(
      "Background results should be reviewed for recency, decency, frequency, and whether the candidate learned from the event.",
    );
    expect(step?.fields?.find(({ key }) => key === "credit_score")?.hint).toBe(
      "Credit shows the ability to run a personal business; the national average is 683 and the target is 720+. Exceptions may include divorce or catastrophic health events.",
    );
  });

  it("removes the old actions and homework", () => {
    const step = QUALIFICATION_STEPS.find(({ num }) => num === 2);
    const keys = [
      ...(step?.postCall.map(({ key }) => key) ?? []),
      ...(step?.homework.map(({ key }) => key) ?? []),
    ];
    expect(keys).not.toContain("sent_mindset");
    expect(keys).not.toContain("mvs_site_share");
    expect(keys).not.toContain("read_mindset");
    expect(keys).not.toContain("provide_bg_auth");
  });

  it("removes the local marketing plan from step 3 homework", () => {
    const step = QUALIFICATION_STEPS.find(({ num }) => num === 3);
    expect(step?.homework.map(({ key }) => key)).toEqual(["facility_form"]);
    expect(step?.homework.map(({ key }) => key)).not.toContain("marketing_plan");
  });
});