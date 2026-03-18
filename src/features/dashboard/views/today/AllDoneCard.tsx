import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Clock, Flame } from 'lucide-react';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { track } from '@lib/analytics';

interface AllDoneCardProps {
  tasksCompleted: number;
  streak: number;
  day: number;
  minutesToday?: number;
  taskTypeSummary?: string;
}

const IDENTITY_QUOTES = [
  { line1: "Small steps, done consistently,", line2: "become great leaps." },
  { line1: "Every day you showed up,", line2: "you rewired who you are." },
  { line1: "You showed up.", line2: "That's the hardest part." },
  { line1: "Consistency is the compound interest", line2: "of personal growth." },
  { line1: "Discipline is doing it", line2: "before you feel like it." },
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

export default function AllDoneCard({ tasksCompleted, streak, day, minutesToday = 0 }: AllDoneCardProps) {
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    track({ event: 'day_completed', properties: { day, tasks_done: tasksCompleted, streak } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const quoteData = IDENTITY_QUOTES[streak % IDENTITY_QUOTES.length];
  const MILESTONES = [7, 14, 30, 60, 100];
  const nextMilestone = MILESTONES.find(m => m > streak);
  const nearMilestone = nextMilestone && (nextMilestone - streak) <= 3 ? nextMilestone : null;
  const streakMessage = getStreakMessage(streak);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], type: 'spring', stiffness: 200, damping: 20 }}
      style={{
        position: 'relative',
        padding: isMobile ? '48px 28px' : '64px 48px',
        background: 'linear-gradient(145deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)',
        border: '1px solid rgba(167,139,250,0.15)',
        borderRadius: 28,
        textAlign: 'center',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(124,58,237,0.35), 0 0 0 1px rgba(167,139,250,0.1)',
      }}
    >
      {/* Glow orb (celebration bg) */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'celebration-pulse 3s ease-in-out infinite',
      }} />

      {/* Subtle bottom glow */}
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Celebration icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
        style={{ fontSize: 64, marginBottom: 24, display: 'block', lineHeight: 1, position: 'relative' }}
      >
        🎯
      </motion.div>

      {/* Heading */}
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          fontSize: isMobile ? 26 : 32,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          margin: '0 0 8px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(196,181,253,0.9) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          position: 'relative',
        }}
      >
        {streak > 0 ? `Day ${streak > 1 ? streak + ' done' : 'one done'}` : 'All done today'}
      </motion.h3>

      {/* Streak identity message */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{
          fontSize: 16,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6,
          maxWidth: 400,
          margin: '0 auto 28px',
          position: 'relative',
        }}
      >
        {streakMessage}
      </motion.p>

      {/* Quote */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        style={{
          fontSize: 14,
          color: 'rgba(196,181,253,0.5)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          maxWidth: 320,
          margin: '0 auto 28px',
          position: 'relative',
        }}
      >
        "{quoteData.line1}<br />{quoteData.line2}"
      </motion.p>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          flexWrap: 'wrap',
          position: 'relative',
        }}
      >
        {/* Tasks completed */}
        <div style={{
          padding: '8px 16px',
          background: 'rgba(167,139,250,0.08)',
          border: '1px solid rgba(167,139,250,0.15)',
          borderRadius: 99,
          fontSize: 13,
          color: 'rgba(196,181,253,0.75)',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          ✓ {tasksCompleted} task{tasksCompleted !== 1 ? 's' : ''} completed
        </div>

        {minutesToday > 0 && (
          <div style={{
            padding: '8px 16px',
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: 99,
            fontSize: 13,
            color: 'rgba(196,181,253,0.75)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Clock size={12} strokeWidth={2} color="rgba(196,181,253,0.6)" />
            {minutesToday >= 60
              ? `${Math.floor(minutesToday / 60)}h ${minutesToday % 60 > 0 ? `${minutesToday % 60}m` : ''}`
              : `${minutesToday}min`} focused
          </div>
        )}

        {streak > 1 && (
          <div style={{
            padding: '8px 16px',
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: 99,
            fontSize: 13,
            color: '#fbbf24',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Flame size={12} strokeWidth={2} color="#f97316" />
            {streak}-day streak
          </div>
        )}
      </motion.div>

      {/* Near-milestone nudge */}
      {nearMilestone && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          style={{
            marginTop: 16,
            fontSize: 13,
            color: '#f97316',
            fontWeight: 600,
            position: 'relative',
          }}
        >
          🔥 {nearMilestone - streak} day{nearMilestone - streak !== 1 ? 's' : ''} to {nearMilestone}-day streak
        </motion.p>
      )}

      <style>{`
        @keyframes celebration-pulse {
          0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.1); }
        }
      `}</style>
    </motion.div>
  );
}
