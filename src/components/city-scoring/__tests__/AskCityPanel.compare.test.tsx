import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// jsdom polyfills for scroll APIs used inside AskCityPanel
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

// Mock supabase client used by AskCityPanel
const orderMock = vi.fn();
const ilikeMock = vi.fn(() => ({
  order: vi.fn(() => ({ limit: vi.fn(() => orderMock()) })),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ ilike: ilikeMock })),
    })),
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
  },
}));

// react-markdown is ESM; stub it
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

import { AskCityPanel } from "../AskCityPanel";

describe("AskCityPanel — Compare to…", () => {
  beforeEach(() => {
    orderMock.mockReset();
    orderMock.mockResolvedValue({
      data: [
        { id: "frisco-id", city_name: "Frisco", state_abbr: "TX" },
        { id: "fremont-id", city_name: "Fremont", state_abbr: "CA" },
      ],
    });
    // @ts-expect-error stub
    global.fetch = vi.fn(async () => ({
      ok: true,
      body: { getReader: () => ({ read: async () => ({ done: true, value: undefined }) }) },
    }));
  });

  it("sends a 'Compare X to Y' prompt to ask-city when a result is clicked", async () => {
    render(
      <AskCityPanel
        cityId="nashville-id"
        cityName="Nashville"
        stateName="TN"
        totalScore={73}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /compare to/i }));
    const search = await screen.findByRole("combobox");
    fireEvent.change(search, { target: { value: "Fr" } });

    const option = await screen.findByRole("option", { name: /frisco, tx/i });
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    const lastUser = body.messages[body.messages.length - 1];
    expect(lastUser.role).toBe("user");
    expect(lastUser.content).toBe("Compare Nashville, TN to Frisco, TX.");
    expect(body.cityId).toBe("nashville-id");
  });

  it("excludes the current city from compare results", async () => {
    orderMock.mockResolvedValueOnce({
      data: [
        { id: "nashville-id", city_name: "Nashville", state_abbr: "TN" },
        { id: "frisco-id", city_name: "Frisco", state_abbr: "TX" },
      ],
    });

    render(
      <AskCityPanel cityId="nashville-id" cityName="Nashville" stateName="TN" totalScore={73} />
    );
    fireEvent.click(screen.getByRole("button", { name: /compare to/i }));
    fireEvent.change(await screen.findByRole("combobox"), { target: { value: "na" } });

    await screen.findByRole("option", { name: /frisco, tx/i });
    expect(screen.queryByRole("option", { name: /nashville, tn/i })).toBeNull();
  });
});
