import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { StoryBeat, StoryPlan } from "@/lib/hoot-prompt";

export const dynamic = "force-dynamic";

// Use a smarter model than the per-turn one for plan generation. A great
// story rests on a great outline; cheaping out here is a false economy.
const MODEL = process.env.OPENAI_STORY_PLAN_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o";
const VALID_AGE = new Set(["4-6", "7-9", "10-12", "13+"]);
const VALID_KIND = new Set(["interactive", "listen"]);
const LANGUAGE_LABEL: Record<string, string> = { EN: "English", ES: "Spanish", HI: "Hindi" };

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function clean(s: unknown, max = 200): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.trim().slice(0, max);
  return t.length > 0 ? t : undefined;
}

function buildPlanPrompt(args: { name: string; ageBand: string; kind: "interactive" | "listen"; tag?: string; language: string }): string {
  const { name, ageBand, kind, tag, language } = args;
  const styleLine = tag ? `Style flavour: ${tag}.` : "Style: warm, engaging, original.";
  const langLine = `LANGUAGE — write ALL prose content (title, setting, character roles, theme, scene summaries, question text, option text, ending) in ${language}. Character NAMES can be names that fit the ${language}-speaking world. Do not write any of the prose in English unless ${language} is English. JSON keys ("title", "setting", etc.) stay as the literal English keys.`;
  const modeBlock = kind === "interactive"
    ? `Mode: INTERACTIVE. 3 of the 5 scenes should end with a meaningful question for the child. Mix these two question kinds — do not use one repeatedly:
   • BRANCH — a real choice that will steer the next scene. Provide exactly 2 short, contrasting options (each under 8 words). Use BRANCH when the child's pick can plausibly change what happens next.
   • REFLECT — open-ended, asking what the child THINKS or FEELS about a character's choice, an action, a moral wrinkle, or a moment. No options. Examples: "Do you think it was fair?", "Why do you think she said that?", "Would you have done the same?"
   Questions must feel like a thoughtful adult guiding a child through a story — never mechanical "what happens next" prompts. Vary kind across the arc (e.g. REFLECT, BRANCH, REFLECT).`
    : `Mode: LISTEN. No questions in the plan — continuous narration with a satisfying ending.`;

  return `You are a master children's storyteller. Plan a complete, satisfying story for a child named ${name} (age band ${ageBand}).

${styleLine}
${langLine}
${modeBlock}

REQUIREMENTS:
- A real story with a beginning, rising action, a clear climax, and a resolution that lands. NOT a wandering string of "and then…" moments.
- A central character with a tangible goal, problem, or desire. Other characters who push or pull on that goal.
- 5 scenes. Each beat is a meaningful step toward the climax, not a filler episode.
- A real theme (courage, friendship, honesty, fear of being left out, growing up, kindness shown to someone unkind, etc.) that the story actually explores through events, not just declares.
- Age-appropriate vocabulary, complexity and themes for a ${ageBand}-year-old. Nothing scary, violent, sexual, or unsafe.
- An ending that gives the child something to feel or think about — closure, a small lesson learned IN-WORLD (not preached), or a quiet emotional turn.
- ${name} can be in the story (as a character) or it can be about another character — your call, whichever makes the better story. Pick names that aren't bland.

Return STRICT JSON, no prose, no markdown. Schema:
{
  "title": "string (3-7 words)",
  "setting": "1-2 sentence setting",
  "characters": [
    {"name": "string", "role": "string (one short phrase)"}
  ],
  "theme": "one phrase — the real theme of the story",
  "arc": [
    {"number": 1, "summary": "1-2 sentences of what happens in this scene"},
    {"number": 2, "summary": "...", "question": {"kind": "reflect", "text": "the question to ask the child"}},
    {"number": 3, "summary": "...", "question": {"kind": "branch", "text": "the question", "options": ["option A", "option B"]}}
  ],
  "endingNote": "1-2 sentences describing how the story ends, what the final image or feeling is"
}`;
}

function validateAndCoerce(raw: unknown): StoryPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const title = clean(obj.title, 120);
  const setting = clean(obj.setting, 400);
  const theme = clean(obj.theme, 200);
  const endingNote = clean(obj.endingNote, 400);
  if (!title || !setting || !theme || !endingNote) return null;

  const charsRaw = Array.isArray(obj.characters) ? obj.characters : [];
  const characters: { name: string; role: string }[] = [];
  for (const c of charsRaw) {
    if (!c || typeof c !== "object") continue;
    const co = c as Record<string, unknown>;
    const name = clean(co.name, 60);
    const role = clean(co.role, 200);
    if (name && role) characters.push({ name, role });
    if (characters.length >= 6) break;
  }

  const arcRaw = Array.isArray(obj.arc) ? obj.arc : [];
  const arc: StoryBeat[] = [];
  for (const b of arcRaw) {
    if (!b || typeof b !== "object") continue;
    const bo = b as Record<string, unknown>;
    const summary = clean(bo.summary, 600);
    if (!summary) continue;
    const number = typeof bo.number === "number" ? bo.number : arc.length + 1;
    const beat: StoryBeat = { number, summary };
    if (bo.question && typeof bo.question === "object") {
      const q = bo.question as Record<string, unknown>;
      const kindRaw = q.kind;
      const text = clean(q.text, 300);
      if (text && (kindRaw === "branch" || kindRaw === "reflect")) {
        const question: StoryBeat["question"] = { kind: kindRaw, text };
        if (kindRaw === "branch" && Array.isArray(q.options)) {
          const opts = q.options
            .map(o => clean(o, 80))
            .filter((o): o is string => Boolean(o))
            .slice(0, 2);
          if (opts.length === 2) question.options = opts;
        }
        beat.question = question;
      }
    }
    arc.push(beat);
    if (arc.length >= 7) break;
  }
  if (arc.length < 3) return null;

  return { title, setting, characters, theme, arc, endingNote };
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = clean(body.name, 80) ?? "friend";
  const ageBandRaw = clean(body.ageBand, 16);
  const ageBand = ageBandRaw && VALID_AGE.has(ageBandRaw) ? ageBandRaw : "7-9";
  const kindRaw = clean(body.kind, 16);
  const kind: "interactive" | "listen" = kindRaw && VALID_KIND.has(kindRaw) ? (kindRaw as "interactive" | "listen") : "interactive";
  const tag = clean(body.tag, 60);
  const langRaw = clean(body.language, 8) ?? "EN";
  const language = LANGUAGE_LABEL[langRaw] ?? "English";

  const prompt = buildPlanPrompt({ name, ageBand, kind, tag, language });

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You output STRICT JSON only — no prose, no markdown, no commentary outside the JSON object." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.95,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ error: "Empty plan." }, { status: 502 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Plan was not valid JSON." }, { status: 502 });
    }

    const plan = validateAndCoerce(parsed);
    if (!plan) {
      return NextResponse.json({ error: "Plan did not match the required shape." }, { status: 502 });
    }

    return NextResponse.json({ plan });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Could not generate the story plan.", details }, { status: 500 });
  }
}
