import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { LeadSheetTab } from "../LeadSheetTab";

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

describe("LeadSheetTab — Google Form Step 1 fields", () => {
  beforeEach(() => {
    for (const k of Object.keys(profileStore)) delete profileStore[k];
    lastUpsertPayload = null;
  });

  it("renders all 6 new Step-1 fields from the Google Form", async () => {
    render(<LeadSheetTab candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());

    expect(screen.getByText(/Role in Neuron Garage/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you married\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City you're located in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/How did you discover Neuron Garage\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Can invest ~\$1,000 franchise fee/i)).toBeInTheDocument();
    expect(screen.getByText(/Can commit 1 summer of sweat equity\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Other summer-income opportunities/i)).toBeInTheDocument();
  });

  it("shows the registration-state warning under the City field", async () => {
    render(<LeadSheetTab candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
    expect(screen.getByText(/Registration states/i)).toBeInTheDocument();
    // spot-check a few of the 14 abbreviations
    const warn = screen.getByText(/Registration states/i).textContent ?? "";
    for (const s of ["CA", "NY", "IL", "WA", "WI"]) {
      expect(warn).toContain(s);
    }
  });

  it("persists the new fields with correct types (text, boolean, nulls) on Save", async () => {
    render(<LeadSheetTab candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/City you're located in/i), {
      target: { value: "Nashville" },
    });
    fireEvent.change(screen.getByLabelText(/How did you discover Neuron Garage\?/i), {
      target: { value: "Facebook ad" },
    });
    fireEvent.change(screen.getByLabelText(/Other summer-income opportunities/i), {
      target: { value: "Tutoring" },
    });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(lastUpsertPayload).not.toBeNull());
    expect(lastUpsertPayload.candidate_id).toBe("cand-1");
    expect(lastUpsertPayload.city).toBe("Nashville");
    expect(lastUpsertPayload.discovery_source).toBe("Facebook ad");
    expect(lastUpsertPayload.other_opportunities).toBe("Tutoring");
    // Untouched yes/no fields should be null, not false
    expect(lastUpsertPayload.married).toBeNull();
    expect(lastUpsertPayload.can_invest_min).toBeNull();
    expect(lastUpsertPayload.sweat_equity_ok).toBeNull();
    // role_other only saved when role === "other"
    expect(lastUpsertPayload.role).toBeNull();
    expect(lastUpsertPayload.role_other).toBeNull();
  });

  it("loads saved values back into the form on mount", async () => {
    profileStore["cand-1"] = {
      candidate_id: "cand-1",
      city: "Austin",
      discovery_source: "Friend referral",
      married: true,
      can_invest_min: false,
      sweat_equity_ok: true,
      other_opportunities: "Summer camp director",
      role: "operator",
    };

    render(<LeadSheetTab candidate={candidate} />);
    await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());

    expect((screen.getByLabelText(/City you're located in/i) as HTMLInputElement).value).toBe("Austin");
    expect((screen.getByLabelText(/How did you discover/i) as HTMLTextAreaElement).value).toBe("Friend referral");
    expect((screen.getByLabelText(/Other summer-income/i) as HTMLTextAreaElement).value).toBe("Summer camp director");
  });
});
