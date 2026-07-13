// Per-signal one-line explanations kept deterministic — short, factual,
// real value to the reader. Shared by ExecutiveSummaryPanel, MarketReportModal,
// and the PDF generator so all three surfaces show the same prose.
export const SIGNAL_EXPLAIN: Record<string, { good: string; mid: string; bad: string }> = {
  children_5_12_count: {
    good: "A large pool of elementary-age children — the core target customer is well-represented here.",
    mid: "A moderate pool of elementary-age children — the target customer base is present but not unusually deep.",
    bad: "A thin pool of elementary-age children — the core target customer base is small relative to top markets.",
  },
  median_household_income: {
    good: "Household income is high enough to comfortably support discretionary education spending.",
    mid: "Household income is workable for the program's price point, but not a tailwind.",
    bad: "Household income is below the level where after-school STEM spend is reliably discretionary — pricing or financial-aid messaging matters more here.",
  },
  dual_income_household_pct: {
    good: "A high share of dual-income households — strong demand driver for after-school programming.",
    mid: "A moderate share of dual-income households — some after-school demand pull, but not dominant.",
    bad: "A low share of dual-income households — less structural pull for paid after-school care.",
  },
  education_bachelors_plus_pct: {
    good: "Parents are highly educated, which correlates with willingness to pay for enrichment.",
    mid: "Parent education levels are average — receptive but not a standout driver.",
    bad: "Parent education levels are below benchmark — expect more friction explaining the value proposition.",
  },
  // Operator & Venue Supply rebuild 2026-07-12: Teacher FTE and Private Elementary
  // Schools are scored as percentile rank across all scored US cities.
  // Public Elementary Schools + Public Elementary Enrollment dropped.
  public_elementary_teacher_count: {
    good: "Top-tier recruiting pool — this city has more elementary teacher FTEs than most US cities we score.",
    mid: "A middle-of-the-pack teacher pool — hiring is workable but not a standout advantage.",
    bad: "A small teacher pool relative to peer cities — instructor and operator hiring will likely be the constraint.",
  },
  private_charter_school_count: {
    good: "Deep private-elementary supply — top-tier facility partners and a secondary channel to families.",
    mid: "A moderate private-elementary footprint — useful but not a primary driver.",
    bad: "Sparse private-elementary supply — limited alternative facility and enrollment channels.",
  },
  col_salary_index: {
    good: "Teacher salaries (cost-of-living adjusted) are favorable for recruiting at our payable wage.",
    mid: "Teacher salaries are in line with cost of living — recruiting economics are neutral.",
    bad: "Teacher salaries are high relative to cost of living — expect upward pressure on instructor pay.",
  },
  csi_national_brand_supply: {
    good: "National-brand STEM and enrichment competitors are under-represented — genuine white space for a new entrant.",
    mid: "Some national-brand competitors are present — entry is workable but requires sharper positioning.",
    bad: "The market is saturated with national-brand competitors — a new entrant needs a clear differentiator to win share.",
  },
  // csi_local_camp_estimate and csi_demand_adjusted_market removed 2026-07-07
  // (Prompt 1 CSI refactor). CSI now uses only real counted national-brand supply.
};
