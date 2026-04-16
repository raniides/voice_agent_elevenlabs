"use client";

import {
  ConversationProvider,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
  type HookCallbacks,
} from "@elevenlabs/react";
import { useCallback, useMemo, useState } from "react";
import { Transcript, type TranscriptLine } from "./Transcript";

type MessagePayload = Parameters<
  NonNullable<HookCallbacks["onMessage"]>
>[0];

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

function VoicePanel({
  messages,
  onClearTranscript,
}: {
  messages: TranscriptLine[];
  onClearTranscript: () => void;
}) {
  const { startSession, endSession, setVolume } = useConversationControls();
  const { status, message: statusMessage } = useConversationStatus();
  const { mode, isSpeaking, isListening } = useConversationMode();

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [volume, setVolumeState] = useState(1);

  const bearer = process.env.NEXT_PUBLIC_CONVERSATION_BEARER;

  const busy = isFetchingToken || status === "connecting";

  const start = useCallback(async () => {
    onClearTranscript();
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
        headers,
      });

      const data = (await res.json()) as {
        conversationToken?: string;
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

      const token = data.conversationToken;
      if (!token) {
        setFetchError("Server did not return a conversation token.");
        setIsFetchingToken(false);
        return;
      }

      startSession({
        conversationToken: token,
        connectionType: "webrtc",
        userId: stableUserId(),
      });
    } catch {
      setFetchError(
        "Network error while starting the session. Check your connection.",
      );
    } finally {
      setIsFetchingToken(false);
    }
  }, [bearer, onClearTranscript, startSession]);

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

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="rounded-3xl border border-zinc-200/90 bg-white/90 p-8 shadow-sm backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-950/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Voice agent
            </h1>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Start a session to talk with your ElevenLabs agent. Audio stays
              in the browser; only a short-lived token is issued from this app.
            </p>
          </div>
          <div
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 sm:mt-0"
            role="status"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "connected"
                  ? "bg-emerald-500"
                  : busy
                    ? "animate-pulse bg-amber-500"
                    : "bg-zinc-400"
              }`}
              aria-hidden
            />
            {statusLabel}
          </div>
        </div>

        {(fetchError || micError || (status === "error" && statusMessage)) && (
          <div
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {micError || fetchError || statusMessage}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={start}
            disabled={!canStart || busy}
            className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Start session"}
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={!canStop}
            className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-full border border-zinc-300 bg-transparent px-6 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Stop
          </button>
        </div>

        <div className="mt-8">
          <label
            htmlFor="agent-volume"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Agent volume
          </label>
          <input
            id="agent-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolumeState(v);
              setVolume({ volume: v });
            }}
            className="mt-2 w-full accent-emerald-600"
          />
        </div>
      </div>

      <Transcript messages={messages} />
    </div>
  );
}

export function VoiceAgentApp() {
  const [messages, setMessages] = useState<TranscriptLine[]>([]);

  const onMessage = useCallback((props: MessagePayload) => {
    const text = props.message?.trim();
    if (!text) return;

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        props.event_id !== undefined &&
        last.eventId === props.event_id
      ) {
        return [...prev.slice(0, -1), { ...last, text: props.message }];
      }
      return [
        ...prev,
        {
          id:
            props.event_id !== undefined
              ? `evt-${props.event_id}`
              : crypto.randomUUID(),
          role: props.role,
          text: props.message,
          eventId: props.event_id,
        },
      ];
    });
  }, []);

  const onClearTranscript = useCallback(() => setMessages([]), []);

  return (
    <ConversationProvider onMessage={onMessage}>
      <VoicePanel messages={messages} onClearTranscript={onClearTranscript} />
    </ConversationProvider>
  );
}
