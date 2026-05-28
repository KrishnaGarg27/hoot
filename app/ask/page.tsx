"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Ask } from "@/components/screens/Ask";
import { useGate } from "@/components/useProfile";

function AskRoute() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("q") || undefined;
  const { profile, status } = useGate();

  if (status !== "ready" || !profile) {
    return <div style={{ minHeight: "100dvh", background: "var(--bg)" }}/>;
  }

  return (
    <AppShell>
      <Ask profile={profile} preset={preset} onClose={() => router.push("/")} />
    </AppShell>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--bg)" }}/>}>
      <AskRoute/>
    </Suspense>
  );
}
