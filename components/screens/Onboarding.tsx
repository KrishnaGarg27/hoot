"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hoot } from "@/components/icons/Hoot";
import { BgWaves, Card, Pill } from "@/components/primitives";
import { PALETTES, PALETTE_ORDER, type PaletteId } from "@/lib/palettes";
import { saveProfile, type AgeBand } from "@/lib/profile";

const AGE_BANDS: { id: AgeBand; label: string; sub: string }[] = [
  { id: "4-6",   label: "4–6",   sub: "Little explorer" },
  { id: "7-9",   label: "7–9",   sub: "Big questions" },
  { id: "10-12", label: "10–12", sub: "Curious mind" },
  { id: "13+",   label: "13+",   sub: "Deep dives" },
];

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState<AgeBand | null>(null);
  const [palette, setPalette] = useState<PaletteId>("sky");

  // Preview the theme as the user picks it
  function pickPalette(id: PaletteId) {
    setPalette(id);
    document.documentElement.setAttribute("data-theme", id);
  }

  function finish() {
    if (!age) return;
    saveProfile({ name: name.trim() || "friend", age, theme: palette, language: "EN" });
    router.replace("/");
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <BgWaves/>

      {/* Huge wordmark backdrop — desktop only */}
      <div
        aria-hidden="true"
        className="hidden md:block"
        style={{
          position: "absolute", top: 20, left: 0, right: 0, textAlign: "center",
          fontFamily: "var(--font-fredoka)", fontWeight: 700, fontSize: 260,
          color: "var(--card)", opacity: 0.5, letterSpacing: "-0.04em", lineHeight: 0.85,
          pointerEvents: "none",
        }}
      >Hoot</div>

      <div
        style={{
          position: "relative", zIndex: 1,
          minHeight: "100dvh",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "32px 20px",
        }}
      >
        <div
          className="w-full max-w-[440px] md:max-w-[720px]"
          style={{
            background: "var(--card)",
            border: "3px solid var(--ink)",
            borderRadius: 28,
            padding: 28,
            boxShadow: "0 8px 0 var(--ink)",
          }}
        >
          {step === 0 && (
            <div className="hoot-fade" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 700, fontSize: 56, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }} className="md:!text-[72px]">
                Hoot
              </div>
              <div style={{ animation: "hootBob 3s ease-in-out infinite" }}>
                <Hoot size={180} mood="idle"/>
              </div>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 30, color: "var(--ink)", lineHeight: 1.1 }} className="md:!text-[44px]">
                Hi! I&apos;m Hoot.
              </div>
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 17, color: "var(--ink)", opacity: 0.78, maxWidth: 460, lineHeight: 1.4 }} className="md:!text-[20px]">
                Ask me anything you wonder about. I&apos;ll tell you stories too, the kind that listen back.
              </div>
              <div style={{ marginTop: 16, width: "100%", maxWidth: 320 }}>
                <Pill full onClick={() => setStep(1)}>Let&apos;s begin →</Pill>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="hoot-fade" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <Hoot size={130} mood="listening"/>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 30, color: "var(--ink)", lineHeight: 1.1 }} className="md:!text-[36px]">
                What should I call you?
              </div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Type your name"
                autoFocus
                aria-label="Your name"
                style={{
                  width: "100%", maxWidth: 400,
                  border: "2px solid var(--ink)", borderRadius: 16, outline: "none",
                  background: "var(--bg)", padding: "16px 22px",
                  fontFamily: "var(--font-nunito)", fontSize: 22, fontWeight: 700,
                  color: "var(--ink)", textAlign: "center",
                }}
              />
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", opacity: 0.7 }}>
                Just a first name is fine.
              </div>
              <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
                <Pill full disabled={!name.trim()} onClick={() => name.trim() && setStep(2)}>Next →</Pill>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="hoot-fade" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Hoot size={110} mood="talking"/>
              <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 28, color: "var(--ink)", lineHeight: 1.1 }} className="md:!text-[32px]">
                How old are you, {name || "friend"}?
              </div>
              <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", opacity: 0.7 }}>
                I&apos;ll match my answers to your age.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, width: "100%", marginTop: 4 }}>
                {AGE_BANDS.map(b => {
                  const active = age === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setAge(b.id)}
                      aria-pressed={active}
                      style={{
                        background: active ? "var(--accent-yellow)" : "var(--card)",
                        border: "2px solid var(--ink)", borderRadius: 18, padding: 18,
                        boxShadow: active ? "0 2px 0 var(--ink)" : "0 4px 0 var(--ink)",
                        transform: active ? "translateY(2px)" : "none",
                        cursor: "pointer", textAlign: "center",
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 700, fontSize: 32, color: "var(--ink)", lineHeight: 1 }}>{b.label}</div>
                      <div style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.7, marginTop: 4 }}>{b.sub}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
                <Pill full disabled={!age} onClick={() => age && setStep(3)}>Next →</Pill>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="hoot-fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ textAlign: "center" }}>
                <Hoot size={90} mood="idle"/>
                <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 26, color: "var(--ink)", marginTop: 4, lineHeight: 1.1 }} className="md:!text-[30px]">
                  Pick a style
                </div>
                <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", opacity: 0.7, marginTop: 4 }}>
                  Choose how Hoot looks. You can change it later in Settings.
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: 10, marginTop: 4 }}>
                {PALETTE_ORDER.map(id => {
                  const p = PALETTES[id];
                  const active = palette === id;
                  return (
                    <button
                      key={id}
                      onClick={() => pickPalette(id)}
                      aria-pressed={active}
                      style={{
                        border: "2.5px solid var(--ink)", borderRadius: 18, padding: 10,
                        background: p.card, cursor: "pointer", textAlign: "left",
                        boxShadow: active ? "0 2px 0 var(--ink)" : "0 5px 0 var(--ink)",
                        transform: active ? "translateY(3px)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", gap: 4, height: 50, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${p.ink}` }}>
                        <div style={{ flex: 2, background: p.bg }}/>
                        <div style={{ flex: 1, background: p.btn }}/>
                        <div style={{ flex: 1, background: p.accentYellow }}/>
                        <div style={{ flex: 1, background: p.accentPink }}/>
                        <div style={{ flex: 1, background: p.accentMint }}/>
                      </div>
                      <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 14, color: p.ink, marginTop: 8, textAlign: "center" }}>
                        {p.name}
                      </div>
                      {active && (
                        <div style={{ fontFamily: "var(--font-nunito)", fontSize: 10, fontWeight: 800, color: p.ink, marginTop: 2, letterSpacing: "0.06em", textAlign: "center" }}>
                          ✓ SELECTED
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <Pill onClick={finish}>Let&apos;s hoot! 🦉</Pill>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
