"use client";

import { AppShell } from "@/components/AppShell";
import { SettingsScreen } from "@/components/screens/Settings";
import { useGate } from "@/components/useProfile";

export default function SettingsPage() {
  const { profile, status } = useGate();
  if (status !== "ready" || !profile) return <div style={{ minHeight: "100dvh", background: "var(--bg)" }}/>;
  return (
    <AppShell>
      <SettingsScreen profile={profile}/>
    </AppShell>
  );
}
