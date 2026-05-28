import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import "dotenv/config";

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const PUBLIC_WS_URL = process.env.PUBLIC_WS_URL?.trim();
const EXISTING_ID = process.env.ELEVENLABS_SPEECH_ENGINE_ID?.trim();

if (!API_KEY) throw new Error("Set ELEVENLABS_API_KEY in .env before creating a Speech Engine.");
if (!PUBLIC_WS_URL) throw new Error("Set PUBLIC_WS_URL in .env before creating a Speech Engine.");

const elevenlabs = new ElevenLabsClient({ apiKey: API_KEY });

// TTS overrides. Both fields are STRICTLY opt-in via env. Forcing a model
// like eleven_multilingual_v2 broke real-time playback (it's a high-quality
// studio model, not tuned for the Speech Engine's streaming pipeline).
// Leaving tts undefined lets the engine use whatever default it already
// validated for its WebRTC pipeline — voice plays cleanly.
//
// If you want a different voice or multilingual TTS, set HOOT_VOICE_ID
// AND HOOT_TTS_MODEL_ID together. Recommended low-latency multilingual
// model: `eleven_flash_v2_5`.
const VOICE_ID = process.env.HOOT_VOICE_ID?.trim();
const TTS_MODEL_ID = process.env.HOOT_TTS_MODEL_ID?.trim();
const ttsOverride =
  VOICE_ID || TTS_MODEL_ID
    ? {
        tts: {
          ...(VOICE_ID ? { voiceId: VOICE_ID } : {}),
          ...(TTS_MODEL_ID
            ? { modelId: TTS_MODEL_ID as "eleven_multilingual_v2" | "eleven_flash_v2_5" | "eleven_flash_v2" | "eleven_v3_conversational" }
            : {}),
        },
      }
    : {};

// Hoot's tuned settings — applied on both create and update so re-running
// this script reconfigures an existing engine in place.
const tuning = {
  speechEngine: { wsUrl: PUBLIC_WS_URL },
  // Eager turn detection: respond sooner after the kid stops talking
  // (default is "normal", which often feels laggy for kids).
  turn: { turnEagerness: "eager" as const },
  ...ttsOverride,
  // NOTE: we deliberately do NOT set `asr.quality: "high"` here. The high
  // tier adds noticeable latency to the "agent thinks the kid is done"
  // moment, which the kid feels as a dead pause. Phantom transcriptions
  // (echo / hallucinated filler words) are handled client-side instead in
  // Ask.tsx and Story.tsx via the looksLikeNoise + echo-window filters.
  // Let the client set the greeting at startSession time.
  overrides: { firstMessage: true },
};

let engineId: string;
if (EXISTING_ID) {
  await elevenlabs.speechEngine.update(EXISTING_ID, tuning);
  engineId = EXISTING_ID;
  console.log(`\nUpdated existing Speech Engine: ${engineId}\n`);
} else {
  const engine = await elevenlabs.speechEngine.create({
    name: "Hoot — Curiosity Companion",
    ...tuning,
  });
  engineId = engine.engineId;
  console.log(`\nCreated Speech Engine: ${engineId}\n`);
}

console.log("Settings:");
console.log("  · wsUrl:        ", PUBLIC_WS_URL);
console.log("  · turnEagerness: eager (faster response after silence)");
console.log("  · tts.modelId:  ", TTS_MODEL_ID ?? "(engine default — set HOOT_TTS_MODEL_ID in .env to change)");
console.log("  · tts.voiceId:  ", VOICE_ID ?? "(engine default — set HOOT_VOICE_ID in .env to change)");
console.log("  · firstMessage override: enabled");
console.log("");
if (!EXISTING_ID) {
  console.log("Next steps:");
  console.log(`  1. Add ELEVENLABS_SPEECH_ENGINE_ID=${engineId} to .env`);
  console.log("  2. Run: pnpm run speech-engine:server");
  console.log("  3. Run: pnpm run dev");
}
