# Hoot

A voice-first curiosity companion for kids. Hoot is a friendly owl who answers
"why is the sky blue?", explores subjects on demand, and tells real
stories — interactive or just-narrate-to-me — with a kid's choices actually
shaping where the plot goes.

Built from a finished design handoff in [`design_handoff_hoot_app/`](./design_handoff_hoot_app/).

---

## What it does

- **Ask Hoot** — tap the mic, speak any question. Hoot answers conversationally
  with full follow-up context. Voice barge-in works: speak over Hoot and he
  stops mid-sentence.
- **Explore** — 10 subjects (Space, Animals, The Human Body, Dinosaurs, …).
  Each subject shows curated wonder cards. Tap one to start an Ask Hoot
  session pre-loaded with that question.
- **Story** — two flavours:
  - **Interactive** — Hoot narrates a complete story scene by scene, asking
    real questions: branching choices that change the next scene, *and*
    reflective ones ("do you think it was fair?"). Stories are pre-planned
    by GPT-4 before narration starts, so they have a real arc and a real
    ending — not a wandering "and then…".
  - **Listen** — Hoot tells the whole story straight through, ~1–2 min, with
    a satisfying close.
- **Pause / Resume** — stop the story or conversation any time, tap continue,
  and Hoot picks up the *same* story (or same Q&A thread) — same characters,
  same plot, same context.
- **Multilingual** — pick English, Spanish, or Hindi in Settings. Wonder cards,
  story plans, narration, and Q&A all switch language. One TTS voice speaks
  all of them.
- **Themes** — 5 colour palettes the kid can switch in Settings; persists
  via `localStorage`.

## Stack

- **UI**: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind. All
  custom inline-SVG doodle icons — no icon library, no raster assets.
- **Voice**: ElevenLabs **Speech Engine** (bring-your-own-LLM) via
  `@elevenlabs/elevenlabs-js` + `@elevenlabs/react`. STT, TTS, turn-taking,
  and voice-activity-driven interruption all handled by ElevenLabs;
  the LLM call lives on our server.
- **LLM**: OpenAI Responses API, streamed.
  - `gpt-4o-mini` for live voice turns (low latency).
  - `gpt-4o` for story-plan generation (quality matters more there).
- **State**: `localStorage` only (no DB, no auth) — the profile, the theme,
  cached wonder lists.

## Quick start

Full step-by-step including ngrok and engine creation is in
[`SETUP.md`](./SETUP.md). The short version:

```bash
pnpm install
cp .env.example .env          # fill in ELEVENLABS_API_KEY + OPENAI_API_KEY
ngrok http 3001               # terminal 1, leave running
# put the wss://…/ws URL into PUBLIC_WS_URL in .env
pnpm run speech-engine:create # one-time — gets you a seng_… ID for .env
pnpm run speech-engine:server # terminal 2
pnpm run dev                  # terminal 3
```

Open <http://localhost:3000>.

## Architecture

```
   browser                         your machine
   ───────                         ─────────────────────────────
   ┌──────────┐                    ┌─────────────────────────────┐
   │ Next.js  │  WebRTC audio  ┌──▶│  ElevenLabs Speech Engine   │
   │ (React)  │ ◀──────────────┘   │  (STT + TTS + VAD + turns)  │
   └────┬─────┘                    └────────────┬────────────────┘
        │                                       │ /ws (ngrok in dev)
        │ POST /api/token                       ▼
        │ POST /api/voice-context        ┌──────────────┐
        │ POST /api/wonders              │ server.mts   │
        │ POST /api/story-plan           │ (Node WS)    │
        ▼                                └──────┬───────┘
   ┌──────────────────┐                         │ onTranscript(messages, signal)
   │  Next.js API     │ ◀── shared file ──┐     ▼
   │  routes          │     (.cache/      │  ┌──────────────────┐
   │  (api/*)         │      voice-       │  │  OpenAI          │
   └────────┬─────────┘      context.json)│  │  (streamed,      │
            │                              │  │   AbortSignal    │
            ▼                              │  │   for barge-in)  │
   ┌──────────────────┐                    │  └──────────────────┘
   │  OpenAI          │ ◀──────────────────┘
   │  (wonders +      │
   │   story plans)   │
   └──────────────────┘
```

