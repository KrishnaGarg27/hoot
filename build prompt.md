Build a kids' voice-first curiosity app called "Hoot" with Next.js (App Router) + TypeScript + Tailwind. Mobile-first, responsive. This is a hackathon demo, not production: no auth, no database — store the child's profile (name, age band, theme, language) in localStorage. All API keys stay server-side.

#### NON-NEGOTIABLE VOICE REQUIREMENT — READ FIRST
The voice layer MUST use ElevenLabs SPEECH ENGINE — the bring-your-own-LLM product where OUR server runs the conversation logic and ElevenLabs only does speech-to-text, text-to-speech, turn-taking, and interruption.
DO NOT use ElevenLabs Conversational AI / ElevenAgents (the fully hosted agent where ElevenLabs provides the LLM). Hoot's system prompt and the LLM call MUST live in OUR server code. If you find yourself configuring an "Agent" with a prompt in the ElevenLabs dashboard, you are doing it WRONG.

Build on the official primitives — do not hand-roll the voice plumbing:
- Use the official skill: `npx skills add elevenlabs/skills --skill speech-engine`
- Base the project on the official Next.js quickstart: https://github.com/elevenlabs/examples/tree/main/speech-engine/nextjs/quickstart
- Docs: https://elevenlabs.io/docs/overview/capabilities/speech-engine and https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-engine

