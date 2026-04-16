"use client";

import {
  ConversationProvider,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { VoiceProvider, useVoice } from "@humeai/voice-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const SERVER_LOCATION = (() => {
  const sl = process.env.NEXT_PUBLIC_ELEVENLABS_SERVER_LOCATION;
  if (
    sl === "us" ||
    sl === "eu-residency" ||
    sl === "in-residency" ||
    sl === "global"
  ) {
    return sl;
  }
  return undefined;
})();

type ProviderId = "elevenlabs" | "hume";

type VoiceController = {
  providerLabel: string;
  transportLabel: string;
  statusLabel: string;
  busy: boolean;
  connected: boolean;
  isMuted: boolean;
  volume: number;
  error: string | null;
  startStopLabel: string;
  canStartStop: boolean;
  canMute: boolean;
  onStartStop: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
};

const PROVIDER_TABS: Array<{ id: ProviderId; label: string }> = [
  { id: "elevenlabs", label: "ElevenLabs" },
  { id: "hume", label: "Hume AI" },
];

function stableUserId(): string {
  if (typeof window === "undefined") return "server";
  const key = "elevenlabs_voice_demo_user_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

function VoiceCallShell({
  controller,
}: {
  controller: VoiceController;
}) {
  const orbStateClass = controller.connected
    ? controller.statusLabel.includes("speaking")
      ? "voice-orb-speaking"
      : "voice-orb-listening"
    : controller.busy
      ? "voice-orb-connecting"
      : "voice-orb-idle";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-between px-6 py-10 text-zinc-100">
      <div className="flex w-full items-center justify-between text-xs font-medium text-zinc-400">
        <span className="inline-flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              controller.connected
                ? "bg-emerald-400"
                : controller.busy
                  ? "animate-pulse bg-amber-400"
                  : "bg-zinc-500"
            }`}
            aria-hidden
          />
          {controller.statusLabel}
        </span>
        <span>{controller.transportLabel}</span>
      </div>

      <main className="flex w-full flex-1 flex-col items-center justify-center gap-8">
        <div
          className={`voice-orb ${orbStateClass}`}
          role="status"
          aria-live="polite"
          aria-label={`${controller.providerLabel} ${controller.statusLabel}`}
        >
          <div className="voice-orb-core" />
        </div>

        {controller.error && (
          <div
            className="w-full max-w-xl rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {controller.error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={controller.onStartStop}
            disabled={!controller.canStartStop || controller.busy}
            className="inline-flex h-16 min-w-[180px] items-center justify-center rounded-full bg-emerald-500 px-8 text-base font-semibold text-emerald-950 shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {controller.startStopLabel}
          </button>

          <button
            type="button"
            onClick={controller.onToggleMute}
            disabled={!controller.canMute}
            className="inline-flex h-16 min-w-[140px] items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/60 px-6 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {controller.isMuted ? "Unmute mic" : "Mute mic"}
          </button>
        </div>

        <div className="w-full max-w-xl">
          <label
            htmlFor={`${controller.providerLabel}-agent-volume`}
            className="text-xs font-medium uppercase tracking-wide text-zinc-400"
          >
            Agent volume
          </label>
          <input
            id={`${controller.providerLabel}-agent-volume`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={controller.volume}
            onChange={(e) => controller.onVolumeChange(Number(e.target.value))}
            disabled={!controller.connected}
            className="mt-2 w-full accent-emerald-500 disabled:opacity-50"
          />
        </div>
      </main>
    </div>
  );
}

function useElevenLabsAdapter(): VoiceController {
  const { startSession, endSession, setVolume } = useConversationControls();
  const { isMuted, setMuted } = useConversationInput();
  const { status, message: statusMessage } = useConversationStatus();
  const { mode, isSpeaking, isListening } = useConversationMode();

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [volume, setVolumeState] = useState(1);

  const bearer = process.env.NEXT_PUBLIC_CONVERSATION_BEARER;

  const busy = isFetchingToken || status === "connecting";
  const connected = status === "connected";

  const start = useCallback(async () => {
    setFetchError(null);
    setMicError(null);
    setIsFetchingToken(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(
        "Microphone access was denied or is unavailable. Allow microphone use for this site and try again.",
      );
      setIsFetchingToken(false);
      return;
    }

    try {
      const headers: HeadersInit = {};
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      const res = await fetch("/api/conversation/session", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionType: "websocket" }),
      });

      const data = (await res.json()) as {
        signedUrl?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        const hint =
          data.code === "ELEVENLABS_QUOTA" || res.status === 429
            ? " You may have hit your ElevenLabs quota or rate limit."
            : "";
        setFetchError(
          (data.error || `Request failed (${res.status})`) + hint,
        );
        setIsFetchingToken(false);
        return;
      }

      const signedUrl = data.signedUrl;
      if (!signedUrl) {
        setFetchError("Server did not return a signed URL for WebSocket.");
        setIsFetchingToken(false);
        return;
      }
      startSession({
        signedUrl,
        connectionType: "websocket",
        userId: stableUserId(),
      });
    } catch {
      setFetchError(
        "Network error while starting the session. Check your connection.",
      );
    } finally {
      setIsFetchingToken(false);
    }
  }, [bearer, startSession]);

  const stop = useCallback(() => {
    endSession();
  }, [endSession]);

  const statusLabel = useMemo(() => {
    if (isFetchingToken) return "Preparing…";
    if (status === "connecting") {
      return "Connecting…";
    }
    if (status === "connected") {
      if (isSpeaking) return "Agent is speaking";
      if (isListening) return "Listening…";
      return `Live · ${mode}`;
    }
    if (status === "error") return "Error";
    return "Ready";
  }, [isFetchingToken, isSpeaking, isListening, mode, status]);

  const canStart = status === "disconnected" || status === "error";
  const canStop = status === "connected" || status === "connecting";
  const showError =
    fetchError || micError || (status === "error" && statusMessage);

  useEffect(() => {
    if (!connected) return;
    try {
      setVolume({ volume });
    } catch {
      // Ignore occasional race while the session is finishing connection setup.
    }
  }, [connected, setVolume, volume]);

  return {
    providerLabel: "ElevenLabs",
    transportLabel: "WebSocket mode",
    statusLabel,
    busy,
    connected,
    isMuted,
    volume,
    error: showError || null,
    startStopLabel: busy ? "Connecting..." : canStart ? "Start voice call" : "End call",
    canStartStop: canStart || canStop,
    canMute: canStop,
    onStartStop: canStart ? start : stop,
    onToggleMute: () => setMuted(!isMuted),
    onVolumeChange: (v: number) => {
      setVolumeState(v);
      if (connected) {
        try {
          setVolume({ volume: v });
        } catch {
          // Ignore when no active session yet.
        }
      }
    },
  };
}

function ElevenLabsPanel() {
  const controller = useElevenLabsAdapter();
  return <VoiceCallShell controller={controller} />;
}

function useHumeAdapter(): VoiceController {
  const {
    connect,
    disconnect,
    status,
    isMuted,
    mute,
    unmute,
    volume,
    setVolume,
    isPlaying,
    error,
  } = useVoice();

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const bearer = process.env.NEXT_PUBLIC_CONVERSATION_BEARER;

  const connected = status.value === "connected";
  const busy = isFetchingToken || status.value === "connecting";

  const start = useCallback(async () => {
    setFetchError(null);
    setMicError(null);
    setIsFetchingToken(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(
        "Microphone access was denied or is unavailable. Allow microphone use for this site and try again.",
      );
      setIsFetchingToken(false);
      return;
    }

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      const response = await fetch("/api/hume/access-token", {
        method: "POST",
        headers,
      });

      const data = (await response.json()) as {
        accessToken?: string;
        configId?: string;
        error?: string;
      };

      if (!response.ok) {
        setFetchError(data.error || `Request failed (${response.status})`);
        setIsFetchingToken(false);
        return;
      }

      if (!data.accessToken) {
        setFetchError("Server did not return a Hume access token.");
        setIsFetchingToken(false);
        return;
      }

      await connect({
        auth: { type: "accessToken", value: data.accessToken },
        ...(data.configId ? { configId: data.configId } : {}),
      });
    } catch {
      setFetchError(
        "Network error while starting Hume session. Check your connection.",
      );
    } finally {
      setIsFetchingToken(false);
    }
  }, [bearer, connect]);

  const stop = useCallback(() => {
    void disconnect();
  }, [disconnect]);

  const statusLabel = useMemo(() => {
    if (isFetchingToken) return "Preparing…";
    if (status.value === "connecting") return "Connecting…";
    if (status.value === "connected") {
      return isPlaying ? "Agent speaking" : "Listening…";
    }
    if (status.value === "error") return `Error: ${status.reason}`;
    return "Ready";
  }, [isFetchingToken, isPlaying, status.reason, status.value]);

  const canStart = status.value === "disconnected" || status.value === "error";
  const canStop = status.value === "connected" || status.value === "connecting";
  const showError =
    fetchError || micError || (status.value === "error" ? status.reason : null);
  const normalizedVolume = Number.isFinite(volume) ? volume : 1;

  return {
    providerLabel: "Hume AI",
    transportLabel: "EVI WebSocket mode",
    statusLabel,
    busy,
    connected,
    isMuted,
    volume: normalizedVolume,
    error:
      showError ||
      (error
        ? `${error.message || "Hume voice error"}`
        : null),
    startStopLabel: busy ? "Connecting..." : canStart ? "Start voice call" : "End call",
    canStartStop: canStart || canStop,
    canMute: canStop,
    onStartStop: canStart ? start : stop,
    onToggleMute: () => {
      if (isMuted) unmute();
      else mute();
    },
    onVolumeChange: (v: number) => {
      if (!connected) return;
      setVolume(v);
    },
  };
}

function HumePanel() {
  const controller = useHumeAdapter();
  return <VoiceCallShell controller={controller} />;
}

export function VoiceAgentApp() {
  const [activeProvider, setActiveProvider] = useState<ProviderId>("elevenlabs");

  return (
    <div className="w-full">
      <div className="mx-auto mt-6 flex w-full max-w-4xl justify-center px-6">
        <div className="inline-flex rounded-full border border-zinc-700/70 bg-zinc-900/70 p-1">
          {PROVIDER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveProvider(tab.id)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                activeProvider === tab.id
                  ? "bg-emerald-500 text-emerald-950"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeProvider === "elevenlabs" ? (
        <ConversationProvider
          {...(SERVER_LOCATION ? { serverLocation: SERVER_LOCATION } : {})}
        >
          <ElevenLabsPanel />
        </ConversationProvider>
      ) : (
        <VoiceProvider>
          <HumePanel />
        </VoiceProvider>
      )}
    </div>
  );
}
