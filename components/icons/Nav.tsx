"use client";

type IconProps = { size?: number; color?: string };

function D({ children, size = 24, color = "currentColor" }: { children: React.ReactNode; size?: number; color?: string }) {
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

export const IconHome = (p: IconProps) => (
  <D {...p}>
    <path d="M10 30 L32 12 L54 30 V52 a3 3 0 0 1 -3 3 H13 a3 3 0 0 1 -3 -3 Z"/>
    <path d="M26 55 V40 a2 2 0 0 1 2 -2 h8 a2 2 0 0 1 2 2 V55"/>
  </D>
);

export const IconAsk = (p: IconProps) => (
  <D {...p}>
    <path d="M12 22c0-5 4-9 10-9h20c6 0 10 4 10 9v14c0 5-4 9-10 9h-12l-8 6v-6h-1c-5 0-9-4-9-9z"/>
    <path d="M19 13c0-2 1-3 2-3M45 13c0-2-1-3-2-3"/>
    <circle cx="24" cy="28" r="1.5" fill="currentColor"/>
    <circle cx="40" cy="28" r="1.5" fill="currentColor"/>
    <path d="M28 35q4 3 8 0"/>
  </D>
);

export const IconStory = (p: IconProps) => (
  <D {...p}>
    <path d="M8 17q12-2 24 2q12-4 24-2v32q-12-2-24 2q-12-4-24-2z"/>
    <path d="M32 19v32"/>
    <path d="M14 25q6 0 12 2M14 32q6 0 12 2M14 39q6 0 10 2"/>
    <path d="M50 25q-6 0-12 2M50 32q-6 0-12 2M50 39q-6 0-10 2"/>
  </D>
);

export const IconExplore = (p: IconProps) => (
  <D {...p}>
    <circle cx="32" cy="32" r="22"/>
    <path d="M40 24l-4 12l-12 4l4-12z" fill="currentColor" fillOpacity="0.15"/>
    <path d="M40 24l-4 12l-12 4l4-12z"/>
    <circle cx="32" cy="32" r="1.5" fill="currentColor"/>
  </D>
);

export const IconSettings = (p: IconProps) => (
  <D {...p}>
    <circle cx="32" cy="32" r="7"/>
    <path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4 4M45 45l4 4M49 15l-4 4M19 45l-4 4"/>
  </D>
);

export const IconLang = (p: IconProps) => (
  <D {...p}>
    <circle cx="32" cy="32" r="22"/>
    <path d="M10 32h44"/>
    <path d="M32 10c-7 6-7 38 0 44M32 10c7 6 7 38 0 44"/>
  </D>
);

export const IconMic = (p: IconProps) => (
  <D {...p}>
    <rect x="24" y="10" width="16" height="28" rx="8"/>
    <path d="M14 30c0 10 8 18 18 18s18-8 18-18"/>
    <path d="M32 48v8M22 56h20"/>
  </D>
);

export const IconRefresh = (p: IconProps) => (
  <D {...p}>
    <path d="M52 32a20 20 0 1 1 -7-15"/>
    <path d="M48 8v10h-10"/>
  </D>
);

export const IconChevron = (p: IconProps) => (
  <D {...p}>
    <path d="M24 14 L42 32 L24 50"/>
  </D>
);

export const IconBack = (p: IconProps) => (
  <D {...p}>
    <path d="M40 14 L22 32 L40 50"/>
  </D>
);

export const IconClose = (p: IconProps) => (
  <D {...p}>
    <path d="M16 16 L48 48 M48 16 L16 48"/>
  </D>
);

export const IconSparkle = (p: IconProps) => (
  <D {...p}>
    <path d="M32 10 L36 28 L54 32 L36 36 L32 54 L28 36 L10 32 L28 28 Z" fill="currentColor" fillOpacity="0.15"/>
    <path d="M32 10 L36 28 L54 32 L36 36 L32 54 L28 36 L10 32 L28 28 Z"/>
  </D>
);

export const IconStop = (p: IconProps) => (
  <D {...p}>
    <rect x="14" y="14" width="36" height="36" rx="6"/>
  </D>
);
