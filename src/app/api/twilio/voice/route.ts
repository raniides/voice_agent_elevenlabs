import { NextResponse } from "next/server";
import twilio from "twilio";
import { getPhoneVoiceProvider } from "@/lib/phoneSettings";

function twimlError(message: string): NextResponse {
  const vr = new twilio.twiml.VoiceResponse();
  vr.say({ voice: "alice" }, message);
  return new NextResponse(vr.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function POST(request: Request) {
  const streamUrl = process.env.TWILIO_STREAM_WS_URL?.trim();
  if (!streamUrl) {
    return twimlError(
      "Server is not configured for media streams. Set TWILIO_STREAM_WS_URL to a secure WebSocket URL.",
    );
  }

  const formData = await request.formData();
  const params = formDataToObject(formData);

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const publicBase = process.env.TWILIO_PUBLIC_BASE_URL?.replace(/\/$/, "");

  if (authToken) {
    if (!publicBase) {
      return NextResponse.json(
        {
          error:
            "TWILIO_AUTH_TOKEN is set but TWILIO_PUBLIC_BASE_URL is missing (needed for signature validation).",
        },
        { status: 500 },
      );
    }
    const signature = request.headers.get("X-Twilio-Signature") ?? "";
    const fullUrl = `${publicBase}/api/twilio/voice`;
    const ok = twilio.validateRequest(authToken, signature, fullUrl, params);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid Twilio signature" },
        { status: 403 },
      );
    }
  }

  const provider = await getPhoneVoiceProvider();
  const vr = new twilio.twiml.VoiceResponse();
  const connect = vr.connect();
  const stream = connect.stream({ url: streamUrl });
  stream.parameter({ name: "phoneVoiceProvider", value: provider });

  return new NextResponse(vr.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function GET() {
  return twimlError(
    "Configure your Twilio number to POST to this URL for incoming calls.",
  );
}
