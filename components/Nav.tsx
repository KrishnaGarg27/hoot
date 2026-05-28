"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hoot } from "@/components/icons/Hoot";
import { IconAsk, IconExplore, IconHome, IconStory } from "@/components/icons/Nav";
import type { Profile } from "@/lib/profile";

const ITEMS = [
  { id: "home",    label: "Home",     href: "/",        Icon: IconHome },
  { id: "ask",     label: "Ask",      href: "/ask",     Icon: IconAsk },
  { id: "explore", label: "Explore",  href: "/explore", Icon: IconExplore },
  { id: "story",   label: "Story",    href: "/story",   Icon: IconStory },
] as const;

function isActive(current: string, id: string, href: string) {
  if (id === "home") return current === "/";
  return current === href || current.startsWith(href + "/");
}

// ── Top nav (desktop / tablet) ─────────────────────────────
export function TopNav({ current, profile }: { current: string; profile: Profile | null }) {
  const initial = (profile?.name || "H")[0].toUpperCase();
  return (
    <div
      className="hidden md:flex"
      style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--card)", borderBottom: "2px solid var(--ink)",
        alignItems: "center", height: 64, padding: "0 28px",
        boxShadow: "0 4px 0 var(--ink)",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent-yellow)", border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Hoot size={34} mood="idle"/>
        </div>
        <div style={{ fontFamily: "var(--font-fredoka)", fontWeight: 700, fontSize: 26, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Hoot
        </div>
      </Link>
      <div style={{ flex: 1 }}/>
      <div style={{ display: "flex", gap: 4, background: "var(--bg)", padding: 4, borderRadius: 999, border: "2px solid var(--ink)" }}>
        {ITEMS.map(it => {
          const active = isActive(current, it.id, it.href);
          return (
            <Link
              key={it.id}
              href={it.href}
              style={{
                padding: "8px 18px", borderRadius: 999,
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--card)" : "var(--ink)",
                fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 14,
                display: "inline-flex", alignItems: "center", gap: 6,
                textDecoration: "none",
                transition: "background 200ms",
              }}
            >
              <it.Icon size={16} color={active ? "var(--card)" : "var(--ink)"}/>
              {it.label === "Ask" ? "Ask Hoot" : it.label}
            </Link>
          );
        })}
      </div>
      <div style={{ flex: 1 }}/>
      <Link
        href="/settings"
        aria-label="Open settings"
        style={{
          display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 8px 6px 16px",
          background: "var(--bg)", border: "2px solid var(--ink)", borderRadius: 999,
          fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 14, color: "var(--ink)",
          textDecoration: "none",
        }}
      >
        {profile?.name || "Guest"}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--accent-pink)", border: "2px solid var(--ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-fredoka)", fontWeight: 600, fontSize: 14,
        }}>{initial}</div>
      </Link>
    </div>
  );
}

// ── Bottom nav (mobile) ─────────────────────────────────────
export function BottomNav({ current }: { current: string }) {
  const router = useRouter();
  return (
    <nav
      className="flex md:hidden"
      style={{
        position: "fixed",
        left: 14, right: 14, bottom: "calc(14px + env(safe-area-inset-bottom))",
        zIndex: 20,
        background: "var(--card)", border: "2px solid var(--ink)",
        borderRadius: 24, padding: 8,
        justifyContent: "space-around", alignItems: "center",
        boxShadow: "0 4px 0 var(--ink)",
      }}
    >
      {ITEMS.map(it => {
        const active = isActive(current, it.id, it.href);
        return (
          <button
            key={it.id}
            onClick={() => router.push(it.href)}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1, height: 54, border: "none", borderRadius: 18,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--card)" : "var(--ink)",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              transition: "background 200ms, color 200ms",
            }}
          >
            <it.Icon size={22} color={active ? "var(--card)" : "var(--ink)"}/>
            <div style={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 10 }}>{it.label}</div>
          </button>
        );
      })}
    </nav>
  );
}
