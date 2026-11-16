import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FddSentDateField } from "./FddSentDateField";

const mocks = vi.hoisted(() => ({
  sentAt: null as string | null,
  events: [] as { event: string }[],
  status: "queued",
  invoke: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: (table: string) => {
      const result = () => ({ error: null, data:
        table === "candidate_compliance" ? { fdd_sent_at: mocks.sentAt, fdd_received_at: null, fdd_file_id: null } :
        table === "fdd_delivery_events" ? mocks.events :
        table === "fdd_email_sends" ? { status: mocks.status, error_message: null } : [] });
      const chain = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
        maybeSingle: () => Promise.resolve(result()),
        then: (resolve: (value: ReturnType<typeof result>) => void) => Promise.resolve(result()).then(resolve),
      };
      return chain;
    },
  },
}));

describe("FDD action completion evidence", () => {
  beforeEach(() => {
    mocks.sentAt = null;
    mocks.events = [];
    mocks.status = "queued";
    mocks.invoke.mockReset().mockResolvedValue({ data: { success: true }, error: null });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("recognizes a saved staff-recorded send after reopening", async () => {
    mocks.sentAt = "2026-11-16T18:35:00Z";
    const complete = vi.fn();
    render(<FddSentDateField candidateDbId="candidate" onCompletionChange={complete} />);
    await waitFor(() => expect(complete).toHaveBeenCalledWith(true));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("recognizes an existing emailed delivery event", async () => {
    mocks.events = [{ event: "emailed" }];
    const complete = vi.fn();
    render(<FddSentDateField candidateDbId="candidate" onCompletionChange={complete} />);
    await waitFor(() => expect(complete).toHaveBeenCalledWith(true));
  });

  it("does not count a legacy display date or download as sending proof", async () => {
    mocks.events = [{ event: "downloaded" }];
    const complete = vi.fn();
    render(<FddSentDateField candidateDbId="candidate" fallbackDate="2026-11-16" onCompletionChange={complete} />);
    await waitFor(() => expect(complete).toHaveBeenCalledWith(false));
    expect(complete).not.toHaveBeenCalledWith(true);
  });

  it.each(["queued", "failed"])("does not complete for a %s email", async (status) => {
    mocks.status = status;
    const complete = vi.fn();
    render(<FddSentDateField candidateDbId="candidate" onCompletionChange={complete} />);
    await waitFor(() => expect(complete).toHaveBeenCalledWith(false));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Email FDD" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(31000); });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalledWith(true);
  });

  it("completes only after sending is confirmed and the saved evidence reloads", async () => {
    const complete = vi.fn();
    render(<FddSentDateField candidateDbId="candidate" onCompletionChange={complete} />);
    await waitFor(() => expect(complete).toHaveBeenCalledWith(false));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Email FDD" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(complete).not.toHaveBeenCalledWith(true);
    mocks.status = "sent";
    mocks.sentAt = "2026-11-16T18:35:00Z";
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(complete).toHaveBeenLastCalledWith(true);
  });
});