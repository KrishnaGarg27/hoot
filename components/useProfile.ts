"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadProfile, type Profile } from "@/lib/profile";

export type ProfileStatus = "loading" | "missing" | "ready";

export function useProfile(): { profile: Profile | null; status: ProfileStatus } {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("loading");

  useEffect(() => {
    const apply = () => {
      const p = loadProfile();
      setProfile(p);
      setStatus(p ? "ready" : "missing");
    };
    apply();
    window.addEventListener("hoot:profile-changed", apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener("hoot:profile-changed", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return { profile, status };
}

export function useGate(): { profile: Profile | null; status: ProfileStatus } {
  const gate = useProfile();
  const router = useRouter();
  useEffect(() => {
    if (gate.status === "missing") router.replace("/");
  }, [gate.status, router]);
  return gate;
}
