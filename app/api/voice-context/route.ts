import { NextResponse } from "next/server";
import { saveVoiceContext } from "@/lib/voice-context-store";
import type { HootContext, PrevMessage, StoryBeat, StoryPlan } from "@/lib/hoot-prompt";

export const dynamic = "force-dynamic";

const VALID_AGE = new Set(["4-6", "7-9", "10-12", "13+"]);
const VALID_LANG = new Set(["EN", "ES", "HI"]);
const VALID_MODE = new Set(["qa", "story"]);
const VALID_STORY_KIND = new Set(["interactive", "listen"]);
const MAX_PREV_MESSAGES = 30;
const MAX_PREV_CHARS = 2000;

function clean(s: unknown, max = 500): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.trim().slice(0, max);
  return t.length > 0 ? t : undefined;
}

function parseStoryPlan(value: unknown): StoryPlan | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  const title = clean(obj.title, 200);
  const setting = clean(obj.setting, 600);
  const theme = clean(obj.theme, 300);
  const endingNote = clean(obj.endingNote, 600);
  if (!title || !setting || !theme || !endingNote) return undefined;
  const charsRaw = Array.isArray(obj.characters) ? obj.characters : [];
  const characters: { name: string; role: string }[] = [];
  for (const c of charsRaw) {
    if (!c || typeof c !== "object") continue;
    const co = c as Record<string, unknown>;
    const name = clean(co.name, 80);
    const role = clean(co.role, 300);
    if (name && role) characters.push({ name, role });
    if (characters.length >= 8) break;
  }
  const arcRaw = Array.isArray(obj.arc) ? obj.arc : [];
  const arc: StoryBeat[] = [];
  for (const b of arcRaw) {
    if (!b || typeof b !== "object") continue;
    const bo = b as Record<string, unknown>;
    const summary = clean(bo.summary, 800);
    if (!summary) continue;
    const number = typeof bo.number === "number" ? bo.number : arc.length + 1;
    const beat: StoryBeat = { number, summary };
    if (bo.question && typeof bo.question === "object") {
      const q = bo.question as Record<string, unknown>;
      const text = clean(q.text, 400);
      if (text && (q.kind === "branch" || q.kind === "reflect")) {
        const question: StoryBeat["question"] = { kind: q.kind, text };
        if (q.kind === "branch" && Array.isArray(q.options)) {
          const opts = q.options
            .map(o => clean(o, 100))
            .filter((o): o is string => Boolean(o))
            .slice(0, 2);
          if (opts.length === 2) question.options = opts;
        }
        beat.question = question;
      }
    }
    arc.push(beat);
    if (arc.length >= 8) break;
  }
  if (arc.length < 1) return undefined;
  return { title, setting, characters, theme, arc, endingNote };
}

function parsePrevMessages(value: unknown): PrevMessage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: PrevMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_PREV_CHARS);
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }
  return out.length > 0 ? out.slice(-MAX_PREV_MESSAGES) : undefined;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const conversationId = clean(body.conversationId, 200);
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required." }, { status: 400 });
  }

  const ageBandRaw = clean(body.ageBand, 16);
  const languageRaw = clean(body.language, 8);

  const modeRaw = clean(body.mode, 8);
  const storyKindRaw = clean(body.storyKind, 16);

  const ctx: HootContext = {
    name: clean(body.name, 80),
    ageBand: ageBandRaw && VALID_AGE.has(ageBandRaw) ? (ageBandRaw as HootContext["ageBand"]) : undefined,
    language: languageRaw && VALID_LANG.has(languageRaw) ? languageRaw : undefined,
    startingContext: clean(body.startingContext, 1000),
    previousMessages: parsePrevMessages(body.previousMessages),
    mode: modeRaw && VALID_MODE.has(modeRaw) ? (modeRaw as HootContext["mode"]) : undefined,
    storyKind: storyKindRaw && VALID_STORY_KIND.has(storyKindRaw) ? (storyKindRaw as HootContext["storyKind"]) : undefined,
    storyPlan: parseStoryPlan(body.storyPlan),
  };

  try {
    await saveVoiceContext(conversationId, ctx);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Failed to save context.";
    return NextResponse.json({ error: "Could not save voice context.", details }, { status: 500 });
  }
}
