import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Auth from "./Auth";

const mocks = vi.hoisted(() => ({ auth: {
  session: {}, loading: false, accessChecked: true,
  role: null as string | null, portalCandidateId: null as string | null,
} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));
afterEach(cleanup);
const mount = () => render(<MemoryRouter initialEntries={["/auth"]}><Routes>
  <Route path="/auth" element={<Auth />} />
  <Route path="/portal" element={<div>Prospect destination</div>} />
  <Route path="/" element={<div>Staff destination</div>} />
</Routes></MemoryRouter>);

describe("sign-in destinations", () => {
  it("sends a checked prospect to /portal", () => {
    mocks.auth = { session: {}, loading: false, accessChecked: true, role: null, portalCandidateId: "candidate" };
    mount();
    expect(screen.getByText("Prospect destination")).toBeInTheDocument();
  });
  it("keeps a checked administrator going to the staff home", () => {
    mocks.auth = { session: {}, loading: false, accessChecked: true, role: "admin", portalCandidateId: null };
    mount();
    expect(screen.getByText("Staff destination")).toBeInTheDocument();
  });
  it("does not navigate using an unchecked role", () => {
    mocks.auth = { session: {}, loading: false, accessChecked: false, role: "admin", portalCandidateId: null };
    mount();
    expect(screen.queryByText("Staff destination")).not.toBeInTheDocument();
    expect(screen.queryByText("Prospect destination")).not.toBeInTheDocument();
  });
});