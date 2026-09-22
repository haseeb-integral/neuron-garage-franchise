import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { LeadSheetSection } from "../LeadSheetSection";

// In-memory store the mock pretends to read/write
const profileStore: Record<string, any> = {};
const candidateStore: Record<string, any> = { "cand-1": { partner_involved: false } };
let lastUpsertPayload: any = null;

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          if (table === "candidate_profiles") {
            return { data: profileStore["cand-1"] ?? null, error: null };
          }
          if (table === "candidates") {
            return { data: candidateStore["cand-1"] ?? null, error: null };
          }
          return { data: null, error: null };
        },
      }),
    }),
    upsert: async (payload: any) => {
      lastUpsertPayload = payload;
      profileStore[payload.candidate_id] = payload;
      return { error: null };
    },
    update: async (_p: any) => ({ eq: async () => ({ error: null }) }),
  });
  return { supabase: { from: (t: string) => builder(t) } };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const candidate: any = {
  dbId: "cand-1",
  qualificationScores: { teaching: 0, leadership: 0, financial: 0, marketFit: 0, cultureFit: 0 },
};

describe("LeadSheetSection — Google Form Step 1 fields", () => {
  beforeEach(() => {
    for (const k of Object.keys(profileStore)) delete profileStore[k];
    lastUpsertPayload = null;
  });

  it("renders the revised Step 1 fields and removes the old questions", async () => {
    render(<LeadSheetSection candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());

    expect(screen.getByText(/Owner has to also be the Operator/i)).toBeInTheDocument();
    expect(screen.getByText(/Explained the general timeline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/when would they ideally like to begin/i)).toBeInTheDocument();
    expect(screen.queryByText(/Are you married\?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Low investment, but not no investment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Liquid Capital/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/What city and state are you located in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/How did you discover Neuron Garage\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/What other opportunities for summer income/i)).toBeInTheDocument();
  });

  it("shows the registration-state warning under the City field", async () => {
    render(<LeadSheetSection candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
    expect(screen.getByText(/Registration states/i)).toBeInTheDocument();
    // spot-check a few of the 14 abbreviations
    const warn = screen.getByText(/Registration states/i).textContent ?? "";
    for (const s of ["CA", "NY", "IL", "WA", "WI"]) {
      expect(warn).toContain(s);
    }
  });

  it("persists the revised fields with correct types", async () => {
    render(<LeadSheetSection candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/What city and state are you located in/i), {
      target: { value: "Nashville" },
    });
    fireEvent.change(screen.getByLabelText(/How did you discover Neuron Garage\?/i), {
      target: { value: "Facebook ad" },
    });
    fireEvent.change(screen.getByLabelText(/What other opportunities for summer income/i), {
      target: { value: "Tutoring" },
    });
    fireEvent.click(screen.getByText(/Owner has to also be the Operator/i));

    await waitFor(() => expect(lastUpsertPayload).not.toBeNull());
    expect(lastUpsertPayload.candidate_id).toBe("cand-1");
    expect(lastUpsertPayload.city).toBe("Nashville");
    expect(lastUpsertPayload.discovery_source).toBe("Facebook ad");
    expect(lastUpsertPayload.other_opportunities).toBe("Tutoring");
    expect(lastUpsertPayload.owner_operator_explained).toBe(true);
    expect(lastUpsertPayload.general_timeline_explained).toBe(false);
  });

  it("loads saved values back into the form on mount", async () => {
    profileStore["cand-1"] = {
      candidate_id: "cand-1",
      city: "Austin",
      discovery_source: "Friend referral",
      owner_operator_explained: true,
      general_timeline_explained: true,
      timeline: "A later summer",
      other_opportunities: "Summer camp director",
    };

    render(<LeadSheetSection candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());

    expect((screen.getByLabelText(/What city and state are you located in/i) as HTMLInputElement).value).toBe("Austin");
    expect((screen.getByLabelText(/How did you discover/i) as HTMLTextAreaElement).value).toBe("Friend referral");
    expect((screen.getByLabelText(/What other opportunities for summer income/i) as HTMLTextAreaElement).value).toBe("Summer camp director");
    expect((screen.getByLabelText(/Other ideal start time/i) as HTMLInputElement).value).toBe("A later summer");
  });
});
