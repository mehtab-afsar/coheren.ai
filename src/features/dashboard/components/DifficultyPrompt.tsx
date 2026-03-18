import { Sparkles } from 'lucide-react';
import { tokens } from '@core/design-system';

interface Props {
  onSimplify: () => void;
  onExtend: () => void;
  onKeep: () => void;
}

export default function DifficultyPrompt({ onSimplify, onExtend, onKeep }: Props) {
  return (
    <div style={{
      background: '#f5f3ff',
      border: '1px solid rgba(124,58,237,0.2)',
      borderLeft: '3px solid #7c3aed',
      borderRadius: tokens.borderRadius.lg,
      padding: '16px 18px',
      marginBottom: tokens.spacing.xl,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Sparkles size={14} color="#7c3aed" strokeWidth={2} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
          I noticed things have been tough lately
        </span>
      </div>
      <p style={{
        fontSize: 13, color: tokens.colors.text.secondary,
        lineHeight: 1.6, margin: '0 0 14px',
      }}>
        It's okay — let's make this sustainable. What feels right?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onSimplify}
          style={{
            padding: '10px 14px', backgroundColor: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            fontSize: 13, fontWeight: 500, textAlign: 'left' as const, lineHeight: 1.4,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Simplify this week — fewer, shorter tasks
        </button>
        <button
          onClick={onExtend}
          style={{
            padding: '10px 14px', backgroundColor: 'rgba(124,58,237,0.06)',
            color: tokens.colors.text.primary,
            border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10,
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
            textAlign: 'left' as const, lineHeight: 1.4, transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.06)'}
        >
          Extend my timeline — add 1–2 more weeks
        </button>
        <button
          onClick={onKeep}
          style={{
            padding: '8px 14px', backgroundColor: 'transparent',
            color: tokens.colors.text.tertiary, border: 'none',
            borderRadius: 10, cursor: 'pointer', fontSize: 12,
            textAlign: 'left' as const, lineHeight: 1.4,
          }}
        >
          I'm fine — keep going as planned
        </button>
      </div>
    </div>
  );
}
