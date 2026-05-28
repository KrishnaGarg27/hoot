"use client";

import { useRouter } from "next/navigation";
import { Card, WaveBg } from "@/components/primitives";
import { SubjectIcon } from "@/components/icons/Subjects";
import { SUBJECTS } from "@/lib/data";

export function Explore() {
  const router = useRouter();
  return (
    <>
      {/* ── Mobile ────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ padding: "20px 20px 0" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 32, color: "var(--ink)", lineHeight: 1 }}>Explore</div>
          <div style={{ fontFamily: "var(--font-nunito)", fontSize: 15, color: "var(--ink)", opacity: 0.7, marginTop: 4 }}>
            Pick a subject. Hoot has wonders ready.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SUBJECTS.map((s, i) => {
            const Icon = SubjectIcon[s.id];
            return (
              <Card key={s.id} tint={s.tint} onClick={() => router.push(`/explore/${s.id}`)}
                style={{ padding: 14, minHeight: 130, position: "relative", overflow: "hidden", animation: `chipPop 0.3s ${i*30}ms ease both` }}>
                <WaveBg color="rgba(0,0,0,0.06)" seed={i}/>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Icon size={56}/>
                  <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 15, color: "var(--ink)", marginTop: 8, lineHeight: 1.15 }}>
                    {s.label}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Desktop ───────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 48px 64px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 52, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>Explore</div>
          <div style={{ fontFamily: "var(--font-nunito)", fontSize: 18, color: "var(--ink)", opacity: 0.7, marginTop: 8 }}>
            Pick a subject. Hoot has wonders ready.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {SUBJECTS.map((s, i) => {
            const Icon = SubjectIcon[s.id];
            return (
              <Card key={s.id} tint={s.tint} onClick={() => router.push(`/explore/${s.id}`)}
                style={{ padding: 20, textAlign: "center", position: "relative", overflow: "hidden", animation: `chipPop 0.3s ${i*30}ms ease both`, minHeight: 180 }}>
                <WaveBg color="rgba(0,0,0,0.06)" seed={i}/>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Icon size={72}/>
                  <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 16, color: "var(--ink)", marginTop: 12, lineHeight: 1.15 }}>
                    {s.label}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
