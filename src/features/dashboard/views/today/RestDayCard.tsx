import { Coffee } from 'lucide-react';
import { useBreakpoint } from '@hooks/useBreakpoint';

interface RestDayCardProps {
  onNavigateJourney: () => void;
}

export default function RestDayCard({ onNavigateJourney }: RestDayCardProps) {
  const { isMobile } = useBreakpoint();
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30,14,60,0.8) 0%, rgba(17,8,40,0.9) 100%)',
      border: '1px solid rgba(124,58,237,0.15)',
      borderRadius: 24,
      padding: isMobile ? '24px 20px' : '36px 28px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Coffee icon */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'rgba(124,58,237,0.15)',
        border: '1px solid rgba(124,58,237,0.3)',
        marginBottom: 20,
        position: 'relative',
      }}>
        <Coffee size={24} color="#a78bfa" strokeWidth={1.5} />
      </div>

      <h3 style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#f3e8ff',
        margin: '0 0 10px',
        letterSpacing: '-0.025em',
        position: 'relative',
      }}>
        Rest Day
      </h3>

      <p style={{
        fontSize: 14,
        color: 'rgba(196,181,253,0.6)',
        lineHeight: 1.6,
        margin: '0 0 24px',
        maxWidth: 260,
        marginLeft: 'auto',
        marginRight: 'auto',
        position: 'relative',
      }}>
        Recovery is part of progress. Your streak is protected.
      </p>

      <button
        onClick={onNavigateJourney}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: '#a78bfa',
          padding: 0,
          position: 'relative',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#c4b5fd'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#a78bfa'; }}
      >
        See tomorrow's task →
      </button>
    </div>
  );
}
