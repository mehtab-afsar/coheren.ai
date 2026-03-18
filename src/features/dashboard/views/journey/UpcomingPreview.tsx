import { Eye, Target, BookOpen, MessageCircle } from 'lucide-react';

export interface UpcomingPreviewProps {
  weekNumber: number;
  focus: string;
  description: string;
  practiceCount: number;
  learningCount: number;
  reflectionCount: number;
}

export default function UpcomingPreview({
  weekNumber,
  focus,
  description,
  practiceCount,
  learningCount,
  reflectionCount,
}: UpcomingPreviewProps) {
  return (
    <div
      style={{
        background: 'rgba(99,102,241,0.05)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 18,
        padding: '16px 18px',
        marginTop: 16,
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 10,
        }}
      >
        <Eye size={14} color="#a5b4fc" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#a5b4fc',
            letterSpacing: '0.01em',
          }}
        >
          Next Week Preview
        </span>
      </div>

      {/* Week title */}
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#ffffff',
          margin: '0 0 6px',
          lineHeight: 1.3,
        }}
      >
        Week {weekNumber} · {focus}
      </p>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: '#9ca3af',
          margin: '0 0 12px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {/* Task type pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {practiceCount > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 99,
            }}
          >
            <Target size={10} color="#a78bfa" />
            <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>
              {practiceCount} practice
            </span>
          </div>
        )}

        {learningCount > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              background: 'rgba(14,165,233,0.1)',
              border: '1px solid rgba(14,165,233,0.2)',
              borderRadius: 99,
            }}
          >
            <BookOpen size={10} color="#38bdf8" />
            <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 500 }}>
              {learningCount} learning
            </span>
          </div>
        )}

        {reflectionCount > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 99,
            }}
          >
            <MessageCircle size={10} color="#c4b5fd" />
            <span style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 500 }}>
              {reflectionCount} reflection
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
