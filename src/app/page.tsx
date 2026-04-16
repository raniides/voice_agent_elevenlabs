import { VoiceAgentApp } from "@/components/VoiceAgentApp";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
      <VoiceAgentApp />
    </div>
  );
}
