// File-based store shared between the Next.js process (writes context)
// and the Speech Engine server process (reads context) — both run on the
// same machine in development.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { HootContext } from "./hoot-prompt";

const STORE_FILE = ".cache/hoot-voice-context.json";

type Store = {
  contexts: Record<string, HootContext>;
};

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { contexts: parsed.contexts ?? {} };
  } catch {
    return { contexts: {} };
  }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store), "utf8");
}

export async function saveVoiceContext(conversationId: string, ctx: HootContext): Promise<void> {
  const store = await readStore();
  store.contexts[conversationId] = ctx;
  await writeStore(store);
}

export async function loadVoiceContext(conversationId: string): Promise<HootContext | null> {
  const store = await readStore();
  return store.contexts[conversationId] ?? null;
}
