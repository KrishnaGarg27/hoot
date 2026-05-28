"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hoot } from "@/components/icons/Hoot";
import { IconAsk, IconBack, IconLang, IconSparkle } from "@/components/icons/Nav";
import { Card, Pill, SmallSquare } from "@/components/primitives";
import { PALETTES, PALETTE_ORDER, type PaletteId } from "@/lib/palettes";
import { updateProfile, type AgeBand, type Language, type Profile } from "@/lib/profile";

const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: "4-6",   label: "4–6" },
  { id: "7-9",   label: "7–9" },
  { id: "10-12", label: "10–12" },
  { id: "13+",   label: "13+" },
];

const LANGS: { id: Language; label: string }[] = [
  { id: "EN", label: "English" },
  { id: "ES", label: "Español" },
  { id: "HI", label: "हिन्दी" },
];

// ── Small editable-row primitives ─────────────────────────────

function RowShell({
  Icon, label, children,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, border: "2px solid var(--ink)",
          background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={20}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{label}</div>
          <div style={{ marginTop: 8 }}>{children}</div>
        </div>
      </div>
    </Card>
  );
}

function NameRow({ profile }: { profile: Profile }) {
  // Local draft so typing doesn't lose focus on every persist.
  const [draft, setDraft] = useState(profile.name);
  // Resync if the profile changes externally (e.g. after re-onboarding).
  useEffect(() => { setDraft(profile.name); }, [profile.name]);

  const commit = () => {
    const next = draft.trim().slice(0, 80);
    if (!next) { setDraft(profile.name); return; }
    if (next !== profile.name) updateProfile({ name: next });
  };

  return (
    <RowShell Icon={IconAsk} label="Name">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
        aria-label="Your name"
        maxLength={80}
        style={{
          width: "100%", border: "2px solid var(--ink)", borderRadius: 12,
          background: "var(--card)", padding: "10px 14px",
          fontFamily: "var(--font-nunito)", fontSize: 15, fontWeight: 700, color: "var(--ink)",
          outline: "none",
        }}
      />
    </RowShell>
  );
}

function AgeRow({ profile }: { profile: Profile }) {
  return (
    <RowShell Icon={IconSparkle} label="Age band">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {AGE_BANDS.map(b => {
          const active = profile.age === b.id;
          return (
            <button
              key={b.id}
              onClick={() => { if (!active) updateProfile({ age: b.id }); }}
              aria-pressed={active}
              style={{
                padding: "8px 14px", borderRadius: 999, border: "2px solid var(--ink)",
                background: active ? "var(--accent-yellow)" : "var(--card)",
                color: "var(--ink)", cursor: "pointer",
                fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 14,
                boxShadow: active ? "0 2px 0 var(--ink)" : "0 3px 0 var(--ink)",
                transform: active ? "translateY(1px)" : "none",
              }}
            >{b.label}</button>
          );
        })}
      </div>
    </RowShell>
  );
}

function LanguageRow({ profile }: { profile: Profile }) {
  return (
    <RowShell Icon={IconLang} label="Language">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {LANGS.map(l => {
          const active = profile.language === l.id;
          return (
            <button
              key={l.id}
              onClick={() => { if (!active) updateProfile({ language: l.id }); }}
              aria-pressed={active}
              style={{
                padding: "8px 14px", borderRadius: 999, border: "2px solid var(--ink)",
                background: active ? "var(--accent-yellow)" : "var(--card)",
                color: "var(--ink)", cursor: "pointer",
                fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 14,
                boxShadow: active ? "0 2px 0 var(--ink)" : "0 3px 0 var(--ink)",
                transform: active ? "translateY(1px)" : "none",
              }}
            >{l.label}</button>
          );
        })}
      </div>
    </RowShell>
  );
}

// ── Screen ───────────────────────────────────────────────────

