"use client";

import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/screens/Onboarding";
import { Home } from "@/components/screens/Home";
import { useProfile } from "@/components/useProfile";

export default function RootPage() {
  const { profile, status } = useProfile();

  if (status === "loading") {
    return <div style={{ minHeight: "100dvh", background: "var(--bg)" }}/>;
  }

  if (status === "missing" || !profile) {
    return <Onboarding/>;
  }

  return (
    <AppShell>
      <Home profile={profile}/>
    </AppShell>
  );
}
