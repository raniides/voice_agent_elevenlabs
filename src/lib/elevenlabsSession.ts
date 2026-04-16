export type MintConversationTokenSuccess = {
  ok: true;
  conversationToken: string;
  agentId: string;
};

export type MintConversationTokenFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type MintConversationTokenResult =
  | MintConversationTokenSuccess
  | MintConversationTokenFailure;

function mapElevenLabsError(status: number, bodyText: string): MintConversationTokenFailure {
  let message = bodyText.slice(0, 400);
  try {
    const parsed = JSON.parse(bodyText) as {
      detail?: unknown;
      message?: string;
    };
    if (typeof parsed.detail === "string") {
      message = parsed.detail;
    } else if (
      parsed.detail &&
      typeof parsed.detail === "object" &&
      "message" in parsed.detail &&
      typeof (parsed.detail as { message: unknown }).message === "string"
    ) {
      message = (parsed.detail as { message: string }).message;
    } else if (typeof parsed.message === "string") {
      message = parsed.message;
    }
  } catch {
    /* keep truncated raw text */
  }

  if (status === 401 || status === 403) {
    return { ok: false, status, code: "ELEVENLABS_AUTH", message };
  }
  if (status === 429) {
    return { ok: false, status, code: "ELEVENLABS_QUOTA", message };
  }
  return { ok: false, status, code: "ELEVENLABS_ERROR", message };
}

/**
 * Requests a WebRTC conversation token from ElevenLabs (server-side only).
 */
export async function mintConversationToken(
  apiKey: string,
  agentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MintConversationTokenResult> {
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
  url.searchParams.set("agent_id", agentId);

  const response = await fetchImpl(url, {
    method: "GET",
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });

  const bodyText = await response.text();

  if (!response.ok) {
    return mapElevenLabsError(response.status, bodyText);
  }

  let token: string | undefined;
  try {
    const data = JSON.parse(bodyText) as { token?: string };
    token = data.token;
  } catch {
    return {
      ok: false,
      status: 502,
      code: "INVALID_RESPONSE",
      message: "Could not parse ElevenLabs response",
    };
  }

  if (!token) {
    return {
      ok: false,
      status: 502,
      code: "MISSING_TOKEN",
      message: "ElevenLabs response did not include a token",
    };
  }

  return { ok: true, conversationToken: token, agentId };
}

export type MintSignedUrlSuccess = {
  ok: true;
  signedUrl: string;
  agentId: string;
};

export type MintSignedUrlResult = MintSignedUrlSuccess | MintConversationTokenFailure;

/**
 * Signed WebSocket URL for conversational AI (no WebRTC / LiveKit).
 * Use when `startSession({ signedUrl, connectionType: "websocket" })`.
 */
export async function mintSignedUrl(
  apiKey: string,
  agentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MintSignedUrlResult> {
  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
  );
  url.searchParams.set("agent_id", agentId);

  const response = await fetchImpl(url, {
    method: "GET",
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });

  const bodyText = await response.text();

  if (!response.ok) {
    return mapElevenLabsError(response.status, bodyText);
  }

  let signedUrl: string | undefined;
  try {
    const data = JSON.parse(bodyText) as {
      signed_url?: string;
    };
    signedUrl = data.signed_url;
  } catch {
    return {
      ok: false,
      status: 502,
      code: "INVALID_RESPONSE",
      message: "Could not parse ElevenLabs response",
    };
  }

  if (!signedUrl) {
    return {
      ok: false,
      status: 502,
      code: "MISSING_SIGNED_URL",
      message: "ElevenLabs response did not include signed_url",
    };
  }

  return { ok: true, signedUrl, agentId };
}
