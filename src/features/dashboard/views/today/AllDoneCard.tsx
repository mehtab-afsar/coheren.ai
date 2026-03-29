import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Clock, Flame, CheckCircle2 } from 'lucide-react';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { track } from '@lib/analytics';
import { ap } from '@core/design-system/appleTokens';
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
  "Every day you showed up, you rewired who you are.",
  "You showed up. That's the hardest part.",
  "Consistency is the compound interest of personal growth.",
  "Discipline is doing it before you feel like it.",
];

const STREAK_MESSAGES: Record<number, string> = {
  1:  "Day one done. The streak starts here.",
  3:  "Three days in. The habit is forming.",
  7:  "Seven days of showing up. This is who you're becoming.",
  14: "Two weeks. Most people quit before this.",
  21: "Twenty-one days. The science says it's a habit now.",
  30: "Thirty days. You're not the same person who started.",
};

function getStreakMessage(streak: number): string {
  const milestones = [30, 21, 14, 7, 3, 1];
  for (const m of milestones) {
    if (streak >= m) return STREAK_MESSAGES[m];
  }
  return "Keep showing up.";
}

export default function AllDoneCard({ tasksCompleted, streak, day, minutesToday = 0, tomorrowTask }: AllDoneCardProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: ap.font }}
    >
      {/* ── Main celebration card ── */}
      <div style={{
        background: ap.surface,
        border: `1px solid ${ap.border}`,
        borderRadius: 20,
        padding: isMobile ? '32px 24px' : '40px 36px',
        textAlign: 'center',
      }}>
        {/* Checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 18 }}
          style={{ marginBottom: 20 }}
        >
          <div style={{
            width: 56, height: 56,
            borderRadius: 16,
            background: ap.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <CheckCircle2 size={28} color={ap.accent} strokeWidth={1.8} />
          </div>
        </motion.div>

        {/* Day heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: ap.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Day {day}
          </div>
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, letterSpacing: '-0.03em', color: ap.textPrimary, marginBottom: 8 }}>
            {streak > 0 ? (streak === 1 ? 'Day one done' : `${streak} days done`) : 'All done today'}
          </div>
          <div style={{ fontSize: 14, color: ap.textSecondary, lineHeight: 1.55, maxWidth: 340, margin: '0 auto 24px' }}>
            {streakMessage}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px',
            background: ap.surfaceAlt, border: `1px solid ${ap.border}`,
            borderRadius: 99, fontSize: 12, color: ap.textSecondary, fontWeight: 500,
          }}>
            <CheckCircle2 size={11} color={ap.success} strokeWidth={2.5} />
            {tasksCompleted} task{tasksCompleted !== 1 ? 's' : ''} done
          </div>

          {minutesToday > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px',
              background: ap.surfaceAlt, border: `1px solid ${ap.border}`,
              borderRadius: 99, fontSize: 12, color: ap.textSecondary, fontWeight: 500,
            }}>
              <Clock size={11} strokeWidth={2} color={ap.textTertiary} />
              {minutesToday >= 60
                ? `${Math.floor(minutesToday / 60)}h${minutesToday % 60 > 0 ? ` ${minutesToday % 60}m` : ''}`
                : `${minutesToday}m`} focused
            </div>
          )}

          {streak > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px',
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)',
              borderRadius: 99, fontSize: 12, color: '#ea580c', fontWeight: 600,
            }}>
              <Flame size={11} strokeWidth={2} color="#f97316" />
              {streak}-day streak
            </div>
          )}
        </motion.div>

        {/* Quote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          style={{ fontSize: 13, color: ap.textTertiary, fontStyle: 'italic', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}
        >
          "{quote}"
        </motion.p>
      </div>

      {/* ── Near-milestone nudge ── */}
      {nearMilestone && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          style={{
            background: 'rgba(249,115,22,0.06)',
            border: '1px solid rgba(249,115,22,0.18)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <Flame size={15} color="#f97316" strokeWidth={2} />
          <span style={{ fontSize: 13, color: '#ea580c', fontWeight: 600 }}>
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
            background: ap.surface,
            border: `1px solid ${ap.border}`,
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: ap.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Tomorrow needs a little prep
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {tomorrowTask.requiresPrep.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: ap.accent, marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: ap.textSecondary, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{
            fontSize: 12, color: ap.accent, fontWeight: 500, lineHeight: 1.5,
            padding: '8px 12px', background: ap.accentSoft, borderRadius: 8,
          }}>
            {tomorrowTask.requiresPrep.note}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
