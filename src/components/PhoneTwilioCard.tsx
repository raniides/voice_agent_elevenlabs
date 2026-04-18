"use client";

import { useCallback, useEffect, useState } from "react";

type PhoneProvider = "elevenlabs" | "hume";

export function PhoneTwilioCard() {
  const [provider, setProvider] = useState<PhoneProvider>("elevenlabs");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/twilio/voice`
      : "/api/twilio/voice";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/phone-provider");
      const data = (await res.json()) as {
        provider?: PhoneProvider;
        updatedAt?: string | null;
      };
      if (data.provider === "hume" || data.provider === "elevenlabs") {
        setProvider(data.provider);
      }
      if (data.updatedAt) setUpdatedAt(data.updatedAt);
    } catch {
      setError("Could not load phone provider setting.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: PhoneProvider) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/phone-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: next }),
      });
      const data = (await res.json()) as {
        provider?: PhoneProvider;
        updatedAt?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      if (data.provider) setProvider(data.provider);
      if (data.updatedAt) setUpdatedAt(data.updatedAt);
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto mt-8 w-full max-w-4xl rounded-2xl border border-zinc-700/70 bg-zinc-900/50 px-6 py-5 text-zinc-200">
      <h2 className="text-sm font-semibold text-zinc-100">
        Phone calls (Twilio)
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        Incoming calls use the provider selected below. Point your Twilio number
        Voice webhook (HTTP POST) at your public URL for{" "}
        <code className="text-zinc-300">/api/twilio/voice</code>. Run{" "}
        <code className="text-zinc-300">npm run twilio:stream</code> and expose
        the WebSocket with ngrok; set{" "}
        <code className="text-zinc-300">TWILIO_STREAM_WS_URL</code> to{" "}
        <code className="text-zinc-300">wss://…/twilio-stream</code>.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Incoming calls use:</span>
        {(["elevenlabs", "hume"] as const).map((id) => (
          <button
            key={id}
            type="button"
            disabled={saving || loading}
            onClick={() => void save(id)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              provider === id
                ? "bg-sky-600 text-white"
                : "border border-zinc-600 text-zinc-300 hover:border-zinc-500"
            } disabled:opacity-50`}
          >
            {id === "elevenlabs" ? "ElevenLabs" : "Hume AI"}
          </button>
        ))}
        {saving && (
          <span className="text-xs text-zinc-500">Saving…</span>
        )}
      </div>

      {updatedAt && (
        <p className="mt-2 text-[11px] text-zinc-500">
          Last saved: {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-zinc-700/80 bg-zinc-950/60 px-3 py-2 font-mono text-[11px] text-zinc-400 break-all">
        <div>
          <span className="text-zinc-500">Webhook (dev): </span>
          {baseUrl}
        </div>
      </div>
    </section>
  );
}
