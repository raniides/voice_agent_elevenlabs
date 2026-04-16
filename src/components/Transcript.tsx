"use client";

import { useEffect, useRef } from "react";

export type TranscriptLine = {
  id: string;
  role: "user" | "agent";
  text: string;
  eventId?: number;
};

type TranscriptProps = {
  messages: TranscriptLine[];
};

export function Transcript({ messages }: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-700/80 dark:bg-zinc-900/40"
      aria-label="Conversation transcript"
    >
      <div className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-700/80">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Transcript
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Live captions from your voice session
        </p>
      </div>
      <div
        className="max-h-[min(420px,50vh)] flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Messages appear here once you start talking.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm"
                    : "max-w-[85%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                }
              >
                <span className="sr-only">
                  {m.role === "user" ? "You said: " : "Agent said: "}
                </span>
                {m.text}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