**Voice loop, end to end:**

1. Client requests a WebRTC token from `/api/token`.
2. Client opens an ElevenLabs voice session and POSTs the kid's profile + any
   starting context (preset wonder, story plan) to `/api/voice-context`,
   keyed by the new `conversationId`.
3. ElevenLabs streams the kid's speech to `server.mts` on `/ws`.
4. `server.mts onTranscript` reads the per-session context, builds Hoot's
   system prompt (Q&A or Story flavour), and streams an OpenAI response
   back through `session.sendResponse(stream)`.
5. The `AbortSignal` ElevenLabs provides is forwarded into the OpenAI call,
   so a real voice barge-in cancels the in-flight LLM stream — Hoot stops
   speaking immediately.

Discovery (Explore, Home wonders) and Story all reuse this exact loop —
there is no second voice system.

## Project layout

```
app/
  api/
    story-plan/      POST — generates a structured story outline
    token/           GET  — issues a WebRTC conversation token
    voice-context/   POST — per-session profile + plan + history
    wonders/         POST — generates curated wonder cards
  ask/               /ask  (mic screen)
  explore/           /explore + /explore/[subject]
  story/             /story (chooser + in-story view)
  settings/          /settings (name, age, language, theme)
  layout.tsx, page.tsx, globals.css

components/
  icons/             Inline SVG: Hoot mascot, subject icons, nav glyphs
  primitives.tsx     Card · Pill · SmallSquare · WaveBg · BgWaves
  screens/           One file per screen (Onboarding, Home, Ask, Story, …)
  Nav.tsx            TopNav (md+) + BottomNav (mobile)
  AppShell.tsx       Page chrome (nav + bg waves)
  ThemeBoot.tsx      Applies saved palette to <html data-theme>
  useProfile.ts      Profile hooks + gated route helper

lib/
  hoot-prompt.ts     System prompt templates (Q&A + Story) + plan formatter
  assistant.ts       OpenAI streaming wrapper for live voice turns
  voice-context-store.ts  File-based store shared by Next.js + server.mts
  wonders-client.ts  Client fetch + localStorage cache for wonder cards
  profile.ts         localStorage profile (name, age, theme, language)
  palettes.ts        5 theme palettes
  data.ts            SUBJECTS, seeded WONDERS, HOME_WONDERS

server.mts           Speech Engine WebSocket server (binds /ws on :3001)
scripts/
  create-engine.mts  Upsert the Speech Engine + push tuned config
```

## Multilingual

| Layer | Multilingual? |
|---|---|
| LLM responses (Q&A, story narration) | yes — language is templated into every system prompt |
| Wonder cards (Home + per-subject) | yes — cache key includes language, refetched on switch |
| Story plan + interactive questions | yes — LLM is told to write all prose in target language |
| Opening greeting | yes — localized for EN / ES / HI |
| Voice (TTS) | yes if you set `HOOT_TTS_MODEL_ID=eleven_flash_v2_5` (~32 languages, low latency) |
| Voice (STT) | yes — Scribe auto-detects |
| Static UI strings ("Home", "Settings", etc.) | **no** — hardcoded English. Would need full i18n. |

## Configuration (env vars)

See [`.env.example`](./.env.example) for the full list. Required:

- `ELEVENLABS_API_KEY` — server-only, your ElevenLabs key
- `ELEVENLABS_SPEECH_ENGINE_ID` — `seng_…` from `pnpm run speech-engine:create`
- `OPENAI_API_KEY` — server-only, your OpenAI key
- `PUBLIC_WS_URL` — the public `wss://…/ws` URL the Speech Engine connects to
  (ngrok in dev, a real domain in prod)

Optional:

- `OPENAI_MODEL` — live-voice LLM (default `gpt-4o-mini`)
- `OPENAI_STORY_PLAN_MODEL` — plan generator (default `gpt-4o`)
- `HOOT_VOICE_ID` — any ElevenLabs voice ID (default: engine default)
- `HOOT_TTS_MODEL_ID` — TTS model (default: engine default; set to
  `eleven_flash_v2_5` for low-latency multilingual narration)

