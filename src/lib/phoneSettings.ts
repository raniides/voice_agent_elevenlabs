import fs from "fs/promises";
import path from "path";

export type PhoneVoiceProvider = "elevenlabs" | "hume";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "phone-provider.json");

type Stored = {
  provider: PhoneVoiceProvider;
  updatedAt: string;
};

function envDefault(): PhoneVoiceProvider {
  const v = process.env.PHONE_VOICE_PROVIDER;
  return v === "hume" ? "hume" : "elevenlabs";
}

export async function getPhoneSettings(): Promise<{
  provider: PhoneVoiceProvider;
  updatedAt: string | null;
}> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Stored>;
    const provider = parsed.provider === "hume" ? "hume" : "elevenlabs";
    const updatedAt =
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : null;
    return { provider, updatedAt };
  } catch {
    return { provider: envDefault(), updatedAt: null };
  }
}

export async function getPhoneVoiceProvider(): Promise<PhoneVoiceProvider> {
  const s = await getPhoneSettings();
  return s.provider;
}

export async function setPhoneVoiceProvider(
  provider: PhoneVoiceProvider,
): Promise<Stored> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload: Stored = {
    provider,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}
