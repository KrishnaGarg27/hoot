"use client";

import type { PaletteId } from "./palettes";

export type AgeBand = "4-6" | "7-9" | "10-12" | "13+";
export type Language = "EN" | "ES" | "HI";

export type Profile = {
  name: string;
  age: AgeBand;
  theme: PaletteId;
  language: Language;
};

const KEY = "hoot.profile";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("hoot:profile-changed"));
}

export function updateProfile(patch: Partial<Profile>): Profile | null {
  const current = loadProfile();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveProfile(next);
  return next;
}
