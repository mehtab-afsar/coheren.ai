import { CheckCircle2, Clock, ArrowRight, Sparkles, SkipForward, X, Zap, Brain, BookOpen, Lightbulb, ListChecks } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useCinemaMode } from '../hooks/useCinemaMode';
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
    canAdvanceDay,
  } = useStore();

  const { cinemaTaskId, setCinemaTaskId, getYouTubeId, timeToSeconds } = useCinemaMode();
  const { isMobile } = useBreakpoint();
  const { startSession, updateElapsed, endSession } = useFocusSession();
  const completeTask = useStore((state) => state.completeTask);
  const completeAssessment = useStore((state) => state.completeAssessment);
  const skipTask = useStore((state) => state.skipTask);
  const setTaskFeedback = useStore((state) => state.setTaskFeedback);
  const { completingTaskId, skippingTaskId, skipReasonTaskId, setSkipReasonTaskId, particles, showSkipMessage, pendingFeedbackTaskId, submitFeedback, dismissFeedback, handleCompleteTask, handleSkipTask, confirmSkip } = useTaskActions(completeTask, skipTask, setTaskFeedback);

  // Quick Mode — surfaces only the single most important incomplete task
  const [quickMode, setQuickMode] = useState(false);
  // Ease Back Mode — auto-limits to 1 task on re-engagement, dismissed when user wants all
  const [easeBackMode, setEaseBackMode] = useState(true);
  // Show all tasks below FocusCard
  const [_showAllTasks, setShowAllTasks] = useState(false);
  // Ref to the YouTube iframe so we can postMessage it
  const cinemaIframeRef = useRef<HTMLIFrameElement>(null);
  // Tracks current video playback position from YouTube infoDelivery messages
  const cinemaCurrentTimeRef = useRef<number>(0);
  // Focus Timer (count-up while cinema is open)
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [focusPaused, setFocusPaused] = useState(false);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FocusComplete overlay
  const [showFocusComplete, setShowFocusComplete] = useState(false);

  // Note input (single line, saved to localStorage per task)
  const [noteInput, setNoteInput] = useState('');
  // Focus mode: step checklist + mobile tab (steps vs watch)
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [focusTab, setFocusTab] = useState<'steps' | 'watch'>('steps');

  // Listen for YouTube infoDelivery postMessages to track current time
  useEffect(() => {
    if (!cinemaTaskId) return;
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'infoDelivery' && typeof data?.info?.currentTime === 'number') {
          cinemaCurrentTimeRef.current = data.info.currentTime;
        }
      } catch { /* ignore non-JSON or unrelated messages */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [cinemaTaskId]);

  // Count-up focus timer — runs while cinema is open and not paused
  useEffect(() => {
    if (!cinemaTaskId || focusPaused) {
      if (focusIntervalRef.current) { clearInterval(focusIntervalRef.current); focusIntervalRef.current = null; }
      return;
    }
    focusIntervalRef.current = setInterval(() => {
      setFocusSeconds(s => {
        const next = s + 1;
        if (next % 10 === 0) updateElapsed(next);
        return next;
      });
    }, 1000);
    return () => { if (focusIntervalRef.current) { clearInterval(focusIntervalRef.current); focusIntervalRef.current = null; } };
  }, [cinemaTaskId, focusPaused, updateElapsed]);

  // Pause the embedded YouTube video via postMessage (requires enablejsapi=1)
  const pauseYouTube = useCallback(() => {
    cinemaIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
      '*'
    );
  }, []);
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
  const canAdvance = canAdvanceDay();

  // Re-engagement: streak broken, not first day, nothing done today
  const showReEngagement = streak === 0 && currentDay > 1 && completedTasks.length === 0;

  // Tasks to render — full list, Quick Mode (1 task), or Ease Back Mode (1 task on return)
  const incompleteTasks = todaysTasks.filter(t => !t.completed);
  const visibleTasks = (quickMode || (showReEngagement && easeBackMode))
    ? [...completedTasks, ...incompleteTasks.slice(0, 1)]
    : todaysTasks;
  // Hero task: first incomplete task of the day (shown as the featured focus card)
  const heroTask = !allDone && incompleteTasks.length > 0 ? incompleteTasks[0] : null;
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

  // ── Cinema Mode data ─────────────────────────────────────────────────────
  const cinemaTask = cinemaTaskId ? todaysTasks.find(t => t.id === cinemaTaskId) : null;
  const cinemaResource = cinemaTask?.resources?.primary ?? null;
  const cinemaVideoId = cinemaResource?.type === 'video' ? getYouTubeId(cinemaResource.url) : null;
  const cinemaEmbedUrl = cinemaVideoId ? (() => {
    const p = new URLSearchParams();
    if (cinemaResource?.watchFrom) p.set('start', String(timeToSeconds(cinemaResource.watchFrom)));
    if (cinemaResource?.watchTo) p.set('end', String(timeToSeconds(cinemaResource.watchTo)));
    p.set('autoplay', '1');
    p.set('rel', '0');
    p.set('enablejsapi', '1');
    return `https://www.youtube.com/embed/${cinemaVideoId}?${p.toString()}`;
  })() : null;

  const hasCinemaMode = (task: typeof todaysTasks[0]) => !task.completed;

  // Open cinema: start timer and session
  const openCinema = (taskId: string) => {
    try { localStorage.setItem('onboard_focus_done', '1'); } catch { /* ignore */ }
    setFocusSeconds(0);
    setFocusPaused(false);
    setNoteInput('');
    setCheckedSteps(new Set());
    setFocusTab('steps');
    cinemaCurrentTimeRef.current = 0;
    setCinemaTaskId(taskId);
    const task = todaysTasks.find(t => t.id === taskId);
    startSession(taskId, task?.title ?? taskId);
  };

  // Close cinema: save video position, pause, end session
  const closeCinema = () => {
    if (cinemaVideoId && cinemaCurrentTimeRef.current > 5) {
      localStorage.setItem(`cinema_pos_${cinemaVideoId}`, String(Math.floor(cinemaCurrentTimeRef.current)));
    }
    pauseYouTube();
    endSession();
    setCinemaTaskId(null);
  };

  return (
    <div style={{ position: 'relative' }}>
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

      {/* ── Focus Mode ───────────────────────────────────────────────────── */}
      {cinemaTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9800, display: 'flex', flexDirection: 'column', backgroundColor: '#04040c' }}>

          {/* Top bar: title + timer + close */}
          <div style={{ padding: '0 24px 0', paddingTop: 'max(20px, env(safe-area-inset-top))', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cinemaTask.title}
            </span>
            {/* Focus timer — count-up with ring */}
            {(() => {
              const estSecs = cinemaTask.duration * 60;
              const progress = Math.min(focusSeconds / estSecs, 1);
              const circumference = 2 * Math.PI * 13;
              const mins = Math.floor(focusSeconds / 60);
              const secs = focusSeconds % 60;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                    <circle cx="16" cy="16" r="13" fill="none" stroke={progress >= 1 ? '#a78bfa' : tokens.colors.primary} strokeWidth="2.5"
                      strokeDasharray={`${progress * circumference} ${circumference}`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s linear' }} />
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                  </span>
                  <button
                    onClick={() => setFocusPaused(p => !p)}
                    title={focusPaused ? 'Resume timer' : 'Pause timer'}
                    style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {focusPaused
                      ? <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0l10 6-10 6z"/></svg>
                      : <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><rect x="0" y="0" width="3.5" height="12"/><rect x="6.5" y="0" width="3.5" height="12"/></svg>
                    }
                  </button>
                </div>
              );
            })()}
            <button
              onClick={closeCinema}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Main content — split layout on desktop, tabs on mobile */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

            {/* Desktop split: Left panel = steps/tips, Right = video */}
            {!isMobile ? (
              <>
                {/* ── Left: Step checklist ── */}
                <div style={{
                  width: cinemaVideoId ? '380px' : '100%',
                  display: 'flex', flexDirection: 'column',
                  overflowY: 'auto', padding: '28px 24px 28px 32px',
                  borderRight: cinemaVideoId ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  flexShrink: 0,
                }}>
                  {/* Task title */}
                  <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 700, color: '#f3e8ff', letterSpacing: '-0.025em', margin: '0 0 6px', lineHeight: 1.25 }}>
                    {cinemaTask.title}
                  </h2>
                  {cinemaTask.description && (
                    <p style={{ fontSize: 13, color: 'rgba(196,181,253,0.55)', lineHeight: 1.6, margin: '0 0 20px' }}>
                      {cinemaTask.description.split('. ').slice(0, 2).join('. ')}{cinemaTask.description.split('. ').length > 2 ? '.' : ''}
                    </p>
                  )}

                  {/* Steps */}
                  {Array.isArray((cinemaTask as unknown as Record<string, unknown>).steps) && ((cinemaTask as unknown as Record<string, unknown>).steps as string[]).length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <ListChecks size={13} color="#a78bfa" strokeWidth={2} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Steps ({checkedSteps.size}/{((cinemaTask as unknown as Record<string, unknown>).steps as string[]).length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {((cinemaTask as unknown as Record<string, unknown>).steps as string[]).map((step, i) => {
                          const done = checkedSteps.has(i);
                          return (
                            <button
                              key={i}
                              onClick={() => setCheckedSteps(prev => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i); else next.add(i);
                                return next;
                              })}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: 12,
                                background: done ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${done ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                borderRadius: 12, padding: '14px 16px',
                                cursor: 'pointer', textAlign: 'left', width: '100%',
                                transition: 'all 150ms ease',
                              }}
                            >
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                border: `2px solid ${done ? '#a78bfa' : 'rgba(255,255,255,0.2)'}`,
                                background: done ? '#7c3aed' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginTop: 2, transition: 'all 150ms ease',
                              }}>
                                {done && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div style={{ flex: 1 }}>
                                <span style={{
                                  display: 'block',
                                  fontSize: 10, fontFamily: 'monospace',
                                  fontVariantNumeric: 'tabular-nums',
                                  color: done ? '#a78bfa' : 'rgba(167,139,250,0.4)',
                                  marginBottom: 3, letterSpacing: '0.05em',
                                  transition: 'color 150ms ease',
                                }}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span style={{
                                  fontSize: 15, color: done ? 'rgba(196,181,253,0.5)' : 'rgba(255,255,255,0.85)',
                                  lineHeight: 1.55, textDecoration: done ? 'line-through' : 'none',
                                  transition: 'all 150ms ease',
                                }}>
                                  {typeof step === 'string' ? step : (step as Record<string, unknown>).details as string ?? String(step)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {Array.isArray((cinemaTask as unknown as Record<string, unknown>).tips) && ((cinemaTask as unknown as Record<string, unknown>).tips as string[]).length > 0 && (
                    <div style={{
                      background: 'rgba(251,191,36,0.06)',
                      border: '1px solid rgba(251,191,36,0.15)',
                      borderRadius: 12, padding: '16px 18px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Lightbulb size={12} color="#fbbf24" strokeWidth={2} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Coach Tips</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {((cinemaTask as unknown as Record<string, unknown>).tips as string[]).slice(0, 3).map((tip, i) => (
                          <p key={i} style={{ fontSize: 12, color: 'rgba(251,191,36,0.8)', margin: 0, lineHeight: 1.5 }}>
                            · {tip}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Right: Video player — fills edge-to-edge ── */}
                {cinemaVideoId && cinemaEmbedUrl && (
                  <div style={{ flex: 1, position: 'relative', background: '#000', minWidth: 0 }}>
                    <iframe
                      key={cinemaEmbedUrl}
                      ref={cinemaIframeRef}
                      src={cinemaEmbedUrl}
                      title={cinemaTask.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => { cinemaIframeRef.current?.contentWindow?.postMessage('{"event":"listening"}', '*'); }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                    {cinemaResource?.watchFrom && (
                      <p style={{ position: 'absolute', bottom: 8, left: 0, right: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0, pointerEvents: 'none' }}>
                        Watch from {cinemaResource.watchFrom}{cinemaResource.watchTo ? ` to ${cinemaResource.watchTo}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* No video: show description centered */}
                {!cinemaVideoId && !Array.isArray((cinemaTask as unknown as Record<string, unknown>).steps) && cinemaTask.description && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, textAlign: 'center', maxWidth: 480, margin: 0 }}>
                      {cinemaTask.description}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* ── Mobile: Tab switcher ── */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Tab bar */}
                {cinemaVideoId && (
                  <div style={{ display: 'flex', gap: 0, padding: '0 16px', paddingTop: 8, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {(['steps', 'watch'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setFocusTab(tab)}
                        style={{
                          flex: 1, height: 48, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: focusTab === tab ? 700 : 400,
                          background: 'transparent',
                          color: focusTab === tab ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                          borderRadius: 0, transition: 'all 150ms ease',
                          borderBottom: focusTab === tab ? '2.5px solid #a78bfa' : '2.5px solid transparent',
                          textTransform: 'capitalize',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {tab === 'steps' ? `Steps (${checkedSteps.size}/${((cinemaTask as unknown as Record<string, unknown>).steps as string[] | undefined)?.length ?? 0})` : 'Watch'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Steps tab */}
                {(focusTab === 'steps' || !cinemaVideoId) && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 8px' }}>
                    {/* Task title */}
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f3e8ff', letterSpacing: '-0.025em', margin: '0 0 12px', lineHeight: 1.25 }}>
                      {cinemaTask.title}
                    </h2>

                    {/* Steps */}
                    {Array.isArray((cinemaTask as unknown as Record<string, unknown>).steps) && ((cinemaTask as unknown as Record<string, unknown>).steps as string[]).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                          Steps
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {((cinemaTask as unknown as Record<string, unknown>).steps as string[]).map((step, i) => {
                            const done = checkedSteps.has(i);
                            return (
                              <button
                                key={i}
                                onClick={() => setCheckedSteps(prev => {
                                  const next = new Set(prev);
                                  if (next.has(i)) next.delete(i); else next.add(i);
                                  return next;
                                })}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 12,
                                  background: done ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${done ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                  borderRadius: 12, padding: '14px 16px',
                                  cursor: 'pointer', textAlign: 'left', width: '100%',
                                }}
                              >
                                <div style={{
                                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                  border: `2px solid ${done ? '#a78bfa' : 'rgba(255,255,255,0.2)'}`,
                                  background: done ? '#7c3aed' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                                }}>
                                  {done && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <span style={{
                                    display: 'block',
                                    fontSize: 10, fontFamily: 'monospace',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: done ? '#a78bfa' : 'rgba(167,139,250,0.4)',
                                    marginBottom: 3, letterSpacing: '0.05em',
                                    transition: 'color 150ms ease',
                                  }}>
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <span style={{
                                    fontSize: 15, color: done ? 'rgba(196,181,253,0.5)' : 'rgba(255,255,255,0.85)',
                                    lineHeight: 1.55, textDecoration: done ? 'line-through' : 'none',
                                    transition: 'all 150ms ease',
                                  }}>
                                    {typeof step === 'string' ? step : (step as Record<string, unknown>).details as string ?? String(step)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tips */}
                    {Array.isArray((cinemaTask as unknown as Record<string, unknown>).tips) && ((cinemaTask as unknown as Record<string, unknown>).tips as string[]).length > 0 && (
                      <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Lightbulb size={12} color="#fbbf24" strokeWidth={2} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tips</span>
                        </div>
                        {((cinemaTask as unknown as Record<string, unknown>).tips as string[]).slice(0, 3).map((tip, i) => (
                          <p key={i} style={{ fontSize: 12, color: 'rgba(251,191,36,0.8)', margin: '0 0 4px', lineHeight: 1.5 }}>· {tip}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Watch tab — fills full height edge-to-edge */}
                {focusTab === 'watch' && cinemaVideoId && cinemaEmbedUrl && (
                  <div style={{ flex: 1, position: 'relative', background: '#000' }}>
                    <iframe
                      key={cinemaEmbedUrl}
                      ref={cinemaIframeRef}
                      src={cinemaEmbedUrl}
                      title={cinemaTask.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => { cinemaIframeRef.current?.contentWindow?.postMessage('{"event":"listening"}', '*'); }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Note input */}
          <div style={{ padding: '0 24px 12px', flexShrink: 0 }}>
            <input
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && noteInput.trim()) {
                  try { localStorage.setItem(`note_${cinemaTask.id}`, noteInput.trim()); } catch { /* ignore */ }
                  setNoteInput('');
                }
              }}
              placeholder="Quick note... (Enter to save)"
              style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.7)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Action footer */}
          <div style={{ padding: '0 24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
            {skipReasonTaskId === cinemaTask.id ? (
              <div style={{ maxWidth: 480, margin: '0 auto' }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10, textAlign: 'center' }}>What's getting in the way?</p>
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
                      onClick={() => confirmSkip(cinemaTask.id, storeReason, setCinemaTaskId)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
                    >
                      <span>{emoji}</span><span>{label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setSkipReasonTaskId(null)} style={{ width: '100%', background: 'none', border: 'none', fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '6px 0' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, maxWidth: 480, margin: '0 auto' }}>
                <button
                  onClick={() => setShowFocusComplete(true)}
                  style={{ flex: 1, padding: '13px 0', backgroundColor: tokens.colors.primary, color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: `0 4px 20px ${tokens.colors.primary}45`, letterSpacing: '-0.01em' }}
                >
                  <CheckCircle2 size={15} strokeWidth={2.5} /> Complete ✓
                </button>
                <button
                  onClick={e => handleSkipTask(cinemaTask.id, e)}
                  style={{ padding: '13px 18px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <SkipForward size={13} /> End early
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* ── Primary task area: RestDay / AllDone / FocusCard ────────────── */}
      {isRestDay ? (
        <RestDayCard onNavigateJourney={() => onNavigate?.('roadmap')} />
      ) : allDone ? (
        <AllDoneCard
          tasksCompleted={completedTasks.length}
          streak={streak}
          day={currentDay}
          minutesToday={minutesToday}
          taskTypeSummary={taskTypeSummary}
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
                    onClick={() => confirmSkip(heroTask.id, storeReason, setCinemaTaskId)}
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
              onStartFocus={(t) => openCinema(t.id)}
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
            display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.sm,
            marginBottom: tokens.spacing['2xl'],
            padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
            backgroundColor: `${tokens.colors.primary}08`,
            border: `1px solid ${tokens.colors.primary}18`,
            borderRadius: tokens.borderRadius.lg,
          }}>
            <Brain size={14} strokeWidth={1.5} color={tokens.colors.primary} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, lineHeight: 1.55, fontStyle: 'italic' }}>
              {insight.text}
            </p>
          </div>
        );
      })()}

      {/* ── Tasks Section ────────────────────────────────────────────────── */}
      <div>
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
            const hasCinema = hasCinemaMode(task);

            return (
              <SwipeableCard
                key={task.id}
                data-task-card
                swipeDisabled={!isMobile || task.completed || isCompleting}
                onSwipeLeft={() => {
                  if (!task.completed && !isCompleting) setSkipReasonTaskId(task.id);
                }}
                onSwipeRight={() => {
                  if (!task.completed && !isCompleting && hasCinema) openCinema(task.id);
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
                  cursor: !task.completed && hasCinema ? 'pointer' : 'default',
                  animation: isCompleting ? 'completedSettle 0.45s cubic-bezier(0.4,0,0.2,1)' : 'none',
                  pointerEvents: isCompleting ? 'none' : 'auto',
                }}
                onClick={() => {
                  if (!task.completed && !isCompleting && hasCinema) {
                    openCinema(task.id);
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
                                  onClick={() => confirmSkip(task.id, storeReason, setCinemaTaskId)}
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
                        {hasCinema && (
                          <button
                            onClick={e => { e.stopPropagation(); openCinema(task.id); }}
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
                        {/* Direct resource link */}
                        {task.resources?.primary?.url && (
                          <a
                            href={task.resources.primary.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: tokens.typography.sizes.sm,
                              color: '#0ea5e9',
                              fontWeight: tokens.typography.weights.regular,
                              textDecoration: 'none',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/>
                            </svg>
                            {task.resources.primary.title || 'Watch resource'}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </SwipeableCard>
            );
          })}
        </div>

        {/* All Done — celebration card */}
        {allDone && canAdvance && (
          <div style={{ marginTop: tokens.spacing['3xl'], animation: 'celebration 0.6s ease-out' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)',
              borderRadius: tokens.borderRadius.xl,
              padding: `${tokens.spacing['3xl']} ${tokens.spacing['2xl']}`,
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(124,58,237,0.4), 0 0 0 1px rgba(167,139,250,0.2)',
              position: 'relative' as const,
              overflow: 'hidden' as const,
            }}>
              {/* Subtle radial glow */}
              <div style={{
                position: 'absolute',
                top: '-40%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Sparkles */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20, position: 'relative' as const }}>
                <Sparkles size={20} strokeWidth={1.5} color="rgba(167,139,250,0.5)" />
                <Sparkles size={28} strokeWidth={1.5} color="#c4b5fd" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.8))' }} />
                <Sparkles size={20} strokeWidth={1.5} color="rgba(167,139,250,0.5)" />
              </div>

              <h3 style={{ fontSize: tokens.typography.sizes['2xl'], fontWeight: tokens.typography.weights.semibold, color: '#f3e8ff', margin: '0 0 8px', letterSpacing: '-0.03em', position: 'relative' as const }}>
                Day {currentDay} complete
              </h3>
              <p style={{ fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.regular, color: 'rgba(196,181,253,0.75)', margin: '0 0 32px', lineHeight: 1.6, position: 'relative' as const }}>
                {streak > 1 ? `🔥 ${streak} day streak · ` : ''}You showed up and did the work.
              </p>

              {/* Stats row */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: tokens.spacing['2xl'], marginBottom: tokens.spacing['2xl'], flexWrap: 'wrap' as const, position: 'relative' as const }}>
                {[
                  { label: 'Completed', value: String(completedTasks.length) },
                  { label: 'Streak', value: `${streak}d` },
                  { label: 'Day', value: String(currentDay) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#e9d5ff', margin: 0, letterSpacing: '-0.04em' }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(196,181,253,0.55)', margin: '4px 0 0', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{label}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: tokens.typography.sizes.sm, color: 'rgba(196,181,253,0.45)', margin: 0, position: 'relative' as const }}>
                Rest well — tomorrow starts automatically.
              </p>
            </div>
          </div>
        )}

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

      {/* FocusComplete overlay — shown when user taps Mark Done inside cinema */}
      {showFocusComplete && cinemaTask && (
        <FocusComplete
          taskId={cinemaTask.id}
          taskTitle={cinemaTask.title}
          timeSpentSeconds={focusSeconds}
          newStreak={streak}
          onComplete={(mood, reflection) => {
            handleCompleteTask(cinemaTask.id, window.innerWidth / 2, window.innerHeight / 2);
            endSession();
            if (setTaskFeedback) {
              setTaskFeedback(cinemaTask.id, mood, undefined, reflection || undefined, undefined);
            }
            setShowFocusComplete(false);
            setCinemaTaskId(null);
          }}
          onClose={() => setShowFocusComplete(false)}
        />
      )}

    </div>
  );
}
