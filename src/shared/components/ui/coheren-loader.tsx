/**
 * CoherenLoader — luma-spin adapted for the Coheren // logo design.
 * Two diagonal strokes animate with a staggered stroke-draw loop.
 */
export const CoherenLoader = ({ size = 56, color = '#39594D' }: { size?: number; color?: string }) => {
  const s = size;
  // The // logo has two parallel diagonal lines at ~45°
  // Long line: (40,192) → (192,40)  [length ≈ 215 in 256-unit canvas]
  // Short line: (128,208) → (208,128) [length ≈ 113 in 256-unit canvas]
  // Scale them to our `size` viewBox
  const longLen = 216;
  const shortLen = 114;

  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <svg
        viewBox="0 0 256 256"
        width={s}
        height={s}
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Long line — animates first */}
        <line
          x1="40" y1="192" x2="192" y2="40"
          stroke={color}
          strokeWidth="28"
          strokeLinecap="round"
          strokeDasharray={longLen}
          strokeDashoffset={longLen}
          style={{ animation: 'coherenDraw 2.5s ease-in-out infinite' }}
        />
        {/* Short line — staggered -1.25s like luma-spin */}
        <line
          x1="128" y1="208" x2="208" y2="128"
          stroke={color}
          strokeWidth="28"
          strokeLinecap="round"
          strokeDasharray={shortLen}
          strokeDashoffset={shortLen}
          style={{ animation: 'coherenDraw 2.5s ease-in-out infinite', animationDelay: '-1.25s' }}
        />
      </svg>

      <style>{`
        @keyframes coherenDraw {
          0%   { stroke-dashoffset: var(--len, 216); opacity: 0.2; }
          25%  { stroke-dashoffset: 0;                opacity: 1;   }
          60%  { stroke-dashoffset: 0;                opacity: 1;   }
          100% { stroke-dashoffset: calc(var(--len, 216) * -1); opacity: 0.2; }
        }
        svg line:first-child { --len: 216; }
        svg line:last-child  { --len: 114; }
      `}</style>
    </div>
  );
};
