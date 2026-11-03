import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PortalSignIn from "./PortalSignIn";

const m = vi.hoisted(() => ({ auth: { session: null as object | null, loading: false, accessChecked: true, role: null as string | null, portalCandidateId: null as string | null, signOut: vi.fn() }, login: vi.fn(), reset: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => m.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithPassword: m.login, resetPasswordForEmail: m.reset } } }));
beforeEach(() => { vi.clearAllMocks(); m.auth = { session: null, loading: false, accessChecked: true, role: null, portalCandidateId: null, signOut: vi.fn() }; });
afterEach(cleanup);
const mount = (from?: string) => render(<MemoryRouter initialEntries={[{ pathname: "/portal/sign-in", state: { from } }]}><Routes>
  <Route path="/portal/sign-in" element={<PortalSignIn />} />
  <Route path="/portal" element={<div>Prospect destination</div>} />
  <Route path="/portal/form/rfc" element={<div>RFC destination</div>} />
  <Route path="/" element={<div>Staff destination</div>} />
</Routes></MemoryRouter>);
describe("prospect sign-in account rules", () => {
  it("sends checked prospects to their portal", () => { m.auth.session = {}; m.auth.portalCandidateId = "candidate"; mount(); expect(screen.getByText("Prospect destination")).toBeInTheDocument(); });
  it("keeps staff on the staff home", () => { m.auth.session = {}; m.auth.role = "admin"; mount(); expect(screen.getByText("Staff destination")).toBeInTheDocument(); });
  it("waits for checked access before choosing a destination", () => { m.auth.session = {}; m.auth.accessChecked = false; m.auth.role = "admin"; mount(); expect(screen.queryByText("Staff destination")).not.toBeInTheDocument(); });
  it("does not give an unlinked account portal access", () => { m.auth.session = {}; mount(); expect(screen.queryByText("Prospect destination")).not.toBeInTheDocument(); expect(screen.queryByText("Staff destination")).not.toBeInTheDocument(); });
  it("returns a prospect to an invited form, but ignores an external destination", () => { m.auth.session = {}; m.auth.portalCandidateId = "candidate"; mount("https://example.com"); expect(screen.getByText("Prospect destination")).toBeInTheDocument(); cleanup(); mount("/portal/form/rfc"); expect(screen.getByText("RFC destination")).toBeInTheDocument(); });
  it("uses the existing password sign-in and shows a rejected password", async () => {
    m.login.mockResolvedValue({ error: new Error("Invalid login credentials") }); mount();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "prospect@example.com" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In", exact: true }));
    await waitFor(() => expect(m.login).toHaveBeenCalledWith({ email: "prospect@example.com", password: "wrong-password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("don’t match");
  });
  it("sends password reset back through the existing portal password page", async () => {
    m.reset.mockResolvedValue({ error: null }); mount();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "prospect@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => expect(m.reset).toHaveBeenCalledWith("prospect@example.com", { redirectTo: `${window.location.origin}/reset-password?portal=1` }));
  });
});