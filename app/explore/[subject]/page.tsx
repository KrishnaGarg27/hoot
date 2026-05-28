"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { SubjectDetail } from "@/components/screens/SubjectDetail";
import { useGate } from "@/components/useProfile";
import type { SubjectId } from "@/lib/data";

export default function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = use(params);
  const { profile, status } = useGate();
  if (status !== "ready" || !profile) return <div style={{ minHeight: "100dvh", background: "var(--bg)" }}/>;
  return (
    <AppShell>
      <SubjectDetail subjectId={subject as SubjectId} profile={profile}/>
    </AppShell>
  );
}
