import { describe, expect, it, vi } from "vitest";
import { mintConversationToken } from "./elevenlabsSession";

describe("mintConversationToken", () => {
  it("returns token on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ token: "tok_abc" }),
    });

    const result = await mintConversationToken(
      "test-key",
      "agent_123",
      fetchMock as unknown as typeof fetch,
    );

    expect(result.ok && result.conversationToken).toBe("tok_abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL | string, RequestInit];
    expect(String(url)).toContain("agent_id=agent_123");
    expect(init.headers).toMatchObject({ "xi-api-key": "test-key" });
  });

  it("maps 429 to quota code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ detail: "rate limited" }),
    });

    const result = await mintConversationToken(
      "k",
      "a",
      fetchMock as unknown as typeof fetch,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ELEVENLABS_QUOTA");
      expect(result.status).toBe(429);
    }
  });
});
