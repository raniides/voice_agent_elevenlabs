import { NextResponse } from "next/server";
import { fetchAccessToken } from "hume";
import { checkConversationSessionRateLimit } from "@/lib/rateLimit";

function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
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

  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;
  const configId = process.env.HUME_CONFIG_ID;
  if (!apiKey || !secretKey) {
    return jsonError(
      501,
      "HUME_NOT_CONFIGURED",
      "Hume is not configured. Set HUME_API_KEY and HUME_SECRET_KEY.",
    );
  }

  try {
    const accessToken = await fetchAccessToken({ apiKey, secretKey });
    return NextResponse.json({
      accessToken,
      ...(configId ? { configId } : {}),
    });
  } catch {
    return jsonError(
      502,
      "HUME_TOKEN_ERROR",
      "Failed to create Hume access token on server.",
    );
  }
}
