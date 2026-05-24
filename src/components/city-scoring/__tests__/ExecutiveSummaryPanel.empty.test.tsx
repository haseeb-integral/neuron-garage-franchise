import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/useCityNarrative", () => ({
  useCityNarrative: () => ({
    narrative: null,
    loading: false,
    error: null,
    regenerate: vi.fn(),
  }),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(() => ({ ilike: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [] })) })) })) })) })),
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
  },
}));

import { ExecutiveSummaryPanel } from "../ExecutiveSummaryPanel";

describe("ExecutiveSummaryPanel — empty state", () => {
  const baseProps = {
    selectedCity: "Nowhereville",
    selectedState: "ZZ",
    detailScore: "—",
    detailCategoryScores: {},
    sigRows: [],
    execReportOpen: false,
    setExecReportOpen: vi.fn(),
  };

  it("renders the 'No data for this market yet' empty state when cityId is null", () => {
    render(<ExecutiveSummaryPanel {...baseProps} cityId={null} />);
    expect(
      screen.getByText(/no data for this market yet/i)
    ).toBeInTheDocument();
    // The expand/regenerate affordances should NOT be shown in the empty state
    expect(screen.queryByText(/\[Expand\]/i)).toBeNull();
  });

  it("does NOT render the empty state when cityId is present", () => {
    render(<ExecutiveSummaryPanel {...baseProps} cityId="some-city" />);
    expect(screen.queryByText(/no data for this market yet/i)).toBeNull();
  });
});
