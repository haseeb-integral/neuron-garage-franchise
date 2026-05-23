// Surface 4: TeacherTable — renders prospects, selects rows via uuid (NOT the
// legacy numeric id, which was killed on 2026-05-23). If this suite goes red,
// the dual-ID system has resurfaced or selection state has drifted.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TeacherTable } from "./TeacherTable";
import type { TeacherProspect } from "@/data/teacherData";

function makeProspect(over: Partial<TeacherProspect>): TeacherProspect {
  return {
    uuid: "uuid-1",
    name: "Alice Adams",
    school: "Oak Elementary",
    city: "Frisco",
    state: "TX",
    email: "alice@oak.edu",
    phone: "",
    linkedin: "",
    fitScore: 80,
    tag: "Untagged",
    enrichmentStatus: "Enriched",
    gradeLevel: "K-2",
    yearsExperience: 5,
    hasSummerCampExp: false,
    aiReasoning: "",
    tags: [],
    notes: "",
    ...over,
  };
}

const prospects: TeacherProspect[] = [
  makeProspect({ uuid: "uuid-alice", name: "Alice Adams" }),
  makeProspect({ uuid: "uuid-bob",   name: "Bob Brown" }),
];

const baseProps = {
  prospects,
  selected: [] as string[],
  onToggleSelect: vi.fn(),
  onToggleAll: vi.fn(),
  onRowClick: vi.fn(),
  onPromote: vi.fn(),
  onShortlist: vi.fn(),
  onEnrich: vi.fn(),
  onMarkNotFit: vi.fn(),
  page: 1,
  pageSize: 25,
  totalCount: prospects.length,
  onPageChange: vi.fn(),
};

describe("TeacherTable", () => {
  it("renders one row per prospect with the correct names", () => {
    render(<TeacherTable {...baseProps} />);
    expect(screen.getByText("Alice Adams")).toBeInTheDocument();
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
  });

  it("calls onToggleSelect with the uuid (not a numeric id) when a row checkbox is clicked", () => {
    const onToggleSelect = vi.fn();
    render(<TeacherTable {...baseProps} onToggleSelect={onToggleSelect} />);

    // Find Alice's row, then her checkbox
    const aliceRow = screen.getByText("Alice Adams").closest("tr")!;
    const cb = within(aliceRow).getByRole("checkbox");
    fireEvent.click(cb);

    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    const arg = onToggleSelect.mock.calls[0][0];
    expect(typeof arg).toBe("string"); // uuid, never a number
    expect(arg).toBe("uuid-alice");
  });

  it("marks the row checkbox checked when its uuid is in `selected`", () => {
    render(<TeacherTable {...baseProps} selected={["uuid-bob"]} />);
    const bobRow = screen.getByText("Bob Brown").closest("tr")!;
    const cb = within(bobRow).getByRole("checkbox");
    expect(cb).toHaveAttribute("data-state", "checked");
  });

  it("renders the empty state when there are no prospects", () => {
    render(<TeacherTable {...baseProps} prospects={[]} totalCount={0} />);
    expect(screen.getByText(/No prospects match your filters/i)).toBeInTheDocument();
  });

  it("fires onRowClick with the prospect when the row body is clicked", () => {
    const onRowClick = vi.fn();
    render(<TeacherTable {...baseProps} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Alice Adams"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0].uuid).toBe("uuid-alice");
  });
});
