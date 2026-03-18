import { useMemo, useState } from 'react';
import { Flame, TrendingUp, Calendar, CheckCircle, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@core/store/useStore';
import { useBreakpoint } from '@hooks/useBreakpoint';
import StreakCalendar, { type CalendarDay } from './progress/StreakCalendar';
import PersonalRecords from './progress/PersonalRecords';
import TrendSparkline from './progress/TrendSparkline';
import CoachSummary from './progress/CoachSummary';
import DifficultyTrend from './progress/DifficultyTrend';
import TaskTypeBreakdown from './progress/TaskTypeBreakdown';
import SkipPatterns from './progress/SkipPatterns';
import ConsistencyScore from './progress/ConsistencyScore';
import { useFeedbackMetrics } from '../hooks/useFeedbackMetrics';

export default function InsightsView() {
  const { tasks, currentDay, streak, roadmap } = useStore();
  const agentRoadmap = useStore(s => s.agentRoadmap);
  const { isMobile } = useBreakpoint();
  const [historyOpen, setHistoryOpen] = useState(false);
  const metrics = useFeedbackMetrics();

  const currentWeek = Math.ceil(currentDay / 7);
  const totalDays = agentRoadmap?.roadmap?.totalDays
    ?? ((roadmap?.strategicPlan?.totalWeeks ?? Math.ceil((roadmap?.duration || 3) * 4)) * 7);
  const totalWeeks = Math.ceil(totalDays / 7);
  const estimatedTotalMinutes = (totalWeeks * 5 * 45); // rough estimate

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Previous week completion for context
  const prevWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek - 1);
  const prevWeekDone = prevWeekTasks.filter(t => t.completed).length;
  const prevWeekCompletion = prevWeekTasks.length > 0
    ? Math.round((prevWeekDone / prevWeekTasks.length) * 100) : null;

  const thisWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek);
  const thisWeekCompleted = thisWeekTasks.filter(t => t.completed).length;
  const weeklyCompletion = thisWeekTasks.length > 0
    ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100) : 0;

  const totalMinutesInvested = useMemo(
    () => tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.duration || 0), 0),
    [tasks],
  );
  const hoursInvested = Math.round((totalMinutesInvested / 60) * 10) / 10;
  const estimatedHoursTotal = Math.round(estimatedTotalMinutes / 60);
  const hoursRemaining = Math.max(0, estimatedHoursTotal - hoursInvested);

  // Calendar days (last 28)
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const tasksByDay = new Map<number, { total: number; completed: number }>();
    tasks.forEach(t => {
      const d = t.day;
      const existing = tasksByDay.get(d) ?? { total: 0, completed: 0 };
      existing.total += 1;
      if (t.completed) existing.completed += 1;
      tasksByDay.set(d, existing);
    });
    const result: CalendarDay[] = [];
    for (let d = Math.max(1, currentDay - 27); d <= currentDay + (28 - (currentDay % 28 || 28)); d++) {
      const diffFromToday = d - currentDay;
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + diffFromToday);
      const date = dateObj.toISOString().split('T')[0];
      let status: CalendarDay['status'];
      if (d > currentDay) { status = 'future'; }
      else if (d === currentDay) { status = 'today'; }
      else {
        const dayData = tasksByDay.get(d);
        if (!dayData || dayData.total === 0) status = d % 7 === 0 ? 'rest' : 'missed';
        else if (dayData.completed >= dayData.total) status = 'completed';
        else if (dayData.completed > 0) status = 'partial';
        else status = 'missed';
      }
      result.push({ dayNumber: d, date, status });
    }
    return result.slice(0, 28);
  }, [tasks, currentDay]);

  // Personal records
  const longestStreak = useMemo(() => {
    let best = 0, cur = 0;
    for (const d of calendarDays) {
      if (d.status === 'completed' || d.status === 'today') { cur++; if (cur > best) best = cur; }
      else if (d.status !== 'future') { cur = 0; }
    }
    return Math.max(best, streak);
  }, [calendarDays, streak]);

  const bestWeek = useMemo(() => {
    const hwt = tasks.length > 0 ? Math.max(...tasks.map(t => Math.ceil(t.day / 7))) : 1;
    let bestNum = 1, bestPct = 0;
    for (let w = 1; w <= hwt; w++) {
      const wTasks = tasks.filter(t => Math.ceil(t.day / 7) === w);
      const wDone = wTasks.filter(t => t.completed).length;
      const pct = wTasks.length > 0 ? Math.round((wDone / wTasks.length) * 100) : 0;
      if (pct > bestPct) { bestPct = pct; bestNum = w; }
    }
    return { number: bestNum, percentage: bestPct };
  }, [tasks]);

  // Trend data
  const trendData = useMemo(() => {
    const hwt = tasks.length > 0 ? Math.max(...tasks.map(t => Math.ceil(t.day / 7))) : currentWeek;
    return Array.from({ length: Math.min(hwt, currentWeek) }, (_, i) => {
      const w = i + 1;
      const wTasks = tasks.filter(t => Math.ceil(t.day / 7) === w);
      const wDone = wTasks.filter(t => t.completed).length;
      return { week: w, percentage: wTasks.length > 0 ? Math.round((wDone / wTasks.length) * 100) : 0 };
    });
  }, [tasks, currentWeek]);

  // Coach summary
  const coachSummary = (() => {
    try { return localStorage.getItem('coheren_coach_summary') ?? ''; } catch { return ''; }
  })();

  // Context sentences for momentum strip
  const completionContext = prevWeekCompletion !== null
    ? overallCompletion >= prevWeekCompletion
      ? `up from ${prevWeekCompletion}% last week`
      : `down from ${prevWeekCompletion}% last week`
    : 'overall completion rate';

  const streakContext = streak >= longestStreak && streak > 0
    ? 'your longest yet'
    : streak > 0
    ? `best is ${longestStreak} days`
    : 'keep going';

  const hoursContext = hoursRemaining > 0
    ? `~${hoursRemaining}h to go`
    : 'goal within reach';

  const weekContext = `week ${currentWeek} of ${totalWeeks}`;

  const momentumStats = [
    { icon: TrendingUp, label: 'COMPLETION', value: `${overallCompletion}%`, context: completionContext, color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '#ddd6fe' },
    { icon: Flame, label: 'STREAK',     value: `${streak}d`,             context: streakContext,    color: '#f97316', bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '#fed7aa' },
    { icon: CheckCircle, label: 'HOURS',  value: `${hoursInvested}h`,     context: hoursContext,     color: '#22c55e', bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#bbf7d0' },
    { icon: Calendar,  label: 'PROGRESS', value: weekContext,              context: `${weeklyCompletion}% this week`, color: '#0ea5e9', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#bfdbfe' },
  ];

  // History log (last 30 completed tasks)
  const historyTasks = [...tasks]
    .filter(t => t.completed)
    .sort((a, b) => b.day - a.day)
    .slice(0, 30);

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Page title */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: '0 0 20px', letterSpacing: '-0.03em' }}>
        Progress
      </h1>

      {/* ── 1. Momentum Strip — horizontal scroll on mobile ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        overflowX: isMobile ? 'auto' : 'visible',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        paddingBottom: isMobile ? 4 : 0,
      }}>
        {momentumStats.map(({ icon: Icon, label, value, context, color, bg, border }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.07 }}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 14,
              padding: '12px 14px',
              flexShrink: 0,
              minWidth: isMobile ? 140 : 0,
              flex: isMobile ? 'none' : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon size={12} color={color} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 2px', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{context}</p>
          </motion.div>
        ))}
      </div>

      {/* ── 2. Activity Calendar — full width centrepiece ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
          28-Day Activity
        </p>
        <StreakCalendar days={calendarDays} currentStreak={streak} longestStreak={longestStreak} />
      </div>

      {/* ── 3. Weekly Performance — 2-col on desktop ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 12,
        marginBottom: 20,
      }}>
        {trendData.length > 1 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              Weekly Trend
            </p>
            <TrendSparkline data={trendData} />
          </div>
        )}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
            Personal Records
          </p>
          <PersonalRecords
            longestStreak={longestStreak}
            totalTasksDone={completedTasks}
            totalMinutes={totalMinutesInvested}
            bestWeekNumber={bestWeek.number}
            bestWeekPercent={bestWeek.percentage}
          />
        </div>
      </div>

      {/* ── 4. AI Observations ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Brain size={13} color="#7c3aed" />
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
            AI Observations
          </p>
        </div>
        <CoachSummary summary={coachSummary} />
      </div>

      {/* ── 5. Deep Insights — 2×2 grid ── */}
      {(metrics.taskTypeBreakdown.length > 0 || metrics.difficultyTrend.length >= 2 || metrics.skipPatterns.length > 0) && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
            Deep Insights
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#fff', border: '1px solid #f0f0f5', borderRadius: 16, padding: 16, overflow: 'hidden' }}>
              <ConsistencyScore score={metrics.consistencyScore} />
            </div>
            {metrics.taskTypeBreakdown.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #f0f0f5', borderRadius: 16, padding: 16, overflow: 'hidden' }}>
                <TaskTypeBreakdown data={metrics.taskTypeBreakdown} />
              </div>
            )}
            {metrics.difficultyTrend.length >= 2 && (
              <div style={{ background: '#fff', border: '1px solid #f0f0f5', borderRadius: 16, padding: 16, overflow: 'hidden' }}>
                <DifficultyTrend data={metrics.difficultyTrend} />
              </div>
            )}
            {metrics.skipPatterns.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #f0f0f5', borderRadius: 16, padding: 16, overflow: 'hidden' }}>
                <SkipPatterns data={metrics.skipPatterns} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. History (collapsible) ── */}
      <div>
        <button
          onClick={() => setHistoryOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '12px 0',
            background: 'none', border: 'none', cursor: 'pointer',
            borderTop: '1px solid #f0f0f5',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            History ({historyTasks.length})
          </span>
          {historyOpen ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
        </button>
        {historyOpen && (
          <div style={{ paddingTop: 8 }}>
            {historyTasks.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Complete tasks to build your history.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {historyTasks.map((task) => (
                  <div key={task.id} style={{
                    background: '#fff', border: '1px solid #f3f4f6',
                    borderRadius: 12, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <CheckCircle size={14} color="#7c3aed" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#374151', margin: '0 0 2px', fontWeight: 500, lineHeight: 1.3 }}>
                        {task.title}
                      </p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Day {task.day}</p>
                    </div>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 99,
                      background: 'rgba(124,58,237,0.07)', color: '#7c3aed',
                      flexShrink: 0,
                    }}>
                      {task.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
