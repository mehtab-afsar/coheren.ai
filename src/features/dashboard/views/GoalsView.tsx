import { Target, TrendingUp, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';

export default function GoalsView() {
  const { roadmap, currentDay } = useStore();

  if (!roadmap) {
    return (
      <div>
        <h1 style={{
          fontSize: tokens.typography.sizes['3xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          marginBottom: tokens.spacing['2xl'],
          lineHeight: 1.15,
        }}>
          Your Roadmap
        </h1>
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
      {/* Header */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary, marginBottom: tokens.spacing.xs, letterSpacing: '0.01em' }}>
          Your goal
        </p>
        <h1 style={{
          fontSize: tokens.typography.sizes['3xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          marginBottom: tokens.spacing.md,
          lineHeight: 1.15,
        }}>
          Roadmap
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
          <span style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.light }}>
            {roadmap.duration} months
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
          }}>
            {progressPercent}% complete
          </span>
        </div>
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
                border: `1px solid ${isActive ? 'rgba(124,58,237,0.2)' : isCompleted ? 'rgba(16,185,129,0.15)' : tokens.colors.borderLight}`,
                borderLeft: isActive
                  ? '4px solid #7c3aed'
                  : isCompleted
                  ? '4px solid #10b981'
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
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : tokens.colors.gray[100],
                  borderRadius: tokens.borderRadius.md,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 4px 12px rgba(124,58,237,0.3)' : isCompleted ? '0 4px 12px rgba(16,185,129,0.2)' : 'none',
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
