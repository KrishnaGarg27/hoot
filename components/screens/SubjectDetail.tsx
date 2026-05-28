"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconBack, IconChevron, IconRefresh, IconSparkle } from "@/components/icons/Nav";
import { SubjectIcon } from "@/components/icons/Subjects";
import { Card, Pill, SmallSquare, WaveBg } from "@/components/primitives";
import { WONDERS, findSubject, type SubjectId } from "@/lib/data";
import type { Profile } from "@/lib/profile";
import { fetchSubjectWonders, loadSubjectWonders, saveSubjectWonders } from "@/lib/wonders-client";

export function SubjectDetail({ subjectId, profile }: { subjectId: SubjectId; profile: Profile }) {
  const router = useRouter();
  const subj = findSubject(subjectId);

  const seedWonders = subj ? WONDERS[subj.id] : [];
  const [wonders, setWonders] = useState<string[]>(seedWonders);
  const [loading, setLoading] = useState(false);
  const wondersRef = useRef(wonders);
  wondersRef.current = wonders;

  useEffect(() => {
    if (!subj) return;
    const cached = loadSubjectWonders(subj.id, profile.age, profile.language);
    if (cached && cached.length > 0) { setWonders(cached); return; }
    let cancelled = false;
    setLoading(true);
    fetchSubjectWonders({ subjectId: subj.id, ageBand: profile.age, language: profile.language, count: 6 })
      .then(fresh => {
        if (cancelled || fresh.length === 0) return;
        setWonders(fresh);
        saveSubjectWonders(subj.id, profile.age, profile.language, fresh);
      })
      .catch(() => { /* keep seed */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subj, profile.age, profile.language]);

  const refresh = async () => {
    if (!subj || loading) return;
    setLoading(true);
    try {
      const exclude = wondersRef.current;
      const fresh = await fetchSubjectWonders({ subjectId: subj.id, ageBand: profile.age, language: profile.language, count: 6, exclude });
      if (fresh.length > 0) {
        setWonders(fresh);
        saveSubjectWonders(subj.id, profile.age, profile.language, fresh);
      }
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  };

  if (!subj) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-fredoka)", fontSize: 24, color: "var(--ink)" }}>Subject not found.</div>
        <div style={{ marginTop: 16 }}>
          <Pill variant="soft" onClick={() => router.push("/explore")}>← Back to explore</Pill>
        </div>
      </div>
    );
  }

  const Icon = SubjectIcon[subj.id];

  return (
    <>
      {/* ── Mobile ────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <SmallSquare onClick={() => router.push("/explore")} ariaLabel="Back"><IconBack size={20}/></SmallSquare>
          <div style={{ flex: 1 }}/>
          <SmallSquare onClick={refresh} ariaLabel="Refresh wonders"
            style={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? "none" : undefined }}>
            <IconRefresh size={20}/>
          </SmallSquare>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <Card tint={subj.tint} style={{ padding: 10, position: "relative", overflow: "hidden" }}>
            <WaveBg color="rgba(0,0,0,0.08)" seed={2}/>
            <div style={{ position: "relative", zIndex: 1 }}>
              <Icon size={72}/>
            </div>
          </Card>
          <div>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 24, color: "var(--ink)", lineHeight: 1.05 }}>
              {subj.label}
            </div>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.7, marginTop: 4 }}>
              {loading ? "Cooking up fresh wonders…" : `${wonders.length} wonders waiting`}
            </div>
          </div>
        </div>

        <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 200ms" }}>
          {wonders.map((q, i) => (
            <Card key={q} onClick={() => router.push(`/ask?q=${encodeURIComponent(q)}`)}
              style={{ padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, animation: `chipPop 0.3s ${i*40}ms ease both` }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: subj.tint,
                border: "2px solid var(--ink)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 16, color: "var(--ink)",
              }}>?</div>
              <div style={{ flex: 1, fontFamily: "var(--font-nunito)", fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>
                {q}
              </div>
              <IconChevron size={18}/>
            </Card>
          ))}

          <Card tint="var(--accent-yellow)" onClick={refresh}
            style={{ padding: 16, textAlign: "center", marginTop: 10, opacity: loading ? 0.7 : 1 }}>
            <IconSparkle size={28}/>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 18, color: "var(--ink)", marginTop: 4 }}>
              {loading ? "Loading…" : "Show me more wonders"}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Desktop ───────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 48px 64px" }}>
        <Pill variant="soft" onClick={() => router.push("/explore")} style={{ marginBottom: 22 }}>← All subjects</Pill>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 30 }}>
          <Card tint={subj.tint} style={{ padding: 16, position: "relative", overflow: "hidden" }}>
            <WaveBg color="rgba(0,0,0,0.08)" seed={3}/>
            <div style={{ position: "relative", zIndex: 1 }}>
              <Icon size={110}/>
            </div>
          </Card>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 44, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>{subj.label}</div>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 16, color: "var(--ink)", opacity: 0.7, marginTop: 8 }}>
              {loading ? "Cooking up fresh wonders…" : `${wonders.length} wonders waiting. Tap any to ask Hoot.`}
            </div>
          </div>
          <Pill variant="soft" onClick={refresh} disabled={loading}>
            <IconRefresh size={16}/> {loading ? "Loading…" : "Refresh"}
          </Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, opacity: loading ? 0.6 : 1, transition: "opacity 200ms" }}>
          {wonders.map((q, i) => (
            <Card key={q} onClick={() => router.push(`/ask?q=${encodeURIComponent(q)}`)}
              style={{ padding: 20, display: "flex", alignItems: "center", gap: 14, animation: `chipPop 0.3s ${i*40}ms ease both` }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: subj.tint,
                border: "2px solid var(--ink)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 18, color: "var(--ink)",
              }}>?</div>
              <div style={{ flex: 1, fontFamily: "var(--font-nunito)", fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{q}</div>
              <IconChevron size={20}/>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
