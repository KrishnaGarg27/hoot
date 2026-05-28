import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getRequiredEnv(name: "ELEVENLABS_API_KEY" | "ELEVENLABS_SPEECH_ENGINE_ID"): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}.`);
  return v;
}

export async function GET() {
  try {
    const apiKey = getRequiredEnv("ELEVENLABS_API_KEY");
    const engineId = getRequiredEnv("ELEVENLABS_SPEECH_ENGINE_ID");
    const elevenlabs = new ElevenLabsClient({ apiKey });
    const response = await elevenlabs.conversationalAi.conversations.getWebrtcToken({
      agentId: engineId,
    });
    return NextResponse.json({ token: response.token });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Failed to create a token.";
    return NextResponse.json(
      { error: "Unable to create a conversation token.", details },
      { status: 500 }
    );
  }
}
