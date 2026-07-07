// Surface 2 (slice): the CSI section of the Sub-Metric Weights drawer MUST be
// read-only by design. Manus owns the CSI formula; we never want sliders, an
// Apply button, or other editable controls to sneak into this panel. The
// normalization + apply/reset math itself is covered by
// `src/lib/subWeightNormalization.test.ts`.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CsiLockedPanel } from "./CsiLockedPanel";

const metrics: any[] = [
  { key: "csi_national_brand_supply", label: "National brand supply", category: "competitiveLandscape", source: "Manus", status: "live", enabled: true },
];

describe("CsiLockedPanel", () => {
  it("renders without any editable controls (no sliders, no inputs, no Apply button)", () => {
    render(
      <CsiLockedPanel
        metrics={metrics}
        rawValuesByKey={{}}
        csiRawScore={42}
        csiSaturationCategory="Moderately competitive"
        csiBrandDetail="Code Ninjas(2)|KinderCare(1)"
        selectedCityLabel="Frisco, TX"
      />,
    );

    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
  });

  it("displays the raw CSI score and the saturation category", () => {
    render(
      <CsiLockedPanel
        metrics={metrics}
        rawValuesByKey={{}}
        csiRawScore={42}
        csiSaturationCategory="Moderately competitive"
        csiBrandDetail={null}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/Moderately competitive/i)).toBeInTheDocument();
  });

  it("parses csi_brand_detail and renders each brand with its count", () => {
    render(
      <CsiLockedPanel
        metrics={metrics}
        rawValuesByKey={{}}
        csiRawScore={20}
        csiSaturationCategory={null}
        csiBrandDetail="Code Ninjas(2)|KinderCare(1)"
      />,
    );
    expect(screen.getAllByText(/Code Ninjas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KinderCare/i).length).toBeGreaterThan(0);
  });
});
