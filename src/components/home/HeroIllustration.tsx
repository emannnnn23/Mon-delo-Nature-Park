import { useId } from "react";

/** Fronds of one palm crown: rotation (deg) and length scale. */
const FRONDS = [
  { rotate: -168, scale: 0.85 },
  { rotate: -142, scale: 1 },
  { rotate: -112, scale: 0.9 },
  { rotate: -84, scale: 0.75 },
  { rotate: -58, scale: 0.95 },
  { rotate: -30, scale: 1.05 },
  { rotate: -6, scale: 0.85 },
  { rotate: 18, scale: 0.7 },
];

const FROND = "M0 0 C34 -16 86 -14 132 18 C88 2 38 6 0 0Z";

function Palm({
  x,
  y,
  height,
  lean,
}: {
  x: number;
  y: number;
  height: number;
  lean: number;
}) {
  const topX = x + lean;
  const topY = y - height;
  return (
    <g>
      <path
        d={`M${x - 7} ${y} C${x - 4} ${y - height * 0.45} ${topX - 10} ${topY + height * 0.3} ${topX - 2} ${topY} L${topX + 3} ${topY} C${topX - 2} ${topY + height * 0.3} ${x + 6} ${y - height * 0.45} ${x + 7} ${y}Z`}
      />
      {FRONDS.map(({ rotate, scale }) => (
        <path
          key={rotate}
          d={FROND}
          transform={`translate(${topX} ${topY}) rotate(${rotate}) scale(${scale})`}
        />
      ))}
    </g>
  );
}

/**
 * Stand-in hero artwork while the park has no hero photo: layered hills in
 * forest greens under a low gold sun, echoing the logo's sun-and-ridge mark.
 * Decorative only. Anchored to the bottom so phones crop the sky, not the hills.
 */
export function HeroIllustration({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const sky = `sky-${id}`;
  const glow = `glow-${id}`;
  const sun = `sun-${id}`;
  const haze = `haze-${id}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMax slice"
      className={`h-full w-full ${className}`.trim()}
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f2a21" />
          <stop offset="0.45" stopColor="#21443a" />
          <stop offset="0.66" stopColor="#5d6a44" />
        </linearGradient>
        <radialGradient
          id={glow}
          cx="1030"
          cy="560"
          r="760"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(1030 560) scale(1.25 0.62) translate(-1030 -560)"
        >
          <stop offset="0" stopColor="#fbe4a8" />
          <stop offset="0.1" stopColor="#f0c873" />
          <stop offset="0.3" stopColor="#dcae5a" stopOpacity="0.9" />
          <stop offset="0.58" stopColor="#9c7a3e" stopOpacity="0.4" />
          <stop offset="1" stopColor="#183f32" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={sun}>
          <stop offset="0" stopColor="#fbe0a0" />
          <stop offset="0.55" stopColor="#f2c66e" />
          <stop offset="1" stopColor="#f0c873" />
        </radialGradient>
        <linearGradient id={haze} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0c873" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f0c873" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1600" height="1000" fill={`url(#${sky})`} />
      <rect width="1600" height="1000" fill={`url(#${glow})`} />

      {/* Sun, half set behind the far ridge. */}
      <circle cx="1030" cy="560" r="64" fill={`url(#${sun})`} />

      {/* Far ridge, hazy and lit by the sun. */}
      <path
        d="M0 640 C120 600 220 585 340 610 S560 560 700 590 S920 612 1040 586 S1300 540 1420 575 S1560 600 1600 590 V1000 H0Z"
        fill="#7d7a4c"
      />
      <rect y="590" width="1600" height="90" fill={`url(#${haze})`} />

      {/* Second ridge with a gold rim, like the logo's ridge line. */}
      <path
        d="M0 690 C140 640 260 630 380 660 S600 702 760 652 S1000 612 1120 640 S1380 690 1600 642 V1000 H0Z"
        fill="#48654a"
      />
      <path
        d="M0 690 C140 640 260 630 380 660 S600 702 760 652 S1000 612 1120 640 S1380 690 1600 642"
        fill="none"
        stroke="#e2bb6a"
        strokeWidth="2.5"
        opacity="0.55"
      />

      <path
        d="M0 762 C180 702 320 692 470 732 S760 792 920 742 S1200 692 1360 732 S1540 762 1600 750 V1000 H0Z"
        fill="#2f5541"
      />
      <path
        d="M0 842 C200 782 380 792 560 832 S900 862 1080 812 S1400 782 1600 822 V1000 H0Z"
        fill="#21473a"
      />

      {/* Foreground ridge with palms on the right. */}
      <g fill="#10301f">
        <Palm x={1352} y={930} height={250} lean={-26} />
        <Palm x={1468} y={920} height={330} lean={18} />
        <Palm x={1560} y={940} height={210} lean={-14} />
        <path d="M0 930 C240 872 480 882 700 912 S1100 932 1300 892 S1520 872 1600 880 V1000 H0Z" />
      </g>
    </svg>
  );
}
