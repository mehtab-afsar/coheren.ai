import { Target, TrendingUp, CheckCircle2, Circle, ArrowRight, Brain, Layers } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';
import type { StoneType, StoneSeverity } from '@types-app/agents';

interface GoalsViewProps {
  onNavigate?: (view: string) => void;
}

const STONE_LABELS: Record<StoneType, string> = {
  TimeConstraint: 'Time Constraint',
  ResourceGap: 'Resource Gap',
  EnvironmentFriction: 'Environment Friction',
  Inconsistency: 'Inconsistency',
  FearOfFailure: 'Fear of Failure',
  Perfectionism: 'Perfectionism',
  LowConfidence: 'Low Confidence',
  UnrealisticExpectations: 'Unrealistic Expectations',
  FocusFragility: 'Focus Fragility',
  CognitiveFatigue: 'Cognitive Fatigue',
  SkillGap: 'Skill Gap',
  ProcrastinationPattern: 'Procrastination Pattern',
  Overcommitment: 'Overcommitment',
};

const SEVERITY_STYLE: Record<StoneSeverity, { color: string; bg: string; label: string }> = {
  Low:      { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Low' },
  Moderate: { color: '#d97706', bg: 'rgba(245,158,11,0.1)',  label: 'Moderate' },
  High:     { color: '#dc2626', bg: 'rgba(239,68,68,0.1)',   label: 'High' },
  Critical: { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', label: 'Critical' },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GoalsView({ onNavigate }: GoalsViewProps) {
  const { roadmap, currentDay, stoneProfile } = useStore();

  const profile = stoneProfile?.stoneProfile ?? null;

  if (!roadmap) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing['2xl'] }}>
          <h1 style={{
            flex: 1,
            fontSize: tokens.typography.sizes['2xl'],
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.colors.text.primary,
            letterSpacing: '-0.03em',
            margin: 0,
          }}>
            Goals
          </h1>
        </div>
        <div style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing['3xl'],
          textAlign: 'center',
        }}>
          <p style={{ fontSize: tokens.typography.sizes.base, color: tokens.colors.text.secondary }}>
            No roadmap generated yet. Complete the onboarding to get started!
          </p>
        </div>
      </div>
    );
  }

  const totalDays = Math.ceil(roadmap.duration * 7 * 4);
  const progressPercent = Math.min(100, Math.round((currentDay / totalDays) * 100));
  const currentWeek = Math.ceil(currentDay / 7);

  return (
    <div>
      {/* Header — inline row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing['2xl'] }}>
        <h1 style={{
          flex: 1,
          fontSize: tokens.typography.sizes['2xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          margin: 0,
        }}>
          Goals
        </h1>
        <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, whiteSpace: 'nowrap' as const }}>
          {roadmap.duration}mo
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          borderRadius: '99px',
          fontSize: '11px',
          fontWeight: tokens.typography.weights.medium,
          color: '#fff',
          letterSpacing: '0.02em',
          boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
          flexShrink: 0,
        }}>
          {progressPercent}%
        </span>
      </div>

      {/* Goal Hero Card — dark gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)',
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing['2xl'],
        marginBottom: tokens.spacing['2xl'],
        boxShadow: '0 20px 60px rgba(124,58,237,0.35), 0 0 0 1px rgba(167,139,250,0.2)',
        position: 'relative' as const,
        overflow: 'hidden' as const,
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Goal title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.md, marginBottom: tokens.spacing.xl, position: 'relative' as const }}>
          <div style={{
            width: '40px', height: '40px', flexShrink: 0,
            background: 'rgba(167,139,250,0.15)',
            border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: tokens.borderRadius.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={20} color="#c4b5fd" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: 'rgba(196,181,253,0.55)', fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>
              Goal
            </p>
            <h2 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.semibold,
              color: '#f3e8ff',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              textTransform: 'capitalize' as const,
            }}>
              {roadmap.title}
            </h2>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, position: 'relative' as const }}>
            <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.5)', letterSpacing: '0.05em', margin: '0 0 2px', textTransform: 'uppercase' as const }}>Target</p>
            <p style={{ fontSize: tokens.typography.sizes.sm, color: '#e9d5ff', fontWeight: tokens.typography.weights.medium, margin: 0 }}>
              {new Date(roadmap.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: tokens.spacing.xl, position: 'relative' as const }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(196,181,253,0.6)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>Progress</span>
            <span style={{ fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.semibold, color: '#c4b5fd' }}>{progressPercent}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)',
              borderRadius: '99px',
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 0 8px rgba(167,139,250,0.6)',
            }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tokens.spacing.lg, position: 'relative' as const }}>
          {[
            { label: 'Duration', value: `${roadmap.duration}mo` },
            { label: 'Day', value: `${currentDay}/${totalDays}` },
            { label: 'Daily', value: roadmap.dailyTime },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: '#e9d5ff', margin: 0, letterSpacing: '-0.01em' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral Profile */}
      {profile && (
        <div style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderLeft: '4px solid #7c3aed',
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.xl,
          marginBottom: tokens.spacing['2xl'],
          boxShadow: '0 4px 16px rgba(124,58,237,0.06)',
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              borderRadius: tokens.borderRadius.md,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(124,58,237,0.3)',
            }}>
              <Brain size={16} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: '0 0 1px', letterSpacing: '-0.01em' }}>
                Your Behavioral Profile
              </h3>
              <p style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, margin: 0 }}>
                Identified during your onboarding session
              </p>
            </div>
          </div>

          {/* Archetype card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(109,40,217,0.02) 100%)',
            border: '1px solid rgba(124,58,237,0.16)',
            borderRadius: tokens.borderRadius.md,
            padding: tokens.spacing.lg,
            marginBottom: tokens.spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.md,
          }}>
            <Layers size={18} color="#7c3aed" strokeWidth={2} />
            <div>
              <p style={{ fontSize: '10px', color: '#7c3aed', fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 3px' }}>
                Your Archetype
              </p>
              <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.01em' }}>
                {profile.userArchetype}
              </p>
            </div>
          </div>

          {/* Primary challenge */}
          <p style={{ fontSize: '10px', color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: tokens.spacing.sm }}>
            Identified Friction Points
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
            {profile.stones.slice(0, 4).map((stone, i) => {
              const sev = SEVERITY_STYLE[stone.severity];
              const isPrimary = stone.type === profile.primaryStone;
              return (
                <div
                  key={i}
                  style={{
                    padding: tokens.spacing.md,
                    backgroundColor: isPrimary ? 'rgba(124,58,237,0.03)' : tokens.colors.background,
                    border: `1px solid ${isPrimary ? 'rgba(124,58,237,0.15)' : tokens.colors.borderLight}`,
                    borderRadius: tokens.borderRadius.md,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: tokens.spacing.md,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, paddingTop: '2px' }}>
                    <div style={{
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      backgroundColor: sev.color,
                      boxShadow: `0 0 4px ${sev.color}60`,
                    }} />
                    {isPrimary && (
                      <span style={{ fontSize: '8px', color: '#7c3aed', fontWeight: tokens.typography.weights.semibold, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const }}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '3px' }}>
                      <span style={{ fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary }}>
                        {STONE_LABELS[stone.type] ?? stone.type}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '99px',
                        backgroundColor: sev.bg,
                        color: sev.color,
                        fontWeight: tokens.typography.weights.medium,
                      }}>
                        {sev.label}
                      </span>
                    </div>
                    <p style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.secondary, margin: 0, lineHeight: 1.5 }}>
                      {stone.trigger}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phases */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
        <h2 style={{ fontSize: tokens.typography.sizes.xl, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
          Phases
        </h2>
        <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>
          {roadmap.phases.length} total
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        {roadmap.phases.map((phase, index) => {
          const [start, end] = phase.weeks.split('-').map((w: string) => parseInt(w.trim()));
          const isActive = currentWeek >= start && currentWeek <= end;
          const isCompleted = currentWeek > end;

          return (
            <div
              key={index}
              style={{
                backgroundColor: isActive ? 'rgba(124,58,237,0.03)' : tokens.colors.surface,
                border: `1px solid ${isActive ? 'rgba(124,58,237,0.2)' : isCompleted ? 'rgba(124,58,237,0.15)' : tokens.colors.borderLight}`,
                borderLeft: isActive
                  ? '4px solid #7c3aed'
                  : isCompleted
                  ? '4px solid #6d28d9'
                  : `4px solid ${tokens.colors.gray[200]}`,
                borderRadius: tokens.borderRadius.lg,
                padding: tokens.spacing.xl,
                opacity: isCompleted ? 0.8 : !isActive && !isCompleted ? 0.6 : 1,
                boxShadow: isActive ? '0 4px 16px rgba(124,58,237,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.lg }}>
                {/* Icon */}
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  background: isActive
                    ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                    : isCompleted
                    ? 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
                    : tokens.colors.gray[100],
                  borderRadius: tokens.borderRadius.md,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 4px 12px rgba(124,58,237,0.3)' : isCompleted ? '0 4px 12px rgba(109,40,217,0.2)' : 'none',
                }}>
                  {isCompleted ? (
                    <CheckCircle2 size={18} color="#fff" />
                  ) : (
                    <Circle size={18} color={isActive ? '#fff' : tokens.colors.text.tertiary} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing.sm }}>
                    <h3 style={{
                      fontSize: tokens.typography.sizes.base,
                      fontWeight: tokens.typography.weights.semibold,
                      color: isActive ? '#7c3aed' : tokens.colors.text.primary,
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}>
                      {phase.title}
                    </h3>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '99px',
                      backgroundColor: isActive ? 'rgba(124,58,237,0.1)' : tokens.colors.gray[50],
                      color: isActive ? '#7c3aed' : tokens.colors.text.tertiary,
                      fontWeight: tokens.typography.weights.medium,
                      letterSpacing: '0.02em',
                    }}>
                      {phase.weeks}
                    </span>
                  </div>

                  <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, lineHeight: 1.55, marginBottom: isActive ? tokens.spacing.md : 0 }}>
                    {phase.description}
                  </p>

                  {isActive && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(109,40,217,0.06) 100%)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      borderRadius: tokens.borderRadius.sm,
                    }}>
                      <TrendingUp size={12} color="#7c3aed" strokeWidth={2} />
                      <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: tokens.typography.weights.semibold, letterSpacing: '0.02em' }}>
                        Current Phase
                      </span>
                      <ArrowRight size={12} color="#7c3aed" strokeWidth={2} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
