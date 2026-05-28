"use client";

export type HootMood = "idle" | "listening" | "talking";

export function Hoot({ size = 200, mood = "idle" }: { size?: number; mood?: HootMood }) {
  const stroke = 2.2;
  const eyes = (() => {
    if (mood === "listening") return (
      <g>
        <ellipse cx="24" cy="34" rx="6.5" ry="7.5" fill="#1a1a1a"/>
        <ellipse cx="40" cy="34" rx="6.5" ry="7.5" fill="#1a1a1a"/>
        <circle cx="26" cy="32" r="2" fill="#fff"/>
        <circle cx="42" cy="32" r="2" fill="#fff"/>
        <circle cx="22" cy="36" r="1" fill="#fff"/>
        <circle cx="38" cy="36" r="1" fill="#fff"/>
      </g>
    );
    if (mood === "talking") return (
      <g stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M19 33 q4 -4 9 0"/>
        <path d="M35 33 q4 -4 9 0"/>
      </g>
    );
    return (
      <g>
        <ellipse cx="24" cy="33" rx="5.5" ry="6.5" fill="#1a1a1a"/>
        <ellipse cx="40" cy="33" rx="5.5" ry="6.5" fill="#1a1a1a"/>
        <circle cx="26" cy="31" r="1.8" fill="#fff"/>
        <circle cx="42" cy="31" r="1.8" fill="#fff"/>
        <circle cx="22" cy="35" r="0.9" fill="#fff"/>
        <circle cx="38" cy="35" r="0.9" fill="#fff"/>
      </g>
    );
  })();

  return (
    <svg
      viewBox="0 0 64 70"
      width={size}
      height={size * (70 / 64)}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <ellipse cx="32" cy="64" rx="18" ry="2" fill="#000" opacity="0.1"/>

      {/* tiny tufts */}
      <path d="M18 14 q-1 -4 2 -5 q 2 1 2 5z" fill="#FFFFFF" stroke="#1a1a1a" strokeWidth={stroke}/>
      <path d="M46 14 q1 -4 -2 -5 q -2 1 -2 5z" fill="#FFFFFF" stroke="#1a1a1a" strokeWidth={stroke}/>

      {/* body */}
      <path
        d="M10 32 Q10 14 32 14 Q54 14 54 32 L54 48 Q54 60 32 60 Q10 60 10 48 Z"
        fill="#FFFFFF"
        stroke="#1a1a1a"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />

      {eyes}

      {/* cheeks */}
      <ellipse cx="17" cy="42" rx="3.5" ry="2.4" fill="#FFB4C6" opacity="0.7"/>
      <ellipse cx="47" cy="42" rx="3.5" ry="2.4" fill="#FFB4C6" opacity="0.7"/>

      {/* beak / smile */}
      {mood === "talking" ? (
        <path d="M28 42 q4 6 8 0 q-2 -2 -8 0z" fill="#FF7FA8" stroke="#1a1a1a" strokeWidth="1.6"/>
      ) : (
        <g stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M28 43 q4 3 8 0"/>
          <path d="M31 41 l1 1.5 l1 -1.5" stroke="#FFC44A" strokeWidth="1.4" fill="#FFC44A"/>
        </g>
      )}

      {/* wing nubs */}
      <ellipse cx="11" cy="42" rx="3" ry="6" fill="#FFFFFF" stroke="#1a1a1a" strokeWidth={stroke}/>
      <ellipse cx="53" cy="42" rx="3" ry="6" fill="#FFFFFF" stroke="#1a1a1a" strokeWidth={stroke}/>

      {/* feet */}
      <ellipse cx="26" cy="60" rx="4" ry="2" fill="#FFC44A" stroke="#1a1a1a" strokeWidth={stroke}/>
      <ellipse cx="38" cy="60" rx="4" ry="2" fill="#FFC44A" stroke="#1a1a1a" strokeWidth={stroke}/>

      {/* sparkle highlights */}
      <circle cx="14" cy="22" r="1.4" fill="#FFC44A"/>
      <circle cx="50" cy="20" r="1" fill="#FFC44A"/>

      {mood === "listening" && (
        <g stroke="#A8E6C7" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M6 28 q-2 2 0 4"/>
          <path d="M58 28 q2 2 0 4"/>
        </g>
      )}
    </svg>
  );
}
