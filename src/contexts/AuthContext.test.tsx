import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const mocks = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: Session | null) => void),
  query: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: {
    onAuthStateChange: (callback: typeof mocks.listener) => {
      mocks.listener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
    getSession: mocks.getSession,
    signOut: mocks.signOut,
  },
  from: (table: string) => {
    let id = "";
    const builder = {
      select: () => builder,
      eq: (_column: string, value: string) => { id = value; return builder; },
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => mocks.query(table, id),
    };
    return builder;
  },
} }));

const session = (id: string) => ({ user: { id } }) as Session;
const emit = (id: string | null) => act(() => {
  mocks.listener?.(id ? "SIGNED_IN" : "SIGNED_OUT", id ? session(id) : null);
});
function State() {
  const auth = useAuth();
  return <output data-testid="state">{JSON.stringify({
    user: auth.user?.id, role: auth.role, portal: auth.portalCandidateId, checked: auth.accessChecked,
  })}</output>;
}
const state = () => JSON.parse(screen.getByTestId("state").textContent ?? "{}");
function StaffGate() {
  const { session: current } = useAuth();
  return current ? <ProtectedRoute><div>Staff content</div></ProtectedRoute> : null;
}
const mount = () => render(<MemoryRouter><AuthProvider><State /><Routes>
  <Route path="/" element={<StaffGate />} />
  <Route path="/auth" element={<div>Signed out</div>} />
  <Route path="/portal" element={<div>Prospect content</div>} />
</Routes></AuthProvider></MemoryRouter>);
beforeEach(() => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.query.mockImplementation((table: string, id: string) => Promise.resolve({
    error: null,
    data: table === "user_roles" ? (id === "staff" ? { role: "admin" } : null)
      : table === "candidate_portal_users" ? (id === "prospect" ? { candidate_id: "candidate" } : null)
      : { id, email: `${id}@example.test`, full_name: id },
  }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("account-scoped access", () => {
  it("hides staff pages immediately when staff switches to a prospect", async () => {
    mount();
    emit("staff");
    await screen.findByText("Staff content");
    emit("prospect");
    expect(state()).toMatchObject({ user: "prospect", role: null, portal: null, checked: false });
    expect(screen.queryByText("Staff content")).not.toBeInTheDocument();
    await waitFor(() => expect(state()).toMatchObject({ role: null, portal: "candidate", checked: true }));
  });

  it("ignores a staff lookup that finishes after the prospect lookup", async () => {
    const original = mocks.query.getMockImplementation();
    const pending: Array<() => void> = [];
    mocks.query.mockImplementation((table: string, id: string) => id === "staff"
      ? new Promise(resolve => pending.push(() => resolve({ data: table === "user_roles" ? { role: "admin" } : null, error: null })))
      : original?.(table, id));
    mount();
    emit("staff");
    await waitFor(() => expect(pending).toHaveLength(3));
    emit("prospect");
    await waitFor(() => expect(state().portal).toBe("candidate"));
    await act(async () => pending.forEach(resolve => resolve()));
    expect(state()).toMatchObject({ user: "prospect", role: null, portal: "candidate", checked: true });
  });

  it("clears access on sign-out and rejects pending access results", async () => {
    let resolveRole: ((value: unknown) => void) | undefined;
    const original = mocks.query.getMockImplementation();
    mocks.query.mockImplementation((table: string, id: string) => table === "user_roles"
      ? new Promise(resolve => { resolveRole = resolve; }) : original?.(table, id));
    mount();
    emit("staff");
    await waitFor(() => expect(resolveRole).toBeTypeOf("function"));
    emit(null);
    await act(async () => resolveRole?.({ data: { role: "admin" }, error: null }));
    expect(state()).toMatchObject({ role: null, portal: null, checked: true });
    expect(screen.queryByText("Staff content")).not.toBeInTheDocument();
  });

  it("keeps staff pages hidden if the role check fails", async () => {
    mocks.query.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    mount();
    emit("staff");
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(3));
    expect(state()).toMatchObject({ role: null, checked: false });
    expect(screen.queryByText("Staff content")).not.toBeInTheDocument();
  });
});