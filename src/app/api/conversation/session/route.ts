import { NextResponse } from "next/server";
import {
  mintConversationToken,
  mintSignedUrl,
} from "@/lib/elevenlabsSession";
import { checkConversationSessionRateLimit } from "@/lib/rateLimit";

type ConnectionKind = "webrtc" | "websocket";

function parseConnectionType(request: Request): ConnectionKind {
  const header = request.headers.get("x-voice-connection");
  if (header === "websocket" || header === "webrtc") {
    return header;
  }
  return "webrtc";
}

function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  let connectionType: ConnectionKind = parseConnectionType(request);
  try {
    const body = (await request.json()) as {
      connectionType?: string;
    };
    if (
      body?.connectionType === "websocket" ||
      body?.connectionType === "webrtc"
    ) {
      connectionType = body.connectionType;
    }
  } catch {
    /* no JSON body */
  }

  const secret = process.env.APP_SESSION_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ")
      ? auth.slice("Bearer ".length).trim()
      : null;
    if (!token || token !== secret) {
      return jsonError(401, "UNAUTHORIZED", "Missing or invalid authorization");
    }
  }

  const clientKey = clientKeyFromRequest(request);
  if (!checkConversationSessionRateLimit(clientKey)) {
    return jsonError(
      429,
      "RATE_LIMIT",
      "Too many session requests. Try again in a minute.",
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return jsonError(
      500,
      "SERVER_CONFIG",
      "Server is missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID",
    );
  }

  if (connectionType === "websocket") {
    const result = await mintSignedUrl(apiKey, agentId);
    if (!result.ok) {
      const status =
        result.status >= 400 && result.status < 600 ? result.status : 502;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }
    return NextResponse.json({
      signedUrl: result.signedUrl,
      agentId: result.agentId,
      connectionType: "websocket" as const,
    });
  }

  const result = await mintConversationToken(apiKey, agentId);
  if (!result.ok) {
    const status =
      result.status >= 400 && result.status < 600 ? result.status : 502;
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status },
    );
  }

  return NextResponse.json({
    conversationToken: result.conversationToken,
    agentId: result.agentId,
    connectionType: "webrtc" as const,
  });
}
