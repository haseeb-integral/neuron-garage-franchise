import { renderHook, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePortalPathRefresh } from "./usePortalPathRefresh";

const m = vi.hoisted(() => ({ invalidate: vi.fn(), channel: vi.fn(), remove: vi.fn(), on: vi.fn(), subscribe: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: m.invalidate }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { channel: m.channel, removeChannel: m.remove } }));
beforeEach(() => {
  vi.clearAllMocks();
  const channel = { on: m.on, subscribe: m.subscribe };
  m.channel.mockReturnValue(channel);
  m.on.mockReturnValue(channel);
  m.subscribe.mockReturnValue(channel);
});
afterEach(cleanup);
describe("private portal refresh", () => {
  it("joins only the signed-in prospect's private topic and refreshes their path", () => {
    renderHook(() => usePortalPathRefresh("prospect-user", "candidate-one"));
    expect(m.channel).toHaveBeenCalledWith("portal-path:prospect-user", { config: { private: true } });
    act(() => m.on.mock.calls[0][2]());
    expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["portal-path", "candidate-one"] });
    expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["portal-fdd-access", "candidate-one"] });
    expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ["portal-fdd-version", "candidate-one"] });
  });
  it("does not connect without both a user and their candidate link", () => {
    renderHook(() => usePortalPathRefresh(undefined, "candidate-one"));
    renderHook(() => usePortalPathRefresh("user", null));
    expect(m.channel).not.toHaveBeenCalled();
  });
  it("checks on join and when the tab is visible, without a timer", () => {
    renderHook(() => usePortalPathRefresh("user", "candidate-one"));
    act(() => m.subscribe.mock.calls[0][0]("SUBSCRIBED"));
    expect(m.invalidate).toHaveBeenCalledTimes(3);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(m.invalidate).toHaveBeenCalledTimes(3);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(m.invalidate).toHaveBeenCalledTimes(6);
    vi.restoreAllMocks();
  });
  it("removes the channel on leave and ignores late messages", () => {
    const { unmount } = renderHook(() => usePortalPathRefresh("user", "candidate-one"));
    const callback = m.on.mock.calls[0][2];
    unmount();
    expect(m.remove).toHaveBeenCalledTimes(1);
    act(() => callback());
    expect(m.invalidate).not.toHaveBeenCalled();
  });
});