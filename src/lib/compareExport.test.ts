import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import type { RankedMarket } from "@/lib/cityScoringLiveData";
import { buildCompareWorkbook, buildComparePdf, buildCompareFilename } from "./compareExport";

// Minimal scored-row stub. cityScoringLiveData seeds from these fields.
function makeMarket(id: string, city: string, state: string) {
  return {
    id,
    cityId: id,
    city,
    state,
    county: "Test County",
    metroArea: null,
    hasLiveData: true,
    composite: 65,
    categoryScores: { demand: 55, franchiseeSupply: 50, competitiveLandscape: 60 },
    scoredRow: {
      city_id: id,
      city,
      state,
      population: 500000,
      children_5_12_count: 40000,
      median_household_income: 70000,
      dual_income_household_pct: 60,
      bachelors_attainment_pct: 35,
      score_demand: 55,
      score_tam_teachers: 50,
      score_csi: 40,
      composite_score_default: 65,
    } as any,
  } as unknown as RankedMarket;
}

describe("compareExport", () => {
  const markets = [
    makeMarket("a", "Nashville", "Tennessee"),
    makeMarket("b", "Louisville", "Kentucky"),
  ];
  const subs = { demand: { children_5_12_count: 30 }, franchiseeSupply: {}, competitiveLandscape: {} };
  const masters = { demand: 40, franchiseeSupply: 30, competitiveLandscape: 30 };

  it("builds an xlsx workbook with the three expected sheets", () => {
    const wb = buildCompareWorkbook(markets, subs, masters, "Demand Heavy");
    expect(wb.SheetNames).toEqual(["Overview", "Key Market Signals", "Weights Snapshot"]);
    const overview = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Overview, { header: 1 });
    // header row + Overall + Tier + 2 pillars (Demand, TAM) = 5 rows
    expect(overview.length).toBeGreaterThanOrEqual(5);
    expect(overview[0].some((h) => String(h).startsWith("Nashville"))).toBe(true);
  });

  it("builds a pdf without throwing", () => {
    const doc = buildComparePdf(markets, subs, masters, "Demand Heavy");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("formats filename as expected", () => {
    const d = new Date("2026-05-26T10:00:00Z");
    expect(buildCompareFilename(markets, "xlsx", d)).toBe(
      "compare-nashville-louisville-2026-05-26.xlsx",
    );
  });
});
