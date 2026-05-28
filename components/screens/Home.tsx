"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Hoot } from "@/components/icons/Hoot";
import { IconRefresh, IconSettings } from "@/components/icons/Nav";
import { SubjectIcon } from "@/components/icons/Subjects";
import { Card, Pill, SmallSquare, WaveBg } from "@/components/primitives";
import { HOME_WONDERS, SUBJECTS, findSubject, type HomeWonder } from "@/lib/data";
import type { Profile } from "@/lib/profile";
import { fetchHomeWonders, loadHomeWonders, saveHomeWonders } from "@/lib/wonders-client";

export function Home({ profile }: { profile: Profile }) {
  const router = useRouter();

  // Wonders: cache → fetch on first paint per (age band). Seed data is the
  // synchronous initial render so the page is never empty.
  const [wonders, setWonders] = useState<HomeWonder[]>(HOME_WONDERS.slice(0, 5));
  const [loadingWonders, setLoadingWonders] = useState(false);
  const wondersRef = useRef(wonders);
  wondersRef.current = wonders;

  useEffect(() => {
    const cached = loadHomeWonders(profile.age, profile.language);
    if (cached && cached.length > 0) { setWonders(cached); return; }
    // No cache for this age band — fetch fresh in the background.
    let cancelled = false;
    setLoadingWonders(true);
    fetchHomeWonders({ ageBand: profile.age, language: profile.language, count: 5 })
      .then(fresh => {
        if (cancelled || fresh.length === 0) return;
        setWonders(fresh);
        saveHomeWonders(profile.age, profile.language, fresh);
      })
      .catch(() => { /* keep seed; offline or API failure */ })
      .finally(() => { if (!cancelled) setLoadingWonders(false); });
    return () => { cancelled = true; };
  }, [profile.age, profile.language]);

  const refreshWonders = async () => {
    if (loadingWonders) return;
    setLoadingWonders(true);
    try {
      const exclude = wondersRef.current.map(w => w.q);
      const fresh = await fetchHomeWonders({ ageBand: profile.age, language: profile.language, count: 5, exclude });
      if (fresh.length > 0) {
        setWonders(fresh);
        saveHomeWonders(profile.age, profile.language, fresh);
      }
    } catch {
      /* keep existing */
    } finally {
      setLoadingWonders(false);
    }
  };

  function askWonder(q: string) {
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      {/* ── Mobile layout ─────────────────────────────────────── */}
      <div className="md:hidden" style={{ padding: "20px 20px 0", position: "relative" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, background: "var(--card)",
            border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <Hoot size={42} mood="idle"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.7, fontWeight: 600 }}>Hi there,</div>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>
              {profile.name}!
            </div>
          </div>
          <SmallSquare onClick={() => router.push("/settings")} ariaLabel="Open settings">
            <IconSettings size={22}/>
          </SmallSquare>
        </div>

        {/* Two hero cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          <Card onClick={() => router.push("/ask")} tint="var(--accent-pink-soft)"
            ariaLabel="Open Ask Hoot"
            style={{ padding: 14, minHeight: 170, position: "relative", overflow: "hidden" }}>
            <WaveBg color="var(--accent-pink)" seed={0} opacity={0.55}/>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)", lineHeight: 1, marginBottom: 6 }}>Ask Hoot</div>
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.75 }}>Wonder out loud</div>
            </div>
            <div style={{ position: "absolute", right: -8, bottom: -10, zIndex: 1 }}>
              <Hoot size={100} mood="listening"/>
            </div>
          </Card>

          <Card onClick={() => router.push("/story")} tint="var(--accent-mint-soft)"
            ariaLabel="Open Story Time"
            style={{ padding: 14, minHeight: 170, position: "relative", overflow: "hidden" }}>
            <WaveBg color="var(--accent-mint)" seed={1} opacity={0.7}/>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)", lineHeight: 1, marginBottom: 6 }}>Story Time</div>
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.75 }}>Listen or play along</div>
            </div>
            <svg viewBox="0 0 100 80" width="120" height="96" aria-hidden="true" style={{ position: "absolute", right: -10, bottom: -8, zIndex: 1 }}>
              <path d="M8 22 q24-6 42 4 q18-10 42-4 v44 q-24-6-42 4 q-18-10-42-4z" fill="#fff" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round"/>
              <path d="M50 26 v44" stroke="var(--ink)" strokeWidth="2.4"/>
              <path d="M16 32 q12 0 22 3 M16 40 q12 0 22 3 M16 48 q12 0 20 3" stroke="var(--ink)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
              <path d="M84 32 q-12 0-22 3 M84 40 q-12 0-22 3 M84 48 q-12 0-22 3" stroke="var(--ink)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            </svg>
          </Card>
        </div>

        {/* Wonders */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 20, color: "var(--ink)" }}>
            ✨ Wonders for you
          </div>
          <SmallSquare onClick={refreshWonders} size={36} ariaLabel="Refresh wonders"
            style={{ opacity: loadingWonders ? 0.5 : 1, pointerEvents: loadingWonders ? "none" : undefined }}>
            <IconRefresh size={18}/>
          </SmallSquare>
        </div>
        <div className="no-scrollbar" style={{ display: "flex", gap: 12, overflowX: "auto", margin: "0 -20px", padding: "4px 20px 12px", opacity: loadingWonders ? 0.6 : 1, transition: "opacity 200ms" }}>
          {wonders.map((w, i) => {
            const subj = findSubject(w.subj)!;
            const Icon = SubjectIcon[subj.id];
            return (
              <Card key={w.q} onClick={() => askWonder(w.q)} tint={subj.tint}
                style={{ minWidth: 200, flexShrink: 0, padding: 14, position: "relative", overflow: "hidden", animation: `chipPop 0.3s ${i*40}ms ease both` }}>
                <WaveBg color="rgba(0,0,0,0.06)" seed={i}/>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Icon size={36}/>
                  <div style={{ fontFamily: "var(--font-nunito)", fontSize: 15, fontWeight: 700, color: "var(--ink)", marginTop: 8, lineHeight: 1.25 }}>{w.q}</div>
                  <div style={{ fontFamily: "var(--font-nunito)", fontSize: 12, color: "var(--ink)", opacity: 0.65, marginTop: 6 }}>Tap to ask Hoot</div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Subjects */}
        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 20, color: "var(--ink)", marginTop: 18, marginBottom: 10 }}>
          Pick a subject
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {SUBJECTS.slice(0, 6).map((s, i) => {
            const Icon = SubjectIcon[s.id];
            return (
              <Card key={s.id} tint={s.tint} onClick={() => router.push(`/explore/${s.id}`)}
                style={{ padding: 10, textAlign: "center", minHeight: 92, position: "relative", overflow: "hidden" }}>
                <WaveBg color="rgba(0,0,0,0.05)" seed={i}/>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Icon size={44}/>
                  <div style={{ fontFamily: "var(--font-nunito)", fontSize: 11, fontWeight: 700, color: "var(--ink)", marginTop: 4, lineHeight: 1.1 }}>
                    {s.shortLabel}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 12, marginBottom: 8 }}>
          <Pill variant="soft" onClick={() => router.push("/explore")}>See all subjects →</Pill>
        </div>
      </div>

      {/* ── Desktop layout ────────────────────────────────────── */}
      <div className="hidden md:block" style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 48px 64px" }}>
        {/* Greeting + hero owl */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 36, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 16, color: "var(--ink)", opacity: 0.7, fontWeight: 600 }}>Welcome back,</div>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 64, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              Hi, {profile.name}!
            </div>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 18, color: "var(--ink)", opacity: 0.78, marginTop: 12, maxWidth: 460, lineHeight: 1.4 }}>
              Got a question on your mind? Ask out loud and I&apos;ll do my best to explain.
            </div>
          </div>
          <div style={{ animation: "hootBob 3s ease-in-out infinite" }}>
            <Hoot size={170} mood="talking"/>
          </div>
        </div>

        {/* Two hero cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 32 }}>
          <Card onClick={() => router.push("/ask")} tint="var(--accent-pink-soft)"
            ariaLabel="Open Ask Hoot"
            style={{ padding: 24, position: "relative", overflow: "hidden", minHeight: 180 }}>
            <WaveBg color="var(--accent-pink)" seed={0} opacity={0.55}/>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 32, color: "var(--ink)", lineHeight: 1 }}>Ask Hoot</div>
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 16, color: "var(--ink)", opacity: 0.75, marginTop: 6, maxWidth: 280 }}>
                Wonder out loud. Hoot listens, answers, plays back.
              </div>
              <div style={{ marginTop: 18 }}>
                <Pill onClick={() => router.push("/ask")}>Start a question</Pill>
              </div>
            </div>
            <div style={{ position: "absolute", right: 8, bottom: -10, zIndex: 1 }}>
              <Hoot size={130} mood="listening"/>
            </div>
          </Card>

          <Card onClick={() => router.push("/story")} tint="var(--accent-mint-soft)"
            ariaLabel="Open Story Time"
            style={{ padding: 24, position: "relative", overflow: "hidden", minHeight: 180 }}>
            <WaveBg color="var(--accent-mint)" seed={1} opacity={0.7}/>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 32, color: "var(--ink)", lineHeight: 1 }}>Story Time</div>
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 16, color: "var(--ink)", opacity: 0.75, marginTop: 6, maxWidth: 320 }}>
                Listen or play along. Hoot will follow your choices.
              </div>
              <div style={{ marginTop: 18 }}>
                <Pill onClick={() => router.push("/story")}>Tell me a story</Pill>
              </div>
            </div>
            <svg viewBox="0 0 140 100" width="160" height="120" aria-hidden="true" style={{ position: "absolute", right: 12, bottom: 12, zIndex: 1 }}>
              <path d="M10 28 q30-8 60 4 q30-12 60-4 v54 q-30-8-60 4 q-30-12-60-4z" fill="#fff" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round"/>
              <path d="M70 32 v54" stroke="var(--ink)" strokeWidth="2.6"/>
              <path d="M20 40 q14 0 26 3 M20 50 q14 0 26 3 M20 60 q14 0 24 3" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M120 40 q-14 0-26 3 M120 50 q-14 0-26 3 M120 60 q-14 0-26 3" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </Card>
        </div>

        {/* Wonders */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)" }}>✨ Wonders for you</div>
            <div style={{ flex: 1 }}/>
            <Pill variant="soft" onClick={refreshWonders} disabled={loadingWonders}>
              <IconRefresh size={16}/> {loadingWonders ? "Loading…" : "New wonders"}
            </Pill>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, opacity: loadingWonders ? 0.6 : 1, transition: "opacity 200ms" }}>
            {wonders.map((w, i) => {
              const subj = findSubject(w.subj)!;
              const Icon = SubjectIcon[subj.id];
              return (
                <Card key={w.q} onClick={() => askWonder(w.q)} tint={subj.tint}
                  style={{ padding: 14, position: "relative", overflow: "hidden", animation: `chipPop 0.3s ${i*50}ms ease both` }}>
                  <WaveBg color="rgba(0,0,0,0.06)" seed={i}/>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <Icon size={42}/>
                    <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginTop: 10, lineHeight: 1.3 }}>{w.q}</div>
                    <div style={{ fontFamily: "var(--font-nunito)", fontSize: 11, color: "var(--ink)", opacity: 0.65, marginTop: 8 }}>Ask Hoot →</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Subjects */}
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)" }}>Explore by subject</div>
            <div style={{ flex: 1 }}/>
            <Pill variant="soft" onClick={() => router.push("/explore")}>See all 10 →</Pill>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
            {SUBJECTS.slice(0, 5).map((s, i) => {
              const Icon = SubjectIcon[s.id];
              return (
                <Card key={s.id} tint={s.tint} onClick={() => router.push(`/explore/${s.id}`)}
                  style={{ padding: 16, textAlign: "center", position: "relative", overflow: "hidden", animation: `chipPop 0.3s ${i*40}ms ease both` }}>
                  <WaveBg color="rgba(0,0,0,0.06)" seed={i+1}/>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <Icon size={64}/>
                    <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 14, color: "var(--ink)", marginTop: 10, lineHeight: 1.15 }}>
                      {s.label}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
