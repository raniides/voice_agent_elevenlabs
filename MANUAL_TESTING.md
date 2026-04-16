# Manual testing checklist

## Prerequisites

1. Create an ElevenLabs conversational agent and copy **Agent ID**.
2. Create an **API key** with access to conversational AI / token endpoints.
3. Copy `.env.example` to `.env.local` and set `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID`.
4. Confirm the agent works in the ElevenLabs web UI before testing this app.

## Backend session route

```bash
curl -sS -X POST http://localhost:3000/api/conversation/session | jq
```

- Expect `200` and a `conversationToken` (default WebRTC) when env vars are valid.
- WebSocket: `curl -sS -X POST http://localhost:3000/api/conversation/session -H 'Content-Type: application/json' -d '{"connectionType":"websocket"}' | jq` → `signedUrl`.
- With `APP_SESSION_SECRET` set, send `Authorization: Bearer <same value as in .env>` (and set `NEXT_PUBLIC_CONVERSATION_BEARER` in `.env.local` for the browser).

## Browser

1. Run `npm run dev`, open `http://localhost:3000`.
2. If you see **"could not establish pc connection"**, console errors about **`/rtc/v1`** or **LiveKit**, enable **"Use WebSocket transport"** on the page (or set `NEXT_PUBLIC_ELEVENLABS_CONNECTION=websocket` in `.env.local`). Optionally try `NEXT_PUBLIC_ELEVENLABS_SERVER_LOCATION=eu-residency` (or `in-residency`) if your ElevenLabs project uses that region.
3. **Start session** — allow microphone when prompted.
4. Speak — you should hear the agent and see lines in **Transcript**.
5. **Stop** — session ends; transcript remains until the next start. Use **Stop** before closing the tab so the agent session tears down cleanly.
6. Deny microphone — expect a clear error message.
7. Invalid or missing API key on server — expect a JSON error from the API (and UI message after Start).

## Automated tests

```bash
npm test
```

Tests mock `fetch` and do not call ElevenLabs (safe for CI and free-tier quota).
