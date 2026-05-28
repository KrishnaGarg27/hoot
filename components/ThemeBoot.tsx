"use client";

import { useEffect } from "react";
import { loadProfile } from "@/lib/profile";

export function ThemeBoot() {
  useEffect(() => {
    const apply = () => {
      const p = loadProfile();
      const theme = p?.theme || "sky";
      document.documentElement.setAttribute("data-theme", theme);
    };
    apply();
    window.addEventListener("hoot:profile-changed", apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener("hoot:profile-changed", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);
  return null;
}
