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

  // 14-day activity chart — group completed tasks by calendar date
  const todayDate = new Date();
  const todayDateStr = todayDate.toISOString().split('T')[0];
  const last14Dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 13 + i);
    return d.toISOString().split('T')[0];
  });
  const completedByDate: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.completed && t.completedAt) {
      const dateStr = t.completedAt.split('T')[0];
      completedByDate[dateStr] = (completedByDate[dateStr] ?? 0) + 1;
    }
  });
  const last14DaysData = last14Dates.map(dateStr => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return {
      dateStr,
      label: dayNames[d.getDay()],
      completed: completedByDate[dateStr] ?? 0,
      isToday: dateStr === todayDateStr,
    };
  });
  const maxDayBar = Math.max(1, ...last14DaysData.map(d => d.completed));

  // Task type breakdown
  const typeBreakdown = [
    { label: 'Practice', type: 'practice', color: '#7c3aed', gradient: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)' },
    { label: 'Learning', type: 'learning', color: '#0ea5e9', gradient: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)' },
    { label: 'Reflection', type: 'reflection', color: '#7c3aed', gradient: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)' },
  ].map(({ label, type, color, gradient }) => {
    const count = tasks.filter(t => t.completed && t.type === type).length;
    const pct = completedTasks > 0 ? Math.round((count / completedTasks) * 100) : 0;
    return { label, color, gradient, count, pct };
  });

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
      bg: 'linear-gradient(135deg, #f5f3ff 0%, #fdfcff 100%)',
      border: 'rgba(124,58,237,0.2)',
      accentColor: '#7c3aed',
      labelColor: '#7c3aed',
      valueColor: '#5b21b6',
      shadow: '0 4px 16px rgba(124,58,237,0.08)',
      iconColor: '#7c3aed',
      iconFilter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))',
    },
  ];

  return (
    <div>
      {/* Header — single inline row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}>
        <h1 style={{
          fontSize: tokens.typography.sizes['2xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          margin: 0,
          lineHeight: 1,
          flex: 1,
        }}>
          Progress
        </h1>
        {roadmap?.title && (
          <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.light, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
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
          flexShrink: 0,
        }}>
          Week {currentWeek}
        </span>
      </div>

      {/* Stats Strip — 4 items in one row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        marginBottom: tokens.spacing['2xl'],
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {statCards.map(({ icon: Icon, label, value, accentColor, iconColor, iconFilter }, idx) => (
          <div key={label} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: `${tokens.spacing.md} ${tokens.spacing.sm}`,
            borderRight: idx < statCards.length - 1 ? `1px solid ${tokens.colors.borderLight}` : 'none',
          }}>
            <div style={{ fontSize: '1.35rem', fontWeight: tokens.typography.weights.semibold, color: accentColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Icon size={11} strokeWidth={2} color={iconColor} style={{ filter: iconFilter }} />
              <span style={{ fontSize: '9px', color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Task Type Breakdown */}
      {completedTasks > 0 && (
        <div style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.xl,
          marginBottom: tokens.spacing['2xl'],
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}>
            <Zap size={15} strokeWidth={2} color="#7c3aed" style={{ filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))' }} />
            <h3 style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.01em' }}>
              Activity Breakdown
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
            {typeBreakdown.map(({ label, color, gradient, count, pct }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.medium }}>
                    {label}
                  </span>
                  <span style={{ fontSize: tokens.typography.sizes.xs, color, fontWeight: tokens.typography.weights.medium }}>
                    {count} done · {pct}%
                  </span>
                </div>
                <div style={{ height: '6px', backgroundColor: tokens.colors.gray[100], borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: gradient,
                    borderRadius: '99px',
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tokens.spacing.md }}>
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
                    color: isDone ? '#6d28d9' : isCurrentWeek ? '#7c3aed' : tokens.colors.text.secondary,
                  }}>
                    {Math.round(weekProgress)}%
                  </span>
                </div>
                <div style={{ height: '6px', backgroundColor: tokens.colors.gray[100], borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${weekProgress}%`,
                    background: isDone
                      ? 'linear-gradient(90deg, #6d28d9 0%, #a78bfa 100%)'
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

      {/* 14-Day Activity Chart */}
      <div style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.xl,
        marginTop: tokens.spacing['2xl'],
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}>
          <Calendar size={15} strokeWidth={2} color="#0ea5e9" style={{ filter: 'drop-shadow(0 0 4px rgba(14,165,233,0.4))' }} />
          <h3 style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.01em' }}>
            Last 14 Days
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '72px' }}>
          {last14DaysData.map(({ dateStr, label, completed, isToday }) => {
            const barHeight = completed === 0 ? 4 : Math.max(10, (completed / maxDayBar) * 56);
            return (
              <div
                key={dateStr}
                title={`${dateStr}: ${completed} task${completed === 1 ? '' : 's'} completed`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
              >
                <div style={{
                  width: '100%',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  backgroundColor: tokens.colors.gray[100],
                  borderRadius: '4px',
                  overflow: 'hidden',
                  outline: isToday ? '2px solid #7c3aed' : 'none',
                  outlineOffset: '1px',
                }}>
                  <div style={{
                    width: '100%',
                    height: `${barHeight}px`,
                    background: isToday
                      ? 'linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%)'
                      : completed === 0
                        ? 'transparent'
                        : 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)',
                    borderRadius: '3px',
                    transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
                <span style={{
                  fontSize: '9px',
                  color: isToday ? '#7c3aed' : tokens.colors.text.tertiary,
                  fontWeight: isToday ? tokens.typography.weights.semibold : tokens.typography.weights.regular,
                  lineHeight: 1,
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: tokens.spacing.lg, marginTop: tokens.spacing.lg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }} />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>Tasks done</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#7c3aed', outline: '2px solid #7c3aed', outlineOffset: '1px' }} />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
