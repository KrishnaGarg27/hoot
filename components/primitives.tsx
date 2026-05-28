"use client";

import type { CSSProperties, ReactNode } from "react";

// ─── Pill button ──────────────────────────────────────────────
export type PillVariant = "primary" | "ghost" | "soft";

export function Pill({
  children,
  onClick,
  variant = "primary",
  style,
  full,
  type = "button",
  disabled,
  ariaPressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: PillVariant;
  style?: CSSProperties;
  full?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaPressed?: boolean;
}) {
  const variants: Record<PillVariant, CSSProperties> = {
    primary: { background: "var(--btn)", color: "var(--btn-ink)" },
    ghost:   { background: "transparent", color: "var(--ink)" },
    soft:    { background: "var(--card)", color: "var(--ink)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={ariaPressed}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "14px 22px",
        borderRadius: 999,
        fontFamily: "var(--font-nunito), system-ui",
        fontSize: 17,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        border: "2px solid var(--ink)",
        boxShadow: "0 4px 0 var(--ink)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        width: full ? "100%" : undefined,
        opacity: disabled ? 0.5 : 1,
        ...variants[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(2px)";
        e.currentTarget.style.boxShadow = "0 2px 0 var(--ink)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
      }}
    >
      {children}
    </button>
  );
}

// ─── Card with chunky shadow ──────────────────────────────────
export function Card({
  children,
  style,
  onClick,
  tint,
  ariaLabel,
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  tint?: string;
  ariaLabel?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick as () => void}
      aria-label={ariaLabel}
      style={{
        background: tint || "var(--card)",
        border: "2px solid var(--ink)",
        borderRadius: 22,
        padding: 16,
        boxShadow: "0 4px 0 var(--ink)",
        cursor: onClick ? "pointer" : undefined,
        textAlign: "left",
        font: "inherit",
        color: "inherit",
        width: onClick ? "100%" : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

// ─── Small square icon button ─────────────────────────────────
export function SmallSquare({
  children,
  onClick,
  active,
  size = 44,
  style,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  size?: number;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--card)" : "var(--ink)",
        border: "2px solid var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Wave background overlay (on hero cards) ─────────────────
export function WaveBg({ color, seed = 0, opacity = 1 }: { color: string; seed?: number; opacity?: number }) {
  const shapes = [
    "M 0 110 Q 80 70 160 100 T 320 90 L 320 180 L 0 180 Z",
    "M 0 130 Q 100 80 200 120 T 320 110 L 320 180 L 0 180 Z",
    "M 0 100 Q 60 130 140 100 T 320 120 L 320 180 L 0 180 Z",
    "M 0 120 Q 120 90 220 130 T 320 100 L 320 180 L 0 180 Z",
  ];
  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity,
      }}
    >
      <path d={shapes[seed % shapes.length]} fill={color} />
    </svg>
  );
}

// ─── Full-screen background flowing waves ─────────────────────
export function BgWaves({ tone, variant = "soft" }: { tone?: string; variant?: "soft" | "stage" }) {
  const fill = tone || "rgba(0,0,0,0.08)";
  if (variant === "stage") {
    return (
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
        preserveAspectRatio="none"
        viewBox="0 0 1000 1200"
      >
        <path d="M -50 320 Q 200 220 450 320 T 1050 340 L 1050 600 Q 800 700 500 600 T -50 580 Z" fill={fill}/>
        <path d="M -50 760 Q 250 660 500 760 T 1050 740 L 1050 1250 L -50 1250 Z" fill={fill}/>
        <path d="M -50 100 Q 300 60 600 120 T 1050 140 L 1050 200 Q 700 240 400 200 T -50 180 Z" fill={fill} opacity="0.6"/>
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
      preserveAspectRatio="none"
      viewBox="0 0 400 800"
    >
      <path d="M -20 240 Q 100 180 200 240 T 420 250 L 420 380 Q 300 440 180 380 T -20 400 Z" fill={fill}/>
      <path d="M -20 580 Q 130 510 250 580 T 420 570 L 420 820 L -20 820 Z" fill={fill}/>
    </svg>
  );
}