Speech Engine architecture (follow the quickstart's structure exactly):
1. A Speech Engine instance (engine_id `seng_...`) pointed at our WebSocket server URL. For local dev, expose the server via ngrok and use the `wss://...ngrok.../ws` URL.
2. Server attaches Speech Engine on `/ws`. The transcript callback (`onTranscript`) receives the full conversation history and an AbortSignal. It calls OUR LLM (OpenAI/Anthropic/Gemini — SDK auto-extracts text from their streams) with Hoot's system prompt, and streams the reply back with `sendResponse`.
3. INTERRUPTION: pass the AbortSignal from `onTranscript` into the LLM call so that when the child speaks mid-response, the in-flight LLM request is cancelled and Hoot stops talking immediately. The child must be able to barge in at any time and Hoot must yield. Make this work and make it visible in the UI.
4. Server-side token endpoint returning a WebRTC conversation token (keeps the API key out of the browser).
5. Client uses `@elevenlabs/react` `useConversation`; fetch token; `startSession({ conversationToken })`; use the `firstMessage` override so Hoot greets the child first.

#### STRICT BUILD ORDER — verify each phase RUNS with no errors before moving on
PHASE 1: Stand up the official quickstart voice loop with a placeholder LLM prompt. Confirm I can speak, hear a streamed reply, AND interrupt it mid-sentence. Do not proceed until this works.
PHASE 2: Replace the placeholder with Hoot's real system prompt (provided below) and wire in context injection: age band, language, and optional starting context. Confirm voice still works.
PHASE 3: Build the UI screens incrementally, verifying each renders cleanly before the next. Use the design I provide as the source of truth. Keep components simple and robust over clever.
PHASE 4: Wire the discovery + story features into the same voice loop. Do not build a second voice system.

#### FEATURES
1. ASK HOOT (core): open-ended voice Q&A, full context across follow-ups and tangents, age-band adaptive, supports voice intents "explain it simpler" / "tell me more" / "why?".
2. EXPLORE BY SUBJECT (discovery layer feeding Ask Hoot — NOT a separate voice system): subject tiles (Space, History, Nature & Biology, How Things Work, Body & Mind, Earth, Anything). Tapping a subject shows AI-generated "wonders" with a refresh button; selecting one launches Ask Hoot seeded with that question. Also a small rotating row of suggested wonders on Home.
3. STORY WITH HOOT: child picks "interactive" or "normal." Interactive = Hoot narrates, pauses to ask "What should happen next?", branches on the spoken answer; child can interrupt anytime. Normal = continuous narration, still interruptible.

#### THEME SYSTEM
Multiple visual themes via CSS variables / a theme context (whole app re-skins instantly). Theme chosen during onboarding and changeable in Settings; persisted in localStorage.

#### SCREENS
- Onboarding: Hoot welcome → enter name → choose AGE BAND (4-6, 7-9, 10-12, 13+) → choose THEME.
- Home: "Hi, [name]!" + Hoot; two big cards (Ask Hoot, Story); a row of suggested wonders; entry into Explore; bottom nav.
- Explore by Subject: subject tiles → refreshable per-subject wonders.
- Ask Hoot: large animated Hoot; clearly visible voice states (tap-to-talk, listening waveform, Hoot speaking, INTERRUPT indicator); transcript bubbles; depth chips ("Explain it simpler" / "Tell me more" / "Why?"); language toggle.
- Story with Hoot: interactive-vs-normal choice; in-story narration view with spoken branch prompt and interrupt indicator.
- Settings: change theme, language, name, age band.

#### MULTILINGUAL (bonus, keep simple)
Accept the child's language and have Hoot respond in it with an appropriate ElevenLabs voice.

#### DESIGN
Match this aesthetic exactly — soft sky-blue background, white rounded cards, navy text, sparing yellow/pink/mint accents; big radii, pill buttons, lots of whitespace; bubbly display font for headers, clean sans for body; a doodle SVG owl mascot and a cohesive set of custom doodle SVG icons (never stock emoji).
[Paste/import my finalized design here as the source of truth.]

#### HOOT SYSTEM PROMPT (use verbatim as the server LLM's system instruction)
You are Hoot, a wise, warm, gently funny owl who is a curiosity companion for a child. Your purpose is to nurture wonder and help the child grow their thinking, speaking, and listening — never to replace the people in their life.

CORE PRINCIPLE: Respect the child. NEVER talk down to them. Age changes HOW you explain (vocabulary, sentence length, analogies, how much you scaffold), NOT WHETHER you give a real, honest answer. A curious child can handle real substance. The child's age band is: {AGE_BAND}.

STARTING CONTEXT (optional): The conversation may begin from a subject the child chose or a suggested wonder: {STARTING_CONTEXT}. If present, treat it as a warm invitation — dive straight in with an "ooh, great one!" energy — and then stay open to wherever their curiosity wanders. When it fits, you can offer one related wonder to spark the next question, but keep it brief and let the child lead.

VOICE DISCIPLINE: You are spoken aloud, not read. Keep turns short — usually 2-4 sentences. One idea at a time. For younger bands, even shorter, with occasional "Does that make sense so far?" check-ins. Be conversational, never lecture-y.

ADAPT TO THE CHILD:
- If they seem confused (says "huh?", "what does that mean?", goes quiet), simplify and try a different analogy.
- If they use big words or ask sharp questions, go deeper.
- Honor the intents "explain it simpler", "tell me more", "why?" — let them steer the depth.
- Follow their tangents. Curiosity wandering is the goal, not a distraction.

GUARDRAILS (always):
- Keep all content age-appropriate for {AGE_BAND}. No sexual, violent, graphic, or otherwise unsafe content.
- If asked something not appropriate for their age, gently redirect with warmth and honesty, without shaming the question.
- Encourage real-world connection: nudge them toward friends, family, teachers, and trusted adults. You are a companion, never a substitute for human relationships.
- If a child shares distress (sadness, bullying, fear, something at home), respond with care, validate their feelings, and gently encourage them to talk to a trusted adult they choose. Do not promise secrecy and do not position yourself as their only confidant.
- Encourage healthy habits, including taking breaks from screens.

PERSONALITY: kind, playful, a little whimsical, endlessly curious yourself. You love a good "ooh, great question!" You make learning feel like an adventure.

LANGUAGE: respond in the child's language: {LANGUAGE}.

Keep scope tight — I have limited time. Prioritize a flawless, interruptible Ask Hoot voice loop above all else.