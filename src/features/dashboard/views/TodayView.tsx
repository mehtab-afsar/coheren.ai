import { CheckCircle2, Clock, ArrowRight, Sparkles, SkipForward, Zap, Brain, BookOpen } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { ap } from '@core/design-system/appleTokens';
import { Label, Tile } from '@core/design-system/AppleUI';
import { useRef, useState, useEffect } from 'react';
import { useTaskActions } from '../hooks/useTaskActions';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { useFocusSession } from '@hooks/useFocusSession';
import TaskFeedbackModal from '../components/TaskFeedbackModal';
import SwipeableCard from '../components/SwipeableCard';
import TodayHeader from './today/TodayHeader';
import SmartBannerSlot from './today/SmartBannerSlot';
import FocusCard from './today/FocusCard';
import AllDoneCard from './today/AllDoneCard';
import RestDayCard from './today/RestDayCard';
import FocusComplete from './today/FocusComplete';
import AssessmentCard from '../components/AssessmentCard';
import ResourceCard from '../components/ResourceCard';
import { TaskVariantPicker } from '../components/TaskVariantPicker';
import { flags } from '@config/feature-flags';

export default function TodayView({
  onNavigate,
}: {
  onNavigate?: (view: string) => void;
}) {
  const {
    universalProfile,
    roadmap,
    tasks,
    currentDay,
    streak,
    completionRate,
  } = useStore();

  const { isMobile } = useBreakpoint();
  const { startSession, updateElapsed, endSession } = useFocusSession();
  const completeTask = useStore((state) => state.completeTask);
  const completeAssessment = useStore((state) => state.completeAssessment);
  const skipTask = useStore((state) => state.skipTask);
  const setTaskFeedback = useStore((state) => state.setTaskFeedback);
  const selectedVariants = useStore(s => s.selectedVariants);
  const { completingTaskId, skippingTaskId, skipReasonTaskId, setSkipReasonTaskId, particles, showSkipMessage, pendingFeedbackTaskId, submitFeedback, dismissFeedback, handleCompleteTask, handleSkipTask, confirmSkip } = useTaskActions(completeTask, skipTask, setTaskFeedback);

  // Quick Mode — surfaces only the single most important incomplete task
  const [quickMode, setQuickMode] = useState(false);
  // Ease Back Mode — auto-limits to 1 task on re-engagement, dismissed when user wants all
  const [easeBackMode, setEaseBackMode] = useState(true);
  // Show all tasks below FocusCard
  const [_showAllTasks, setShowAllTasks] = useState(false);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FocusComplete overlay
  const [showFocusComplete, setShowFocusComplete] = useState(false);

  // Note input (single line, saved to localStorage per task)
  const [noteInput, setNoteInput] = useState('');
  // Focus mode: step checklist
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  // Focus task state (replaces cinema mode)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('focus_task_id') ?? null; } catch { return null; }
  });

  // Restore elapsed seconds if resuming the same session
  const [focusSeconds, setFocusSeconds] = useState(() => {
    try {
      const saved = sessionStorage.getItem('focus_elapsed');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const [focusPaused, setFocusPaused] = useState(() => {
    try { return sessionStorage.getItem('focus_paused') === '1'; } catch { return false; }
  });

  // Count-up focus timer — runs while focus mode is open and not paused
  useEffect(() => {
    if (!focusTaskId || focusPaused) {
      if (focusIntervalRef.current) { clearInterval(focusIntervalRef.current); focusIntervalRef.current = null; }
      return;
    }
    focusIntervalRef.current = setInterval(() => {
      setFocusSeconds(s => {
        const next = s + 1;
        if (next % 10 === 0) updateElapsed(next);
        try { sessionStorage.setItem('focus_elapsed', String(next)); } catch { /* ignore */ }
        return next;
      });
    }, 1000);
    return () => { if (focusIntervalRef.current) { clearInterval(focusIntervalRef.current); focusIntervalRef.current = null; } };
  }, [focusTaskId, focusPaused, updateElapsed]);
  // Streak milestone banner (Day 3, 7, 14, 30, 60, 90)
  const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90];
  const milestoneKey = `streak-milestone-${streak}`;
  const [milestoneDismissed, setMilestoneDismissed] = useState(
    () => { try { return Boolean(localStorage.getItem(milestoneKey)); } catch { return false; } }
  );
  const showMilestoneBanner = STREAK_MILESTONES.includes(streak) && !milestoneDismissed;
  const dismissMilestone = () => {
    try { localStorage.setItem(milestoneKey, '1'); } catch { /* ignore */ }
    setMilestoneDismissed(true);
  };
  useEffect(() => {
    if (!showMilestoneBanner) return;
    const tid = setTimeout(dismissMilestone, 8000);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMilestoneBanner]);

  const todaysTasks = tasks.filter(t => t.day === currentDay && !t.skipped);
  const completedTasks = todaysTasks.filter(t => t.completed);
  const allDone = todaysTasks.length > 0 && todaysTasks.every(t => t.completed);


  // Re-engagement: streak broken, not first day, nothing done today
  const showReEngagement = streak === 0 && currentDay > 1 && completedTasks.length === 0;

  // Tasks to render — full list, Quick Mode (1 task), or Ease Back Mode (1 task on return)
  const incompleteTasks = todaysTasks.filter(t => !t.completed);
  const visibleTasks = (quickMode || (showReEngagement && easeBackMode))
    ? [...completedTasks, ...incompleteTasks.slice(0, 1)]
    : todaysTasks;
  // Item 7 — Variant picker gate
  const variantTasks = tasks.filter(t => t.day === currentDay && t.variant != null);
  const hasVariants = flags.USE_TASK_VARIANTS && variantTasks.length === 3;
  const chosenVariant = selectedVariants[currentDay];
  const showVariantPicker = hasVariants && chosenVariant == null;

  // Hero task: first incomplete task of the day (shown as the featured focus card)
  // When variants exist and one is chosen, hero = the chosen variant task
  const heroTask = !allDone && incompleteTasks.length > 0
    ? (hasVariants && chosenVariant
        ? (variantTasks.find(t => t.variant === chosenVariant) ?? incompleteTasks[0])
        : incompleteTasks[0])
    : null;
  // List tasks: everything except the hero task (still respects quickMode/easeBack filtering)
  const listTasks = heroTask ? visibleTasks.filter(t => t.id !== heroTask.id) : visibleTasks;

  // Derived values for new sub-components
  const isRestDay = todaysTasks.some(t =>
    (t.type as string) === 'rest' || t.title.toLowerCase().includes('rest')
  );

  // AllDoneCard recap stats
  const minutesToday = completedTasks.reduce((sum, t) => sum + (t.duration ?? 0), 0);
  const taskTypeSummary = (() => {
    const counts: Record<string, number> = {};
    completedTasks.forEach(t => { counts[t.type] = (counts[t.type] ?? 0) + 1; });
    return Object.entries(counts).map(([type, n]) => `${n} ${type}`).join(' · ');
  })();

  const userName = universalProfile?.name ?? roadmap?.title ?? 'there';
  const currentGoalTitle = useStore(s => s.currentGoal?.specificGoal) ?? roadmap?.title;
  const goalSubtitle = currentGoalTitle ? `Day ${currentDay} of your ${currentGoalTitle.toLowerCase()} journey` : undefined;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const hasFocusMode = (task: typeof todaysTasks[0]) => !task.completed;

  // Open focus mode: start timer and session
  const openFocus = (taskId: string) => {
    try { localStorage.setItem('onboard_focus_done', '1'); } catch { /* ignore */ }
    // Only reset elapsed if switching to a different task
    const prevTaskId = sessionStorage.getItem('focus_task_id');
    if (prevTaskId !== taskId) {
      setFocusSeconds(0);
      try { sessionStorage.setItem('focus_elapsed', '0'); } catch { /* ignore */ }
    }
    setFocusPaused(false);
    try {
      sessionStorage.setItem('focus_task_id', taskId);
      sessionStorage.setItem('focus_paused', '0');
    } catch { /* ignore */ }
    setNoteInput('');
    setCheckedSteps(new Set());
    setFocusTaskId(taskId);
    const task = todaysTasks.find(t => t.id === taskId);
    startSession(taskId, task?.title ?? taskId);
  };

  // Close focus mode: end session
  const closeFocus = () => {
    endSession();
    setFocusTaskId(null);
    setFocusSeconds(0);
    setCheckedSteps(new Set());
    try {
      sessionStorage.removeItem('focus_task_id');
      sessionStorage.removeItem('focus_elapsed');
      sessionStorage.removeItem('focus_paused');
    } catch { /* ignore */ }
  };

  // Find the focus task
  const focusTask = focusTaskId ? todaysTasks.find(t => t.id === focusTaskId) : null;

  // ── Inline Focus Mode render ─────────────────────────────────────────
  if (focusTask) {
    const mins = String(Math.floor(focusSeconds / 60)).padStart(2, '0');
    const secs = String(focusSeconds % 60).padStart(2, '0');
    const focusTaskExt = focusTask as unknown as Record<string, unknown>;
    const focusSteps: Array<string | { instruction?: string }> = Array.isArray(focusTaskExt.stepsData) ? focusTaskExt.stepsData as Array<string | { instruction?: string }> : Array.isArray(focusTask.steps) ? focusTask.steps as Array<string | { instruction?: string }> : [];
    const coachTips: string[] = Array.isArray(focusTaskExt.coachTips) ? focusTaskExt.coachTips as string[] : [];

    return (
      <div style={{ fontFamily: ap.font }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 16, borderBottom: `1px solid ${ap.border}`, marginBottom: 24,
        }}>
          <div>
            <div style={{ fontSize: 12, color: ap.textTertiary }}>Focus Session</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: ap.textPrimary, letterSpacing: '-0.02em' }}>
              {focusTask.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: ap.accent, fontFamily: ap.mono }}>
              {mins}:{secs}
            </span>
            <button
              onClick={() => setFocusPaused(p => {
                const next = !p;
                try { sessionStorage.setItem('focus_paused', next ? '1' : '0'); } catch { /* ignore */ }
                return next;
              })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: ap.textSecondary, fontSize: 16 }}
            >
              {focusPaused ? '▶' : '⏸'}
            </button>
            <button
              onClick={closeFocus}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: ap.textTertiary, fontSize: 20 }}
            >✕</button>
          </div>
        </div>

        {/* Split layout */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
          {/* Left: Segments or Steps checklist */}
          <div>
            {focusTask.segments && focusTask.segments.length > 0 ? (() => {
              const SEG_COLORS = [
                { border: 'rgba(14,165,233,0.2)', bg: 'rgba(14,165,233,0.06)', bgDone: 'rgba(14,165,233,0.13)', pill: '#0ea5e9' },
                { border: 'rgba(124,58,237,0.2)', bg: ap.accentSoft, bgDone: ap.accentMid, pill: ap.accent },
                { border: 'rgba(16,185,129,0.2)', bg: 'rgba(16,185,129,0.05)', bgDone: 'rgba(16,185,129,0.12)', pill: '#10b981' },
              ];
              const total = focusTask.segments!.length;
              const done = focusTask.segments!.filter((_, i) => checkedSteps.has(i)).length;
              return (
                <>
                  <Label left={`Blocks · ${done}/${total}`} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {focusTask.segments!.map((seg, i) => {
                      const isDone = checkedSteps.has(i);
                      const c = SEG_COLORS[i % SEG_COLORS.length];
                      return (
                        <div key={i}
                          onClick={() => { const s = new Set(checkedSteps); isDone ? s.delete(i) : s.add(i); setCheckedSteps(s); }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                            backgroundColor: isDone ? c.bgDone : c.bg,
                            border: `1px solid ${c.border}`,
                            opacity: isDone ? 0.7 : 1,
                            transition: 'all 0.15s',
                          }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                            backgroundColor: isDone ? c.pill : 'transparent',
                            border: `1.5px solid ${isDone ? c.pill : ap.textTertiary}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 10, fontWeight: 700,
                          }}>{isDone ? '✓' : ''}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.05em', color: c.pill,
                              }}>{seg.label}</span>
                              <span style={{ fontSize: 11, color: ap.textTertiary }}>{seg.duration} min</span>
                            </div>
                            <span style={{
                              fontSize: 13, color: isDone ? ap.textTertiary : ap.textPrimary,
                              textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.45,
                            }}>{seg.description}</span>
                            {seg.tip && !isDone && (
                              <div style={{ fontSize: 11, color: ap.textTertiary, fontStyle: 'italic', marginTop: 3 }}>{seg.tip}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })() : (
              <>
                <Label left={`Steps · ${checkedSteps.size}/${focusSteps.length}`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {focusSteps.map((step, i) => {
                    const done = checkedSteps.has(i);
                    const stepText = typeof step === 'string' ? step : (step as { instruction?: string }).instruction ?? String(step);
                    return (
                      <div key={i}
                        onClick={() => { const s = new Set(checkedSteps); done ? s.delete(i) : s.add(i); setCheckedSteps(s); }}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          backgroundColor: done ? ap.accentSoft : ap.surfaceAlt,
                        }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                          backgroundColor: done ? ap.accent : 'transparent',
                          border: `1.5px solid ${done ? ap.accent : ap.textTertiary}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 10,
                        }}>{done ? '✓' : ''}</div>
                        <span style={{
                          fontSize: 13, color: done ? ap.textSecondary : ap.textPrimary,
                          textDecoration: done ? 'line-through' : 'none', lineHeight: 1.5,
                        }}>{stepText}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Coach Tips */}
            {coachTips.length > 0 && (
              <div style={{ backgroundColor: ap.accentSoft, border: `1px solid ${ap.accentMid}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 650, color: ap.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Coach Tips</div>
                {coachTips.map((tip, i) => (
                  <div key={i} style={{ fontSize: 13, color: ap.textSecondary, marginBottom: i < coachTips.length - 1 ? 6 : 0, lineHeight: 1.5 }}>
                    · {tip}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Inline task content + notes */}
          <div>
            <Label left="Task" />
            <Tile style={{ overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 13.5, color: ap.textSecondary, lineHeight: 1.65 }}>
                  {focusTask.description}
                </div>
                {focusTask.reflection && (
                  <div style={{
                    marginTop: 12, padding: '12px 14px',
                    backgroundColor: ap.surfaceAlt, borderRadius: 8,
                    fontSize: 13, color: ap.textPrimary, fontStyle: 'italic',
                  }}>
                    🤔 {focusTask.reflection}
                  </div>
                )}
              </div>
            </Tile>
            <textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Quick note..."
              style={{
                width: '100%', border: `1px solid ${ap.border}`, borderRadius: 8,
                padding: '9px 12px', fontSize: 13, fontFamily: ap.font,
                backgroundColor: ap.surface, color: ap.textPrimary,
                resize: 'none', outline: 'none', minHeight: 64, boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />

            {/* Resource (video / article) for this task */}
            {focusTask.resources?.primary && (
              <ResourceCard
                primary={focusTask.resources.primary}
                supplementary={focusTask.resources.supplementary}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            onClick={closeFocus}
            style={{
              padding: '9px 20px', borderRadius: 9, border: `1px solid ${ap.border}`,
              backgroundColor: ap.surface, color: ap.textSecondary, fontSize: 13,
              fontFamily: ap.font, cursor: 'pointer',
            }}>End</button>
          <button
            onClick={() => { handleCompleteTask(focusTask.id); closeFocus(); }}
            style={{
              padding: '9px 20px', borderRadius: 9, border: 'none',
              backgroundColor: ap.success, color: '#fff',
              fontWeight: 650, fontSize: 13, fontFamily: ap.font, cursor: 'pointer',
            }}>Complete Task</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', fontFamily: ap.font }}>
      {/* ── Particles ───────────────────────────────────────────────────── */}
      {particles.map((particle, index) => {
        const targetX = window.innerWidth / 2;
        const targetY = window.innerHeight / 3;
        return (
          <div
            key={particle.id}
            style={{
              position: 'fixed',
              left: particle.x,
              top: particle.y,
              width: '8px',
              height: '8px',
              pointerEvents: 'none',
              zIndex: 10000,
              opacity: 0,
              animation: `floatToProgress 1.5s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.05}s forwards`,
              '--target-x': `${targetX - particle.x}px`,
              '--target-y': `${targetY - particle.y}px`,
            } as React.CSSProperties}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill={tokens.colors.primary}
                style={{ filter: `drop-shadow(0 0 6px ${tokens.colors.primary})` }}
              />
            </svg>
          </div>
        );
      })}

      <style>{`
        @keyframes slideDown {
          0%   { opacity:0; transform:translateX(-50%) translateY(-16px); }
          100% { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes floatToProgress {
          0%   { transform:translate(-4px,-4px) scale(0) rotate(0deg);                           opacity:0; }
          10%  { transform:translate(-4px,-4px) scale(1.2) rotate(45deg);                         opacity:1; }
          80%  { transform:translate(var(--target-x),var(--target-y)) scale(1) rotate(360deg);    opacity:1; }
          100% { transform:translate(var(--target-x),var(--target-y)) scale(0) rotate(450deg);    opacity:0; }
        }
        @keyframes completedSettle {
          0%   { transform:scale(1); }
          25%  { transform:scale(0.985); }
          60%  { transform:scale(1.004); }
          100% { transform:scale(1); }
        }
        @keyframes checkPop {
          0%   { transform:scale(0.6); opacity:0; }
          60%  { transform:scale(1.25); opacity:1; }
          100% { transform:scale(1); opacity:1; }
        }
        @keyframes progressPulse {
          0%   { box-shadow:${tokens.shadows.sm}; transform:scale(1); }
          50%  { box-shadow:0 0 30px ${tokens.colors.primary}60, ${tokens.shadows.md}; transform:scale(1.03); }
          100% { box-shadow:${tokens.shadows.sm}; transform:scale(1); }
        }
        @keyframes celebration {
          0%   { opacity:0; transform:translateY(20px) scale(0.9); }
          50%  { transform:translateY(-5px) scale(1.02); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes cinemaSlideIn {
          0%   { opacity:0; transform:scale(0.96) translateY(12px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes panelSlideIn {
          0%   { opacity:0; transform:translateX(24px); }
          100% { opacity:1; transform:translateX(0); }
        }
        @keyframes milestoneIn {
          0%   { opacity:0; transform:translateY(-8px) scale(0.97); }
          60%  { transform:translateY(2px) scale(1.01); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>


      {/* ── Header — greeting + AI context line ─────────────────────────── */}
      <TodayHeader
        userName={userName}
        currentDay={currentDay}
        streak={streak}
        unreadCount={0}
        onNotificationTap={() => {}}
        goalSubtitle={goalSubtitle}
        tasks={tasks}
      />

      {/* ── Skip Toast ───────────────────────────────────────────────────── */}
      {showSkipMessage && (
        <div style={{
          position: 'fixed',
          top: tokens.spacing.xl,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.gray[200]}`,
          borderRadius: tokens.borderRadius.md,
          boxShadow: tokens.shadows.lg,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          animation: 'slideDown 300ms cubic-bezier(.4,0,.2,1)',
        }}>
          <CheckCircle2 size={18} color={tokens.colors.success} strokeWidth={2} />
          <span style={{ ...text.body, color: tokens.colors.text.primary, fontWeight: tokens.typography.weights.medium }}>
            Task skipped. Tomorrow's task will be adjusted.
          </span>
        </div>
      )}

      {/* ── Re-engagement banner (kept inline since it uses local easeBackMode state) ── */}
      {showReEngagement && (
        <div style={{
          marginBottom: tokens.spacing['2xl'],
          padding: tokens.spacing.xl,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(99,102,241,0.03) 100%)',
          border: '1px solid rgba(124,58,237,0.15)',
          borderLeft: '3px solid #7c3aed',
          borderRadius: tokens.borderRadius.lg,
          animation: 'milestoneIn 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '6px' }}>
            <Sparkles size={15} color="#7c3aed" strokeWidth={1.8} />
            <span style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
              Welcome back — ease back in.
            </span>
          </div>
          <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, margin: '0 0 12px 0', fontWeight: tokens.typography.weights.light, lineHeight: 1.55, paddingLeft: '23px' }}>
            Life got busy — that's okay. We've queued up just one task so you can rebuild momentum without pressure.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.lg, paddingLeft: '23px' }}>
            {easeBackMode && incompleteTasks.length > 1 && (
              <>
                <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>
                  Showing 1 of {incompleteTasks.length} tasks
                </span>
                <button
                  onClick={() => setEaseBackMode(false)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: tokens.typography.sizes.xs, fontWeight: tokens.typography.weights.medium, color: '#7c3aed', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                >
                  Show all {incompleteTasks.length} tasks
                </button>
              </>
            )}
            {(!easeBackMode || incompleteTasks.length <= 1) && (
              <span style={{ fontSize: tokens.typography.sizes.xs, color: '#7c3aed', fontWeight: tokens.typography.weights.medium }}>
                ✓ Showing all {incompleteTasks.length} {incompleteTasks.length === 1 ? 'task' : 'tasks'} today
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Primary task area: RestDay / AllDone / VariantPicker / FocusCard ── */}
      {isRestDay ? (
        <RestDayCard onNavigateJourney={() => onNavigate?.('roadmap')} />
      ) : showVariantPicker ? (
        <TaskVariantPicker day={currentDay} tasks={variantTasks} />
      ) : allDone ? (
        <AllDoneCard
          tasksCompleted={completedTasks.length}
          streak={streak}
          day={currentDay}
          minutesToday={minutesToday}
          taskTypeSummary={taskTypeSummary}
          tomorrowTask={tasks.find(t => t.day === currentDay + 1)}
        />
      ) : heroTask ? (
        <>
          {/* Skip reason sheet — shown when skipReasonTaskId === heroTask.id */}
          {skipReasonTaskId === heroTask.id ? (
            <div style={{
              marginBottom: 20,
              padding: '16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #f3f4f6',
              borderRadius: 16,
            }}>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, textAlign: 'center' }}>What's getting in the way?</p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 8 }}>
                {([
                  { storeReason: 'time'       as const, emoji: '⏱️', label: 'No time' },
                  { storeReason: 'health'     as const, emoji: '😓', label: 'Not feeling well' },
                  { storeReason: 'difficulty' as const, emoji: '😕', label: 'Too hard' },
                  { storeReason: 'external'   as const, emoji: '📅', label: 'Something came up' },
                  { storeReason: 'external'   as const, emoji: '🌪️', label: 'Lost motivation' },
                ]).map(({ storeReason, emoji, label }) => (
                  <button
                    key={label}
                    onClick={() => confirmSkip(heroTask.id, storeReason, () => {})}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: '#374151', transition: 'all 120ms ease' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                  >
                    <span>{emoji}</span><span>{label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setSkipReasonTaskId(null)} style={{ width: '100%', background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', padding: '6px 0' }}>
                Cancel
              </button>
            </div>
          ) : (heroTask.type === 'challenge' || heroTask.type === 'retrieval' || heroTask.type === 'assessment') && heroTask.assessmentQuestions && heroTask.assessmentQuestions.length > 0 ? (
            <AssessmentCard
              title={heroTask.title}
              description={heroTask.description}
              questions={heroTask.assessmentQuestions}
              taskType={heroTask.type as 'challenge' | 'retrieval' | 'assessment'}
              onComplete={(results) => {
                completeAssessment(heroTask.id, results);
              }}
            />
          ) : (
            <FocusCard
              task={heroTask}
              tasksRemainingCount={incompleteTasks.length - 1}
              isCompleting={completingTaskId === heroTask.id}
              isSkipping={skippingTaskId === heroTask.id}
              streak={streak}
              currentDay={currentDay}
              onStartFocus={(t) => openFocus(t.id)}
              onMarkDone={(t) => {
                handleCompleteTask(t.id, window.innerWidth / 2, window.innerHeight / 3);
              }}
              onSkip={(t) => {
                setSkipReasonTaskId(t.id);
              }}
              onShowMore={() => { setShowAllTasks(true); }}
            />
          )}
        </>
      ) : null}

      {/* ── Smart Banner Slot — milestone / week recap / plan adjustment ── */}
      {!showReEngagement && <SmartBannerSlot />}

      {/* ── Daily Insight ────────────────────────────────────────────────── */}
      {!allDone && (() => {
        const insights: { condition: boolean; text: string }[] = [
          { condition: currentDay <= 3, text: "The first 3 days are the hardest. Momentum builds from here." },
          { condition: streak >= 14, text: `${streak} days of consistency. Your brain is rewiring in real time.` },
          { condition: streak >= 7, text: "7+ days in — you've passed the hardest threshold. Keep going." },
          { condition: streak >= 3, text: "You're on a streak. Each day makes the next one easier." },
          { condition: completionRate >= 80, text: "Your completion rate is exceptional. You're in rare company." },
          { condition: showReEngagement, text: "Getting back after a break is harder than starting fresh. That counts." },
          { condition: true, text: "Progress is built in small, consistent steps — not grand moments." },
        ];
        const insight = insights.find(i => i.condition);
        if (!insight) return null;
        return (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            marginBottom: 20,
            padding: '14px 16px',
            backgroundColor: ap.accentSoft,
            border: `1px solid ${ap.accentMid}`,
            borderRadius: 12,
          }}>
            <Brain size={14} strokeWidth={1.5} color={ap.accent} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13, color: ap.textSecondary, lineHeight: 1.55, fontStyle: 'italic' }}>
              💡 {insight.text}
            </p>
          </div>
        );
      })()}

      {/* ── Tasks Section ────────────────────────────────────────────────── */}
      <div>
        {/* When allDone: show compact completed log instead of full cards */}
        {allDone && completedTasks.length > 0 && (
        <div style={{
          marginTop: 4,
          background: ap.surface,
          border: `1px solid ${ap.border}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: `1px solid ${ap.border}`,
            fontSize: 11, fontWeight: 700, color: ap.textTertiary,
            letterSpacing: '0.07em', textTransform: 'uppercase' as const,
          }}>
            Completed today
          </div>
          {completedTasks.map((task, i) => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px',
              borderBottom: i < completedTasks.length - 1 ? `1px solid ${ap.border}` : 'none',
            }}>
              <CheckCircle2 size={15} color={ap.success} strokeWidth={2} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: ap.textSecondary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                }}>
                  {task.title}
                </div>
              </div>
              {(task.duration ?? 0) > 0 && (
                <span style={{ fontSize: 11, color: ap.textTertiary, flexShrink: 0 }}>
                  {task.duration}m
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: allDone ? 'none' : 'block' }}>
        {/* Section header — always show when there are list tasks */}
        {listTasks.length > 0 && <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}>
          <h2 style={text.h2}>{heroTask ? "Also Today" : "Today's Tasks"}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
            {/* Quick Mode toggle */}
            {incompleteTasks.length > 1 && (
              <button
                onClick={() => setQuickMode(q => !q)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  borderRadius: '99px',
                  border: `1px solid ${quickMode ? tokens.colors.primary : tokens.colors.borderLight}`,
                  backgroundColor: quickMode ? `${tokens.colors.primary}12` : 'transparent',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: tokens.typography.weights.medium,
                  color: quickMode ? tokens.colors.primary : tokens.colors.text.tertiary,
                  transition: 'all 150ms ease',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                <Zap size={12} strokeWidth={2} />
                10 min
              </button>
            )}
            <span style={{ ...text.caption, color: tokens.colors.text.secondary, whiteSpace: 'nowrap' as const }}>
              {heroTask
                ? `${listTasks.filter(t => !t.completed).length} remaining`
                : `${completedTasks.length} of ${todaysTasks.length} done`}
            </span>
          </div>
        </div>}

        {/* Quick Mode active banner */}
        {quickMode && incompleteTasks.length > 0 && (
          <div style={{
            marginBottom: tokens.spacing.lg,
            padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
            backgroundColor: `${tokens.colors.primary}08`,
            border: `1px solid ${tokens.colors.primary}20`,
            borderRadius: tokens.borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}>
            <Zap size={12} strokeWidth={2.5} color={tokens.colors.primary} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.light }}>
              One task at a time.{incompleteTasks.length > 1 ? ` ${incompleteTasks.length - 1} more waiting.` : ' This is your last one.'}
            </span>
            <button
              onClick={() => setQuickMode(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, padding: '2px 6px', borderRadius: 4, transition: 'color 150ms ease', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => e.currentTarget.style.color = tokens.colors.text.primary}
              onMouseLeave={e => e.currentTarget.style.color = tokens.colors.text.tertiary}
            >
              Show all
            </button>
          </div>
        )}

        {/* List tasks — always shown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xl }}>
          {listTasks.map((task) => {
            const isCompleting = completingTaskId === task.id;
            const hasFocus = hasFocusMode(task);

            return (
              <SwipeableCard
                key={task.id}
                data-task-card
                swipeDisabled={!isMobile || task.completed || isCompleting}
                onSwipeLeft={() => {
                  if (!task.completed && !isCompleting) setSkipReasonTaskId(task.id);
                }}
                onSwipeRight={() => {
                  if (!task.completed && !isCompleting && hasFocus) openFocus(task.id);
                }}
                style={{
                  ...card.standard,
                  backgroundColor: task.completed
                    ? 'rgba(124,58,237,0.03)'
                    : tokens.colors.surface,
                  padding: tokens.spacing['2xl'],
                  boxShadow: task.completed ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                  border: `1px solid ${task.completed ? 'rgba(124,58,237,0.12)' : tokens.colors.borderLight}`,
                  borderLeft: task.completed
                    ? '4px solid rgba(124,58,237,0.2)'
                    : '4px solid rgba(124,58,237,0.35)',
                  borderRadius: tokens.borderRadius.lg,
                  opacity: task.completed ? 0.65 : 1,
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  cursor: !task.completed && hasFocus ? 'pointer' : 'default',
                  animation: isCompleting ? 'completedSettle 0.45s cubic-bezier(0.4,0,0.2,1)' : 'none',
                  pointerEvents: isCompleting ? 'none' : 'auto',
                }}
                onClick={() => {
                  if (!task.completed && !isCompleting && hasFocus) {
                    openFocus(task.id);
                  }
                }}
                onMouseEnter={e => {
                  if (!task.completed && !isCompleting) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 32px rgba(124,58,237,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)';
                    e.currentTarget.style.borderLeftColor = '#7c3aed';
                  }
                }}
                onMouseLeave={e => {
                  if (!task.completed) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = tokens.colors.borderLight;
                    e.currentTarget.style.borderLeftColor = 'rgba(124,58,237,0.35)';
                  }
                }}
              >
                <div style={{ display: 'flex', gap: tokens.spacing.xl, alignItems: 'flex-start' }}>
                  {/* Checkbox */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (!task.completed) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleCompleteTask(task.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
                      }
                    }}
                    disabled={task.completed}
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: task.completed ? tokens.colors.primary : 'transparent',
                      border: `1.5px solid ${task.completed ? tokens.colors.primary : tokens.colors.gray[300]}`,
                      borderRadius: '50%',
                      cursor: task.completed ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                      flexShrink: 0,
                      marginTop: '2px',
                      animation: isCompleting ? 'checkPop 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none',
                      // Larger tap target on mobile
                      ...(isMobile && { width: '40px', height: '40px' }),
                    }}
                    onMouseEnter={e => {
                      if (!task.completed) {
                        e.currentTarget.style.borderColor = tokens.colors.primary;
                        e.currentTarget.style.borderWidth = '2px';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!task.completed) {
                        e.currentTarget.style.borderColor = tokens.colors.gray[300];
                        e.currentTarget.style.borderWidth = '1.5px';
                      }
                    }}
                  >
                    {task.completed && <CheckCircle2 size={18} strokeWidth={2} color={tokens.colors.text.inverse} />}
                  </button>

                  {/* Task content */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      marginBottom: tokens.spacing.md,
                    }}>
                      {/* Type badge — solid gradient pill */}
                      {(() => {
                        const typeGradients: Record<string, { bg: string; shadow: string; label: string }> = {
                          practice:   { bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', shadow: 'rgba(124,58,237,0.35)', label: 'Practice' },
                          learning:   { bg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', shadow: 'rgba(14,165,233,0.35)', label: 'Learning' },
                          reflection: { bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', shadow: 'rgba(124,58,237,0.35)', label: 'Reflect' },
                        };
                        const g = typeGradients[task.type] ?? { bg: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', shadow: 'rgba(107,114,128,0.35)', label: task.type };
                        return (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: tokens.typography.weights.semibold,
                            color: '#fff',
                            background: task.completed ? tokens.colors.gray[200] : g.bg,
                            boxShadow: task.completed ? 'none' : `0 2px 8px ${g.shadow}`,
                            padding: '3px 10px',
                            borderRadius: '99px',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.06em',
                          }}>
                            {g.label}
                          </span>
                        );
                      })()}
                      <span style={{ fontSize: '11px', color: tokens.colors.text.tertiary, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} strokeWidth={1.5} />
                        {formatDuration(task.duration)}
                      </span>
                    </div>

                    <h4 style={{
                      fontSize: tokens.typography.sizes.lg,
                      fontWeight: tokens.typography.weights.semibold,
                      lineHeight: 1.3,
                      color: task.completed ? tokens.colors.text.tertiary : tokens.colors.text.primary,
                      marginBottom: tokens.spacing.sm,
                      textDecoration: task.completed ? 'line-through' : 'none',
                      letterSpacing: '-0.01em',
                      transition: 'color 0.3s ease',
                    }}>
                      {task.title}
                    </h4>

                    {!task.completed && (
                      <p style={{
                        fontSize: tokens.typography.sizes.md,
                        fontWeight: tokens.typography.weights.light,
                        lineHeight: tokens.typography.lineHeights.normal,
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing.md,
                      }}>
                        {task.description}
                      </p>
                    )}

                    {/* 30-30-40 Segment blocks */}
                    {!task.completed && task.segments && task.segments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: tokens.spacing.md }}>
                        {task.segments.map((seg, i) => {
                          const segColors = [
                            { bg: 'rgba(14,165,233,0.07)', border: 'rgba(14,165,233,0.2)', pill: '#0ea5e9', pillText: '#fff', icon: <BookOpen size={11} strokeWidth={2} color="#0ea5e9" /> },
                            { bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.2)', pill: '#7c3aed', pillText: '#fff', icon: <Zap size={11} strokeWidth={2} color="#7c3aed" /> },
                            { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)', pill: '#10b981', pillText: '#fff', icon: <Brain size={11} strokeWidth={2} color="#10b981" /> },
                          ];
                          const c = segColors[i % segColors.length];
                          return (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '10px 12px', borderRadius: 10,
                              background: c.bg, border: `1px solid ${c.border}`,
                            }}>
                              <div style={{ flexShrink: 0, marginTop: 1 }}>{c.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, color: c.pillText,
                                    background: c.pill, borderRadius: 99, padding: '2px 8px',
                                    letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                                  }}>{seg.label}</span>
                                  <span style={{ fontSize: 11, color: tokens.colors.text.tertiary, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Clock size={10} strokeWidth={1.5} />{seg.duration} min
                                  </span>
                                </div>
                                <p style={{ fontSize: 12, color: tokens.colors.text.secondary, lineHeight: 1.45, margin: 0 }}>
                                  {seg.description}
                                </p>
                                {seg.tip && (
                                  <p style={{ fontSize: 11, color: tokens.colors.text.tertiary, fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.4 }}>
                                    {seg.tip}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Skip button (card level) */}
                    {!task.completed && (
                      <div onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => handleSkipTask(task.id, e)}
                          disabled={skippingTaskId === task.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: tokens.spacing.xs,
                            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                            backgroundColor: skipReasonTaskId === task.id ? tokens.colors.gray[50] : 'transparent',
                            border: `1px solid ${skipReasonTaskId === task.id ? tokens.colors.gray[300] : tokens.colors.gray[200]}`,
                            borderRadius: tokens.borderRadius.sm,
                            cursor: skippingTaskId === task.id ? 'default' : 'pointer',
                            fontSize: tokens.typography.sizes.sm,
                            fontWeight: tokens.typography.weights.regular,
                            color: tokens.colors.text.secondary,
                            transition: 'all 200ms cubic-bezier(.4,0,.2,1)',
                            opacity: skippingTaskId === task.id ? 0.5 : 1,
                          }}
                          onMouseEnter={e => {
                            if (skippingTaskId !== task.id) {
                              e.currentTarget.style.backgroundColor = tokens.colors.gray[50];
                              e.currentTarget.style.borderColor = tokens.colors.gray[300];
                              e.currentTarget.style.color = tokens.colors.text.primary;
                            }
                          }}
                          onMouseLeave={e => {
                            if (skipReasonTaskId !== task.id) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = tokens.colors.gray[200];
                            }
                            e.currentTarget.style.color = tokens.colors.text.secondary;
                          }}
                        >
                          <SkipForward size={14} strokeWidth={1.5} />
                          <span>Not Today</span>
                        </button>

                        {/* Skip reason picker (card level) */}
                        {skipReasonTaskId === task.id && (
                          <div style={{
                            marginTop: tokens.spacing.md,
                            padding: tokens.spacing.lg,
                            backgroundColor: tokens.colors.background,
                            border: `1px solid ${tokens.colors.borderLight}`,
                            borderRadius: tokens.borderRadius.lg,
                            boxShadow: tokens.shadows.sm,
                          }}>
                            <p style={{
                              fontSize: tokens.typography.sizes.sm,
                              fontWeight: tokens.typography.weights.medium,
                              color: tokens.colors.text.secondary,
                              marginBottom: tokens.spacing.md,
                            }}>
                              What's getting in the way?
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: tokens.spacing.sm }}>
                              {([
                                { storeReason: 'time'       as const, emoji: '⏱️', label: 'No time today' },
                                { storeReason: 'health'     as const, emoji: '😓', label: 'Not feeling well' },
                                { storeReason: 'difficulty' as const, emoji: '😕', label: 'Too difficult' },
                                { storeReason: 'external'   as const, emoji: '📅', label: 'Something came up' },
                                { storeReason: 'external'   as const, emoji: '🌪️', label: 'Lost motivation' },
                              ]).map(({ storeReason, emoji, label }) => (
                                <button
                                  key={label}
                                  onClick={() => confirmSkip(task.id, storeReason, () => {})}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: tokens.spacing.xs,
                                    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                                    backgroundColor: tokens.colors.surface,
                                    border: `1px solid ${tokens.colors.borderLight}`,
                                    borderRadius: tokens.borderRadius.md,
                                    cursor: 'pointer',
                                    fontSize: tokens.typography.sizes.sm,
                                    color: tokens.colors.text.primary,
                                    textAlign: 'left',
                                    transition: 'all 150ms ease',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = tokens.colors.primary + '60';
                                    e.currentTarget.style.backgroundColor = tokens.colors.primary + '08';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = tokens.colors.borderLight;
                                    e.currentTarget.style.backgroundColor = tokens.colors.surface;
                                  }}
                                >
                                  <span>{emoji}</span><span>{label}</span>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setSkipReasonTaskId(null)}
                              style={{
                                marginTop: tokens.spacing.sm,
                                width: '100%',
                                padding: tokens.spacing.sm,
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: tokens.typography.sizes.sm,
                                color: tokens.colors.text.tertiary,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Adjusted badge */}
                    {task.adjustedDifficulty === 'easier' && task.rescheduledFrom && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: tokens.spacing.xs,
                        marginTop: tokens.spacing.sm,
                        padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                        backgroundColor: tokens.colors.primary + '10',
                        borderRadius: tokens.borderRadius.sm,
                        fontSize: tokens.typography.sizes.xs,
                        color: tokens.colors.primary,
                        fontWeight: tokens.typography.weights.medium,
                      }}>
                        ✨ Adjusted for today
                      </div>
                    )}

                    {/* Actions row */}
                    {!task.completed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, marginTop: tokens.spacing.lg, flexWrap: 'wrap' as const }}>
                        {/* Deep Focus CTA button */}
                        {hasFocus && (
                          <button
                            onClick={e => { e.stopPropagation(); openFocus(task.id); }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 18px',
                              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: tokens.borderRadius.md,
                              fontSize: tokens.typography.sizes.sm,
                              fontWeight: tokens.typography.weights.medium,
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                              transition: 'all 0.2s ease',
                              letterSpacing: '-0.01em',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(124,58,237,0.45)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,58,237,0.35)'; }}
                          >
                            <Zap size={13} strokeWidth={2} />
                            Deep Focus
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </SwipeableCard>
            );
          })}
        </div>
      </div>

        {todaysTasks.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1a0533 0%, #2d1060 50%, #1a0533 100%)',
            borderRadius: tokens.borderRadius.xl,
            padding: `${tokens.spacing['4xl']} ${tokens.spacing['3xl']}`,
            textAlign: 'center',
            border: '1px solid rgba(124,58,237,0.25)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Background glow */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            {/* Icon */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(124,58,237,0.2)',
              border: '1px solid rgba(124,58,237,0.35)',
              marginBottom: tokens.spacing.lg,
              position: 'relative',
            }}>
              <Sparkles size={24} color="#a78bfa" strokeWidth={1.5} />
            </div>
            {/* Heading */}
            <h3 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.semibold,
              color: '#e9d8fd',
              margin: 0,
              marginBottom: tokens.spacing.sm,
              letterSpacing: '-0.02em',
            }}>
              Your slate is clear
            </h3>
            {/* Subtext */}
            <p style={{
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.light,
              color: 'rgba(196,167,253,0.7)',
              lineHeight: tokens.typography.lineHeights.relaxed,
              margin: 0,
              marginBottom: tokens.spacing['2xl'],
              maxWidth: '280px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Use this time to revisit your goals or explore resources to stay inspired.
            </p>
            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: tokens.spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => onNavigate?.('roadmap')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                  borderRadius: tokens.borderRadius.full,
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                }}
              >
                Review Goals <ArrowRight size={14} strokeWidth={2} />
              </button>
              <button
                onClick={() => onNavigate?.('insights')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                  borderRadius: tokens.borderRadius.full,
                  background: 'rgba(124,58,237,0.12)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  color: '#a78bfa',
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                <BookOpen size={14} strokeWidth={2} /> Explore Library
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Coming Up — next 3 days preview ─────────────────────────────── */}
      {(() => {
        const upcomingDays = [1, 2, 3].map(offset => {
          const dayNum = currentDay + offset;
          const dayTasks = tasks.filter(t => t.day === dayNum && !t.skipped);
          return { dayNum, tasks: dayTasks };
        }).filter(d => d.tasks.length > 0);

        if (upcomingDays.length === 0) return null;

        const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
          practice:   { color: '#a78bfa', bg: 'rgba(124,58,237,0.08)' },
          learning:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
          reflection: { color: '#c4b5fd', bg: 'rgba(124,58,237,0.06)' },
          review:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
          challenge:  { color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
          retrieval:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
          assessment: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        };

        const dayLabel = (offset: number) => offset === 1 ? 'Tomorrow' : offset === 2 ? 'In 2 days' : 'In 3 days';

        return (
          <div style={{ marginTop: 28, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <ArrowRight size={14} color="#9ca3af" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0, letterSpacing: '-0.02em' }}>Coming Up</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingDays.map(({ dayNum, tasks: dayTasks }) => {
                const offset = dayNum - currentDay;
                return (
                  <div key={dayNum} style={{
                    background: '#fff',
                    border: '1px solid #f0f0f5',
                    borderRadius: 14,
                    padding: '12px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{dayLabel(offset)}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>Day {dayNum} · {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dayTasks.slice(0, 3).map(t => {
                        const tc = TYPE_COLORS[t.type] ?? { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' };
                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: tc.color,
                              background: tc.bg, borderRadius: 99, padding: '2px 7px',
                              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                            }}>
                              {t.type}
                            </span>
                            <span style={{
                              fontSize: 13, color: '#374151', fontWeight: 500,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                            }}>
                              {t.title}
                            </span>
                            <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                              {t.duration}m
                            </span>
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <span style={{ fontSize: 11, color: '#9ca3af', paddingLeft: 4 }}>
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Post-task feedback modal */}
      {pendingFeedbackTaskId && (() => {
        const feedbackTask = tasks.find(t => t.id === pendingFeedbackTaskId);
        if (!feedbackTask) return null;
        return (
          <TaskFeedbackModal
            isOpen={true}
            taskTitle={feedbackTask.title}
            estimatedMinutes={feedbackTask.duration}
            onSubmit={(feedback) => submitFeedback(pendingFeedbackTaskId, feedback)}
            onClose={dismissFeedback}
          />
        );
      })()}

      {/* FocusComplete overlay */}
      {showFocusComplete && heroTask && (
        <FocusComplete
          taskId={heroTask.id}
          taskTitle={heroTask.title}
          timeSpentSeconds={focusSeconds}
          newStreak={streak}
          onComplete={(mood, reflection) => {
            handleCompleteTask(heroTask.id, window.innerWidth / 2, window.innerHeight / 2);
            endSession();
            if (setTaskFeedback) {
              setTaskFeedback(heroTask.id, mood, undefined, reflection || undefined, undefined);
            }
            setShowFocusComplete(false);
            setFocusTaskId(null);
          }}
          onClose={() => setShowFocusComplete(false)}
        />
      )}

    </div>
  );
}
