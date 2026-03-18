import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PhaseMapPhase {
  name: string;
  status: 'completed' | 'active' | 'upcoming';
  percentage: number; // 0-100
  description: string;
}

export interface PhaseMapProps {
  phases: PhaseMapPhase[];
  currentPhaseIndex: number;
}

export default function PhaseMap({ phases, currentPhaseIndex }: PhaseMapProps) {
  const currentPhase = phases[currentPhaseIndex];

  return (
    <div
      style={{
        background: 'rgba(17,17,28,0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
      }}
    >
      {/* Phase bars row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {phases.map((phase, index) => (
          <div key={phase.name} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {/* Phase column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Progress bar track */}
              <div
                style={{
                  height: 6,
                  backgroundColor: 'rgba(31,31,48,0.8)',
                  borderRadius: 99,
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${phase.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                  style={{
                    height: '100%',
                    background:
                      phase.status === 'completed'
                        ? 'linear-gradient(90deg, #6d28d9, #7c3aed)'
                        : phase.status === 'active'
                        ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                        : 'transparent',
                    borderRadius: 99,
                  }}
                />
              </div>
              {/* Phase name */}
              <p
                style={{
                  fontSize: 11,
                  margin: 0,
                  color:
                    phase.status === 'active'
                      ? '#c4b5fd'
                      : phase.status === 'completed'
                      ? '#6b7280'
                      : '#374151',
                  fontWeight: phase.status === 'active' ? 600 : 400,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap' as const,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {phase.name}
              </p>
            </div>

            {/* Chevron between phases */}
            {index < phases.length - 1 && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  paddingBottom: 18,
                  marginLeft: 4,
                  marginRight: 4,
                }}
              >
                <ChevronRight size={12} color="#374151" strokeWidth={2} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current phase description */}
      {currentPhase?.description && (
        <p
          style={{
            fontSize: 12,
            color: '#9ca3af',
            margin: '12px 0 0',
            lineHeight: 1.6,
          }}
        >
          {currentPhase.description}
        </p>
      )}
    </div>
  );
}
