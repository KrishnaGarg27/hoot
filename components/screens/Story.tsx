"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hoot } from "@/components/icons/Hoot";
import { IconBack, IconMic, IconStop } from "@/components/icons/Nav";
import { Card, Pill, SmallSquare, WaveBg } from "@/components/primitives";
import type { Profile } from "@/lib/profile";
import type { StoryPlan } from "@/lib/hoot-prompt";

type Mode = "choose" | "interactive" | "listen";
type PrevMessage = { role: "user" | "assistant"; content: string };
type Bubble = { id: string; who: "kid" | "hoot"; text: string };

async function fetchStoryPlan(args: { name: string; ageBand: string; kind: "interactive" | "listen"; tag: string | null; language: string }): Promise<StoryPlan> {
  const r = await fetch("/api/story-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: args.name, ageBand: args.ageBand, kind: args.kind, tag: args.tag ?? undefined, language: args.language }),
  });
  const data = (await r.json().catch(() => ({}))) as { plan?: StoryPlan; error?: string; details?: string };
  if (!r.ok || !data.plan) {
    throw new Error(data.details || data.error || "Could not generate the story plan.");
  }
  return data.plan;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Tight noise patterns — single fillers Scribe commonly hallucinates from
// silence. Real one-word answers like "yes"/"no" deliberately NOT in here.
const NOISE_PATTERNS = /^(uh+|um+|hm+|mm+|ah+|er+|huh|\.+|\?+)$/i;
function looksLikeNoise(text: string): boolean {
  const t = text.trim().replace(/[.!?,]+$/g, "");
  if (t.length < 2) return true;
  if (NOISE_PATTERNS.test(t)) return true;
  return false;
}

// Phrases the STT commonly hallucinates from the agent's own TTS leaking
// back into the mic. Only filtered while/just-after the agent is speaking.
const ECHO_PHANTOMS = /^(thank you|thanks|bye|goodbye|okay|ok|alright|hi|hello|right|sure|maybe|cool|please)$/i;
function looksLikeEchoPhantom(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[.!?,]+$/g, "");
  return ECHO_PHANTOMS.test(t);
}

