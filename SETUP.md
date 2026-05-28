# Hoot — setup

A voice-first curiosity companion for kids. Next.js (App Router) + TypeScript + Tailwind. Voice is wired through the **ElevenLabs Speech Engine** (bring-your-own-LLM) with **OpenAI** as Hoot's brain.

## Prerequisites

- Node.js 20+
- `pnpm` (or run `npm i -g pnpm`)
- An ElevenLabs account + API key
- An OpenAI account + API key
- An ngrok account + the `ngrok` CLI installed locally (free tier is fine)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```
ELEVENLABS_API_KEY=<your elevenlabs key>
OPENAI_API_KEY=<your openai key>
# Leave these two blank for now — we fill them in steps 3 and 4.
PUBLIC_WS_URL=
ELEVENLABS_SPEECH_ENGINE_ID=
```

## 3. Start ngrok and point it at the speech-engine server

The Speech Engine server runs on port 3001. In a dedicated terminal:

```bash
ngrok http 3001
```

ngrok will print something like:

```
Forwarding   https://abcd-1234-5678.ngrok-free.app -> http://localhost:3001
```

Copy that `https://…ngrok-free.app` and put the **`wss://` version with `/ws`** in `.env`:

```
PUBLIC_WS_URL=wss://abcd-1234-5678.ngrok-free.app/ws
```

(Keep this terminal open. If ngrok restarts you'll get a new URL and need to recreate the engine.)

## 4. Create the Speech Engine

This registers a Speech Engine pointed at your ngrok URL and enables the `firstMessage` override:

```bash
pnpm run speech-engine:create
```

You'll see:

```
Speech Engine ID: seng_xxxxxxxxxxxxxxxxxx
```

Add it to `.env`:

```
ELEVENLABS_SPEECH_ENGINE_ID=seng_xxxxxxxxxxxxxxxxxx
```

## 5. Run the app

You need **three** processes running at the same time:

```bash
# Terminal 1: ngrok (from step 3)
ngrok http 3001

# Terminal 2: Speech Engine server (server.mts) — must run BEFORE you open Ask Hoot
pnpm run speech-engine:server

# Terminal 3: Next.js
pnpm run dev
```

Open http://localhost:3000.

You'll land in onboarding the first time. After that, tap **Ask Hoot** and hit the mic — Hoot will greet you and you can interrupt them mid-sentence by speaking.

## Picking a narrator voice

The narrator's voice is set on the Speech Engine. Default is whatever
ElevenLabs assigns; to swap it set `HOOT_VOICE_ID` in `.env` to any voice
ID from your ElevenLabs voice library:

```
HOOT_VOICE_ID=EXAVITQu4vr4xnSDxMaL   # Bella  — soft, young, female
# HOOT_VOICE_ID=pFZP5JQG7iQjIQuC4Bku  # Lily   — warm, female, child-friendly
# HOOT_VOICE_ID=IKne3meq5aSn9XLyUdCD  # Charlie — warm, male, story-friendly
# HOOT_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel  — calm, female
```

Then re-run `pnpm run speech-engine:create` to push the change to the
existing engine. The same voice works for every language Hoot supports
because the default model is `eleven_multilingual_v2` (~29 languages
including English, Spanish, Hindi). If you want lower latency at the
cost of a slightly less expressive model, set
`HOOT_TTS_MODEL_ID=eleven_flash_v2_5` and re-run the script.

## Multilingual scope

Hoot's voice loop and AI-generated content are fully multilingual:

- **Voice (TTS):** the multilingual model lets one voice speak Spanish,
  Hindi, English, and ~26 others.
- **Voice (STT):** ElevenLabs Scribe auto-detects the spoken language.
- **Hoot's spoken responses:** the language is templated into the system
  prompt every turn, so Hoot answers + narrates in the kid's chosen
  language.
- **Wonder cards** on Home and per subject: regenerated in the kid's
  language. Cache is per-(age × language) so switching language in
  Settings naturally refetches.
- **Story plans + interactive questions:** the LLM is told to write all
  story prose in the target language. Character names are picked to fit
  the language's culture.
- **Opening greeting:** localized for EN / ES / HI.

**Not multilingual (intentional, hackathon scope):** static UI strings
like "Home", "Settings", "Pick a subject", the age-band sub-labels, the
"HOOT NARRATING" tag, etc. These are hardcoded English in the JSX —
swapping to `next-intl` is a real project, not a small fix.

## Architecture notes

- **Voice loop**: ElevenLabs Speech Engine handles STT, TTS, turn-taking, and voice-activity-based interruption. Our LLM lives in `lib/assistant.ts` (OpenAI Responses API, streamed). The `AbortSignal` ElevenLabs passes into `onTranscript` is forwarded into the OpenAI call so interruptions cancel the in-flight LLM request — Hoot stops talking immediately.
- **Context per session**: Age band, language, name, and the optional starting wonder are written to `.cache/hoot-voice-context.json` keyed by `conversationId` (POST `/api/voice-context`), then the speech-engine server reads them in `onTranscript` and templates the Hoot system prompt.
- **No second voice system**: Story and discovery features open the same Ask Hoot loop — there is exactly one voice pipeline.
- **No DB / no auth**: profile lives in `localStorage` only. Multiplayer / parent dashboard / persistence are out of scope for the hackathon demo.
- **Themes**: 5 palettes as CSS variables on `[data-theme="..."]`. Set on `<html>` by `ThemeBoot`, persisted in the profile.

## Troubleshooting

- **"Missing ELEVENLABS_SPEECH_ENGINE_ID"** when starting the server → run step 4 first.
- **Mic permission popup never shows** → browsers require HTTPS for `getUserMedia`. localhost is exempt; if you're testing from another device on your LAN, tunnel through ngrok or use a self-signed cert.
- **"Could not get conversation token"** → check `.env` keys; restart the Next.js dev server after editing `.env`.
- **Hoot won't respond after a turn** → make sure the `speech-engine:server` terminal is still running. The Next.js dev server alone is not enough — `/ws` lives in `server.mts`.
- **ngrok URL changed after restart** → update `PUBLIC_WS_URL` in `.env` and re-run `pnpm run speech-engine:create` (creating a new engine + new ID). The free tier reassigns URLs every restart.