After changing voice/model env vars, re-run `pnpm run speech-engine:create` —
it's upsert-aware and updates the existing engine in place.

## Deployment

**Short answer: yes you can deploy on Vercel, but only the Next.js app.
`server.mts` needs to live somewhere that supports long-running
WebSockets — Vercel functions don't.** See [Deployment](#deployment-1)
below for the full options.

## Out of scope (deliberately)

The build was scoped as a hackathon-quality demo. The following are
intentionally left to a later pass:

- Real auth + parent-managed accounts (currently `localStorage` only).
- Parent dashboard / transcript review.
- Server-side content moderation beyond OpenAI's defaults.
- Full UI internationalization (static button labels, screen titles).
- Persistent conversation history across browser sessions.
- Multi-device sync of the kid's profile.

## Deployment

There are two moving pieces in production and they can either share one
host or live separately.

### Piece 1: Next.js app

Static + serverless-route part. **Deploys cleanly on Vercel.**

```bash
# Push to GitHub, then on Vercel:
#   New Project → import repo → set env vars:
#     ELEVENLABS_API_KEY
#     ELEVENLABS_SPEECH_ENGINE_ID
#     OPENAI_API_KEY
#     PUBLIC_WS_URL    ← the public wss URL of your Piece 2 host
#     HOOT_VOICE_ID    (optional)
#     HOOT_TTS_MODEL_ID (optional)
# Deploy.
```

### Piece 2: Speech Engine WS server (`server.mts`)

This is a long-running Node process that ElevenLabs opens a persistent
WebSocket to. **It cannot run on Vercel** — Vercel functions are short-lived
(10 s on Hobby / 60 s on Pro / max ~5 min on serverless), and ElevenLabs needs
the socket open for the whole conversation.

Host it somewhere that supports long-running processes with a stable
public hostname:

- **Railway**, **Fly.io**, **Render**, **Koyeb** — all good fits.
- A small **EC2** / **DigitalOcean droplet** / any always-on box also works.

Setup on that host:

1. Deploy the repo and set the same env vars as Vercel (you only need
   `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_SPEECH_ENGINE_ID`,
   `OPENAI_MODEL`).
2. Run `pnpm run speech-engine:server` (e.g. as the start command).
3. Get the host's public URL (`https://hoot-engine.fly.dev` or similar).
4. Set `PUBLIC_WS_URL=wss://hoot-engine.fly.dev/ws` on **both** Vercel
   *and* this host's env.
5. Run `pnpm run speech-engine:create` once (locally, with the prod
   `PUBLIC_WS_URL` in your `.env`, and `ELEVENLABS_SPEECH_ENGINE_ID`
   either blank to create new or set to update the existing engine) to
   point your engine at the prod URL.

### Storage caveat

The `voice-context-store.ts` writes per-conversation context to a local
JSON file (`.cache/hoot-voice-context.json`). That's fine when Next.js
and `server.mts` run on the same machine. **In split deploys (Vercel +
remote WS host) they can't see each other's filesystem** — you'd need to
swap that store for Redis or Postgres for production. For a demo or
hackathon, the simplest production setup is to deploy *both* pieces on
one host (Railway, Fly, etc.) so the file works.

### Recommended setups

| Scenario | Recommendation |
|---|---|
| Local hackathon demo | localhost + ngrok, as documented in SETUP.md |
| Single-host prod-ish demo | Railway / Fly / Render running both `next start` and `tsx server.mts` |
| Truly serverless prod | Vercel for `next` + a small WS host for `server.mts` + Redis for shared context |

## Security notes

- Both API keys (ElevenLabs + OpenAI) are server-only. They're never
  shipped to the browser. The WebRTC token endpoint mints short-lived
  tokens so the browser only ever holds those.
- `.env` is `.gitignore`d. Don't commit it.
- The runtime voice-context store under `.cache/` is also `.gitignore`d.
- The kid's profile lives in `localStorage` — no PII leaves the device.

## License

Hackathon demo. Use it however you like.
