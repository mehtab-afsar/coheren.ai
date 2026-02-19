import { TrendingUp, Calendar, CheckCircle, Flame, Brain, Zap } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';
import { shouldTriggerCheckpoint } from '@core/agents/recalibrator';

export default function ProgressView() {
  const { tasks, currentDay, streak, roadmap } = useStore();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentWeek = Math.ceil(currentDay / 7);
  const totalWeeks = roadmap?.strategicPlan?.totalWeeks || Math.ceil((roadmap?.duration || 3) * 4);
  const thisWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek);
  const thisWeekCompleted = thisWeekTasks.filter(t => t.completed).length;
  const weeklyCompletion = thisWeekTasks.length > 0
    ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100)
    : 0;

  const highestWeekWithTasks = tasks.length > 0
    ? Math.max(...tasks.map(t => Math.ceil(t.day / 7)))
    : currentWeek;
  const weeksToShow = Math.min(highestWeekWithTasks, totalWeeks);

  const weekTemplates = roadmap?.strategicPlan?.weekTemplates ?? [];
  const currentWeekTemplate = weekTemplates.find(w => w.weekNumber === currentWeek)
    ?? weekTemplates[weekTemplates.length - 1];
  const currentPhaseName = currentWeekTemplate?.focus ?? roadmap?.category ?? 'Your journey';
  const currentPhaseDescription = currentWeekTemplate?.description ?? '';

  const nextCheckpointDay = Array.from({ length: 200 }, (_, i) => i + currentDay + 1)
    .find(d => shouldTriggerCheckpoint(d, 14)) ?? (currentDay + 14);
  const daysToCheckpoint = nextCheckpointDay - currentDay;
  const checkpointToday = shouldTriggerCheckpoint(currentDay, 14);

  const statCards = [
    {
      icon: Flame,
      label: 'Streak',
      value: String(streak),
      sub: streak === 1 ? 'day in a row' : 'days in a row',
      bg: streak > 0 ? 'linear-gradient(135deg, #fff7ed 0%, #fffbf5 100%)' : '#ffffff',
      border: streak > 0 ? 'rgba(249,115,22,0.2)' : tokens.colors.borderLight,
      accentColor: streak > 0 ? '#f97316' : tokens.colors.gray[200],
      labelColor: streak > 0 ? '#ea580c' : tokens.colors.text.tertiary,
      valueColor: streak > 0 ? '#c2410c' : tokens.colors.text.primary,
      shadow: streak > 0 ? '0 4px 16px rgba(249,115,22,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
      iconColor: streak > 0 ? '#f97316' : tokens.colors.gray[300],
      iconFilter: streak > 0 ? 'drop-shadow(0 0 4px rgba(249,115,22,0.5))' : 'none',
    },
    {
      icon: TrendingUp,
      label: 'Overall',
      value: `${overallCompletion}%`,
      sub: `${completedTasks} of ${totalTasks} tasks`,
      bg: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(109,40,217,0.02) 100%)',
      border: 'rgba(124,58,237,0.18)',
      accentColor: '#7c3aed',
      labelColor: '#7c3aed',
      valueColor: '#5b21b6',
      shadow: '0 4px 16px rgba(124,58,237,0.1)',
      iconColor: '#7c3aed',
      iconFilter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))',
    },
    {
      icon: Calendar,
      label: 'This Week',
      value: `${weeklyCompletion}%`,
      sub: `Week ${currentWeek} completion`,
      bg: 'linear-gradient(135deg, #f0f9ff 0%, #fafcff 100%)',
      border: 'rgba(14,165,233,0.2)',
      accentColor: '#0ea5e9',
      labelColor: '#0284c7',
      valueColor: '#0369a1',
      shadow: '0 4px 16px rgba(14,165,233,0.08)',
      iconColor: '#0ea5e9',
      iconFilter: 'drop-shadow(0 0 4px rgba(14,165,233,0.4))',
    },
    {
      icon: CheckCircle,
      label: 'Day',
      value: String(currentDay),
      sub: `of ${totalWeeks * 7} days`,
      bg: 'linear-gradient(135deg, #f0fdf4 0%, #fafffe 100%)',
      border: 'rgba(16,185,129,0.2)',
      accentColor: '#10b981',
      labelColor: '#059669',
      valueColor: '#047857',
      shadow: '0 4px 16px rgba(16,185,129,0.08)',
      iconColor: '#10b981',
      iconFilter: 'drop-shadow(0 0 4px rgba(16,185,129,0.4))',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary, marginBottom: tokens.spacing.xs, letterSpacing: '0.01em' }}>
          Your stats
        </p>
        <h1 style={{
          fontSize: tokens.typography.sizes['3xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          marginBottom: tokens.spacing.md,
          lineHeight: 1.15,
        }}>
          Progress
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
          {roadmap?.title && (
            <span style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.light }}>
              {roadmap.title}
            </span>
          )}
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
            Week {currentWeek}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: tokens.spacing.md,
        marginBottom: tokens.spacing['2xl'],
      }}>
        {statCards.map(({ icon: Icon, label, value, sub, bg, border, accentColor, labelColor, valueColor, shadow, iconColor, iconFilter }) => (
          <div key={label} style={{
            background: bg,
            border: `1px solid ${border}`,
            borderLeft: `4px solid ${accentColor}`,
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing.lg,
            boxShadow: shadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spacing.md }}>
              <Icon size={15} strokeWidth={2} color={iconColor} style={{ filter: iconFilter }} />
              <span style={{ fontSize: tokens.typography.sizes.xs, color: labelColor, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: tokens.typography.weights.semibold, color: valueColor, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px' }}>
              {value}
            </div>
            <div style={{ fontSize: tokens.typography.sizes.xs, color: labelColor, fontWeight: tokens.typography.weights.regular }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Journey Context Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, #ffffff 100%)',
        border: '1px solid rgba(124,58,237,0.14)',
        borderLeft: '4px solid #7c3aed',
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.xl,
        marginBottom: tokens.spacing['2xl'],
        boxShadow: '0 4px 16px rgba(124,58,237,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, marginBottom: tokens.spacing.xl }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            borderRadius: tokens.borderRadius.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
          }}>
            <Brain size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: '0 0 2px', letterSpacing: '-0.01em' }}>
              Why these tasks?
            </h3>
            <p style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, margin: 0 }}>
              Personalised to your behavioral profile and goal
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: tokens.spacing.md }}>
          {/* Current Phase */}
          <div style={{
            padding: tokens.spacing.md,
            backgroundColor: 'rgba(124,58,237,0.04)',
            borderRadius: tokens.borderRadius.md,
            border: '1px solid rgba(124,58,237,0.1)',
          }}>
            <p style={{ fontSize: '10px', color: '#7c3aed', fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
              Current Focus
            </p>
            <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, marginBottom: '4px' }}>
              {currentPhaseName}
            </p>
            {currentPhaseDescription && (
              <p style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.secondary, lineHeight: 1.5, margin: 0 }}>
                {currentPhaseDescription.length > 80 ? currentPhaseDescription.substring(0, 80) + '…' : currentPhaseDescription}
              </p>
            )}
          </div>

          {/* Next Checkpoint */}
          <div style={{
            padding: tokens.spacing.md,
            background: checkpointToday ? 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.02) 100%)' : 'rgba(255,255,255,0.6)',
            borderRadius: tokens.borderRadius.md,
            border: `1px solid ${checkpointToday ? 'rgba(124,58,237,0.3)' : tokens.colors.borderLight}`,
          }}>
            <p style={{ fontSize: '10px', color: checkpointToday ? '#7c3aed' : tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
              {checkpointToday ? '⚡ Checkpoint Today' : 'Next AI Review'}
            </p>
            <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: checkpointToday ? '#5b21b6' : tokens.colors.text.primary, marginBottom: '4px' }}>
              {checkpointToday ? `Day ${currentDay}` : `In ${daysToCheckpoint} day${daysToCheckpoint === 1 ? '' : 's'}`}
            </p>
            <p style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.secondary, lineHeight: 1.5, margin: 0 }}>
              {checkpointToday ? 'Your Coach will recalibrate your sprint today.' : 'Your Coach reviews progress every 14 days and adapts your plan.'}
            </p>
          </div>

          {/* Behavioral Profile */}
          <div style={{
            padding: tokens.spacing.md,
            backgroundColor: 'rgba(255,255,255,0.6)',
            borderRadius: tokens.borderRadius.md,
            border: `1px solid ${tokens.colors.borderLight}`,
          }}>
            <p style={{ fontSize: '10px', color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
              Profile
            </p>
            <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, marginBottom: '4px' }}>
              Personalised
            </p>
            <p style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.secondary, lineHeight: 1.5, margin: 0 }}>
              Tasks shaped by your behavioral profile. Complete a checkpoint to see details.
            </p>
          </div>
        </div>
      </div>

      {/* Progress by Week */}
      <div style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.xl,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}>
          <Zap size={15} strokeWidth={2} color="#7c3aed" style={{ filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))' }} />
          <h3 style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.01em' }}>
            Week by Week
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
          {Array.from({ length: weeksToShow }, (_, i) => i + 1).map(week => {
            const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === week);
            const weekCompleted = weekTasks.filter(t => t.completed).length;
            const weekProgress = weekTasks.length > 0 ? (weekCompleted / weekTasks.length) * 100 : 0;
            const isCurrentWeek = week === currentWeek;
            const isDone = weekProgress === 100;

            return (
              <div key={week}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: tokens.typography.sizes.sm,
                      fontWeight: isCurrentWeek ? tokens.typography.weights.semibold : tokens.typography.weights.regular,
                      color: isCurrentWeek ? '#7c3aed' : tokens.colors.text.primary,
                    }}>
                      Week {week}
                    </span>
                    {isCurrentWeek && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 7px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        color: '#fff',
                        borderRadius: '99px',
                        fontWeight: tokens.typography.weights.medium,
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 6px rgba(124,58,237,0.35)',
                      }}>
                        NOW
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: tokens.typography.sizes.xs,
                    fontWeight: tokens.typography.weights.medium,
                    color: isDone ? '#059669' : isCurrentWeek ? '#7c3aed' : tokens.colors.text.secondary,
                  }}>
                    {Math.round(weekProgress)}%
                  </span>
                </div>
                <div style={{ height: '6px', backgroundColor: tokens.colors.gray[100], borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${weekProgress}%`,
                    background: isDone
                      ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                      : isCurrentWeek
                        ? 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)'
                        : 'linear-gradient(90deg, #6b7280 0%, #9ca3af 100%)',
                    borderRadius: '99px',
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: isCurrentWeek ? '0 0 6px rgba(124,58,237,0.4)' : 'none',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
