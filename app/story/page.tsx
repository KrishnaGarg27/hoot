"use client";

import { AppShell } from "@/components/AppShell";
import { Story } from "@/components/screens/Story";
import { useGate } from "@/components/useProfile";

export default function StoryPage() {
  const { profile, status } = useGate();
  if (status !== "ready" || !profile) return <div style={{ minHeight: "100dvh", background: "var(--bg)" }}/>;
  return (
    <AppShell>
      <Story profile={profile}/>
    </AppShell>
  );
}
