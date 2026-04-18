import { NextResponse } from "next/server";
import {
  getPhoneSettings,
  setPhoneVoiceProvider,
  type PhoneVoiceProvider,
} from "@/lib/phoneSettings";

function isProvider(v: unknown): v is PhoneVoiceProvider {
  return v === "elevenlabs" || v === "hume";
}

export async function GET() {
  const settings = await getPhoneSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { provider?: unknown };
    if (!isProvider(body?.provider)) {
      return NextResponse.json(
        { error: 'provider must be "elevenlabs" or "hume"' },
        { status: 400 },
      );
    }
    const saved = await setPhoneVoiceProvider(body.provider);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
