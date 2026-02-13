import { TrendingUp, Calendar, CheckCircle, Flame, Brain } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { shouldTriggerCheckpoint } from '@core/agents/recalibrator';

export default function ProgressView() {
  const { tasks, currentDay, streak, roadmap } = useStore();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate weekly stats
  const currentWeek = Math.ceil(currentDay / 7);
  const totalWeeks = roadmap?.strategicPlan?.totalWeeks || Math.ceil((roadmap?.duration || 3) * 4);
  const thisWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek);
  const thisWeekCompleted = thisWeekTasks.filter(t => t.completed).length;
  const weeklyCompletion = thisWeekTasks.length > 0
    ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100)
    : 0;

  // Calculate which weeks to display (weeks that have been reached or started)
  const highestWeekWithTasks = tasks.length > 0
    ? Math.max(...tasks.map(t => Math.ceil(t.day / 7)))
    : currentWeek;
  const weeksToShow = Math.min(highestWeekWithTasks, totalWeeks);

  // Current phase name from roadmap week templates
  const weekTemplates = roadmap?.strategicPlan?.weekTemplates ?? [];
  const currentWeekTemplate = weekTemplates.find(w => w.weekNumber === currentWeek)
    ?? weekTemplates[weekTemplates.length - 1];
  const currentPhaseName = currentWeekTemplate?.focus ?? roadmap?.category ?? 'Your journey';
  const currentPhaseDescription = currentWeekTemplate?.description ?? '';

  // Days until next checkpoint
  const nextCheckpointDay = Array.from({ length: 200 }, (_, i) => i + currentDay + 1)
    .find(d => shouldTriggerCheckpoint(d, 14)) ?? (currentDay + 14);
  const daysToCheckpoint = nextCheckpointDay - currentDay;

  // Whether a checkpoint review is coming up today
  const checkpointToday = shouldTriggerCheckpoint(currentDay, 14);

  return (
    <div>
      <h1 style={{ ...text.h1, marginBottom: tokens.spacing['2xl'] }}>
        Your Progress
      </h1>

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: tokens.spacing.lg,
        marginBottom: tokens.spacing['2xl']
      }}>
        {/* Streak */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.primary,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Flame size={24} color="#ff6b35" />
            <h3 style={{ ...text.h4, color: tokens.colors.text.inverse, margin: 0 }}>
              Current Streak
            </h3>
          </div>
          <p style={{ ...text.display, color: tokens.colors.text.inverse, fontSize: '48px', margin: 0 }}>
            {streak}
          </p>
          <p style={{ ...text.caption, color: tokens.colors.text.inverse }}>
            {streak === 1 ? 'day' : 'days'} in a row
          </p>
        </div>

        {/* Overall Progress */}
        <div style={card.standard}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <TrendingUp size={24} color={tokens.colors.text.secondary} />
            <h3 style={{ ...text.h4, margin: 0 }}>Overall Progress</h3>
          </div>
          <p style={{ ...text.display, fontSize: '48px', margin: 0 }}>
            {overallCompletion}%
          </p>
          <p style={{ ...text.caption, color: tokens.colors.text.secondary }}>
            {completedTasks} of {totalTasks} tasks
          </p>
        </div>

        {/* This Week */}
        <div style={card.standard}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Calendar size={24} color={tokens.colors.text.secondary} />
            <h3 style={{ ...text.h4, margin: 0 }}>This Week</h3>
          </div>
          <p style={{ ...text.display, fontSize: '48px', margin: 0 }}>
            {weeklyCompletion}%
          </p>
          <p style={{ ...text.caption, color: tokens.colors.text.secondary }}>
            Week {currentWeek} completion
          </p>
        </div>

        {/* Current Day */}
        <div style={card.standard}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <CheckCircle size={24} color={tokens.colors.text.secondary} />
            <h3 style={{ ...text.h4, margin: 0 }}>Current Day</h3>
          </div>
          <p style={{ ...text.display, fontSize: '48px', margin: 0 }}>
            {currentDay}
          </p>
          <p style={{ ...text.caption, color: tokens.colors.text.secondary }}>
            Keep going!
          </p>
        </div>
      </div>

      {/* Your Journey Context Card */}
      <div style={{
        ...card.standard,
        marginBottom: tokens.spacing['2xl'],
        borderLeft: `4px solid ${tokens.colors.primary}`,
        borderRadius: `0 ${tokens.borderRadius['2xl']} ${tokens.borderRadius['2xl']} 0`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: tokens.spacing.lg,
          marginBottom: tokens.spacing.lg,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: tokens.borderRadius.xl,
            backgroundColor: `${tokens.colors.primary}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Brain size={20} color={tokens.colors.primary} />
          </div>
          <div>
            <h3 style={{ ...text.h3, marginBottom: tokens.spacing.xs }}>
              Why these tasks?
            </h3>
            <p style={{ ...text.caption, color: tokens.colors.text.secondary }}>
              Your roadmap is personalised to your behavioral profile and goal.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.spacing.lg,
        }}>
          {/* Current Phase */}
          <div style={{
            padding: tokens.spacing.md,
            backgroundColor: tokens.colors.background,
            borderRadius: tokens.borderRadius.xl,
            border: `1px solid ${tokens.colors.border}`,
          }}>
            <p style={{ ...text.caption, color: tokens.colors.text.tertiary, marginBottom: tokens.spacing.xs }}>
              Current Focus
            </p>
            <p style={{ ...text.body, fontWeight: tokens.typography.weights.medium, marginBottom: tokens.spacing.xs }}>
              {currentPhaseName}
            </p>
            {currentPhaseDescription && (
              <p style={{ ...text.caption, color: tokens.colors.text.secondary, lineHeight: 1.5 }}>
                {currentPhaseDescription.length > 80
                  ? currentPhaseDescription.substring(0, 80) + '…'
                  : currentPhaseDescription}
              </p>
            )}
          </div>

          {/* Next Checkpoint */}
          <div style={{
            padding: tokens.spacing.md,
            backgroundColor: checkpointToday
              ? `${tokens.colors.primary}08`
              : tokens.colors.background,
            borderRadius: tokens.borderRadius.xl,
            border: `1px solid ${checkpointToday ? tokens.colors.primary : tokens.colors.border}`,
          }}>
            <p style={{ ...text.caption, color: tokens.colors.text.tertiary, marginBottom: tokens.spacing.xs }}>
              {checkpointToday ? 'Checkpoint today' : 'Next AI review'}
            </p>
            <p style={{
              ...text.body,
              fontWeight: tokens.typography.weights.medium,
              color: checkpointToday ? tokens.colors.primary : tokens.colors.text.primary,
              marginBottom: tokens.spacing.xs,
            }}>
              {checkpointToday ? 'Day ' + String(currentDay) : 'In ' + String(daysToCheckpoint) + ' day' + (daysToCheckpoint === 1 ? '' : 's')}
            </p>
            <p style={{ ...text.caption, color: tokens.colors.text.secondary, lineHeight: 1.5 }}>
              {checkpointToday
                ? 'Your Coach will recalibrate your sprint today.'
                : 'Your Coach reviews your progress every 14 days and adapts your roadmap.'}
            </p>
          </div>

          {/* Behavioral Profile */}
          <div style={{
            padding: tokens.spacing.md,
            backgroundColor: tokens.colors.background,
            borderRadius: tokens.borderRadius.xl,
            border: `1px solid ${tokens.colors.border}`,
          }}>
            <p style={{ ...text.caption, color: tokens.colors.text.tertiary, marginBottom: tokens.spacing.xs }}>
              Behavioral Profile
            </p>
            <p style={{ ...text.body, fontWeight: tokens.typography.weights.medium, marginBottom: tokens.spacing.xs }}>
              Personalized
            </p>
            <p style={{ ...text.caption, color: tokens.colors.text.secondary, lineHeight: 1.5 }}>
              Your tasks are shaped by the behavioral patterns identified during onboarding. Complete a checkpoint to see your detailed profile.
            </p>
          </div>
        </div>
      </div>

      {/* Progress by Week */}
      <div style={card.standard}>
        <h3 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>
          Progress by Week
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.md
        }}>
          {Array.from({ length: weeksToShow }, (_, i) => i + 1).map(week => {
            const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === week);
            const weekCompleted = weekTasks.filter(t => t.completed).length;
            const weekProgress = weekTasks.length > 0
              ? (weekCompleted / weekTasks.length) * 100
              : 0;

            return (
              <div key={week}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: tokens.spacing.xs
                }}>
                  <span style={{ ...text.body, fontWeight: week === currentWeek ? 500 : 300 }}>
                    Week {week}
                  </span>
                  <span style={{ ...text.caption, color: tokens.colors.text.secondary }}>
                    {Math.round(weekProgress)}%
                  </span>
                </div>
                <div style={{
                  height: '8px',
                  backgroundColor: tokens.colors.gray[200],
                  borderRadius: tokens.borderRadius.sm,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${weekProgress}%`,
                    backgroundColor: week === currentWeek ? tokens.colors.primary : tokens.colors.gray[600],
                    transition: 'width 0.3s'
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
