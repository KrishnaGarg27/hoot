"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BgWaves } from "@/components/primitives";
import { BottomNav, TopNav } from "@/components/Nav";
import { loadProfile, type Profile } from "@/lib/profile";

export function AppShell({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const pathname = usePathname() || "/";
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const reload = () => setProfile(loadProfile());
    reload();
    window.addEventListener("hoot:profile-changed", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("hoot:profile-changed", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", position: "relative" }}>
      <BgWaves/>
      {!hideNav && <TopNav current={pathname} profile={profile}/>}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          paddingBottom: hideNav ? 0 : "calc(96px + env(safe-area-inset-bottom))",
        }}
        className={hideNav ? "" : "md:!pb-16"}
      >
        {children}
      </main>
      {!hideNav && <BottomNav current={pathname}/>}
    </div>
  );
}
