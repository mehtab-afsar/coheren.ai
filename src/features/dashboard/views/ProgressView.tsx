import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { shouldTriggerCheckpoint } from '@core/agents/recalibrator';
import { useCoachMessages } from '../hooks/useCoachMessages';
import StreakCalendar, { type CalendarDay } from './progress/StreakCalendar';
import TrendSparkline from './progress/TrendSparkline';

function getStatus(pct: number): { label: string; color: string; bgColor: string; borderColor: string } {
  if (pct >= 80) return { label: 'On Track',     color: 'var(--c-accent-green)',  bgColor: 'rgba(34,197,94,0.05)',  borderColor: 'rgba(34,197,94,0.15)' };
  if (pct >= 50) return { label: 'In Progress',  color: 'var(--c-accent-amber)',  bgColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.15)' };
  return {          label: 'Getting there', color: 'var(--c-text-tertiary)',  bgColor: 'var(--c-surface-card)',  borderColor: 'var(--c-border-subtle)' };
}

const TYPE_LABELS: Record<string, { label: string }> = {
  practice:   { label: 'Practice'   },
  learning:   { label: 'Learning'   },
  reflection: { label: 'Reflection' },
  challenge:  { label: 'Challenge'  },
  retrieval:  { label: 'Recall'     },
  rest:       { label: 'Rest'       },
};

const TYPE_SKIP_LABELS: Record<string, { label: string }> = {
  time:       { label: 'Time constraints' },
  difficulty: { label: 'Too difficult' },
  health:     { label: 'Health / energy' },
  external:   { label: 'External reasons' },
};

