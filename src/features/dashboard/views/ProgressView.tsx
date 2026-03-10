import { useMemo } from 'react';
import { TrendingUp, Calendar, CheckCircle, Flame, Brain, Zap, Trophy, Clock } from 'lucide-react';
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

  const completedByDate = useMemo(() => {
    const byDate: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.completed && t.completedAt) {
        const dateStr = t.completedAt.split('T')[0];
        byDate[dateStr] = (byDate[dateStr] ?? 0) + 1;
      }
    });
    return byDate;
  }, [tasks]);

  const { last14DaysData, maxDayBar } = useMemo(() => {
    const last14Dates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - 13 + i);
      return d.toISOString().split('T')[0];
    });
    const data = last14Dates.map(dateStr => {
      const d = new Date(dateStr + 'T12:00:00');
      const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      return {
        dateStr,
        label: dayNames[d.getDay()],
        completed: completedByDate[dateStr] ?? 0,
        isToday: dateStr === todayDateStr,
      };
    });
    return { last14DaysData: data, maxDayBar: Math.max(1, ...data.map(d => d.completed)) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedByDate, todayDateStr]);

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

  // ── Streak Calendar ────────────────────────────────────────────────────
  // Build a 7-week (49-day) contribution grid ending today
  const calendarDays = useMemo(() => {
    const result: Array<{ date: string; status: 'completed' | 'partial' | 'missed' | 'today' | 'future' }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 48; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;
      const isFuture = d > today;
      if (isFuture) { result.push({ date: dateStr, status: 'future' }); continue; }
      if (isToday) { result.push({ date: dateStr, status: 'today' }); continue; }
      const dayCompleted = completedByDate[dateStr] ?? 0;
      const dayTotal = (() => {
        // Estimate total by checking tasks with completedAt or tasks whose day maps roughly to this date
        const firstTaskDate = tasks.length > 0 && tasks[0].completedAt
          ? new Date(tasks[0].completedAt.split('T')[0])
          : null;
        if (!firstTaskDate) return 0;
        const dayOffset = Math.round((d.getTime() - firstTaskDate.getTime()) / (1000 * 60 * 60 * 24));
        return tasks.filter(t => Math.ceil(t.day / 1) === dayOffset + 1).length;
      })();
      if (dayCompleted === 0) { result.push({ date: dateStr, status: 'missed' }); continue; }
      if (dayTotal > 0 && dayCompleted >= dayTotal) { result.push({ date: dateStr, status: 'completed' }); continue; }
      result.push({ date: dateStr, status: 'partial' });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedByDate, tasks]);

  // ── Personal Records ───────────────────────────────────────────────────
  const longestStreak = useMemo(() => {
    let best = 0, current = 0;
    for (const d of calendarDays) {
      if (d.status === 'completed' || d.status === 'today') { current++; if (current > best) best = current; }
      else if (d.status !== 'future') current = 0;
    }
    return Math.max(best, streak);
  }, [calendarDays, streak]);

  const bestWeek = useMemo(() => {
    const highestWeekWithTasks = tasks.length > 0 ? Math.max(...tasks.map(t => Math.ceil(t.day / 7))) : 1;
    let bestNum = 1, bestPct = 0;
    for (let w = 1; w <= highestWeekWithTasks; w++) {
      const wTasks = tasks.filter(t => Math.ceil(t.day / 7) === w);
      const wDone = wTasks.filter(t => t.completed).length;
      const pct = wTasks.length > 0 ? Math.round((wDone / wTasks.length) * 100) : 0;
      if (pct > bestPct) { bestPct = pct; bestNum = w; }
    }
    return { number: bestNum, percentage: bestPct };
  }, [tasks]);

  const totalMinutesInvested = useMemo(
    () => tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.duration || 0), 0),
    [tasks]
  );
  const formatHours = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // ── Coach Summary ──────────────────────────────────────────────────────
  const coachSummary = (() => {
    if (completedTasks === 0) return "You're just getting started. Every journey begins with a single task — complete one today.";
    if (streak >= 14) return `${streak} days of consistency is rare. Most people never make it past 2 weeks. You're building something real.`;
    if (streak >= 7) return `A full week of consistency. Your brain is forming new neural pathways right now. Keep the chain unbroken.`;
    if (streak >= 3) return `Three days in a row. The pattern is forming. This is the critical window — don't let momentum slip.`;
    if (overallCompletion >= 80) return `${overallCompletion}% overall completion puts you in the top tier. You're not just building habits — you're building identity.`;
    if (weeklyCompletion >= 70) return `Strong week. You completed ${weeklyCompletion}% of your planned tasks. Consistency compounds — keep going.`;
    if (weeklyCompletion < 40 && currentWeek > 1) return `This week has been tough. That's okay — progress isn't linear. Focus on completing just one task today.`;
    return `Day ${currentDay} of your journey. Every task you complete is a vote for the person you're becoming.`;
  })();

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

      {/* ── Streak Calendar ──────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.xl,
        marginBottom: tokens.spacing['2xl'],
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.lg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
            <Flame size={15} strokeWidth={2} color="#f97316" style={{ filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.4))' }} />
            <h3 style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.01em' }}>
              Activity
            </h3>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: tokens.spacing.md }}>
            {[
              { color: '#7c3aed', label: 'Done' },
              { color: 'rgba(124,58,237,0.35)', label: 'Partial' },
              { color: 'rgba(239,68,68,0.3)', label: 'Missed' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                <span style={{ fontSize: 9, color: tokens.colors.text.tertiary }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day-of-week labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} style={{ fontSize: 9, color: tokens.colors.text.tertiary, textAlign: 'center' }}>{d}</span>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {calendarDays.map(({ date, status }) => {
            const bg =
              status === 'completed' ? '#7c3aed' :
              status === 'partial'   ? 'rgba(124,58,237,0.4)' :
              status === 'missed'    ? 'rgba(239,68,68,0.28)' :
              status === 'today'     ? '#7c3aed' :
              'rgba(0,0,0,0.04)';
            const ring = status === 'today' ? '2px solid rgba(124,58,237,0.5)' : 'none';
            return (
              <div
                key={date}
                title={date}
                style={{ aspectRatio: '1', borderRadius: 3, backgroundColor: bg, outline: ring, outlineOffset: 1, transition: 'opacity 0.15s' }}
              />
            );
          })}
        </div>

        {/* Current streak callout */}
        <div style={{ marginTop: tokens.spacing.lg, paddingTop: tokens.spacing.md, borderTop: `1px solid ${tokens.colors.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>Current streak</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Flame size={13} strokeWidth={2} color="#f97316" />
            <span style={{ fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary }}>{streak} day{streak !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* ── Personal Records ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
          <Trophy size={15} strokeWidth={2} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' }} />
          <h3 style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.01em' }}>
            Personal Records
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.sm }}>
          {[
            { icon: Flame,    color: '#f97316', label: 'Longest Streak',   value: `${longestStreak} day${longestStreak !== 1 ? 's' : ''}` },
            { icon: Trophy,   color: '#f59e0b', label: 'Best Week',        value: `Week ${bestWeek.number} · ${bestWeek.percentage}%` },
            { icon: CheckCircle, color: '#7c3aed', label: 'Tasks Done',    value: String(completedTasks) },
            { icon: Clock,    color: '#0ea5e9', label: 'Time Invested',    value: formatHours(totalMinutesInvested) },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} style={{
              backgroundColor: tokens.colors.surface,
              border: `1px solid ${tokens.colors.borderLight}`,
              borderRadius: tokens.borderRadius.lg,
              padding: tokens.spacing.lg,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <Icon size={15} strokeWidth={2} color={color} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: '1.25rem', fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: '0 0 2px', letterSpacing: '-0.03em' }}>{value}</p>
              <p style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Coach Summary ─────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: `${tokens.colors.primary}07`,
        border: `1px solid ${tokens.colors.primary}15`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing.xl,
        marginBottom: tokens.spacing['2xl'],
        display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.md,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: tokens.borderRadius.md,
          backgroundColor: `${tokens.colors.primary}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Brain size={16} color={tokens.colors.primary} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '10px', color: tokens.colors.primary, fontWeight: tokens.typography.weights.semibold, letterSpacing: '0.07em', textTransform: 'uppercase' as const, margin: '0 0 6px' }}>
            Coach Notes
          </p>
          <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, lineHeight: 1.65, margin: 0 }}>
            {coachSummary}
          </p>
        </div>
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
