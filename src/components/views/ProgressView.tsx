import { TrendingUp, Calendar, CheckCircle, Flame } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';

export default function ProgressView() {
  const { tasks, currentDay, streak } = useStore();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate weekly stats
  const currentWeek = Math.ceil(currentDay / 7);
  const thisWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek);
  const thisWeekCompleted = thisWeekTasks.filter(t => t.completed).length;
  const weeklyCompletion = thisWeekTasks.length > 0
    ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100)
    : 0;

  return (
    <div>
      <h1 style={{ ...text.h1, marginBottom: tokens.spacing['2xl'] }}>
        Your Progress
      </h1>

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
          {[1, 2, 3, 4].map(week => {
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
