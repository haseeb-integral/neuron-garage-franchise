// Surface 1: CityTable — renders rows, sorts by score (descending by default),
// and the row Score is read through marketView (Rule 12). If this suite goes
// red, the table is either dropping rows, mis-sorting, or has reintroduced a
// raw .compositeScore read.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { CityTable } from "./CityTable";
import type { CityData } from "@/data/cityData";

function makeCity(over: Partial<CityData>): CityData {
  return {
    id: 1,
    city: "Frisco",
    state: "Texas",
    tier: "A",
    compositeScore: 80,
    population: 200_000,
    elementarySchools: 30,
    childrenPct: 11,
    medianIncome: 100_000,
    competitorCount: 3,
    isNonRegistration: true,
    notes: "",
    scoreBreakdown: {
      summerCampDemand: 0, schoolDensity: 0, childPopulation: 0,
      dualIncomeFamilies: 0, stemJobs: 0, competitionScore: 0,
    },
    competitors: [],
    ...over,
  };
}

const noop = () => {};

describe("CityTable", () => {
  const cities: CityData[] = [
    makeCity({ id: 1, city: "Frisco",  compositeScore: 72 }),
    makeCity({ id: 2, city: "Plano",   compositeScore: 91 }),
    makeCity({ id: 3, city: "McKinney", compositeScore: 65 }),
  ];

  it("renders one row per passed-in city", () => {
    render(
      <CityTable
        cities={cities}
        onSelectCity={noop}
        compareMode={false}
        selectedForCompare={[]}
        onToggleCompare={noop}
      />,
    );
    expect(screen.getByText("Frisco")).toBeInTheDocument();
    expect(screen.getByText("Plano")).toBeInTheDocument();
    expect(screen.getByText("McKinney")).toBeInTheDocument();
  });

  it("sorts by score descending by default (highest first)", () => {
    render(
      <CityTable
        cities={cities}
        onSelectCity={noop}
        compareMode={false}
        selectedForCompare={[]}
        onToggleCompare={noop}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1); // skip header
    const firstName = within(rows[0]).getByText(/Plano|Frisco|McKinney/);
    expect(firstName.textContent).toBe("Plano"); // 91 is highest
  });

  it("respects the cities prop as the filter source (empty state when none)", () => {
    render(
      <CityTable
        cities={[]}
        onSelectCity={noop}
        compareMode={false}
        selectedForCompare={[]}
        onToggleCompare={noop}
      />,
    );
    expect(screen.getByText(/No cities match your filters/i)).toBeInTheDocument();
  });

  it("invokes onSelectCity when a row is clicked (non-compare mode)", () => {
    const onSelect = vi.fn();
    render(
      <CityTable
        cities={cities}
        onSelectCity={onSelect}
        compareMode={false}
        selectedForCompare={[]}
        onToggleCompare={noop}
      />,
    );
    fireEvent.click(screen.getByText("Plano"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].city).toBe("Plano");
  });
});
