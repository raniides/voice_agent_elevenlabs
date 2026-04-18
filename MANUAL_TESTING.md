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
7. Deny microphone — expect a clear error message.
8. Invalid or missing API key on server — expect a JSON error from the API (and UI message after Start).

## Twilio phone (MVP)

1. Set in `.env.local`: `TWILIO_STREAM_WS_URL` (public `wss://…/twilio-stream`), `TWILIO_PUBLIC_BASE_URL` (public `https://…` of the Next app), `TWILIO_AUTH_TOKEN` (for signature validation).
2. Run `npm run twilio:stream` (default port `3001`). Expose that port with ngrok; set `TWILIO_STREAM_WS_URL` to the **wss** URL including path `/twilio-stream`.
3. Expose the Next app (`npm run dev`) with a second ngrok HTTPS URL; set `TWILIO_PUBLIC_BASE_URL` to that origin (no trailing slash).
4. In Twilio Console, set the number’s **Voice webhook** to `POST https://<next-ngrok>/api/twilio/voice`.
5. In the app, use **Phone calls (Twilio)** to pick **ElevenLabs** or **Hume** for incoming calls (stored in `data/phone-provider.json`).
6. The stream server logs Twilio events; extend `scripts/twilio-media-server.mjs` to bridge audio to your chosen provider.

## Automated tests

```bash
npm test
```

Tests mock `fetch` and do not call ElevenLabs (safe for CI and free-tier quota).
