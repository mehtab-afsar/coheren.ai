import { tokens } from '../design-system';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
}

export default function LoadingAnimation({ size = 'medium' }: LoadingAnimationProps) {
  const sizes = {
    small: { dotSize: 8, spacing: 24, lineWidth: 2, arrowSize: 6 },
    medium: { dotSize: 12, spacing: 40, lineWidth: 3, arrowSize: 8 },
    large: { dotSize: 16, spacing: 60, lineWidth: 4, arrowSize: 10 },
  };

  const { dotSize, spacing, lineWidth, arrowSize } = sizes[size];
  const totalWidth = spacing * 2 + dotSize;

  return (
    <div style={{ position: 'relative', width: `${totalWidth}px`, height: `${dotSize}px` }}>
      <style>{`
        @keyframes dotPulse1 {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          33% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes dotPulse2 {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          66% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes dotPulse3 {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          99% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes lineDraw {
          0% {
            stroke-dashoffset: 100;
            opacity: 0.3;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
        }

        @keyframes arrowSlide {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(${spacing - dotSize}px);
            opacity: 0;
          }
        }
      `}</style>

      {/* SVG for lines and arrows */}
      <svg
        width={totalWidth}
        height={dotSize}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
        }}
      >
        {/* First line with arrow */}
        <g>
          <line
            x1={dotSize}
            y1={dotSize / 2}
            x2={spacing}
            y2={dotSize / 2}
            stroke={tokens.colors.primary}
            strokeWidth={lineWidth}
            strokeDasharray="100"
            style={{
              animation: 'lineDraw 2.4s ease-in-out infinite',
            }}
          />
          <polygon
            points={`${spacing - arrowSize},${dotSize / 2 - arrowSize / 2} ${spacing},${dotSize / 2} ${spacing - arrowSize},${dotSize / 2 + arrowSize / 2}`}
            fill={tokens.colors.primary}
            style={{
              animation: 'arrowSlide 2.4s ease-in-out infinite',
              transformOrigin: 'left center',
            }}
          />
        </g>

        {/* Second line with arrow */}
        <g>
          <line
            x1={spacing + dotSize}
            y1={dotSize / 2}
            x2={spacing * 2}
            y2={dotSize / 2}
            stroke={tokens.colors.primary}
            strokeWidth={lineWidth}
            strokeDasharray="100"
            style={{
              animation: 'lineDraw 2.4s ease-in-out infinite 0.4s',
            }}
          />
          <polygon
            points={`${spacing * 2 - arrowSize},${dotSize / 2 - arrowSize / 2} ${spacing * 2},${dotSize / 2} ${spacing * 2 - arrowSize},${dotSize / 2 + arrowSize / 2}`}
            fill={tokens.colors.primary}
            style={{
              animation: 'arrowSlide 2.4s ease-in-out infinite 0.4s',
              transformOrigin: `${spacing + dotSize}px center`,
              transformBox: 'fill-box',
            }}
          />
        </g>
      </svg>

      {/* Dot 1 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          backgroundColor: tokens.colors.primary,
          borderRadius: '50%',
          animation: 'dotPulse1 2.4s ease-in-out infinite',
          boxShadow: `0 0 ${dotSize * 1.5}px ${tokens.colors.primary}60`,
        }}
      />

      {/* Dot 2 */}
      <div
        style={{
          position: 'absolute',
          left: `${spacing}px`,
          top: 0,
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          backgroundColor: tokens.colors.primary,
          borderRadius: '50%',
          animation: 'dotPulse2 2.4s ease-in-out infinite',
          boxShadow: `0 0 ${dotSize * 1.5}px ${tokens.colors.primary}60`,
        }}
      />

      {/* Dot 3 */}
      <div
        style={{
          position: 'absolute',
          left: `${spacing * 2}px`,
          top: 0,
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          backgroundColor: tokens.colors.primary,
          borderRadius: '50%',
          animation: 'dotPulse3 2.4s ease-in-out infinite',
          boxShadow: `0 0 ${dotSize * 1.5}px ${tokens.colors.primary}60`,
        }}
      />
    </div>
  );
}