function normalizeForEcho(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// 3+ word user transcript that's a substring of Hoot's recent narration =
// Hoot's own voice echoed back through the speakers and re-transcribed.
// Short barge-ins are immune.
function isSelfEchoOfAgent(userText: string, recentAgent: string): boolean {
  const u = normalizeForEcho(userText);
  if (!u) return false;
  if (u.split(" ").length < 3) return false;
  const a = normalizeForEcho(recentAgent);
  if (!a) return false;
  return a.includes(u);
}

const TAGS = ["Bedtime calm", "Big adventure", "Silly & funny", "About a brave kid", "Mystery"];

async function fetchToken(): Promise<string> {
  const r = await fetch("/api/token", { cache: "no-store" });
  const data = (await r.json().catch(() => ({}))) as { token?: string; error?: string; details?: string };
  if (!r.ok || !data.token) throw new Error(data.details || data.error || "Could not get conversation token");
  return data.token;
}

async function registerContext(payload: {
  conversationId: string;
  name?: string;
  ageBand?: string;
  language?: string;
  startingContext?: string;
  previousMessages?: PrevMessage[];
  mode?: "qa" | "story";
  storyKind?: "interactive" | "listen";
  storyPlan?: StoryPlan;
}): Promise<void> {
  await fetch("/api/voice-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function buildResumePrompt(lastHootLine: string | undefined): string {
  const snippet = lastHootLine?.trim().slice(-400) || "";
  if (!snippet) {
    return "Continue the SAME story from exactly where you stopped. Do not restart, do not greet, do not summarise. Just keep narrating.";
  }
  return [
    `The last thing you narrated was: "${snippet}"`,
    `Continue the SAME story from the very next sentence after that line. Same characters, same setting, same plot.`,
    `Do not restart, do not greet, do not summarise, do not narrate that line again. Just resume.`,
  ].join(" ");
}

function buildStoryPrompt(kind: "interactive" | "listen", name: string, tag: string | null): string {
  const flavorMap: Record<string, string> = {
    "Bedtime calm":     "Make it calm and soothing, the kind of story to drift off to.",
    "Big adventure":    "Make it a sweeping adventure with brave moments.",
    "Silly & funny":    "Make it silly and funny with playful surprises.",
    "About a brave kid":"Make the hero a brave kid who solves a problem with cleverness.",
    "Mystery":          "Make it a gentle mystery with clues to piece together.",
  };
  const flavor = tag ? flavorMap[tag] || "" : "";
  if (kind === "interactive") {
    return [
      `Tell ${name} an interactive story.`,
      flavor,
      `Speak it as you would aloud — 2 to 4 short sentences at a time.`,
      `After each scene, pause and ask "What should happen next?" with one or two simple options.`,
      `Let what ${name} says steer the story. Keep the whole story bright, age-appropriate, and around 4 to 6 scenes long.`,
    ].filter(Boolean).join(" ");
  }
  return [
    `Tell ${name} a short, gentle story.`,
    flavor,
    `Speak it as you would aloud — short sentences, easy to follow.`,
    `Keep it around 4 to 6 short scenes and end with a peaceful, satisfying close.`,
    `No questions or branching — just tell the story.`,
  ].filter(Boolean).join(" ");
}

function StoryInner({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [tag, setTag] = useState<string | null>(null);
  const [narration, setNarration] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [planningStory, setPlanningStory] = useState(false);
  const [stableMode, setStableMode] = useState<"listening" | "speaking">("listening");
  // Real turn-by-turn history so we can hand the LLM continuity on resume.
  // Does NOT include the synthetic story preset or CONTINUE prompt — those
  // are meta-instructions, kept out of the conversation so the LLM can't
  // confuse them with actual narrative turns.
  const [history, setHistory] = useState<PrevMessage[]>([]);
  // Same data shaped for display as conversation bubbles.
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  // The pre-generated outline for this story session. Pinned into the
  // system prompt every session so the LLM never improvises a new story.
  const [storyPlan, setStoryPlan] = useState<StoryPlan | null>(null);

  const presetRef = useRef<string | null>(null);
  // The original story prompt (story-mode instructions). Stays put across
  // pauses/resumes so we can re-inject it as startingContext on every session.
  const originalPresetRef = useRef<string | null>(null);
  // The pre-generated plan stays canonical across pauses + resumes.
  const planRef = useRef<StoryPlan | null>(null);
  const storyKindRef = useRef<"interactive" | "listen">("interactive");
  const presetSent = useRef(false);
  const contextRegistered = useRef(false);
  // Dedupe sent-by-us user messages from the agent's echo (same trick as Ask).
  const pendingSentRef = useRef<string[]>([]);
  // Latest snapshot of `history` so the resume callback uses the current
  // value without re-creating itself on every history change.
  const historyRef = useRef<PrevMessage[]>([]);
  historyRef.current = history;
  // Echo-window tracking: filter STT phantoms from Hoot's TTS bleed-through.
  const agentSpeakStartRef = useRef<number | null>(null);
  const agentSpeakEndRef = useRef<number | null>(null);
  // Rolling buffer of Hoot's recent narration text — used to detect when an
  // incoming user transcript is actually Hoot's own speech being re-heard.
  const recentAgentTextRef = useRef<string>("");
  // Bubble sentinel for auto-scroll to the latest turn.
  const bubbleEndRef = useRef<HTMLDivElement | null>(null);

  const conv = useConversation({
    onConnect: () => setVoiceError(null),
    onError: (msg: string) => setVoiceError(msg),
    onMessage: ({ role, message, event_id }: { role: "user" | "agent"; message: string; event_id?: number }) => {
      const content = message.trim();
      if (!content) return;
      if (role === "user") {
        const idx = pendingSentRef.current.indexOf(content);
        if (idx !== -1) {
          pendingSentRef.current.splice(idx, 1);
          // Already counted in history / bubbles at send time.
          return;
        }
        // Filter obvious STT hallucinations so Hoot doesn't respond to phantom turns.
        if (looksLikeNoise(content)) return;
        // Filter common echo-phantoms while/just-after Hoot was narrating
        // (Hoot's TTS leaking back into the mic). Real "thank you" later in
        // the convo, outside that window, still goes through. The window is
        // generous (6s) because mic just-unmuted from narration may still
        // pick up trailing acoustic echo.
        if (looksLikeEchoPhantom(content)) {
          const now = Date.now();
          const speakingNow = conv.mode === "speaking";
          const justStopped = agentSpeakEndRef.current && (now - agentSpeakEndRef.current < 6000);
          if (speakingNow || justStopped) return;
        }
        // Defense in depth: any short utterance (≤ 3 words) that lands while
        // Hoot is speaking or within 2s of Hoot finishing is almost
        // certainly TTS bleed-through. Real interrupts in story mode happen
        // via the Pause button, not voice.
        if (content.trim().split(/\s+/).length <= 3) {
          const now = Date.now();
          const speakingNow = conv.mode === "speaking";
          const justStopped = agentSpeakEndRef.current && (now - agentSpeakEndRef.current < 2000);
          if (speakingNow || justStopped) return;
        }
        // Self-echo: 3+ word transcript that's a substring of Hoot's recent
        // narration is Hoot's own voice being looped back through speakers.
        if (isSelfEchoOfAgent(content, recentAgentTextRef.current)) return;
        // Real spoken user turn.
        setHistory(h => [...h, { role: "user", content }]);
        const id = event_id != null ? `evt-user-${event_id}` : makeId("kid");
        setBubbles(b => [...b, { id, who: "kid", text: content }]);
        return;
      }
      // Agent narration: surface as the latest hero text AND as a bubble.
      // Also push into the rolling buffer for self-echo detection above.
      setNarration(content);
      setHistory(h => [...h, { role: "assistant", content }]);
      {
        const combined = (recentAgentTextRef.current + " " + content).trim();
        recentAgentTextRef.current = combined.slice(-2000);
      }
      const id = event_id != null ? `evt-agent-${event_id}` : makeId("hoot");
      setBubbles(b => {
        const idx = b.findIndex(x => x.id === id);
        if (idx === -1) return [...b, { id, who: "hoot", text: content }];
        const copy = [...b];
        copy[idx] = { id, who: "hoot", text: content };
        return copy;
      });
    },
  });

  // Auto-scroll the transcript to the newest bubble.
  useEffect(() => {
    bubbleEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles]);

  // Hysteresis on speaking → listening, same as Ask, so the "Hoot is
  // narrating" indicator doesn't blink between TTS chunks. Also pegs the
  // echo-window timestamps used by the phantom filter above.
  useEffect(() => {
    if (conv.mode === "speaking") {
      setStableMode("speaking");
      agentSpeakStartRef.current = Date.now();
      agentSpeakEndRef.current = null;
      return;
    }
    if (conv.mode === "listening") {
      if (agentSpeakStartRef.current && !agentSpeakEndRef.current) {
        agentSpeakEndRef.current = Date.now();
      }
      const t = window.setTimeout(() => setStableMode("listening"), 800);
      return () => window.clearTimeout(t);
    }
  }, [conv.mode]);

  // Mute the mic while Hoot is narrating, unmute the moment Hoot pauses.
  // This blocks STT from hearing Hoot's own TTS leaking through speakers,
  // which is the root cause of phantom user lines like "thank you" / "bye"
  // mid-story. The kid can still hit the Pause button to interrupt, and
  // their voice comes back live the instant Hoot stops narrating a beat.
  //
  // Drives off `stableMode` (the debounced mode) instead of raw `conv.mode`
  // so the mic doesn't flap on every TTS chunk boundary. The 800ms
  // hysteresis on the "speaking → listening" transition also gives any
  // trailing speaker audio time to die out before the mic goes live.
  useEffect(() => {
    if (conv.status !== "connected") return;
    const shouldMute = stableMode === "speaking";
    try { conv.setMuted(shouldMute); } catch { /* SDK quirks */ }
  }, [conv, conv.status, stableMode]);

  // Once connected, send the queued kick-off prompt (either the original
  // story preset or the "continue" message on resume). Both are meta
  // instructions to the LLM and are *not* recorded as conversation turns —
  // the story preset is already in the system prompt via startingContext,
  // and CONTINUE_PROMPT is pure steering.
  useEffect(() => {
    if (conv.status !== "connected") return;
    if (presetSent.current) return;
    const p = presetRef.current;
    if (!p) return;
    presetSent.current = true;
    pendingSentRef.current.push(p);
    try { conv.sendUserMessage(p); } catch { /* noop */ }
  }, [conv, conv.status]);

  const startStory = useCallback(async (kind: "interactive" | "listen") => {
    setMode(kind);
    setNarration("");
    setHistory([]);
    setBubbles([]);
    setVoiceError(null);
    setPendingStart(true);
    setPlanningStory(true);
    setStoryPlan(null);
    storyKindRef.current = kind;
    presetSent.current = false;
    contextRegistered.current = false;
    pendingSentRef.current = [];

    // Step 1: generate the canonical story plan first. This is the single
    // most important thing — without it the LLM improvises and drifts.
    let plan: StoryPlan;
    try {
      plan = await fetchStoryPlan({ name: profile.name, ageBand: profile.age, kind, tag, language: profile.language });
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : "Could not generate the story plan.");
      setPendingStart(false);
      setPlanningStory(false);
      return;
    }
    setStoryPlan(plan);
    planRef.current = plan;
    setPlanningStory(false);

    // The kick-off prompt is intentionally tiny — the plan + the system
    // prompt already tell the LLM exactly what to narrate.
    const preset = kind === "listen"
      ? "Begin the story now. Tell the entire arc through to the ending in this one continuous narration."
      : "Begin the story now. Narrate the first scene from the plan, then end at the planned question if there is one.";
    originalPresetRef.current = preset;
    presetRef.current = preset;

    // Step 2: open the voice session with the plan baked into context.
    try {
      const token = await fetchToken();
      await conv.startSession({
        conversationToken: token,
        onConversationCreated: (vc: { getId: () => string }) => {
          if (contextRegistered.current) return;
          contextRegistered.current = true;
          void registerContext({
            conversationId: vc.getId(),
            name: profile.name,
            ageBand: profile.age,
            language: profile.language,
            startingContext: preset,
            mode: "story",
            storyKind: kind,
            storyPlan: plan,
          });
        },
      });
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : "Could not start the story.");
    } finally {
      setPendingStart(false);
    }
  }, [conv, profile.age, profile.language, profile.name, tag]);

  // Pick up exactly where the paused story left off. Re-injects the ORIGINAL
  // story preset as startingContext so the system prompt still puts the LLM
  // in story mode, AND passes the real turn history so it knows what was said.
  const resumeStory = useCallback(async () => {
    if (conv.status !== "disconnected") return;
    if (historyRef.current.length === 0 || !originalPresetRef.current) return;
    setVoiceError(null);
    setPendingStart(true);
    presetSent.current = false;
    contextRegistered.current = false;
    pendingSentRef.current = [];
    // Anchor the resume to Hoot's actual last line so the LLM has a concrete
    // continuation point instead of a vague "continue" nudge.
    const lastHootLine = [...historyRef.current].reverse().find(m => m.role === "assistant")?.content;
    presetRef.current = buildResumePrompt(lastHootLine);
    const carryOver = historyRef.current.slice();
    const origPreset = originalPresetRef.current;
    const carryPlan = planRef.current ?? undefined;
    const carryKind = storyKindRef.current;

    try {
      const token = await fetchToken();
      await conv.startSession({
        conversationToken: token,
        onConversationCreated: (vc: { getId: () => string }) => {
          if (contextRegistered.current) return;
          contextRegistered.current = true;
          void registerContext({
            conversationId: vc.getId(),
            name: profile.name,
            ageBand: profile.age,
            language: profile.language,
            // Re-inject the original story instructions AND the canonical
            // plan every resume so the LLM never loses the story canon.
            startingContext: origPreset,
            previousMessages: carryOver,
            mode: "story",
            storyKind: carryKind,
            storyPlan: carryPlan,
          });
        },
      });
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : "Could not resume the story.");
    } finally {
      setPendingStart(false);
    }
  }, [conv, profile.age, profile.language, profile.name]);

  const stopStory = useCallback((goBackToChooser = false) => {
    try { conv.endSession(); } catch { /* noop */ }
    presetRef.current = null;
    presetSent.current = false;
    pendingSentRef.current = [];
    if (goBackToChooser) {
      setMode("choose");
      setNarration("");
      setHistory([]);
      setBubbles([]);
      setStoryPlan(null);
      originalPresetRef.current = null;
      planRef.current = null;
    }
    // else: keep narration + history + bubbles + original preset + plan so resume works.
  }, [conv]);

  // Clean up the session if the screen unmounts mid-story.
  useEffect(() => {
    return () => {
      try { conv.endSession(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendBranchChoice = (choice: string) => {
    if (conv.status !== "connected") return;
    pendingSentRef.current.push(choice);
    setHistory(h => [...h, { role: "user", content: choice }]);
    setBubbles(b => [...b, { id: makeId("chip"), who: "kid", text: choice }]);
    try { conv.sendUserMessage(choice); } catch { /* noop */ }
  };

  // Derived view state for the in-story screen. Computed unconditionally so
  // hook order stays stable across the `mode === "choose"` early return.
  const isConnecting = pendingStart || conv.status === "connecting";
  const isSpeaking = stableMode === "speaking";
  const isConnected = conv.status === "connected";
  const isPaused = !isConnecting && !isConnected && history.length > 0;
  const isListening = isConnected && !isSpeaking;

  // Pick the planned beat that best matches what's been narrated so far so
  // we can show the kid the question's real options (when it's a BRANCH).
  // Crude but works: number of distinct Hoot turns ≈ beats narrated so far.
  const hootTurnsSoFar = useMemo(
    () => bubbles.filter(b => b.who === "hoot").length,
    [bubbles]
  );
  const currentBeat = useMemo(() => {
    if (!storyPlan) return null;
    const idx = Math.max(0, Math.min(storyPlan.arc.length - 1, hootTurnsSoFar - 1));
    return storyPlan.arc[idx] ?? null;
  }, [storyPlan, hootTurnsSoFar]);
  const branchOptions = currentBeat?.question?.kind === "branch"
    ? currentBeat.question.options ?? null
    : null;
  const reflectPrompt = currentBeat?.question?.kind === "reflect"
    ? currentBeat.question.text
    : null;

  // ──────────────────────────────────────────────────────────
  // CHOOSE view
  // ──────────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <>
        {/* Mobile */}
        <div className="md:hidden" style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <SmallSquare onClick={() => window.history.back()} ariaLabel="Back"><IconBack size={20}/></SmallSquare>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)", flex: 1, textAlign: "center" }}>Story Time</div>
            <div style={{ width: 44 }}/>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
            <div style={{ animation: "hootBob 3s ease-in-out infinite" }}>
              <Hoot size={140} mood="talking"/>
            </div>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 24, color: "var(--ink)", textAlign: "center", marginTop: 8, lineHeight: 1.1 }}>
              How shall we tell it, {profile.name}?
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card onClick={() => startStory("interactive")} tint="var(--accent-pink-soft)"
              style={{ padding: 18, position: "relative", overflow: "hidden" }}>
              <WaveBg color="var(--accent-pink)" seed={0} opacity={0.55}/>
              <div style={{ position: "relative", zIndex: 1, paddingRight: 60 }}>
                <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)" }}>Interactive story</div>
                <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", opacity: 0.75, marginTop: 4 }}>
                  You make choices out loud. The story bends to listen.
                </div>
              </div>
            </Card>

            <Card onClick={() => startStory("listen")} tint="var(--accent-mint-soft)"
              style={{ padding: 18, position: "relative", overflow: "hidden" }}>
              <WaveBg color="var(--accent-mint)" seed={2} opacity={0.7}/>
              <div style={{ position: "relative", zIndex: 1, paddingRight: 60 }}>
                <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)" }}>Just tell me a story</div>
                <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", opacity: 0.75, marginTop: 4 }}>
                  Close your eyes. Hoot will take care of everything.
                </div>
              </div>
            </Card>

            <div style={{ marginTop: 8, fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.7, textAlign: "center" }}>
              Or pick a kind:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {TAGS.map(t => {
                const active = tag === t;
                return (
                  <button key={t} onClick={() => setTag(active ? null : t)} aria-pressed={active}
                    style={{
                      padding: "8px 14px", borderRadius: 999, border: "2px solid var(--ink)",
                      background: active ? "var(--accent-yellow)" : "var(--card)",
                      fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 13, color: "var(--ink)",
                      cursor: "pointer",
                    }}>{t}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:block" style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 48px 64px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ animation: "hootBob 3s ease-in-out infinite", display: "inline-block" }}>
              <Hoot size={140} mood="talking"/>
            </div>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 44, color: "var(--ink)", marginTop: 8, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              How shall we tell it, {profile.name}?
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
            <Card onClick={() => startStory("interactive")} tint="var(--accent-pink-soft)"
              style={{ padding: 28, position: "relative", overflow: "hidden", minHeight: 220 }}>
              <WaveBg color="var(--accent-pink)" seed={0} opacity={0.55}/>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 30, color: "var(--ink)" }}>Interactive story</div>
                <div style={{ fontFamily: "var(--font-nunito)", fontSize: 15, color: "var(--ink)", opacity: 0.75, marginTop: 6, maxWidth: 280, lineHeight: 1.4 }}>
                  You make choices out loud. The story bends to listen.
                </div>
                <div style={{ marginTop: 16 }}>
                  <Pill onClick={() => startStory("interactive")}>Begin →</Pill>
                </div>
              </div>
            </Card>
            <Card onClick={() => startStory("listen")} tint="var(--accent-mint-soft)"
              style={{ padding: 28, position: "relative", overflow: "hidden", minHeight: 220 }}>
              <WaveBg color="var(--accent-mint)" seed={2} opacity={0.7}/>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 30, color: "var(--ink)" }}>Just tell me a story</div>
                <div style={{ fontFamily: "var(--font-nunito)", fontSize: 15, color: "var(--ink)", opacity: 0.75, marginTop: 6, maxWidth: 280, lineHeight: 1.4 }}>
                  Close your eyes. Hoot will take care of everything.
                </div>
                <div style={{ marginTop: 16 }}>
                  <Pill onClick={() => startStory("listen")}>Listen →</Pill>
                </div>
              </div>
            </Card>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", opacity: 0.7, marginBottom: 10 }}>Or pick a kind:</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {TAGS.map(t => {
                const active = tag === t;
                return (
                  <button key={t} onClick={() => setTag(active ? null : t)} aria-pressed={active}
                    style={{
                      padding: "12px 22px", borderRadius: 999, border: "2px solid var(--ink)",
                      background: active ? "var(--accent-yellow)" : "var(--card)",
                      boxShadow: active ? "0 2px 0 var(--ink)" : "0 4px 0 var(--ink)",
                      transform: active ? "translateY(2px)" : "none",
                      fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 15, color: "var(--ink)",
                      cursor: "pointer",
                    }}>{t}</button>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ──────────────────────────────────────────────────────────
  // IN-STORY view (interactive | listen)
  // ──────────────────────────────────────────────────────────
  const statusLabel = planningStory ? "Hoot is dreaming up your story…"
    : isConnecting ? "Getting Hoot ready to narrate…"
    : isPaused ? "Paused. Tap continue to pick up the story."
    : isSpeaking ? "Hoot is narrating…"
    : isListening ? (reflectPrompt ? "Listening — share what you think." : "Listening — say what should happen next.")
    : "Tap begin to start.";

  const owlMood: "idle" | "listening" | "talking" =
    isSpeaking ? "talking" : isListening ? "listening" : "idle";
  const owlAnim = isSpeaking
    ? "hootTalk 0.6s ease-in-out infinite"
    : isListening ? "hootListen 1.2s ease-in-out infinite"
    : "hootBob 3s ease-in-out infinite";

  // Top-right primary control: stop while connected, play/resume while paused.
  const topRightOnClick = isPaused ? resumeStory : () => stopStory(false);
  const topRightAriaLabel = isPaused
    ? "Continue the story"
    : isConnecting ? "Hoot is starting" : "Pause the story";

  return (
    <div style={{ padding: "20px 20px 0", maxWidth: 1200, margin: "0 auto" }} className="md:!px-12 md:!py-9">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }} className="md:!mb-6">
        <SmallSquare onClick={() => stopStory(true)} ariaLabel="Back"><IconBack size={20}/></SmallSquare>
        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 18, color: "var(--ink)", flex: 1, textAlign: "center", lineHeight: 1.1 }} className="md:!text-[26px] md:!text-left md:!ml-4">
          {mode === "interactive" ? "Your Story" : "A Bedtime Tale"}
        </div>
        <SmallSquare
          onClick={topRightOnClick}
          ariaLabel={topRightAriaLabel}
          style={{
            opacity: isConnecting ? 0.5 : 1,
            pointerEvents: isConnecting ? "none" : undefined,
            background: isPaused ? "var(--accent-mint)" : undefined,
          }}>
          {isPaused ? <IconMic size={20}/> : <IconStop size={20}/>}
        </SmallSquare>
      </div>

      <div className="md:grid md:grid-cols-[1.2fr_1fr]" style={{ gap: 24, alignItems: "start" }}>
        {/* Scene illustration — sticky on desktop so it stays in view as
            the right column scrolls; alignSelf:start so the grid cell
            doesn't stretch into whitespace when the right side is tall. */}
        <div className="md:!sticky md:!top-[80px]" style={{ alignSelf: "start" }}>
          <Card style={{ padding: 0, overflow: "hidden", position: "relative", marginBottom: 14 }}>
            <svg viewBox="0 0 600 360" width="100%" style={{ display: "block", height: "auto" }} aria-hidden="true">
              <rect width="600" height="360" fill="var(--accent-mint-soft)"/>
              <circle cx="510" cy="80" r="32" fill="var(--accent-yellow)" stroke="var(--ink)" strokeWidth="2.8"/>
              <path d="M480 60 q-4 8 4 16" stroke="var(--ink)" strokeWidth="2" fill="none"/>
              <g stroke="var(--ink)" strokeWidth="2.8" strokeLinejoin="round">
                <path d="M60 320 q-10-60 0-120 q10 60 0 120z" fill="var(--accent-mint)"/>
                <path d="M130 320 q-14-80 0-160 q14 80 0 160z" fill="var(--accent-mint)"/>
                <path d="M510 320 q-10-60 0-120 q10 60 0 120z" fill="var(--accent-mint)"/>
              </g>
              <path d="M0 320 Q300 300 600 320 L600 360 L0 360 Z" fill="var(--accent-mint)" stroke="var(--ink)" strokeWidth="2.8"/>
              <g transform="translate(240 160)">
                <path d="M0 0 v8 h36 v-8z" fill="var(--ink)"/>
                <rect x="4" y="8" width="28" height="36" rx="6" fill="var(--accent-yellow)" stroke="var(--ink)" strokeWidth="2.4"/>
                <path d="M18 -8 v-8 q-8 0 0-10" stroke="var(--ink)" strokeWidth="2.2" fill="none"/>
              </g>
              <g fill="var(--accent-yellow)" stroke="var(--ink)" strokeWidth="1.6">
                <path d="M350 70 l3 9 l9 3 l-9 3 l-3 9 l-3-9 l-9-3 l9-3z"/>
                <path d="M400 170 l3 8 l8 3 l-8 3 l-3 8 l-3-8 l-8-3 l8-3z"/>
              </g>
              {/* Listening rings around the owl */}
              {isListening && (
                <g transform="translate(540 320)">
                  <circle r="34" fill="none" stroke="var(--ink)" strokeWidth="2.4" opacity="0.5"/>
                  <circle r="48" fill="none" stroke="var(--ink)" strokeWidth="2" opacity="0.3"/>
                </g>
              )}
            </svg>
            <div style={{ position: "absolute", right: 14, bottom: 14, animation: owlAnim }}>
              <Hoot size={60} mood={owlMood}/>
            </div>
          </Card>
        </div>

        <div>
          {/* Latest narration hero card */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Card style={{ padding: 16, paddingTop: 22, minHeight: 140 }}>
              <div style={{
                position: "absolute", top: -10, left: 16, padding: "2px 12px",
                borderRadius: 999, background: "var(--accent-yellow)", border: "2px solid var(--ink)",
                fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 800, color: "var(--ink)", zIndex: 2,
              }}>{isPaused ? "PAUSED" : "HOOT NARRATING"}</div>
              <div aria-live="polite" style={{ fontFamily: "var(--font-nunito)", fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1.45 }}>
                {narration || (isConnecting ? "Once upon a time…" : "Listen up — Hoot will start any second.")}
              </div>
              <div style={{ marginTop: 12, fontFamily: "var(--font-fredoka)", fontSize: 13, color: "var(--ink)", opacity: 0.65 }}>
                {statusLabel}
              </div>
            </Card>
          </div>

          {/* Full conversation transcript */}
          {bubbles.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 14, color: "var(--ink)", opacity: 0.7, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Story so far
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-live="polite">
                {bubbles.map(m => (
                  <div key={m.id} className="hoot-fade" style={{ display: "flex", justifyContent: m.who === "kid" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "82%", padding: "12px 16px",
                      borderRadius: m.who === "kid" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                      border: "2px solid var(--ink)",
                      background: m.who === "kid" ? "var(--accent-yellow)" : "var(--card)",
                      fontFamily: "var(--font-nunito)", fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4,
                      boxShadow: "0 3px 0 var(--ink)",
                    }}>{m.text}</div>
                  </div>
                ))}
                <div ref={bubbleEndRef} aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Interactive branch / reflect helper — visible while connected
              in interactive mode. Pulls the actual question from the
              planned beat, so chips reflect the real story choices. */}
          {mode === "interactive" && isConnected && (branchOptions || reflectPrompt) && (
            <Card style={{ padding: 16, marginBottom: 14, background: "var(--bg)", border: "2px dashed var(--ink)", boxShadow: "none" }}>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 16, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                <IconMic size={18}/>
                {branchOptions ? "Your call — say it or tap one" : "What do you think?"}
              </div>
              {reflectPrompt && (
                <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", marginTop: 6 }}>
                  {reflectPrompt}
                </div>
              )}
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.7, marginTop: 2, marginBottom: 12 }}>
                {branchOptions ? "Hoot will weave your choice into the next scene." : "Just speak — Hoot will listen."}
              </div>
              {branchOptions && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {branchOptions.map(opt => (
                    <button key={opt} onClick={() => sendBranchChoice(opt)}
                      style={{
                        padding: "8px 14px", borderRadius: 999, border: "2px solid var(--ink)",
                        background: "var(--card)", color: "var(--ink)", cursor: "pointer",
                        fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 13,
                        boxShadow: "0 3px 0 var(--ink)",
                      }}>{opt}</button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {voiceError && (
            <div role="alert" style={{
              marginBottom: 14, padding: "10px 14px", border: "2px solid #b91c1c",
              borderRadius: 14, background: "#FEE2E2", color: "#b91c1c",
              fontFamily: "var(--font-nunito)", fontSize: 13, fontWeight: 600,
            }}>{voiceError}</div>
          )}

          {/* Action bar — contextual: stop while live, resume while paused. */}
          <Card style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            {isPaused ? (
              <Pill onClick={resumeStory} style={{ flexShrink: 0 }}>
                ▶ Continue the story
              </Pill>
            ) : (
              <button
                onClick={() => stopStory(false)}
                aria-label="Pause the story"
                disabled={isConnecting}
                style={{
                  width: 38, height: 38, borderRadius: "50%", border: "2px solid var(--ink)",
                  background: "var(--accent-yellow)",
                  cursor: isConnecting ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  opacity: isConnecting ? 0.5 : 1,
                }}>
                <IconStop size={18}/>
              </button>
            )}
            <div style={{ flex: 1, fontFamily: "var(--font-nunito)", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              {statusLabel}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function Story({ profile }: { profile: Profile }) {
  return (
    <ConversationProvider>
      <StoryInner profile={profile}/>
    </ConversationProvider>
  );
}
