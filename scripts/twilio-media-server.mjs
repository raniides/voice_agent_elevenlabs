/**
 * Twilio Media Streams WebSocket server (MVP).
 *
 * Run: npm run twilio:stream
 * Expose with ngrok (example): ngrok http 3001
 * Set TWILIO_STREAM_WS_URL=wss://YOUR-NGROK-HOST/twilio-stream
 *
 * This server logs events and reads the voice provider from data/phone-provider.json
 * (same file the Next app writes via /api/settings/phone-provider).
 * Extend the TODO sections to pipe audio to ElevenLabs or Hume.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const settingsFile = path.join(root, "data", "phone-provider.json");

function readProviderFromDisk() {
  try {
    const raw = fs.readFileSync(settingsFile, "utf8");
    const j = JSON.parse(raw);
    return j.provider === "hume" ? "hume" : "elevenlabs";
  } catch {
    const env = process.env.PHONE_VOICE_PROVIDER;
    return env === "hume" ? "hume" : "elevenlabs";
  }
}

const port = Number(process.env.TWILIO_STREAM_PORT || "3001");
const pathName = "/twilio-stream";

const wss = new WebSocketServer({ port, path: pathName });

console.log(
  `[twilio-media] listening on ws://127.0.0.1:${port}${pathName} (set TWILIO_STREAM_WS_URL to public wss://...)`,
);

wss.on("connection", (ws, req) => {
  console.log("[twilio-media] client connected", req.socket.remoteAddress);

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      console.log("[twilio-media] binary chunk", data.byteLength);
      return;
    }
    try {
      const msg = JSON.parse(data.toString());
      const diskProvider = readProviderFromDisk();

      if (msg.event === "connected") {
        console.log("[twilio-media] twilio protocol connected", msg.protocol);
      } else if (msg.event === "start") {
        const custom = msg.start?.customParameters ?? {};
        const paramProvider = custom.phonevoiceprovider || custom.phoneVoiceProvider;
        console.log("[twilio-media] stream start", {
          streamSid: msg.start?.streamSid,
          callSid: msg.start?.callSid,
          paramProvider,
          diskProvider,
          effective: paramProvider || diskProvider,
        });
      } else if (msg.event === "media") {
        // High volume — log sparingly in production
        // console.log("[twilio-media] media seq", msg.media?.sequenceNumber);
      } else if (msg.event === "stop") {
        console.log("[twilio-media] stream stop", msg.stop);
      } else {
        console.log("[twilio-media] event", msg.event);
      }
    } catch (e) {
      console.error("[twilio-media] parse error", e);
    }
  });

  ws.on("close", () => {
    console.log("[twilio-media] client disconnected");
  });

  ws.on("error", (err) => {
    console.error("[twilio-media] socket error", err);
  });
});