export function SettingsScreen({ profile }: { profile: Profile }) {
  const router = useRouter();

  function pickPalette(id: PaletteId) {
    if (profile.theme === id) return;
    document.documentElement.setAttribute("data-theme", id);
    updateProfile({ theme: id });
  }

  return (
    <>
      {/* ── Mobile ────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <SmallSquare onClick={() => router.push("/")} ariaLabel="Back"><IconBack size={20}/></SmallSquare>
          <div style={{ flex: 1, fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 22, color: "var(--ink)" }}>Settings</div>
        </div>

        <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--accent-yellow)", border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Hoot size={46} mood="idle"/>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 20, color: "var(--ink)", lineHeight: 1 }}>{profile.name}</div>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 13, color: "var(--ink)", opacity: 0.7, marginTop: 4 }}>Age band: {profile.age}</div>
          </div>
        </Card>

        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 16, color: "var(--ink)", marginTop: 6, marginBottom: 8 }}>Theme</div>
        <Card style={{ padding: 12, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PALETTE_ORDER.map(id => {
              const p = PALETTES[id];
              const active = profile.theme === id;
              return (
                <button key={id} onClick={() => pickPalette(id)} aria-pressed={active}
                  style={{
                    border: `2px solid ${p.ink}`, borderRadius: 14, padding: 8,
                    background: p.card, cursor: "pointer", textAlign: "left",
                    boxShadow: active ? `inset 0 0 0 2px ${p.ink}` : "none",
                  }}>
                  <div style={{ display: "flex", gap: 3, height: 28, borderRadius: 6, overflow: "hidden", border: `1px solid ${p.ink}` }}>
                    <div style={{ flex: 2, background: p.bg }}/>
                    <div style={{ flex: 1, background: p.btn }}/>
                    <div style={{ flex: 1, background: p.accentYellow }}/>
                    <div style={{ flex: 1, background: p.accentPink }}/>
                  </div>
                  <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 13, color: p.ink, marginTop: 6 }}>{p.name}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 16, color: "var(--ink)", marginBottom: 8 }}>Profile</div>
        <NameRow profile={profile}/>
        <AgeRow profile={profile}/>
        <LanguageRow profile={profile}/>
      </div>

      {/* ── Desktop ───────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ maxWidth: 800, margin: "0 auto", padding: "36px 48px 64px" }}>
        <Pill variant="soft" onClick={() => router.push("/")} style={{ marginBottom: 22 }}>← Back</Pill>
        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 40, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 22 }}>Settings</div>

        <Card style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--accent-yellow)", border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Hoot size={52} mood="idle"/>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>{profile.name}</div>
            <div style={{ fontFamily: "var(--font-nunito)", fontSize: 14, color: "var(--ink)", opacity: 0.7, marginTop: 4 }}>Age band: {profile.age}</div>
          </div>
        </Card>

        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 20, color: "var(--ink)", marginBottom: 12 }}>Theme</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
          {PALETTE_ORDER.map(id => {
            const p = PALETTES[id];
            const active = profile.theme === id;
            return (
              <button key={id} onClick={() => pickPalette(id)} aria-pressed={active}
                style={{
                  border: "2.5px solid var(--ink)", borderRadius: 18, padding: 12,
                  background: p.card, cursor: "pointer", textAlign: "center",
                  boxShadow: active ? "0 2px 0 var(--ink)" : "0 5px 0 var(--ink)",
                  transform: active ? "translateY(3px)" : "none",
                }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, height: 70, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${p.ink}` }}>
                  <div style={{ flex: 2, background: p.bg, position: "relative" }}>
                    <div style={{ position: "absolute", right: 6, bottom: 6, width: 14, height: 14, borderRadius: "50%", background: p.btn, border: `1px solid ${p.ink}` }}/>
                  </div>
                  <div style={{ flex: 1, display: "flex", gap: 3, padding: 3 }}>
                    <div style={{ flex: 1, background: p.accentYellow, borderRadius: 4 }}/>
                    <div style={{ flex: 1, background: p.accentPink, borderRadius: 4 }}/>
                    <div style={{ flex: 1, background: p.accentMint, borderRadius: 4 }}/>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 13, color: p.ink, marginTop: 8 }}>{p.name}</div>
                {active && (
                  <div style={{ fontFamily: "var(--font-nunito)", fontSize: 9, fontWeight: 800, color: p.ink, marginTop: 2, letterSpacing: "0.06em" }}>
                    ✓ SELECTED
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 20, color: "var(--ink)", marginBottom: 12 }}>Profile</div>
        <NameRow profile={profile}/>
        <AgeRow profile={profile}/>
        <LanguageRow profile={profile}/>
      </div>
    </>
  );
}
