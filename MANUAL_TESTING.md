# Manual testing checklist

## Prerequisites

1. Create an ElevenLabs conversational agent and copy **Agent ID**.
2. Create an **API key** with access to conversational AI / token endpoints.
3. Copy `.env.example` to `.env.local` and set:
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` for ElevenLabs tab
   - `HUME_API_KEY`, `HUME_SECRET_KEY` (and optional `HUME_CONFIG_ID`) for Hume tab
4. Confirm the agent works in the ElevenLabs web UI before testing this app.

## Backend session route

```bash
curl -sS -X POST http://localhost:3000/api/conversation/session | jq
```

- ElevenLabs: `curl -sS -X POST http://localhost:3000/api/conversation/session | jq` -> `signedUrl`.
- Hume: `curl -sS -X POST http://localhost:3000/api/hume/access-token | jq` -> `accessToken`.
- With `APP_SESSION_SECRET` set, send `Authorization: Bearer <same value as in .env>` (and set `NEXT_PUBLIC_CONVERSATION_BEARER` in `.env.local` for the browser).

## Browser

1. Run `npm run dev`, open `http://localhost:3000`.
2. Select the provider tab (**ElevenLabs** or **Hume AI**).
3. For ElevenLabs, optionally set `NEXT_PUBLIC_ELEVENLABS_SERVER_LOCATION=eu-residency` (or `in-residency`) if your project uses that region.
4. **Start voice call** — allow microphone when prompted.
5. Speak — you should hear the agent output.
6. **End call** — session ends cleanly.
6. Deny microphone — expect a clear error message.
7. Invalid or missing API key on server — expect a JSON error from the API (and UI message after Start).

## Automated tests

```bash
npm test
```

Tests mock `fetch` and do not call ElevenLabs (safe for CI and free-tier quota).
