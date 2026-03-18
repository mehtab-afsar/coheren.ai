import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, CheckCircle, Flame, Brain, Zap } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';
import { shouldTriggerCheckpoint } from '@core/agents/recalibrator';

import StreakCalendar, { type CalendarDay } from './progress/StreakCalendar';
import PersonalRecords from './progress/PersonalRecords';
import TrendSparkline from './progress/TrendSparkline';
import CoachSummary from './progress/CoachSummary';

export default function ProgressView() {
  const { tasks, currentDay, streak, roadmap } = useStore();
  const agentRoadmap = useStore(s => s.agentRoadmap);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentWeek = Math.ceil(currentDay / 7);
  const totalDays = agentRoadmap?.roadmap?.totalDays
    ?? ((roadmap?.strategicPlan?.totalWeeks ?? Math.ceil((roadmap?.duration || 3) * 4)) * 7);
  const totalWeeks = Math.ceil(totalDays / 7);
  const thisWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek);
  const thisWeekCompleted = thisWeekTasks.filter(t => t.completed).length;
  const weeklyCompletion = thisWeekTasks.length > 0
    ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100)
    : 0;

  const highestWeekWithTasks = tasks.length > 0
    ? Math.max(...tasks.map(t => Math.ceil(t.day / 7)))
    : currentWeek;
  const weeksToShow = Math.min(highestWeekWithTasks, totalWeeks);

  const { currentPhaseName, currentPhaseDescription } = (() => {
    if (agentRoadmap?.roadmap?.phases) {
      let elapsed = 0;
      for (const p of agentRoadmap.roadmap.phases) {
        const dur = p.durationDays ?? 14;
        if (currentDay <= elapsed + dur) {
          return {
            currentPhaseName: p.phaseName,
            currentPhaseDescription: p.primaryGoals?.[0] ?? p.scienceRationale ?? '',
          };
        }
        elapsed += dur;
      }
      const last = agentRoadmap.roadmap.phases[agentRoadmap.roadmap.phases.length - 1];
      return { currentPhaseName: last.phaseName, currentPhaseDescription: last.primaryGoals?.[0] ?? '' };
    }
    const weekTemplates = roadmap?.strategicPlan?.weekTemplates ?? [];
    const currentWeekTemplate = weekTemplates.find((w: { weekNumber: number }) => w.weekNumber === currentWeek)
      ?? weekTemplates[weekTemplates.length - 1];
    return {
      currentPhaseName: currentWeekTemplate?.focus ?? roadmap?.category ?? 'Your journey',
      currentPhaseDescription: currentWeekTemplate?.description ?? '',
    };
  })();

  const nextCheckpointDay = Array.from({ length: 200 }, (_, i) => i + currentDay + 1)
    .find(d => shouldTriggerCheckpoint(d, 14)) ?? (currentDay + 14);
  const daysToCheckpoint = nextCheckpointDay - currentDay;
  const checkpointToday = shouldTriggerCheckpoint(currentDay, 14);

  // ── Task type breakdown ─────────────────────────────────────────────────
  const typeBreakdown = [
    { label: 'Practice',   type: 'practice',   color: '#7c3aed', gradient: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)' },
    { label: 'Learning',   type: 'learning',   color: '#0ea5e9', gradient: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)' },
    { label: 'Reflection', type: 'reflection', color: '#7c3aed', gradient: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)' },
  ].map(({ label, type, color, gradient }) => {
    const count = tasks.filter(t => t.completed && t.type === type).length;
    const pct = completedTasks > 0 ? Math.round((count / completedTasks) * 100) : 0;
    return { label, color, gradient, count, pct };
  });

  // ── StreakCalendar data ────────────────────────────────────────────────
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const startDay = Math.max(1, currentDay - 27);
    const result: CalendarDay[] = [];

    // Build a map: app day number → tasks for that day
    const tasksByDay = new Map<number, { total: number; completed: number }>();
    tasks.forEach(t => {
      const d = t.day;
      const existing = tasksByDay.get(d) ?? { total: 0, completed: 0 };
      existing.total += 1;
      if (t.completed) existing.completed += 1;
      tasksByDay.set(d, existing);
    });

    for (let d = startDay; d <= currentDay + (28 - (currentDay % 28 || 28)); d++) {
      // Compute a rough date for display (relative to today)
      const diffFromToday = d - currentDay;
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + diffFromToday);
      const date = dateObj.toISOString().split('T')[0];

      let status: CalendarDay['status'];
      if (d > currentDay) {
        status = 'future';
      } else if (d === currentDay) {
        status = 'today';
      } else if (d % 7 === 0) {
        // Rest day — only if no tasks were assigned for that day
        const dayData = tasksByDay.get(d);
        if (!dayData || dayData.total === 0) {
          status = 'rest';
        } else if (dayData.completed >= dayData.total) {
          status = 'completed';
        } else if (dayData.completed > 0) {
          status = 'partial';
        } else {
          status = 'missed';
        }
      } else {
        const dayData = tasksByDay.get(d);
        if (!dayData || dayData.total === 0) {
          status = 'missed';
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

    // Limit to 28 cells (4 weeks)
    return result.slice(0, 28);
  }, [tasks, currentDay]);

  // ── Personal Records ───────────────────────────────────────────────────
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

  const bestWeek = useMemo(() => {
    const hwt = tasks.length > 0 ? Math.max(...tasks.map(t => Math.ceil(t.day / 7))) : 1;
    let bestNum = 1, bestPct = 0;
    for (let w = 1; w <= hwt; w++) {
      const wTasks = tasks.filter(t => Math.ceil(t.day / 7) === w);
      const wDone  = wTasks.filter(t => t.completed).length;
      const pct    = wTasks.length > 0 ? Math.round((wDone / wTasks.length) * 100) : 0;
      if (pct > bestPct) { bestPct = pct; bestNum = w; }
    }
    return { number: bestNum, percentage: bestPct };
  }, [tasks]);

  const totalMinutesInvested = useMemo(
    () => tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.duration || 0), 0),
    [tasks],
  );

  // ── TrendSparkline data ────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const hwt = tasks.length > 0 ? Math.max(...tasks.map(t => Math.ceil(t.day / 7))) : currentWeek;
    return Array.from({ length: Math.min(hwt, currentWeek) }, (_, i) => {
      const w = i + 1;
      const wTasks = tasks.filter(t => Math.ceil(t.day / 7) === w);
      const wDone  = wTasks.filter(t => t.completed).length;
      const pct    = wTasks.length > 0 ? Math.round((wDone / wTasks.length) * 100) : 0;
      return { week: w, percentage: pct };
    });
  }, [tasks, currentWeek]);

  // ── Coach Summary ──────────────────────────────────────────────────────
  const coachSummary = (() => {
    try {
      return localStorage.getItem('coheren_coach_summary') ?? '';
    } catch {
      return '';
    }
  })();

  // ── Stat cards (top strip) ─────────────────────────────────────────────
  const statCards = [
    {
      icon: Flame,
      label: 'Streak',
      value: String(streak),
      accentColor: streak > 0 ? '#f97316' : tokens.colors.gray[200],
      iconColor: streak > 0 ? '#f97316' : tokens.colors.gray[300],
      iconFilter: streak > 0 ? 'drop-shadow(0 0 4px rgba(249,115,22,0.5))' : 'none',
    },
    {
      icon: TrendingUp,
      label: 'Overall',
      value: `${overallCompletion}%`,
      accentColor: '#7c3aed',
      iconColor: '#7c3aed',
      iconFilter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))',
    },
    {
      icon: Calendar,
      label: 'This Week',
      value: `${weeklyCompletion}%`,
      accentColor: '#0ea5e9',
      iconColor: '#0ea5e9',
      iconFilter: 'drop-shadow(0 0 4px rgba(14,165,233,0.4))',
    },
    {
      icon: CheckCircle,
      label: 'Day',
      value: String(currentDay),
      accentColor: '#7c3aed',
      iconColor: '#7c3aed',
      iconFilter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))',
    },
  ];

  return (
    <div style={{ padding: '0 0 120px' }}>
      {/* Header */}
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
          <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.light, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          marginBottom: 16,
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
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
              <span style={{ fontSize: '9px', color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── StreakCalendar ────────────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <StreakCalendar
          days={calendarDays}
          currentStreak={streak}
          longestStreak={longestStreak}
        />
      </div>

      {/* ── PersonalRecords ───────────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <PersonalRecords
          longestStreak={longestStreak}
          totalTasksDone={completedTasks}
          totalMinutes={totalMinutesInvested}
          bestWeekNumber={bestWeek.number}
          bestWeekPercent={bestWeek.percentage}
        />
      </div>

      {/* ── TrendSparkline ────────────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <TrendSparkline data={trendData} />
      </div>

      {/* ── CoachSummary ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <CoachSummary summary={coachSummary} />
      </div>

      {/* ── Journey Context Card (checkpoint) ────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, #ffffff 100%)',
        border: '1px solid rgba(124,58,237,0.14)',
        borderLeft: '4px solid #7c3aed',
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.xl,
        marginTop: 16,
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
            <p style={{ fontSize: '10px', color: '#7c3aed', fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
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
            <p style={{ fontSize: '10px', color: checkpointToday ? '#7c3aed' : tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
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

      {/* ── Activity Breakdown ────────────────────────────────────────────── */}
      {completedTasks > 0 && (
        <div style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.xl,
          marginTop: 16,
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

      {/* ── Progress by Week ──────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.xl,
        marginTop: 16,
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
            const weekTasks     = tasks.filter(t => Math.ceil(t.day / 7) === week);
            const weekCompleted = weekTasks.filter(t => t.completed).length;
            const weekProgress  = weekTasks.length > 0 ? (weekCompleted / weekTasks.length) * 100 : 0;
            const isCurrentWeek = week === currentWeek;
            const isDone        = weekProgress === 100;

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

    </div>
  );
}
