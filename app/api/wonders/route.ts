import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SUBJECTS, type SubjectId } from "@/lib/data";

export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const VALID_SUBJECT_IDS = new Set<string>(SUBJECTS.map(s => s.id));
const VALID_AGE = new Set(["4-6", "7-9", "10-12", "13+"]);
const LANGUAGE_LABEL: Record<string, string> = { EN: "English", ES: "Spanish", HI: "Hindi" };

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

type HomeWonderOut = { q: string; subj: SubjectId };
type SubjectWonderOut = { q: string };

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const kind = body.kind === "subject" ? "subject" : "home";
  const ageBandRaw = typeof body.ageBand === "string" ? body.ageBand : "7-9";
  const ageBand = VALID_AGE.has(ageBandRaw) ? ageBandRaw : "7-9";
  const langRaw = typeof body.language === "string" ? body.language : "EN";
  const language = LANGUAGE_LABEL[langRaw] ?? "English";
  const count = Math.min(Math.max(Number(body.count) || 5, 3), 8);
  const excludeRaw = Array.isArray(body.exclude) ? body.exclude : [];
  const exclude = excludeRaw.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 30);
  const subjectId =
    typeof body.subjectId === "string" && VALID_SUBJECT_IDS.has(body.subjectId)
      ? (body.subjectId as SubjectId)
      : undefined;

  const langInstr = `Write every question's text in ${language}. The subject id field stays as the literal English id (do not translate it).`;

  let prompt: string;
  let schemaHint: string;
  if (kind === "subject") {
    if (!subjectId) {
      return NextResponse.json({ error: "subjectId required for kind=subject." }, { status: 400 });
    }
    const subj = SUBJECTS.find(s => s.id === subjectId)!;
    schemaHint = `{"wonders":[{"q":"<question>"}]}`;
    prompt = [
      `Generate ${count} short, curious, age-appropriate questions a ${ageBand}-year-old child might wonder about regarding "${subj.label}".`,
      `Each question should be open-ended, sparked by genuine curiosity, and answerable in 2–4 spoken sentences.`,
      langInstr,
      exclude.length ? `Do NOT include or rephrase any of these: ${exclude.map(s => `"${s}"`).join(", ")}.` : "",
      `Return STRICT JSON matching: ${schemaHint}. No prose, no markdown.`,
    ].filter(Boolean).join(" ");
  } else {
    const subjList = SUBJECTS.map(s => `${s.id} (${s.label})`).join(", ");
    schemaHint = `{"wonders":[{"q":"<question>","subj":"<one of: ${SUBJECTS.map(s => s.id).join("|")}>"}]}`;
    prompt = [
      `Generate ${count} short, curious, age-appropriate questions a ${ageBand}-year-old child might wonder about.`,
      `Mix across these subjects (use the id, not the label): ${subjList}.`,
      `Each question should be open-ended and answerable in 2–4 spoken sentences.`,
      langInstr,
      exclude.length ? `Do NOT include or rephrase any of these: ${exclude.map(s => `"${s}"`).join(", ")}.` : "",
      `Return STRICT JSON matching: ${schemaHint}. The "subj" field must be exactly one of the listed ids. No prose, no markdown.`,
    ].filter(Boolean).join(" ");
  }

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You generate JSON only. Never include prose, markdown, or commentary outside the JSON object." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.95,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ wonders: [] });

    let parsed: { wonders?: unknown };
    try {
      parsed = JSON.parse(content) as { wonders?: unknown };
    } catch {
      return NextResponse.json({ wonders: [] });
    }

    const raw = Array.isArray(parsed.wonders) ? parsed.wonders : [];
    if (kind === "subject") {
      const out: SubjectWonderOut[] = [];
      for (const w of raw) {
        if (!w || typeof w !== "object") continue;
        const q = (w as Record<string, unknown>).q;
        if (typeof q !== "string") continue;
        const trimmed = q.trim();
        if (trimmed.length > 0 && trimmed.length < 200) out.push({ q: trimmed });
        if (out.length >= count) break;
      }
      return NextResponse.json({ wonders: out });
    } else {
      const out: HomeWonderOut[] = [];
      for (const w of raw) {
        if (!w || typeof w !== "object") continue;
        const obj = w as Record<string, unknown>;
        const q = obj.q;
        const subj = obj.subj;
        if (typeof q !== "string" || typeof subj !== "string") continue;
        const trimmed = q.trim();
        if (trimmed.length === 0 || trimmed.length >= 200) continue;
        if (!VALID_SUBJECT_IDS.has(subj)) continue;
        out.push({ q: trimmed, subj: subj as SubjectId });
        if (out.length >= count) break;
      }
      return NextResponse.json({ wonders: out });
    }
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Could not generate wonders.", details }, { status: 500 });
  }
}
