"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hoot } from "@/components/icons/Hoot";
import { IconClose, IconLang, IconMic, IconStop } from "@/components/icons/Nav";
import { Card, SmallSquare } from "@/components/primitives";
import { updateProfile, type Language, type Profile } from "@/lib/profile";

type AskState = "idle" | "connecting" | "listening" | "speaking";

type Message = { id: string; who: "kid" | "hoot"; text: string };

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CHIPS = ["Explain it simpler", "Tell me more", "Why?", "Tell a story about it"];

// Localized opening greeting Hoot says when the kid arrives without a preset.
// Per-language so a Spanish-speaking kid isn't greeted in English on connect.
function buildGreeting(name: string, lang: Language): string {
  switch (lang) {
    case "ES": return `¡Hola ${name}! ¿Qué te preguntas hoy?`;
    case "HI": return `नमस्ते ${name}! आज तुम क्या जानना चाहते हो?`;
    default:   return `Hi ${name}! What are you wondering about today?`;
  }
}

// Tight noise patterns — single fillers ElevenLabs Scribe commonly hallucinates
// from silence. Real one-word answers like "yes"/"no" deliberately NOT in here.
const NOISE_PATTERNS = /^(uh+|um+|hm+|mm+|ah+|er+|huh|\.+|\?+)$/i;
function looksLikeNoise(text: string): boolean {
  const t = text.trim().replace(/[.!?,]+$/g, "");
  if (t.length < 2) return true;
  if (NOISE_PATTERNS.test(t)) return true;
  return false;
}

// Phrases the STT commonly hallucinates from the agent's own TTS leaking
// back into the mic. Only filtered while/just-after the agent is speaking,
// so a real "thank you" the kid says later in the conversation still goes through.
const ECHO_PHANTOMS = /^(thank you|thanks|bye|goodbye|okay|ok|alright|hi|hello|right|sure|maybe|cool|please)$/i;
function looksLikeEchoPhantom(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[.!?,]+$/g, "");
  return ECHO_PHANTOMS.test(t);
}

