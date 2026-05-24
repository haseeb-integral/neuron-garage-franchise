import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AiAssistant } from "../AiAssistant";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Stub HTMLMediaElement.play
beforeEach(() => {
  invokeMock.mockReset();
  // @ts-expect-error jsdom
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  // @ts-expect-error jsdom
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

const MARKDOWN_REPLY = `# Heading One
## Subheading
Here is **bold** text and *italic* and some \`inline code\`.

- bullet one
- bullet two

> a quoted line

[link text](https://example.com)
`;

describe("AiAssistant Play button -> TTS payload", () => {
  it("strips markdown markers from text sent to deepgram-tts", async () => {
    // First call: users-guide-ai returns markdown-rich reply (voiceOn auto-plays)
    // Second call: deepgram-tts (auto-play after reply)
    // Third call: deepgram-tts (manual Play click)
    invokeMock.mockImplementation((fnName: string) => {
      if (fnName === "users-guide-ai") {
        return Promise.resolve({ data: { reply: MARKDOWN_REPLY, followups: [] }, error: null });
      }
      if (fnName === "deepgram-tts") {
        return Promise.resolve({
          data: { audio: "AAAA", mime: "audio/mpeg" },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(<AiAssistant open={true} onOpenChange={() => {}} context="general" />);

    // Turn voice OFF to avoid auto-play, so we can isolate the manual Play click.
    fireEvent.click(screen.getByLabelText(/Turn voice off/i));

    // Trigger a message by clicking a suggested prompt
    const suggestion = screen.getAllByRole("button").find((b) =>
      /Where should I start/i.test(b.textContent ?? "")
    )!;
    fireEvent.click(suggestion);

    // Wait until the assistant reply renders and the Play button appears
    const playBtn = await screen.findByRole("button", { name: /Play/i });

    // Reset to capture only the TTS call from clicking Play
    invokeMock.mockClear();
    invokeMock.mockResolvedValue({
      data: { audio: "AAAA", mime: "audio/mpeg" },
      error: null,
    });

    fireEvent.click(playBtn);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "deepgram-tts",
        expect.objectContaining({ body: expect.objectContaining({ text: expect.any(String) }) })
      );
    });

    const ttsCall = invokeMock.mock.calls.find((c) => c[0] === "deepgram-tts");
    expect(ttsCall).toBeTruthy();
    const sentText: string = ttsCall![1].body.text;

    // Hard guarantees: no markdown markers leak into TTS.
    expect(sentText).not.toMatch(/\*\*/);
    expect(sentText).not.toMatch(/^#{1,6}\s/m);
    expect(sentText).not.toMatch(/`/);
    expect(sentText).not.toMatch(/^\s*[-*]\s/m);
    expect(sentText).not.toMatch(/\[[^\]]+]\([^)]+\)/);
    expect(sentText).not.toMatch(/^>\s/m);

    // And the actual words survived
    expect(sentText).toMatch(/Heading One/);
    expect(sentText).toMatch(/bold/);
    expect(sentText).toMatch(/italic/);
    expect(sentText).toMatch(/inline code/);
    expect(sentText).toMatch(/link text/);
  });
});
