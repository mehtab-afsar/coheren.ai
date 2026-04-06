import { useState } from 'react';
import { Sparkles, Flame, Calendar, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@core/store/useStore';

type BannerType = 'plan-adjustment' | 'streak-milestone' | 'week-recap';

function getDismissKey(type: BannerType, value: number) {
  return `smartbanner_dismissed_${type}_${value}`;
}

function isDismissed(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function saveDismiss(key: string) {
  try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
}

export default function SmartBannerSlot() {
  // Use scalar selectors only — avoids useSyncExternalStore snapshot mismatch in React 18
  const currentDay = useStore((s) => s.currentDay);
  const streak = useStore((s) => s.streak);

  // Derive lastCheckpointDay as a scalar (number) inside the selector so no array reference leaks out
  const lastCheckpointDay = useStore((s) =>
    s.tasks.reduce((max, t) => (t.completed && t.day > max ? t.day : max), 0)
  );

  // Derive currentPhaseName as a scalar (string) inside the selector
  const currentPhaseName = useStore((s) => {
    const week = Math.ceil(s.currentDay / 7);
    const phases = s.roadmap?.phases ?? [];
    if (phases.length === 0) return 'Your focus';
    const totalWeeks = s.roadmap?.strategicPlan?.totalWeeks;
    const weeksPerPhase = totalWeeks ? Math.ceil(totalWeeks / phases.length) : 4;
    return phases[Math.floor((week - 1) / weeksPerPhase)]?.title ?? 'Your focus';
  });

  // Compute which banner to show (priority order)
  const weekNum = Math.ceil(currentDay / 7);

  // plan-adjustment: disabled
  const showPlanAdjust = false;
  const planAdjustKey = getDismissKey('plan-adjustment', lastCheckpointDay);

  // streak-milestone: multiples of 7, 14, 30
  const STREAK_MILESTONES = [7, 14, 30];
  const showStreakMilestone = STREAK_MILESTONES.includes(streak) && streak > 0;
  const streakMilestoneKey = getDismissKey('streak-milestone', streak);
  const streakTopPercent = streak >= 30 ? 5 : streak >= 14 ? 15 : 30;

  // week-recap: first day of each week
  const showWeekRecap = currentDay > 7 && currentDay % 7 === 1;
  const weekRecapKey = getDismissKey('week-recap', weekNum);

  // Determine active banner
  let activeBanner: BannerType | null = null;
  let dismissKey = '';

  if (showPlanAdjust && !isDismissed(planAdjustKey)) {
    activeBanner = 'plan-adjustment';
    dismissKey = planAdjustKey;
  } else if (showStreakMilestone && !isDismissed(streakMilestoneKey)) {
    activeBanner = 'streak-milestone';
    dismissKey = streakMilestoneKey;
  } else if (showWeekRecap && !isDismissed(weekRecapKey)) {
    activeBanner = 'week-recap';
    dismissKey = weekRecapKey;
  }

  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    saveDismiss(dismissKey);
    setDismissed(true);
  };

  if (!activeBanner || dismissed) return null;

  const bannerConfig = {
    'plan-adjustment': {
      bg: 'rgba(99,102,241,0.1)',
      border: '1px solid rgba(99,102,241,0.25)',
      Icon: Sparkles,
      iconColor: '#818cf8',
      title: 'Your plan was just updated',
      body: "Based on your recent progress, I've adjusted this week's focus. You're on track.",
    },
    'streak-milestone': {
      bg: 'rgba(249,115,22,0.1)',
      border: '1px solid rgba(249,115,22,0.25)',
      Icon: Flame,
      iconColor: '#f97316',
      title: `${streak}-day streak!`,
      body: `You're in the top ${streakTopPercent}% of users who reach this point.`,
    },
    'week-recap': {
      bg: 'rgba(124,58,237,0.1)',
      border: '1px solid rgba(124,58,237,0.25)',
      Icon: Calendar,
      iconColor: '#a78bfa',
      title: 'New week, new chapter',
      body: `Week ${weekNum} starts today. Your focus: ${currentPhaseName}`,
    },
  } as const;

  const cfg = bannerConfig[activeBanner];
  const { Icon } = cfg;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key={activeBanner}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            backgroundColor: cfg.bg,
            border: cfg.border,
            borderRadius: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Icon size={16} strokeWidth={1.8} color={cfg.iconColor} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#ffffff', lineHeight: 1.3 }}>
                {cfg.title}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                {cfg.body}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
