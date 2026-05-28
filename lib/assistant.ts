import OpenAI from "openai";
import { buildHootSystemPrompt, type HootContext } from "./hoot-prompt";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

type SpeechTranscriptMessage = { role: "user" | "agent"; content: string };

const MAX_HISTORY_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 2000;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function normalizeChatMessages(msgs: ChatMessage[]): ChatMessage[] {
  return msgs
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter(m => m.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

export function transcriptToChatMessages(t: SpeechTranscriptMessage[]): ChatMessage[] {
  return normalizeChatMessages(
    t.map(m => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.content,
    }))
  );
}

export async function createHootStream(
  messages: ChatMessage[],
  ctx: HootContext,
  signal?: AbortSignal
) {
  const stream = await openai().responses.create(
    {
      model: MODEL,
      instructions: buildHootSystemPrompt(ctx),
      input: normalizeChatMessages(messages).map(m => ({ role: m.role, content: m.content })),
      stream: true,
    },
    { signal }
  );

  return {
    async *[Symbol.asyncIterator]() {
      for await (const event of stream) {
        if (event.type === "response.output_text.delta" && event.delta) {
          yield event.delta as string;
        }
      }
    },
  };
}
