import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResetPassword from "./ResetPassword";

const m = vi.hoisted(() => ({ link: "invite", initialize: vi.fn(), getUser: vi.fn(), update: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/passwordSetupLink", () => ({ get initialPasswordSetupLink() { return m.link; } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  initialize: m.initialize, getUser: m.getUser, updateUser: m.update, resetPasswordForEmail: m.reset,
} } }));

beforeEach(() => {
  vi.clearAllMocks();
  m.link = "invite";
  window.history.replaceState({}, "", "/reset-password?portal=1");
  m.initialize.mockResolvedValue({ error: null });
  m.getUser.mockResolvedValue({ data: { user: { id: "prospect" } }, error: null });
  m.update.mockResolvedValue({ error: null });
  m.reset.mockResolvedValue({ error: null });
});
afterEach(cleanup);
const mount = () => render(<MemoryRouter initialEntries={["/reset-password"]}><Routes>
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/portal" element={<div>Portal destination</div>} />
  <Route path="/" element={<div>Staff destination</div>} />
  <Route path="/portal/sign-in" element={<div>Prospect sign-in destination</div>} />
  <Route path="/auth" element={<div>Staff sign-in destination</div>} />
</Routes></MemoryRouter>);
const fill = async (confirmation = "new-password") => {
  await waitFor(() => expect(screen.getByLabelText("New password")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
};

describe("password setup safety and recovery", () => {
  it("never accepts a bad link because an old user session exists", () => {
    m.link = "invalid"; mount();
    expect(m.getUser).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("sends a replacement link back to the prospect password page", async () => {
    m.link = "invalid"; mount();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "prospect@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send new password link" }));
    await waitFor(() => expect(m.reset).toHaveBeenCalledWith("prospect@example.com", { redirectTo: `${window.location.origin}/reset-password?portal=1` }));
  });
  it("keeps staff replacement links on the staff password page", async () => {
    window.history.replaceState({}, "", "/reset-password"); m.link = "invalid"; mount();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "staff@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send new password link" }));
    await waitFor(() => expect(m.reset).toHaveBeenCalledWith("staff@example.com", { redirectTo: `${window.location.origin}/reset-password` }));
  });
  it("does not save if callback validation failed despite a stored user", async () => {
    m.initialize.mockResolvedValue({ error: new Error("invalid token") }); mount();
    await screen.findByLabelText("Email address"); expect(m.getUser).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("saves a valid invitation password and opens the portal", async () => {
    mount(); await fill();
    await screen.findByText("Portal destination");
    expect(m.update).toHaveBeenCalledWith({ password: "new-password" });
  });
  it("saves a valid staff recovery password without a current password", async () => {
    m.link = "recovery"; window.history.replaceState({}, "", "/reset-password"); mount();
    await waitFor(() => expect(screen.getByLabelText("New password")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await screen.findByText("Staff destination"); expect(m.update).toHaveBeenCalledWith({ password: "new-password" });
  });
  it("does not save mismatched passwords", async () => {
    mount(); await fill("different-password"); expect(m.update).not.toHaveBeenCalled();
  });
  it("allows retry after a save connection failure", async () => {
    m.update.mockRejectedValueOnce(new Error("connection failed")); mount(); await fill();
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Save password" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));
    await screen.findByText("Portal destination"); expect(m.update).toHaveBeenCalledTimes(2);
  });
  it("blocks saving when server user validation fails", async () => {
    m.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") }); mount();
    await screen.findByLabelText("Email address"); expect(m.update).not.toHaveBeenCalled();
  });
  it("provides recovery when link validation loses its connection", async () => {
    m.initialize.mockRejectedValue(new Error("offline")); mount();
    await screen.findByRole("button", { name: "Retry checking link" }); expect(m.update).not.toHaveBeenCalled();
  });
  it("releases the send button when requesting a new link fails", async () => {
    m.link = "invalid"; m.reset.mockRejectedValue(new Error("offline")); mount();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "prospect@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send new password link" }));
    await screen.findByRole("alert"); expect(screen.getByRole("button", { name: "Send new password link" })).toBeEnabled();
  });
  it("returns prospects to prospect sign-in", async () => {
    m.link = "invalid"; mount(); fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
    await screen.findByText("Prospect sign-in destination");
  });
  it("returns staff to staff sign-in", async () => {
    m.link = "invalid"; window.history.replaceState({}, "", "/reset-password"); mount();
    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" })); await screen.findByText("Staff sign-in destination");
  });
});