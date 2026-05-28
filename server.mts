import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createServer } from "node:http";
import "dotenv/config";

import {
  createHootStream,
  transcriptToChatMessages,
} from "./lib/assistant.js";
import { loadVoiceContext } from "./lib/voice-context-store.js";

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const SPEECH_ENGINE_ID = process.env.ELEVENLABS_SPEECH_ENGINE_ID?.trim();

if (!API_KEY) throw new Error("Missing ELEVENLABS_API_KEY in .env");
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env");
if (!SPEECH_ENGINE_ID) throw new Error("Missing ELEVENLABS_SPEECH_ENGINE_ID in .env");

const elevenlabs = new ElevenLabsClient({ apiKey: API_KEY });
const httpServer = createServer();

elevenlabs.speechEngine.attach(SPEECH_ENGINE_ID, httpServer, "/ws", {
  debug: true,

  onInit(conversationId: string) {
    console.log("[hoot] session started:", conversationId);
  },

  async onTranscript(
    transcript: { role: "user" | "agent"; content: string }[],
    signal: AbortSignal,
    session: { conversationId?: string; sendResponse: (s: unknown) => void }
  ) {
    const ctx = session.conversationId
      ? (await loadVoiceContext(session.conversationId)) ?? {}
      : {};

    const previousMessages = ctx.previousMessages ?? [];
    const currentMessages = transcriptToChatMessages(transcript);
    const messages = [...previousMessages, ...currentMessages];

    console.log(
      `[hoot] transcript (${transcript.length} turns, +${previousMessages.length} carry-over) age=${ctx.ageBand ?? "?"} lang=${ctx.language ?? "?"} starting=${ctx.startingContext ? "yes" : "no"}`
    );

    const stream = await createHootStream(messages, ctx, signal);
    session.sendResponse(stream);
  },

  onClose(session: { conversationId?: string }) {
    console.log("[hoot] session closed:", session.conversationId);
  },

  onError(error: unknown) {
    console.error("[hoot] speech engine error:", error);
  },
});

const PORT = Number(process.env.SPEECH_ENGINE_PORT ?? 3001);
httpServer.listen(PORT, () => {
  console.log(`Speech Engine server listening on http://localhost:${PORT}`);
});
