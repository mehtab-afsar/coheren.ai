import { useMemo, useState } from 'react';
import { Flame, CheckCircle, Brain, ChevronDown, ChevronUp, Trophy, Clock, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@core/store/useStore';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { ap } from '@core/design-system/appleTokens';
import StreakCalendar, { type CalendarDay } from './progress/StreakCalendar';
import CoachSummary from './progress/CoachSummary';
import TaskTypeBreakdown from './progress/TaskTypeBreakdown';
import { useFeedbackMetrics } from '../hooks/useFeedbackMetrics';

// ── Ring Progress ────────────────────────────────────────────────────────────
function RingProgress({ pct, size = 120, stroke = 9, color = '#7c3aed' }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}

// ── Stat Cell ────────────────────────────────────────────────────────────────
function StatCell({ value, label, sub, last = false }: {
  value: string; label: string; sub?: string; last?: boolean;
}) {
  return (
    <div style={{
      flex: 1,
      padding: '14px 0',
      textAlign: 'center',
      borderRight: last ? 'none' : `1px solid ${ap.border}`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: ap.textPrimary, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: ap.textTertiary, marginTop: 3, fontWeight: 500 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: ap.textTertiary, marginTop: 2, opacity: 0.7 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Record Chip ──────────────────────────────────────────────────────────────
function RecordChip({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      background: ap.surface, border: `1px solid ${ap.border}`,
      borderRadius: 14, flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: color + '12', border: `1px solid ${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: ap.textPrimary, letterSpacing: '-0.02em' }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: ap.textTertiary, marginTop: 1 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InsightsView() {
  const { tasks, currentDay, streak, roadmap } = useStore();
  const agentRoadmap = useStore(s => s.agentRoadmap);
  const { isMobile } = useBreakpoint();
  const [historyOpen, setHistoryOpen] = useState(false);
  const metrics = useFeedbackMetrics();

  // ── Data ───────────────────────────────────────────────────────────────────
  const currentWeek = Math.ceil(currentDay / 7);
  const totalDays = agentRoadmap?.roadmap?.totalDays
    ?? ((roadmap?.strategicPlan?.totalWeeks ?? Math.ceil((roadmap?.duration || 3) * 4)) * 7);
  const totalWeeks = Math.ceil(totalDays / 7);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const thisWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek);
  const thisWeekCompleted = thisWeekTasks.filter(t => t.completed).length;
  const weeklyCompletion = thisWeekTasks.length > 0
    ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100) : 0;

  const prevWeekTasks = tasks.filter(t => Math.ceil(t.day / 7) === currentWeek - 1);
  const prevWeekDone = prevWeekTasks.filter(t => t.completed).length;
  const prevWeekCompletion = prevWeekTasks.length > 0
    ? Math.round((prevWeekDone / prevWeekTasks.length) * 100) : null;

  const totalMinutesInvested = useMemo(
    () => tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.duration || 0), 0),
    [tasks],
  );
  const hoursInvested = Math.round((totalMinutesInvested / 60) * 10) / 10;

  // Calendar
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

  const coachSummary = (() => {
    try { return localStorage.getItem('coheren_coach_summary') ?? ''; } catch { return ''; }
  })();

  const historyTasks = [...tasks]
    .filter(t => t.completed)
    .sort((a, b) => b.day - a.day)
    .slice(0, 30);

  // ── Ring color ─────────────────────────────────────────────────────────────
  const ringColor = overallCompletion >= 80 ? '#22c55e' : overallCompletion >= 50 ? '#7c3aed' : '#f97316';

  // ── Week delta ─────────────────────────────────────────────────────────────
  const weekDelta = prevWeekCompletion !== null ? weeklyCompletion - prevWeekCompletion : null;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 40, fontFamily: ap.font }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: ap.textPrimary,
          margin: '0 0 4px', letterSpacing: '-0.03em',
          fontFamily: 'Fraunces, Georgia, serif',
        }}>
          Insights
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: ap.textTertiary }}>
          Day {currentDay} · Week {currentWeek} of {totalWeeks}
        </p>
      </motion.div>

      {/* ── Hero: ring + headline ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        style={{
          background: ap.surface,
          border: `1px solid ${ap.border}`,
          borderRadius: 24,
          padding: isMobile ? '28px 24px' : '32px 36px',
          marginBottom: 12,
          display: 'flex', alignItems: 'center',
          gap: 28,
        }}
      >
        {/* Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <RingProgress pct={overallCompletion} size={isMobile ? 100 : 112} stroke={8} color={ringColor} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: isMobile ? 22 : 26, fontWeight: 700,
              color: ap.textPrimary, letterSpacing: '-0.03em', lineHeight: 1,
            }}>
              {overallCompletion}%
            </span>
            <span style={{ fontSize: 10, color: ap.textTertiary, marginTop: 2 }}>done</span>
          </div>
        </div>

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: isMobile ? 18 : 22,
            fontFamily: 'Fraunces, Georgia, serif',
            fontWeight: 500, color: ap.textPrimary,
            letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            {overallCompletion === 100 ? 'Perfect run' :
             overallCompletion >= 80 ? 'Strong performance' :
             overallCompletion >= 50 ? 'Solid progress' : 'Getting started'}
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: ap.textSecondary, lineHeight: 1.5 }}>
            {completedTasks} of {totalTasks} task{totalTasks !== 1 ? 's' : ''} completed overall
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {streak > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px',
                background: 'rgba(249,115,22,0.07)',
                border: '1px solid rgba(249,115,22,0.18)',
                borderRadius: 99,
              }}>
                <Flame size={11} color="#f97316" strokeWidth={2} />
                <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>
                  {streak}-day streak
                </span>
              </div>
            )}
            {weeklyCompletion > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px',
                background: ap.accentSoft,
                border: `1px solid ${ap.accentMid}`,
                borderRadius: 99,
              }}>
                <Target size={11} color={ap.accent} strokeWidth={2} />
                <span style={{ fontSize: 12, color: ap.accent, fontWeight: 600 }}>
                  {weeklyCompletion}% this week
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stat row ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{
          background: ap.surface,
          border: `1px solid ${ap.border}`,
          borderRadius: 18,
          display: 'flex',
          marginBottom: 20,
          overflow: 'hidden',
        }}
      >
        <StatCell value={String(completedTasks)} label="tasks done" />
        <StatCell value={`${hoursInvested}h`} label="invested" sub={`of ~${Math.round((totalWeeks * 5 * 45) / 60)}h total`} />
        <StatCell value={`Wk ${currentWeek}`} label={`of ${totalWeeks}`} sub={`${weeklyCompletion}% this week`} last />
      </motion.div>

      {/* ── This week progress bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        style={{
          background: ap.surface,
          border: `1px solid ${ap.border}`,
          borderRadius: 18,
          padding: '18px 20px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ap.textPrimary }}>
            This week
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: weeklyCompletion >= 80 ? ap.success : ap.textPrimary }}>
            {thisWeekCompleted}/{thisWeekTasks.length} done
          </span>
        </div>
        {/* Progress bar */}
        <div style={{
          height: 6, borderRadius: 99, background: ap.surfaceAlt,
          overflow: 'hidden', marginBottom: 8,
        }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${weeklyCompletion}%`,
            background: weeklyCompletion === 100
              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
              : 'linear-gradient(90deg, #7c3aed, #6d28d9)',
            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        {weekDelta !== null && (
          <p style={{ margin: 0, fontSize: 11, color: weekDelta >= 0 ? ap.success : '#f97316' }}>
            {weekDelta >= 0 ? '↑' : '↓'} {Math.abs(weekDelta)}% vs last week
          </p>
        )}
      </motion.div>

      {/* ── Activity calendar ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
        style={{ marginBottom: 20 }}
      >
        <p style={{
          fontSize: 11, fontWeight: 700, color: ap.textTertiary,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          marginBottom: 10, margin: '0 0 10px',
        }}>
          28-day activity
        </p>
        <div style={{
          background: ap.surface, border: `1px solid ${ap.border}`,
          borderRadius: 18, padding: '18px 20px',
        }}>
          <StreakCalendar days={calendarDays} currentStreak={streak} longestStreak={longestStreak} />
        </div>
      </motion.div>

      {/* ── Records ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.22 }}
        style={{ marginBottom: 20 }}
      >
        <p style={{
          fontSize: 11, fontWeight: 700, color: ap.textTertiary,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          margin: '0 0 10px',
        }}>
          Personal bests
        </p>
        <div style={{
          display: 'flex', gap: 10,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          <RecordChip
            icon={<Flame size={15} color="#f97316" strokeWidth={2} />}
            label="best streak"
            value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`}
            color="#f97316"
          />
          <RecordChip
            icon={<Trophy size={15} color="#7c3aed" strokeWidth={2} />}
            label={`best week · Wk ${bestWeek.number}`}
            value={`${bestWeek.percentage}%`}
            color="#7c3aed"
          />
          <RecordChip
            icon={<Clock size={15} color="#22c55e" strokeWidth={2} />}
            label="time invested"
            value={`${hoursInvested}h`}
            color="#22c55e"
          />
        </div>
      </motion.div>

      {/* ── Task type breakdown (if available) ── */}
      {metrics.taskTypeBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          style={{ marginBottom: 20 }}
        >
          <p style={{
            fontSize: 11, fontWeight: 700, color: ap.textTertiary,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            margin: '0 0 10px',
          }}>
            Task types
          </p>
          <div style={{
            background: ap.surface, border: `1px solid ${ap.border}`,
            borderRadius: 18, padding: '18px 20px',
          }}>
            <TaskTypeBreakdown data={metrics.taskTypeBreakdown} />
          </div>
        </motion.div>
      )}

      {/* ── AI Coach ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.28 }}
        style={{ marginBottom: 20 }}
      >
        <div style={{
          background: ap.surface, border: `1px solid ${ap.border}`,
          borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 20px',
            borderBottom: `1px solid ${ap.border}`,
            background: ap.accentSoft,
          }}>
            <Brain size={14} color={ap.accent} strokeWidth={1.8} />
            <span style={{ fontSize: 12, fontWeight: 700, color: ap.accent, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Coach notes
            </span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <CoachSummary summary={coachSummary} />
          </div>
        </div>
      </motion.div>

      {/* ── History ── */}
      <div style={{
        background: ap.surface, border: `1px solid ${ap.border}`,
        borderRadius: 18, overflow: 'hidden',
      }}>
        <button
          onClick={() => setHistoryOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '14px 20px',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} color={ap.success} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600, color: ap.textPrimary }}>
              Completed tasks
            </span>
            <span style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 99,
              background: ap.surfaceAlt, color: ap.textTertiary, fontWeight: 600,
            }}>
              {historyTasks.length}
            </span>
          </div>
          {historyOpen
            ? <ChevronUp size={15} color={ap.textTertiary} />
            : <ChevronDown size={15} color={ap.textTertiary} />}
        </button>

        {historyOpen && (
          <div style={{ borderTop: `1px solid ${ap.border}` }}>
            {historyTasks.length === 0 ? (
              <p style={{ color: ap.textTertiary, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                Complete tasks to build your history.
              </p>
            ) : (
              <div>
                {historyTasks.map((task, i) => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 20px',
                    borderBottom: i < historyTasks.length - 1 ? `1px solid ${ap.border}` : 'none',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: ap.success, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, color: ap.textPrimary, margin: 0,
                        fontWeight: 500, lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {task.title}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 99,
                        background: ap.surfaceAlt,
                        color: ap.textTertiary, fontWeight: 500,
                      }}>
                        {task.type}
                      </span>
                      <span style={{ fontSize: 11, color: ap.textTertiary }}>
                        Day {task.day}
                      </span>
                    </div>
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