export default function ProgressView() {
  const { tasks, currentDay, streak, roadmap } = useStore();
  const agentRoadmap = useStore(s => s.agentRoadmap);
  const { getMessages } = useCoachMessages();

  // ── Computed stats ──────────────────────────────────────────────────────
  const completedTasks = tasks.filter(t => t.completed).length;

  const currentWeek = Math.ceil(currentDay / 7);
  const thisWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek);
  const weeklyCompletion = thisWeekTasks.length > 0
    ? Math.round((thisWeekTasks.filter(t => t.completed).length / thisWeekTasks.length) * 100)
    : 0;

  const status = getStatus(weeklyCompletion);

  // Coach insight (most recent message)
  const recentCoachMessage = useMemo(() => {
    const msgs = getMessages();
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  }, [getMessages]);

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.completed) counts[t.type] = (counts[t.type] ?? 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        label: TYPE_LABELS[type]?.label ?? type,
        count,
        pct: completedTasks > 0 ? Math.round((count / completedTasks) * 100) : 0,
      }));
  }, [tasks, completedTasks]);

  // Skip patterns
  const skipPatterns = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.skipped && t.skipReason) {
        counts[t.skipReason] = (counts[t.skipReason] ?? 0) + 1;
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({
        reason,
        label: TYPE_SKIP_LABELS[reason]?.label ?? reason,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [tasks]);

  // Calendar
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const tasksByDay = new Map<number, { total: number; completed: number }>();
    tasks.forEach(t => {
      const existing = tasksByDay.get(t.day) ?? { total: 0, completed: 0 };
      existing.total += 1;
      if (t.completed) existing.completed += 1;
      tasksByDay.set(t.day, existing);
    });

    const startDay = Math.max(1, currentDay - 27);
    const result: CalendarDay[] = [];
    for (let d = startDay; d <= currentDay + (28 - (currentDay % 28 || 28)); d++) {
      const diffFromToday = d - currentDay;
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + diffFromToday);
      const date = dateObj.toISOString().split('T')[0];

      let status: CalendarDay['status'];
      if (d > currentDay) {
        status = 'future';
      } else if (d === currentDay) {
        status = 'today';
      } else {
        const dayData = tasksByDay.get(d);
        if (!dayData || dayData.total === 0) {
          status = d % 7 === 0 ? 'rest' : 'missed';
        } else if (dayData.completed >= dayData.total) {
          status = 'completed';
        } else if (dayData.completed > 0) {
          status = 'partial';
        } else {
          status = 'missed';
        }
      }
      result.push({ dayNumber: d, date, status });
    }
    return result.slice(0, 28);
  }, [tasks, currentDay]);

  // Longest streak from calendar
  const longestStreak = useMemo(() => {
    let best = 0, current = 0;
    for (const d of calendarDays) {
      if (d.status === 'completed' || d.status === 'today') {
        current++;
        if (current > best) best = current;
      } else if (d.status !== 'future') {
        current = 0;
      }
    }
    return Math.max(best, streak);
  }, [calendarDays, streak]);

  // Trend sparkline
  const trendData = useMemo(() => {
    const hwt = tasks.length > 0 ? Math.max(...tasks.map(t => Math.ceil(t.day / 7))) : currentWeek;
    return Array.from({ length: Math.min(hwt, currentWeek) }, (_, i) => {
      const w = i + 1;
      const wTasks = tasks.filter(t => Math.ceil(t.day / 7) === w);
      const pct = wTasks.length > 0
        ? Math.round((wTasks.filter(t => t.completed).length / wTasks.length) * 100)
        : 0;
      return { week: w, percentage: pct };
    });
  }, [tasks, currentWeek]);

  // Checkpoint
  const totalDays = agentRoadmap?.roadmap?.totalDays
    ?? ((roadmap?.strategicPlan?.totalWeeks ?? Math.ceil((roadmap?.duration || 3) * 4)) * 7);
  const totalWeeks = Math.ceil(totalDays / 7);
  void totalWeeks; // used in checkpoint logic

  const nextCheckpointDay = Array.from({ length: 200 }, (_, i) => i + currentDay + 1)
    .find(d => shouldTriggerCheckpoint(d, 7)) ?? (currentDay + 7);
  const daysToCheckpoint = nextCheckpointDay - currentDay;
  const checkpointToday = shouldTriggerCheckpoint(currentDay, 7);

  // Coach message type display
  const coachTypeLabels: Record<string, string> = {
    daily_brief:         'Daily Brief',
    task_complete:       'Task Complete',
    streak_milestone:    'Streak',
    plan_adjustment:     'Plan Adjusted',
    pattern_observation: 'Pattern Observation',
    intro:               'Welcome',
  };

  return (
    <div style={{ fontFamily: 'var(--c-font-body)', paddingBottom: 80 }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--c-font-display)',
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'var(--c-text-primary)',
          margin: 0,
        }}>
          Progress
        </h1>
      </div>

      {/* ── 3-stat row ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        marginBottom: 24,
      }}>

        {/* Weekly completion */}
        <div style={{
          padding: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 12,
          boxShadow: 'var(--c-shadow-card)',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--c-font-display)',
            fontSize: 32,
            fontWeight: 500,
            color: 'var(--c-text-primary)',
            lineHeight: 1,
            marginBottom: 4,
          }}>
            {weeklyCompletion}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-tertiary)' }}>This week</div>
        </div>

        {/* Streak */}
        <div style={{
          padding: '16px',
          backgroundColor: streak > 0 ? 'rgba(34,197,94,0.04)' : 'var(--c-bg-primary)',
          border: streak > 0 ? '1px solid rgba(34,197,94,0.15)' : '1px solid var(--c-border-subtle)',
          borderRadius: 12,
          boxShadow: 'var(--c-shadow-card)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <Flame size={16} strokeWidth={2} color={streak > 0 ? 'var(--c-accent-green)' : 'var(--c-text-quaternary)'} />
            <div style={{
              fontFamily: 'var(--c-font-display)',
              fontSize: 32,
              fontWeight: 500,
              color: streak > 0 ? 'var(--c-accent-green)' : 'var(--c-text-tertiary)',
              lineHeight: 1,
            }}>
              {streak}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-tertiary)' }}>
            {streak === 1 ? 'day streak' : 'day streak'}
          </div>
        </div>

        {/* Status */}
        <div style={{
          padding: '16px',
          backgroundColor: status.bgColor,
          border: `1px solid ${status.borderColor}`,
          borderRadius: 12,
          boxShadow: 'var(--c-shadow-card)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: status.color,
            marginBottom: 6,
          }} />
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: status.color,
            lineHeight: 1.2,
          }}>
            {status.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-tertiary)', marginTop: 2 }}>
            Week {currentWeek}
          </div>
        </div>
      </div>

      {/* ── Coach Insight hero ─────────────────────────────────────────────── */}
      {recentCoachMessage ? (
        <div style={{
          padding: '20px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 12,
          boxShadow: 'var(--c-shadow-card)',
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--c-text-quaternary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
            fontFamily: 'var(--c-font-body)',
          }}>
            Coach Insight
          </div>
          <p style={{
            fontFamily: 'var(--c-font-display)',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--c-text-primary)',
            lineHeight: 1.6,
            margin: '0 0 12px',
          }}>
            "{recentCoachMessage.text}"
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTop: '1px solid var(--c-border-subtle)',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--c-text-tertiary)',
            }}>
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: 'var(--c-accent-purple)',
                display: 'inline-block',
              }} />
              {coachTypeLabels[recentCoachMessage.type] ?? recentCoachMessage.type}
            </span>
            <span style={{ fontSize: 11, color: 'var(--c-text-quaternary)' }}>
              {new Date(recentCoachMessage.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '20px',
          border: '1px dashed var(--c-border-medium)',
          borderRadius: 12,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'var(--c-text-tertiary)', margin: 0 }}>
            Coach insights will appear here as you complete tasks.
          </p>
        </div>
      )}

      {/* ── Trend sparkline ───────────────────────────────────────────────── */}
      {trendData.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--c-text-quaternary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Last {trendData.length} weeks
          </div>
          <TrendSparkline data={trendData} />
        </div>
      )}

      {/* ── Activity calendar ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <StreakCalendar
          days={calendarDays}
          currentStreak={streak}
          longestStreak={longestStreak}
        />
      </div>

      {/* ── Skip patterns ─────────────────────────────────────────────────── */}
      {skipPatterns.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--c-text-quaternary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Skip Patterns
          </div>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--c-border-subtle)',
            borderRadius: 12,
            padding: '16px',
            boxShadow: 'var(--c-shadow-card)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {skipPatterns.map(({ reason, label, count, pct }) => (
                <div key={reason}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 5,
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                      {count}×
                    </span>
                  </div>
                  <div style={{
                    height: 4,
                    backgroundColor: 'var(--c-surface-card)',
                    borderRadius: 9999,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: 'var(--c-text-quaternary)',
                      borderRadius: 9999,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Task type breakdown ────────────────────────────────────────────── */}
      {typeBreakdown.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--c-text-quaternary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Task Types Completed
          </div>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--c-border-subtle)',
            borderRadius: 12,
            padding: '16px',
            boxShadow: 'var(--c-shadow-card)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {typeBreakdown.map(({ type, label, count, pct }) => (
                <div key={type}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 5,
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                    </span>
                  </div>
                  <div style={{
                    height: 4,
                    backgroundColor: 'var(--c-surface-card)',
                    borderRadius: 9999,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: 'var(--c-accent-purple)',
                      borderRadius: 9999,
                      opacity: 0.5,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Checkpoint countdown ──────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: checkpointToday ? 'rgba(102,126,234,0.06)' : 'var(--c-surface-elevated)',
        border: checkpointToday ? '1px solid var(--c-accent-purple-border)' : '1px solid var(--c-border-subtle)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: checkpointToday ? 'var(--c-accent-purple)' : 'var(--c-text-tertiary)', marginBottom: 2 }}>
            {checkpointToday ? '⚡ AI Review Today' : 'Next AI Review'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>
            {checkpointToday
              ? 'Your coach will recalibrate your plan.'
              : `In ${daysToCheckpoint} day${daysToCheckpoint === 1 ? '' : 's'} — every 14 days`
            }
          </div>
        </div>
      </div>
    </div>
  );
}
