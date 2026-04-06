import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { CheckCircle2, Clock, Flame, ArrowRight, ChevronRight } from 'lucide-react';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { track } from '@lib/analytics';
import type { Task } from '@core/store/useStore';

interface AllDoneCardProps {
  tasksCompleted: number;
  streak: number;
  day: number;
  minutesToday?: number;
  taskTypeSummary?: string;
  tomorrowTask?: Task;
}

const IDENTITY_QUOTES = [
  "Small steps, done consistently, become great leaps.",
  "You showed up. That's the hardest part.",
  "Consistency is the compound interest of personal growth.",
  "Discipline is doing it before you feel like it.",
  "Every rep is a vote for the person you're becoming.",
];

const STREAK_MESSAGES: Record<number, string> = {
  1:  "Day one done. The streak starts here.",
  3:  "Three days in. The habit is forming.",
  7:  "Seven days of showing up. This is who you're becoming.",
  14: "Two weeks. Most people quit before this.",
  21: "Twenty-one days. The science says it's a habit now.",
  30: "Thirty days. You're not the same person who started.",
};

const TASK_TYPE_ICONS: Record<string, string> = {
  practice:   '🏋️',
  learning:   '📖',
  reflection: '🪞',
  challenge:  '⚡',
  retrieval:  '🧠',
  assessment: '📝',
  rest:       '🌿',
};

function getStreakMessage(streak: number): string {
  const milestones = [30, 21, 14, 7, 3, 1];
  for (const m of milestones) {
    if (streak >= m) return STREAK_MESSAGES[m];
  }
  return "Keep showing up.";
}

export default function AllDoneCard({
  tasksCompleted, streak, day, minutesToday = 0, tomorrowTask,
}: AllDoneCardProps) {
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    track({ event: 'day_completed', properties: { day, tasks_done: tasksCompleted, streak } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quote = IDENTITY_QUOTES[streak % IDENTITY_QUOTES.length];
  const MILESTONES = [7, 14, 30, 60, 100];
  const nextMilestone = MILESTONES.find(m => m > streak);
  const nearMilestone = nextMilestone && (nextMilestone - streak) <= 3 ? nextMilestone : null;
  const streakMessage = getStreakMessage(streak);

  const tomorrowType = tomorrowTask?.type ?? 'learning';
  const tomorrowIcon = TASK_TYPE_ICONS[tomorrowType] ?? '📋';
  const tomorrowDuration = tomorrowTask?.duration ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--c-font-body)' }}
    >
      {/* ── Main card ── */}
      <div style={{
        background: 'var(--c-surface-bg)',
        border: '1px solid var(--c-border-subtle)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: 'var(--c-shadow-card)',
      }}>

        {/* Top section — icon + headline */}
        <div style={{
          padding: isMobile ? '32px 24px 24px' : '40px 36px 28px',
          textAlign: 'center',
          borderBottom: '1px solid var(--c-border-subtle)',
        }}>
          {/* Check circle */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 280, damping: 20 }}
            style={{ marginBottom: 20 }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.10)',
              border: '1.5px solid rgba(34, 197, 94, 0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <CheckCircle2 size={30} color="var(--c-accent-green)" strokeWidth={1.8} />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.38 }}
          >
            {/* Streak number — hero */}
            <div style={{
              fontSize: isMobile ? 44 : 52,
              fontFamily: 'var(--c-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              color: 'var(--c-text-primary)',
              lineHeight: 1,
              marginBottom: 8,
            }}>
              {streak > 0 ? streak : day}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--c-text-tertiary)',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              {streak > 1 ? 'day streak' : streak === 1 ? 'day one' : `day ${day}`}
            </div>
            <p style={{
              fontSize: 14, color: 'var(--c-text-secondary)', lineHeight: 1.6,
              maxWidth: 300, margin: '0 auto',
            }}>
              {streakMessage}
            </p>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--c-border-subtle)',
          }}
        >
          {[
            {
              icon: <CheckCircle2 size={14} color="var(--c-accent-green)" strokeWidth={2} />,
              value: tasksCompleted,
              label: tasksCompleted === 1 ? 'task done' : 'tasks done',
            },
            ...(minutesToday > 0 ? [{
              icon: <Clock size={14} color="var(--c-text-tertiary)" strokeWidth={2} />,
              value: minutesToday >= 60
                ? `${Math.floor(minutesToday / 60)}h${minutesToday % 60 > 0 ? ` ${minutesToday % 60}m` : ''}`
                : `${minutesToday}m`,
              label: 'focused',
            }] : []),
            ...(streak > 1 ? [{
              icon: <Flame size={14} color="var(--c-accent-amber)" strokeWidth={2} />,
              value: streak,
              label: 'day streak',
            }] : []),
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '16px 12px',
                borderRight: i < arr.length - 1 ? '1px solid var(--c-border-subtle)' : 'none',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {stat.icon}
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text-primary)', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--c-text-tertiary)', fontWeight: 500 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Tomorrow preview */}
        {tomorrowTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.3 }}
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--c-border-subtle)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'var(--c-surface-card)', border: '1px solid var(--c-border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {tomorrowIcon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--c-text-tertiary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
                Tomorrow
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {tomorrowTask.title}
              </div>
              {tomorrowDuration > 0 && (
                <div style={{ fontSize: 11, color: 'var(--c-text-tertiary)', marginTop: 2 }}>
                  {tomorrowDuration}m · {tomorrowType}
                </div>
              )}
            </div>
            <ChevronRight size={16} color="var(--c-text-tertiary)" strokeWidth={1.5} style={{ flexShrink: 0 }} />
          </motion.div>
        )}

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.44, duration: 0.3 }}
          style={{ padding: '14px 20px' }}
        >
          <p style={{
            margin: 0, fontSize: 12,
            color: 'var(--c-text-tertiary)', fontStyle: 'italic', lineHeight: 1.65,
            textAlign: 'center',
          }}>
            "{quote}"
          </p>
        </motion.div>
      </div>

      {/* ── Near-milestone nudge ── */}
      {nearMilestone && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.18)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <Flame size={15} color="var(--c-accent-amber)" strokeWidth={2} />
          <span style={{ fontSize: 13, color: 'var(--c-accent-amber)', fontWeight: 600 }}>
            {nearMilestone - streak} day{nearMilestone - streak !== 1 ? 's' : ''} to {nearMilestone}-day streak
          </span>
        </motion.div>
      )}

      {/* ── Tomorrow's prep ── */}
      {tomorrowTask?.requiresPrep && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          style={{
            background: 'var(--c-surface-bg)',
            border: '1px solid var(--c-border-subtle)',
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          }}>
            <ArrowRight size={14} color="var(--c-accent-purple)" strokeWidth={2} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Tomorrow needs a little prep
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            {tomorrowTask.requiresPrep.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-accent-purple)', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--c-text-secondary)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--c-accent-purple)', fontWeight: 500, lineHeight: 1.5,
            padding: '8px 12px', background: 'var(--c-accent-purple-soft)', borderRadius: 8,
          }}>
            {tomorrowTask.requiresPrep.note}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