// Normalize for the self-echo substring check: lowercase, strip punctuation,
// collapse whitespace.
function normalizeForEcho(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// True when `userText` looks like Hoot's own speech being re-transcribed:
// 3+ words AND a substring of Hoot's recent narration. Single-word and
// two-word barge-ins ("wait", "stop", "explain it simpler") pass through
// regardless, so interruption still works.
function isSelfEchoOfAgent(userText: string, recentAgent: string): boolean {
  const u = normalizeForEcho(userText);
  if (!u) return false;
  const wordCount = u.split(" ").length;
  if (wordCount < 3) return false;
  const a = normalizeForEcho(recentAgent);
  if (!a) return false;
  return a.includes(u);
}

async function fetchToken(): Promise<string> {
  const r = await fetch("/api/token", { cache: "no-store" });
  const data = (await r.json().catch(() => ({}))) as { token?: string; error?: string; details?: string };
  if (!r.ok || !data.token) {
    throw new Error(data.details || data.error || "Could not get conversation token");
  }
  return data.token;
}

async function registerContext(payload: {
  conversationId: string;
  name?: string;
  ageBand?: string;
  language?: string;
  startingContext?: string;
  previousMessages?: { role: "user" | "assistant"; content: string }[];
}): Promise<void> {
  await fetch("/api/voice-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function AskInner({ profile, preset, onClose }: { profile: Profile; preset?: string; onClose: () => void }) {
  const conv = useConversation({
    onConnect: () => setVoiceError(null),
    onDisconnect: (details: { reason?: string; message?: string }) => {
      if (details.reason === "error" && details.message) setVoiceError(details.message);
    },
    onError: (message: string) => setVoiceError(message),
    onMessage: ({ role, message, event_id }: { role: "user" | "agent"; message: string; event_id?: number }) => {
      const content = message.trim();
      if (!content) return;
      // Skip user messages we already added optimistically via sendUserMessage.
      if (role === "user") {
        const idx = pendingSentRef.current.indexOf(content);
        if (idx !== -1) {
          pendingSentRef.current.splice(idx, 1);
          return;
        }
        // Always drop obvious noise.
        if (looksLikeNoise(content)) return;
        // Drop short polite phrases that arrive while / just after Hoot was
        // speaking — overwhelmingly TTS-echo, not real speech from the kid.
        if (looksLikeEchoPhantom(content)) {
          const now = Date.now();
          const speakingNow = conv.mode === "speaking";
          const justStopped = agentSpeakEndRef.current && (now - agentSpeakEndRef.current < 3000);
          if (speakingNow || justStopped) return;
        }
        // Drop self-echo: 3+ word user transcripts that are a substring of
        // Hoot's recent narration. This is the real defense against
        // sentence-level phantoms ("the sky looks blue" coming back through
        // the speakers and being re-transcribed). Short barge-ins ("wait",
        // "stop", "tell me more") are immune because they're under 3 words
        // OR not present verbatim in Hoot's speech — so interruption works.
        if (isSelfEchoOfAgent(content, recentAgentTextRef.current)) return;
      } else if (role === "agent") {
        // Append to the rolling window so we can detect future self-echo.
        const combined = (recentAgentTextRef.current + " " + content).trim();
        recentAgentTextRef.current = combined.slice(-2000);
      }
      const id = event_id != null ? `evt-${role}-${event_id}` : makeId(role);
      setTranscript(prev => {
        const idx = prev.findIndex(m => m.id === id);
        const next = { id, who: role === "agent" ? ("hoot" as const) : ("kid" as const), text: content };
        if (idx === -1) return [...prev, next];
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });
    },
  });

  const [transcript, setTranscript] = useState<Message[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [lang, setLang] = useState<Language>(profile.language);
  // Debounced version of conv.mode. Hoot's TTS often flickers between
  // "speaking" and "listening" between audio chunks of a single turn; we
  // latch "speaking" instantly but delay the transition back to "listening"
  // so the status label doesn't jiggle mid-turn.
  const [stableMode, setStableMode] = useState<"listening" | "speaking">("listening");
  const presetSent = useRef(false);
  const contextRegistered = useRef(false);
  // Number of times startSession has been invoked this screen — 0 means a
  // fresh start (we greet + send the preset), > 0 means a resume (we skip
  // the greeting and seed the agent with previous messages).
  const sessionsStarted = useRef(0);
  // Guards auto-start so it fires at most once per screen mount, even with
  // React Strict Mode double-render.
  const autoStartAttempted = useRef(false);
  // Tracks user messages we sent via sendUserMessage (preset, chips). The
  // agent doesn't reliably echo these back through onMessage, so we add them
  // optimistically to the transcript and use this ref to dedupe if it does.
  const pendingSentRef = useRef<string[]>([]);
  // Echo-window tracking: when Hoot is/was speaking, the kid's mic can pick
  // up Hoot's own TTS through the speakers and Scribe transcribes garbled
  // fragments as short polite phrases ("thank you", "bye", etc.).
  const agentSpeakStartRef = useRef<number | null>(null);
  const agentSpeakEndRef = useRef<number | null>(null);
  // Rolling buffer of Hoot's recent narration text. Used to detect when an
  // incoming user transcript is actually Hoot's own speech being re-heard
  // through the speakers and transcribed back. ~2KB window covers the last
  // ~minute of agent speech.
  const recentAgentTextRef = useRef<string>("");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  // Pre-warmed WebRTC token, so the kid doesn't wait for a network roundtrip
  // between tapping the mic and the agent connecting.
  const tokenCache = useRef<{ token: string; ts: number } | null>(null);

  // Latch speaking immediately; delay transition to listening by 800ms.
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

  // Derived state
  const state: AskState = useMemo(() => {
    if (pendingStart || conv.status === "connecting") return "connecting";
    if (conv.status === "disconnected") return "idle";
    if (stableMode === "speaking") return "speaking";
    return "listening";
  }, [conv.status, stableMode, pendingStart]);

  // Prefetch a conversation token on mount so mic-tap is near-instant.
  // Token is short-lived; if it's stale by tap time we fetch a fresh one.
  useEffect(() => {
    let cancelled = false;
    fetchToken()
      .then(token => {
        if (cancelled) return;
        tokenCache.current = { token, ts: Date.now() };
      })
      .catch(() => { /* prefetch is best-effort */ });
    return () => { cancelled = true; };
  }, []);

  // Auto-start the voice session when the kid lands here from a wonder card
  // (i.e. the URL has ?q=...). One-shot — if it fails (mic denied, no
  // permission) the manual mic-tap path still works.
  useEffect(() => {
    if (!preset) return;
    if (autoStartAttempted.current) return;
    if (conv.status !== "disconnected") return;
    autoStartAttempted.current = true;
    // Small delay so the screen transition completes before the connecting
    // state flashes — keeps the perceived UX smooth.
    const t = window.setTimeout(() => { void startSession(); }, 150);
    return () => window.clearTimeout(t);
    // startSession is intentionally omitted from deps: we want this to fire
    // at most once per mount, and the ref guards re-runs anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, conv.status]);

  // Auto-scroll to the newest message. scrollIntoView walks up to whichever
  // ancestor is the actual scroll container — the window (when the sticky
  // mic-card layout is in play) or the transcript div (when it has bounded
  // height). Either way, the latest bubble comes into view.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript]);

  // Seed the preset bubble immediately on mount so the kid sees their
  // question in the conversation right away — no "tap the mic" placeholder
  // while the WebRTC session is still handshaking.
  useEffect(() => {
    if (!preset) return;
    setTranscript(prev => prev.length === 0 ? [{ id: "preset-seed", who: "kid", text: preset }] : prev);
  }, [preset]);

  // Once the conversation is truly connected, send the preset wonder as the
  // kid's opening turn. Only on the *first* session — on a resume, the
  // preset was already asked earlier and the kid is continuing the chat.
  // The bubble itself was already seeded on mount, so we just dedupe the
  // ElevenLabs echo and fire the message — no second visual add.
  useEffect(() => {
    if (conv.status !== "connected") return;
    if (!preset || presetSent.current) return;
    if (sessionsStarted.current > 1) return;
    presetSent.current = true;
    pendingSentRef.current.push(preset);
    try { conv.sendUserMessage(preset); } catch { /* noop */ }
  }, [conv, conv.status, preset]);

  // Start the session
  const startSession = useCallback(async () => {
    if (conv.status !== "disconnected") return;
    const isResume = sessionsStarted.current > 0;
    sessionsStarted.current += 1;

    setVoiceError(null);
    setPendingStart(true);  // Flip UI to "Connecting…" immediately
    contextRegistered.current = false;
    // Note: presetSent is *not* reset — preset is a one-time thing per screen visit.

    // Snapshot transcript-so-far to seed the resume. Hoot needs the prior
    // turns or it'll greet the kid as if this is a brand-new conversation.
    const previousMessages = isResume
      ? transcript.map(m => ({
          role: (m.who === "kid" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }))
      : [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not available in this browser.");
      }

      // Use the prewarmed token if it's fresh (< 60s). Otherwise fetch one now.
      let token: string;
      const cached = tokenCache.current;
      if (cached && Date.now() - cached.ts < 60_000) {
        token = cached.token;
        tokenCache.current = null;
      } else {
        token = await fetchToken();
      }

      // Firstmessage rules:
      //   - resume: no greeting (the conversation is continuing)
      //   - preset: no greeting (the preset send triggers the agent's first real turn)
      //   - fresh + no preset: warm greeting in the kid's chosen language
      const overrides = isResume || preset
        ? undefined
        : { agent: { firstMessage: buildGreeting(profile.name, lang) } };

      await conv.startSession({
        conversationToken: token,
        ...(overrides ? { overrides } : {}),
        onConversationCreated: (vc: { getId: () => string }) => {
          if (contextRegistered.current) return;
          contextRegistered.current = true;
          const conversationId = vc.getId();
          void registerContext({
            conversationId,
            name: profile.name,
            ageBand: profile.age,
            language: lang,
            startingContext: isResume ? undefined : preset,
            previousMessages: previousMessages.length > 0 ? previousMessages : undefined,
          });
        },
      });
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : "Could not start the conversation.");
    } finally {
      setPendingStart(false);
    }
  }, [conv, lang, preset, profile.age, profile.name, transcript]);

  const stopSession = useCallback(() => {
    try { conv.endSession(); } catch { /* noop */ }
  }, [conv]);

  // Single button: idle → start; any connected state → stop the session.
  const onMicTap = () => {
    if (state === "idle") void startSession();
    else if (state !== "connecting") stopSession();
  };

  const cycleLang = () => {
    const next: Language = lang === "EN" ? "ES" : lang === "ES" ? "HI" : "EN";
    setLang(next);
    updateProfile({ language: next });
  };

  const owlMood: "idle" | "listening" | "talking" =
    state === "listening" ? "listening" : state === "speaking" ? "talking" : "idle";
  const owlAnim =
    state === "listening" ? "hootListen 1.2s ease-in-out infinite"
    : state === "speaking" ? "hootTalk 0.5s ease-in-out infinite"
    : "hootBob 3s ease-in-out infinite";

  const statusLabel: Record<AskState, string> = {
    idle:       "Tap the mic to talk",
    connecting: "Connecting…",
    listening:  "Listening…",
    speaking:   "Hoot is speaking",
  };

  const micBg =
    state === "listening" ? "#FF7FA8"
    : state === "speaking" ? "var(--accent-mint)"
    : "var(--accent-yellow)";

  const handleChip = (chip: string) => {
    if (conv.status !== "connected") return;
    pendingSentRef.current.push(chip);
    setTranscript(prev => [...prev, { id: makeId("chip"), who: "kid", text: chip }]);
    try { conv.sendUserMessage(chip); } catch { /* noop */ }
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }} className="md:!min-h-0">
      {/* Top bar — mobile only */}
      <div className="md:hidden" style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <SmallSquare onClick={onClose} ariaLabel="Close"><IconClose size={20}/></SmallSquare>
        <div style={{ flex: 1, fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 20, color: "var(--ink)", textAlign: "center" }}>
          Ask Hoot
        </div>
        <button onClick={cycleLang} aria-label={`Language: ${lang}`} style={{
          height: 44, padding: "0 14px", borderRadius: 999,
          background: "transparent", border: "2px solid var(--ink)", color: "var(--ink)",
          fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 14,
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
        }}>
          <IconLang size={16}/> {lang}
        </button>
      </div>

      {/* Two-column desktop / single-column mobile */}
      <div className="md:grid md:grid-cols-[420px_1fr] md:gap-7" style={{ flex: 1, padding: "0 20px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {/* LEFT: owl + status + mic — sticky on both viewports so it stays in view as the transcript grows */}
        <div
          className="md:!top-[80px]"
          style={{ position: "sticky", top: 0, alignSelf: "start", zIndex: 5, paddingTop: 8, paddingBottom: 8, background: "var(--bg)" }}
        >
          <Card style={{ padding: 24, textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {state === "listening" && (
                <>
                  <div style={{ position: "absolute", inset: -16, border: "2px solid var(--ink)", borderRadius: "50%", animation: "ringPulse 1.4s ease-out infinite" }}/>
                  <div style={{ position: "absolute", inset: -16, border: "2px solid var(--ink)", borderRadius: "50%", animation: "ringPulse 1.4s ease-out 0.4s infinite" }}/>
                </>
              )}
              <div style={{ animation: owlAnim }}>
                <Hoot size={170} mood={owlMood}/>
              </div>
            </div>
            <div aria-live="polite" style={{ marginTop: 12, fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 20, color: "var(--ink)" }}>
              {statusLabel[state]}
            </div>

            {/* waveform */}
            <div aria-hidden="true" style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 6, opacity: state === "listening" ? 1 : 0.25, transition: "opacity 300ms" }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{
                  width: 4, borderRadius: 2, background: "var(--ink)",
                  height: 8 + ((i * 7) % 26),
                  transformOrigin: "center",
                  animation: state === "listening" ? `wave1 0.8s ${(i*60)%600}ms ease-in-out infinite` : "none",
                }}/>
              ))}
            </div>

            {/* mic button — single control; tap to start when idle, tap to stop when connected */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <button
                onClick={onMicTap}
                aria-pressed={state === "listening" || state === "speaking"}
                aria-label={state === "idle" ? "Start talking to Hoot" : "Stop the conversation"}
                disabled={state === "connecting"}
                style={{
                  width: 84, height: 84, borderRadius: "50%", border: "3px solid var(--ink)",
                  background: micBg,
                  cursor: state === "connecting" ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 5px 0 var(--ink)", transition: "background 200ms",
                }}>
                {state === "idle" ? <IconMic size={40}/> : <IconStop size={36}/>}
              </button>
            </div>

            {/* lang pill (desktop) */}
            <div className="hidden md:flex" style={{ marginTop: 18, justifyContent: "center" }}>
              <button onClick={cycleLang} style={{
                padding: "6px 12px", borderRadius: 999, border: "2px solid var(--ink)",
                background: "transparent", color: "var(--ink)", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 12,
              }}>
                <IconLang size={14}/> {lang}
              </button>
            </div>

            {voiceError && (
              <div role="alert" style={{
                marginTop: 12, fontFamily: "var(--font-nunito)", fontSize: 12, color: "#b91c1c",
                background: "#FEE2E2", border: "2px solid #b91c1c", borderRadius: 12, padding: "8px 12px",
              }}>
                {voiceError}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: transcript */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, marginTop: 14 }} className="md:!mt-0">
          <div className="hidden md:block" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)", marginBottom: 14 }}>
            Conversation
          </div>

          <div
            aria-live="polite"
            style={{
              flex: 1, display: "flex", flexDirection: "column", gap: 10,
              paddingBottom: 12, minHeight: 200,
            }}
          >
            {transcript.length === 0 && !preset && (
              <div style={{
                fontFamily: "var(--font-nunito)", fontSize: 15, color: "var(--ink)",
                opacity: 0.6, textAlign: "center", padding: 24,
              }}>
                Anything you wonder about — animals, space, why your tummy rumbles…
              </div>
            )}
            {transcript.map((m) => (
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
            {/* Sentinel: keeps the latest message in view across re-renders */}
            <div ref={transcriptEndRef} aria-hidden="true" />
          </div>

          {/* Quick chips */}
          {conv.status === "connected" && transcript.length > 0 && (
            <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0 16px", flexWrap: "nowrap" }}>
              {CHIPS.map((c, i) => (
                <button key={c} onClick={() => handleChip(c)} style={{
                  flexShrink: 0, padding: "10px 16px", borderRadius: 999,
                  border: "2px solid var(--ink)", background: "var(--card)",
                  fontFamily: "var(--font-nunito)", fontSize: 13, fontWeight: 700, color: "var(--ink)",
                  cursor: "pointer", animation: `chipPop 0.3s ${i*40}ms ease both`,
                }}>{c}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Ask({ profile, preset, onClose }: { profile: Profile; preset?: string; onClose: () => void }) {
  return (
    <ConversationProvider>
      <AskInner profile={profile} preset={preset} onClose={onClose}/>
    </ConversationProvider>
  );
}
