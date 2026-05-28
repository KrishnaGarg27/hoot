"use client";

import { AppShell } from "@/components/AppShell";
import { Explore } from "@/components/screens/Explore";
import { useGate } from "@/components/useProfile";

export default function ExplorePage() {
  const { status } = useGate();
  if (status !== "ready") return <div style={{ minHeight: "100dvh", background: "var(--bg)" }}/>;
  return (
    <AppShell>
      <Explore/>
    </AppShell>
  );
}
