"use client";

import type { HomeWonder, SubjectId } from "./data";

const CACHE_KEY = (
  kind: "home" | "subject",
  subj: SubjectId | undefined,
  ageBand: string,
  language: string,
) => `hoot.wonders.${kind}${subj ? "." + subj : ""}.${ageBand}.${language}`;

type Cache<T> = { v: 1; ts: number; data: T };

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache<T>;
    if (parsed.v !== 1 || !parsed.data) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ v: 1, ts: Date.now(), data }));
  } catch { /* quota or disabled */ }
}

export function loadHomeWonders(ageBand: string, language: string): HomeWonder[] | null {
  return readCache<HomeWonder[]>(CACHE_KEY("home", undefined, ageBand, language));
}

export function saveHomeWonders(ageBand: string, language: string, data: HomeWonder[]): void {
  writeCache(CACHE_KEY("home", undefined, ageBand, language), data);
}

export function loadSubjectWonders(subjectId: SubjectId, ageBand: string, language: string): string[] | null {
  return readCache<string[]>(CACHE_KEY("subject", subjectId, ageBand, language));
}

export function saveSubjectWonders(subjectId: SubjectId, ageBand: string, language: string, data: string[]): void {
  writeCache(CACHE_KEY("subject", subjectId, ageBand, language), data);
}

export async function fetchHomeWonders(args: { ageBand: string; language: string; count?: number; exclude?: string[] }): Promise<HomeWonder[]> {
  const res = await fetch("/api/wonders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "home", ageBand: args.ageBand, language: args.language, count: args.count ?? 5, exclude: args.exclude ?? [] }),
  });
  if (!res.ok) throw new Error("wonders fetch failed");
  const data = (await res.json()) as { wonders?: HomeWonder[] };
  return Array.isArray(data.wonders) ? data.wonders : [];
}

export async function fetchSubjectWonders(args: { subjectId: SubjectId; ageBand: string; language: string; count?: number; exclude?: string[] }): Promise<string[]> {
  const res = await fetch("/api/wonders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "subject",
      subjectId: args.subjectId,
      ageBand: args.ageBand,
      language: args.language,
      count: args.count ?? 6,
      exclude: args.exclude ?? [],
    }),
  });
  if (!res.ok) throw new Error("wonders fetch failed");
  const data = (await res.json()) as { wonders?: { q: string }[] };
  return Array.isArray(data.wonders) ? data.wonders.map(w => w.q).filter(q => typeof q === "string") : [];
}
