// Surface 3 (slice): MetricRow — the single row component used by the Market
// Detail drawer. Every registry metric flows through this component, so the
// "renders a row with a real value, or an em-dash when missing" contract is
// pinned here. Full-drawer rendering is integration-tested by ensuring every
// registry entry produces a MetricRow (covered below via a smoke test).

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricRow, type LiveSignal } from "./MetricRow";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";
import type { SowMetricEntry } from "@/lib/sowMetricRegistry";

const sample: SowMetricEntry = {
  key: "children_5_12_count",
  label: "Children 5–12",
  category: "demand",
  source: "Census ACS",
  status: "live",
  enabled: true,
} as SowMetricEntry;

describe("MetricRow", () => {
  it("renders the metric label and source", () => {
    render(<MetricRow metric={sample} signal={null} status="missing" />);
    expect(screen.getByText("Children 5–12")).toBeInTheDocument();
    expect(screen.getByText("Census ACS")).toBeInTheDocument();
  });

  it("shows em-dash when status is missing", () => {
    render(<MetricRow metric={sample} signal={null} status="missing" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the live value when a signal is present and status is live", () => {
    const signal: LiveSignal = {
      signal_key: "children_5_12_count",
      label: "Children 5–12",
      value: "12,345",
      source: "Census ACS",
    };
    render(<MetricRow metric={sample} signal={signal} status="live" />);
    expect(screen.getByText("12,345")).toBeInTheDocument();
  });

  it("renders an external-source link when source_url is set", () => {
    const signal: LiveSignal = {
      signal_key: "children_5_12_count",
      value: "1000",
      source_url: "https://census.gov/foo",
    };
    render(<MetricRow metric={sample} signal={signal} status="live" />);
    const link = screen.getByTitle("Open source");
    expect(link).toHaveAttribute("href", "https://census.gov/foo");
  });
});

describe("MetricRow x sowMetricRegistry (drawer contract)", () => {
  it("every enabled registry metric renders something — either a value or em-dash", () => {
    const all: SowMetricEntry[] = Object.values(METRICS_BY_CATEGORY).flat();
    const enabled = all.filter((m) => m.enabled);
    expect(enabled.length).toBeGreaterThan(0);

    for (const metric of enabled) {
      const { unmount, container } = render(
        <MetricRow metric={metric} signal={null} status="missing" />,
      );
      // Label always rendered
      expect(container.textContent).toContain(metric.label);
      // Missing => em-dash present
      expect(container.textContent).toContain("—");
      unmount();
    }
  });
});
