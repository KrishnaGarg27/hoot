"use client";

import type { SubjectId } from "@/lib/data";

type SubjProps = { size?: number; fill?: string; color?: string };

function D({ children, size = 64, color = "currentColor" }: { children: React.ReactNode; size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SubjSpace({ size = 64, fill = "#FFD58A", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <circle cx="28" cy="32" r="14" fill={fill}/>
      <ellipse cx="32" cy="32" rx="26" ry="6" transform="rotate(-22 32 32)"/>
      <path d="M22 28q2-2 4 0M30 38q2-2 4 0"/>
      <path d="M52 14l1 4l4 1l-4 1l-1 4l-1-4l-4-1l4-1z" fill={color}/>
      <circle cx="10" cy="20" r="1.2" fill={color}/>
      <circle cx="14" cy="50" r="1.2" fill={color}/>
    </D>
  );
}

export function SubjAnimals({ size = 64, fill = "#A8E6C7", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M12 16l6 12M52 16l-6 12" fill={fill}/>
      <path d="M12 16q3 0 6 12M52 16q-3 0-6 12" fill={fill}/>
      <path d="M14 24c0-2 4-2 5 4q3-2 13-2t13 2q1-6 5-4c2 6 0 16-4 20q-6 6-14 6t-14-6c-4-4-6-14-4-20z" fill={fill}/>
      <path d="M22 36q1 1 2 0M40 36q1 1 2 0" stroke={color} strokeWidth="2.6" fill={color}/>
      <path d="M30 43q2 2 4 0"/>
      <path d="M32 38l-1.5 3h3z" fill={color} stroke={color}/>
    </D>
  );
}

export function SubjBody({ size = 64, fill = "#FFB4C6", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M32 52 C12 38 14 18 24 18 c4 0 7 2 8 6 c1-4 4-6 8-6 c10 0 12 20-8 34z" fill={fill}/>
      <path d="M22 32 h6 l3-6 l4 12 l3-6 h6" stroke={color} strokeWidth="2.6" fill="none"/>
    </D>
  );
}

export function SubjDino({ size = 64, fill = "#A8D7E6", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M10 50c0-4 2-8 4-10c-2-3 0-12 8-14c2-6 10-8 16-4c4 0 8 4 8 8c0 6-2 10-8 12l-2 8l-4-2l-2 4l-4-2c-2 2-4 2-6 0z" fill={fill}/>
      <circle cx="38" cy="24" r="1.4" fill={color}/>
      <path d="M30 18l2-2M36 16l2-2M42 18l2-2"/>
      <path d="M16 50l2 4M24 52l2 4"/>
    </D>
  );
}

export function SubjHistory({ size = 64, fill = "#FFE08A", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M10 52 L32 10 L54 52 Z" fill={fill}/>
      <path d="M32 10 L24 52 M32 10 L40 52"/>
      <circle cx="50" cy="18" r="3.5" fill={fill}/>
      <path d="M44 18h-2M50 12v-2M55 14l1-1M55 22l1 1"/>
    </D>
  );
}

export function SubjInvent({ size = 64, fill = "#FFD58A", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M22 38c-4-4-6-8-6-14c0-9 7-14 16-14s16 5 16 14c0 6-2 10-6 14v6h-20z" fill={fill}/>
      <path d="M26 46h12M28 50h8M30 54h4"/>
      <path d="M28 26q4-4 8 0M32 22v8"/>
    </D>
  );
}

export function SubjEarth({ size = 64, fill = "#A8D7E6", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M14 32c0-6 5-10 10-10c2-4 7-6 12-4c5-2 12 2 12 10c4 0 6 4 6 8s-3 6-6 6h-28c-4 0-8-4-8-10z" fill={fill}/>
      <path d="M30 44 L24 56 L30 54 L26 60" stroke={color} strokeWidth="2.8" fill="#FFD94A"/>
      <path d="M44 50q-2 3 0 6M50 54q-2 2 0 4"/>
    </D>
  );
}

export function SubjMyth({ size = 64, fill = "#E0B0FF", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M10 24 L18 38 L26 22 L32 38 L38 22 L46 38 L54 24 L50 52 L14 52 Z" fill={fill}/>
      <circle cx="32" cy="12" r="3" fill="#FFD94A" stroke={color}/>
      <circle cx="18" cy="32" r="2" fill={color}/>
      <circle cx="46" cy="32" r="2" fill={color}/>
      <path d="M22 46 h20"/>
    </D>
  );
}

export function SubjScience({ size = 64, fill = "#A8E6C7", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M26 10 h12 v14 L50 50 c2 4 0 6-4 6 H18 c-4 0-6-2-4-6 L26 24 Z" fill={fill}/>
      <path d="M22 10 h20"/>
      <path d="M18 42 h28"/>
      <circle cx="26" cy="46" r="1.5" fill={color}/>
      <circle cx="34" cy="48" r="1.2" fill={color}/>
      <circle cx="40" cy="44" r="1" fill={color}/>
    </D>
  );
}

export function SubjArt({ size = 64, fill = "#FFB4C6", color = "var(--ink)" }: SubjProps) {
  return (
    <D size={size} color={color}>
      <path d="M14 32c0-12 10-20 22-18c12 2 18 12 14 22c-2 5-8 4-12 2c-3-1-6 1-5 4c1 5-3 8-8 7c-7-2-11-9-11-17z" fill={fill}/>
      <circle cx="20" cy="30" r="2" fill="#FFD94A" stroke={color}/>
      <circle cx="28" cy="22" r="2" fill="#A8E6C7" stroke={color}/>
      <circle cx="38" cy="22" r="2" fill="#A8D7E6" stroke={color}/>
      <circle cx="44" cy="30" r="2" fill="#E0B0FF" stroke={color}/>
      <path d="M48 12 v10"/>
      <circle cx="46.5" cy="22" r="2" fill={color}/>
    </D>
  );
}

export const SubjectIcon: Record<SubjectId, React.ComponentType<SubjProps>> = {
  space: SubjSpace,
  animals: SubjAnimals,
  body: SubjBody,
  dino: SubjDino,
  history: SubjHistory,
  invent: SubjInvent,
  earth: SubjEarth,
  myth: SubjMyth,
  science: SubjScience,
  art: SubjArt,
};
