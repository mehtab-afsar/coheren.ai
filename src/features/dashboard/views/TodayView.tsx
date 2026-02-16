import { Flame, Calendar, TrendingUp, CheckCircle2, Clock, ArrowRight, Sparkles, SkipForward, X, Zap } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { useRef, useState } from 'react';
import { useCinemaMode } from '../hooks/useCinemaMode';
import { useTaskActions } from '../hooks/useTaskActions';
import { useBreakpoint } from '@hooks/useBreakpoint';

export default function TodayView() {
  const {
    universalProfile,
    roadmap,
    tasks,
    currentDay,
    streak,
    completionRate,
    canAdvanceDay,
    advanceDay,
  } = useStore();

  const { cinemaTaskId, setCinemaTaskId, getYouTubeId, timeToSeconds } = useCinemaMode();
  const { isMobile } = useBreakpoint();
  const completeTask = useStore((state) => state.completeTask);
  const skipTask = useStore((state) => state.skipTask);
  const { completingTaskId, skippingTaskId, skipReasonTaskId, setSkipReasonTaskId, particles, showSkipMessage, handleCompleteTask, handleSkipTask, confirmSkip } = useTaskActions(completeTask, skipTask);
  const progressCardRef = useRef<HTMLDivElement>(null);

  // Quick Mode — surfaces only the single most important incomplete task
  const [quickMode, setQuickMode] = useState(false);
  // Weekly recap dismiss (persisted per session per week boundary)
  const weekRecapKey = `weekRecap_dismissed_day${currentDay}`;
  const [weekRecapDismissed, setWeekRecapDismissed] = useState(
    () => sessionStorage.getItem(weekRecapKey) === '1'
  );
  const dismissWeekRecap = () => {
    sessionStorage.setItem(weekRecapKey, '1');
    setWeekRecapDismissed(true);
  };

  const todaysTasks = tasks.filter(t => t.day === currentDay && !t.skipped);
  const completedTasks = todaysTasks.filter(t => t.completed);
  const allDone = todaysTasks.length > 0 && todaysTasks.every(t => t.completed);
  const canAdvance = canAdvanceDay();

  // Tasks to render — full list or just the first incomplete one in Quick Mode
  const incompleteTasks = todaysTasks.filter(t => !t.completed);
  const visibleTasks = quickMode
    ? [...completedTasks, ...incompleteTasks.slice(0, 1)]
    : todaysTasks;

  // Re-engagement: streak broken, not first day, nothing done today
  const showReEngagement = streak === 0 && currentDay > 1 && completedTasks.length === 0;

  // Weekly recap: first day of a new week (day 8, 15, 22…)
  const isNewWeekStart = currentDay > 7 && currentDay % 7 === 1;
  const lastWeekTasks = tasks.filter(t => t.day >= currentDay - 7 && t.day < currentDay);
  const lastWeekCompleted = lastWeekTasks.filter(t => t.completed).length;
  const lastWeekRate = lastWeekTasks.length > 0
    ? Math.round((lastWeekCompleted / lastWeekTasks.length) * 100)
    : 0;
  const showWeekRecap = isNewWeekStart && !weekRecapDismissed && lastWeekTasks.length > 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const handleAdvanceDay = () => {
    const success = advanceDay();
    if (success) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Cinema Mode data ─────────────────────────────────────────────────────
  const cinemaTask = cinemaTaskId ? todaysTasks.find(t => t.id === cinemaTaskId) : null;
  const cinemaResource = cinemaTask?.resources?.primary ?? null;
  const cinemaVideoId = cinemaResource?.type === 'video' ? getYouTubeId(cinemaResource.url) : null;
  // If resource URL is a search URL (no embeddable ID), keep it for direct linking
  const cinemaSearchUrl = cinemaResource?.url && !cinemaVideoId ? cinemaResource.url : null;
  const cinemaEmbedUrl = cinemaVideoId ? (() => {
    const p = new URLSearchParams();
    if (cinemaResource?.watchFrom) p.set('start', String(timeToSeconds(cinemaResource.watchFrom)));
    if (cinemaResource?.watchTo) p.set('end', String(timeToSeconds(cinemaResource.watchTo)));
    p.set('autoplay', '1');
    p.set('rel', '0');
    return `https://www.youtube.com/embed/${cinemaVideoId}?${p.toString()}`;
  })() : null;

  const hasCinemaMode = (task: typeof todaysTasks[0]) =>
    !task.completed && (
      (task.resources?.primary?.type === 'video') ||
      (task.steps?.length ?? 0) > 0 ||
      (task.tips?.length ?? 0) > 0
    );

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
      `}</style>

      {/* ── Cinema Mode Overlay ──────────────────────────────────────────── */}
      {cinemaTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.spacing.xl,
          }}
          onClick={() => setCinemaTaskId(null)}
        >
          {/* Backdrop */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5,5,15,0.82)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }} />

          {/* Panel */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1100px',
              maxHeight: '90vh',
              borderRadius: tokens.borderRadius['2xl'],
              overflow: 'hidden',
              display: 'flex',
              flexDirection: cinemaVideoId ? 'row' : 'column',
              backgroundColor: '#0D0E14',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              animation: 'cinemaSlideIn 0.35s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setCinemaTaskId(null)}
              style={{
                position: 'absolute',
                top: tokens.spacing.lg,
                right: tokens.spacing.lg,
                zIndex: 10,
                width: '36px',
                height: '36px',
                borderRadius: tokens.borderRadius.full,
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              <X size={18} />
            </button>

            {/* Left — Video */}
            {cinemaVideoId && cinemaEmbedUrl && (
              <div style={{
                flex: '0 0 62%',
                backgroundColor: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative' }}>
                  <iframe
                    src={cinemaEmbedUrl}
                    title={cinemaTask.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Right — Task Info */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: tokens.spacing['2xl'],
              overflowY: 'auto',
              gap: tokens.spacing.xl,
            }}>
              {/* Task meta */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  marginBottom: tokens.spacing.md,
                }}>
                  <span style={{
                    fontSize: tokens.typography.sizes.xs,
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.primary,
                    textTransform: 'capitalize',
                    letterSpacing: '0.06em',
                    backgroundColor: `${tokens.colors.primary}20`,
                    padding: `2px ${tokens.spacing.sm}`,
                    borderRadius: tokens.borderRadius.sm,
                  }}>
                    {cinemaTask.type}
                  </span>
                  <span style={{
                    fontSize: tokens.typography.sizes.xs,
                    color: 'rgba(255,255,255,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Clock size={12} /> {formatDuration(cinemaTask.duration)}
                  </span>
                </div>
                <h2 style={{
                  fontSize: tokens.typography.sizes.xl,
                  fontWeight: tokens.typography.weights.light,
                  color: 'rgba(255,255,255,0.92)',
                  lineHeight: 1.35,
                  marginBottom: tokens.spacing.sm,
                }}>
                  {cinemaTask.title}
                </h2>
                <p style={{
                  fontSize: tokens.typography.sizes.sm,
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.65,
                }}>
                  {cinemaTask.description}
                </p>

                {/* Watch on YouTube — shown when resource URL is a search URL (not embeddable) */}
                {cinemaSearchUrl && (
                  <a
                    href={cinemaSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      marginTop: tokens.spacing.md,
                      padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                      backgroundColor: 'rgba(255,0,0,0.12)',
                      border: '1px solid rgba(255,0,0,0.25)',
                      borderRadius: tokens.borderRadius.md,
                      fontSize: tokens.typography.sizes.sm,
                      fontWeight: tokens.typography.weights.medium,
                      color: '#ff6b6b',
                      textDecoration: 'none',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.2)';
                      e.currentTarget.style.color = '#ff4444';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.12)';
                      e.currentTarget.style.color = '#ff6b6b';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/>
                    </svg>
                    Find this on YouTube
                  </a>
                )}
              </div>

              {/* Steps */}
              {(cinemaTask.steps?.length ?? 0) > 0 && (
                <div>
                  <p style={{
                    fontSize: tokens.typography.sizes.xs,
                    fontWeight: tokens.typography.weights.semibold,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: tokens.spacing.md,
                  }}>
                    Steps
                  </p>
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
                    {cinemaTask.steps!.map((step, i) => (
                      <li key={i} style={{
                        display: 'flex',
                        gap: tokens.spacing.md,
                        alignItems: 'flex-start',
                      }}>
                        <span style={{
                          flexShrink: 0,
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: `${tokens.colors.primary}25`,
                          border: `1px solid ${tokens.colors.primary}40`,
                          color: tokens.colors.primary,
                          fontSize: '11px',
                          fontWeight: tokens.typography.weights.semibold,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {i + 1}
                        </span>
                        <span style={{
                          fontSize: tokens.typography.sizes.sm,
                          color: 'rgba(255,255,255,0.7)',
                          lineHeight: 1.6,
                          paddingTop: '2px',
                        }}>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tips (only if no steps) */}
              {(cinemaTask.steps?.length ?? 0) === 0 && (cinemaTask.tips?.length ?? 0) > 0 && (
                <div>
                  <p style={{
                    fontSize: tokens.typography.sizes.xs,
                    fontWeight: tokens.typography.weights.semibold,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: tokens.spacing.md,
                  }}>
                    Tips
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
                    {cinemaTask.tips!.map((tip, i) => (
                      <li key={i} style={{
                        display: 'flex',
                        gap: tokens.spacing.sm,
                        alignItems: 'flex-start',
                      }}>
                        <span style={{ color: tokens.colors.primary, fontSize: '16px', lineHeight: 1.3, flexShrink: 0 }}>·</span>
                        <span style={{
                          fontSize: tokens.typography.sizes.sm,
                          color: 'rgba(255,255,255,0.6)',
                          lineHeight: 1.6,
                        }}>
                          {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Criteria */}
              {cinemaTask.successCriteria && (
                <div style={{
                  padding: tokens.spacing.md,
                  backgroundColor: `${tokens.colors.primary}12`,
                  borderRadius: tokens.borderRadius.lg,
                  border: `1px solid ${tokens.colors.primary}25`,
                }}>
                  <p style={{
                    fontSize: tokens.typography.sizes.xs,
                    fontWeight: tokens.typography.weights.semibold,
                    color: tokens.colors.primary,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: tokens.spacing.xs,
                  }}>
                    Done when
                  </p>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.6,
                  }}>
                    {cinemaTask.successCriteria}
                  </p>
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Skip reason picker (cinema mode) */}
              {skipReasonTaskId === cinemaTask.id && (
                <div style={{
                  padding: tokens.spacing.lg,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: tokens.borderRadius.lg,
                }}>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.medium,
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: tokens.spacing.md,
                  }}>
                    What's getting in the way?
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.sm }}>
                    {([
                      { reason: 'time' as const,       emoji: '⏱️', label: 'No time today' },
                      { reason: 'health' as const,     emoji: '😓', label: 'Not feeling well' },
                      { reason: 'difficulty' as const, emoji: '😕', label: 'Too difficult' },
                      { reason: 'external' as const,   emoji: '📅', label: 'Something came up' },
                    ]).map(({ reason, emoji, label }) => (
                      <button
                        key={reason}
                        onClick={() => confirmSkip(cinemaTask.id, reason, setCinemaTaskId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: tokens.spacing.xs,
                          padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                          backgroundColor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: tokens.borderRadius.md,
                          cursor: 'pointer',
                          fontSize: tokens.typography.sizes.sm,
                          color: 'rgba(255,255,255,0.7)',
                          textAlign: 'left',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
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
                      color: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Action buttons */}
              {skipReasonTaskId !== cinemaTask.id && (
                <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                  <button
                    onClick={() => handleCompleteTask(cinemaTask.id, window.innerWidth / 2, window.innerHeight / 2)}
                    style={{
                      flex: 1,
                      padding: `${tokens.spacing.lg} 0`,
                      backgroundColor: tokens.colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: tokens.borderRadius.lg,
                      fontSize: tokens.typography.sizes.base,
                      fontWeight: tokens.typography.weights.medium,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: tokens.spacing.sm,
                      transition: 'all 0.2s',
                      boxShadow: `0 4px 16px ${tokens.colors.primary}50`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <CheckCircle2 size={18} />
                    Mark done
                  </button>
                  <button
                    onClick={e => handleSkipTask(cinemaTask.id, e)}
                    style={{
                      padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: tokens.borderRadius.lg,
                      fontSize: tokens.typography.sizes.sm,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.xs,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    }}
                  >
                    <SkipForward size={14} /> Skip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <p style={{
          fontSize: tokens.typography.sizes.sm,
          fontWeight: tokens.typography.weights.light,
          color: tokens.colors.text.tertiary,
          marginBottom: tokens.spacing.xs,
          letterSpacing: '0.02em',
        }}>
          {getGreeting()}
        </p>
        <h1 style={{
          fontSize: tokens.typography.sizes['3xl'],
          fontWeight: tokens.typography.weights.light,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          marginBottom: tokens.spacing.sm,
          lineHeight: 1.2,
        }}>
          {universalProfile.name || 'Welcome back'}
        </h1>
        <p style={{
          fontSize: tokens.typography.sizes.sm,
          fontWeight: tokens.typography.weights.light,
          color: tokens.colors.text.tertiary,
        }}>
          {roadmap?.title}
          <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
          Day {currentDay}
        </p>
      </div>

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

      {/* ── Stats Grid ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: tokens.spacing.md,
        marginBottom: tokens.spacing['3xl'],
      }}>
        {/* Streak */}
        <div style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderTop: `3px solid ${streak > 0 ? '#f97316' : tokens.colors.gray[200]}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.lg,
          boxShadow: tokens.shadows.xs,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spacing.md }}>
            <Flame size={14} strokeWidth={1.5} color={streak > 0 ? '#f97316' : tokens.colors.gray[300]} />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.regular, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
              Streak
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: tokens.typography.weights.light, color: tokens.colors.text.primary, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px' }}>
            {streak}
          </div>
          <div style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.light }}>
            {streak === 1 ? 'day in a row' : 'days in a row'}
          </div>
        </div>

        {/* Progress */}
        <div
          ref={progressCardRef}
          style={{
            backgroundColor: tokens.colors.surface,
            border: `1px solid ${tokens.colors.borderLight}`,
            borderTop: `3px solid ${tokens.colors.primary}`,
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing.lg,
            boxShadow: tokens.shadows.xs,
            animation: particles.length > 0 ? 'progressPulse 1s ease-in-out' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spacing.md }}>
            <TrendingUp size={14} strokeWidth={1.5} color={tokens.colors.primary} />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.regular, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
              Today
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: tokens.typography.weights.light, color: tokens.colors.text.primary, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '8px' }}>
            {Math.round(completionRate)}%
          </div>
          {/* Mini progress bar */}
          <div style={{ height: '3px', backgroundColor: tokens.colors.gray[100], borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(completionRate)}%`, backgroundColor: tokens.colors.primary, borderRadius: '99px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>

        {/* Week */}
        <div style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderTop: `3px solid #0ea5e9`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.lg,
          boxShadow: tokens.shadows.xs,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spacing.md }}>
            <Calendar size={14} strokeWidth={1.5} color="#0ea5e9" />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.regular, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
              Week
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: tokens.typography.weights.light, color: tokens.colors.text.primary, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px' }}>
            {Math.ceil(currentDay / 7)}
          </div>
          <div style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.light }}>
            of {Math.ceil((roadmap?.duration || 6) * 4)} weeks
          </div>
        </div>
      </div>

      {/* ── Re-engagement Banner ─────────────────────────────────────────── */}
      {showReEngagement && (
        <div style={{
          marginBottom: tokens.spacing['2xl'],
          padding: tokens.spacing.xl,
          backgroundColor: '#fafaf7',
          border: `1px solid ${tokens.colors.gray[100]}`,
          borderLeft: `3px solid ${tokens.colors.primary}`,
          borderRadius: tokens.borderRadius.lg,
        }}>
          <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.light, color: tokens.colors.text.primary, margin: '0 0 4px 0', lineHeight: 1.5 }}>
            Life got busy — your roadmap waited for you.
          </p>
          <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary, margin: 0, fontWeight: tokens.typography.weights.light }}>
            Start with just one task today to rebuild momentum.
          </p>
        </div>
      )}

      {/* ── Weekly Recap ─────────────────────────────────────────────────── */}
      {showWeekRecap && (
        <div style={{
          marginBottom: tokens.spacing['2xl'],
          padding: tokens.spacing.xl,
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          boxShadow: tokens.shadows.xs,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing.lg,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.regular, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 6px 0' }}>
              Week {Math.ceil((currentDay - 1) / 7)} recap
            </p>
            <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.light, color: tokens.colors.text.primary, margin: 0, lineHeight: 1.4 }}>
              You completed <strong style={{ fontWeight: tokens.typography.weights.medium, color: lastWeekRate >= 70 ? '#059669' : tokens.colors.text.primary }}>{lastWeekCompleted} of {lastWeekTasks.length} tasks</strong> last week — {lastWeekRate}% completion rate.
              {lastWeekRate >= 80 && ' Outstanding consistency.'}
              {lastWeekRate >= 50 && lastWeekRate < 80 && ' Keep building on this.'}
              {lastWeekRate < 50 && ' This week, aim for one more.'}
            </p>
          </div>
          {/* Mini donut-style ring */}
          <div style={{ position: 'relative', flexShrink: 0, width: 48, height: 48 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="24" cy="24" r="18" fill="none" stroke={tokens.colors.gray[100]} strokeWidth="4" />
              <circle cx="24" cy="24" r="18" fill="none"
                stroke={lastWeekRate >= 70 ? '#059669' : tokens.colors.primary}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 18 * lastWeekRate / 100} ${2 * Math.PI * 18}`}
                strokeLinecap="round"
              />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.secondary }}>
              {lastWeekRate}%
            </span>
          </div>
          <button onClick={dismissWeekRecap} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: tokens.colors.text.tertiary, flexShrink: 0 }}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* ── Tasks Section ────────────────────────────────────────────────── */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}>
          <h2 style={text.h2}>Today's Tasks</h2>
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
              {completedTasks.length} of {todaysTasks.length} done
            </span>
          </div>
        </div>

        {/* Quick Mode hint */}
        {quickMode && incompleteTasks.length > 0 && (
          <div style={{
            marginBottom: tokens.spacing.lg,
            padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
            backgroundColor: `${tokens.colors.primary}08`,
            border: `1px solid ${tokens.colors.primary}20`,
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.secondary,
            fontWeight: tokens.typography.weights.light,
          }}>
            Showing your #1 priority task. Complete it, then toggle off for the full list.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xl }}>
          {visibleTasks.map((task) => {
            const isCompleting = completingTaskId === task.id;
            const hasCinema = hasCinemaMode(task);

            return (
              <div
                key={task.id}
                data-task-card
                style={{
                  ...card.standard,
                  backgroundColor: task.completed ? tokens.colors.primary + '06' : tokens.colors.surface,
                  padding: tokens.spacing['2xl'],
                  boxShadow: task.completed ? 'none' : tokens.shadows.sm,
                  border: `1px solid ${task.completed ? tokens.colors.primary + '20' : tokens.colors.borderLight}`,
                  borderRadius: tokens.borderRadius.lg,
                  opacity: task.completed ? 0.65 : 1,
                  transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                  cursor: !task.completed && hasCinema ? 'pointer' : 'default',
                  animation: isCompleting ? 'completedSettle 0.45s cubic-bezier(0.4,0,0.2,1)' : 'none',
                  pointerEvents: isCompleting ? 'none' : 'auto',
                }}
                onClick={() => {
                  if (!task.completed && !isCompleting && hasCinema) {
                    setCinemaTaskId(task.id);
                  }
                }}
                onMouseEnter={e => {
                  if (!task.completed && !isCompleting && hasCinema) {
                    e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
                    e.currentTarget.style.boxShadow = tokens.shadows.md;
                  }
                }}
                onMouseLeave={e => {
                  if (!task.completed) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = tokens.shadows.sm;
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
                      {/* Type badge with color coding */}
                      {(() => {
                        const typeColors: Record<string, { bg: string; text: string; border: string }> = {
                          practice: { bg: 'rgba(124,58,237,0.08)', text: '#7c3aed', border: 'rgba(124,58,237,0.2)' },
                          learning: { bg: 'rgba(14,165,233,0.08)', text: '#0284c7', border: 'rgba(14,165,233,0.2)' },
                          reflection: { bg: 'rgba(16,185,129,0.08)', text: '#059669', border: 'rgba(16,185,129,0.2)' },
                        };
                        const c = typeColors[task.type] ?? { bg: tokens.colors.gray[50], text: tokens.colors.text.secondary, border: tokens.colors.gray[200] };
                        return (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: tokens.typography.weights.medium,
                            color: c.text,
                            backgroundColor: c.bg,
                            border: `1px solid ${c.border}`,
                            padding: '2px 8px',
                            borderRadius: '99px',
                            textTransform: 'capitalize' as const,
                            letterSpacing: '0.01em',
                          }}>
                            {task.type}
                          </span>
                        );
                      })()}
                      <span style={{ fontSize: '11px', color: tokens.colors.text.tertiary, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} strokeWidth={1.5} />
                        {formatDuration(task.duration)}
                      </span>
                    </div>

                    <h4 style={{
                      fontSize: tokens.typography.sizes.base,
                      fontWeight: tokens.typography.weights.regular,
                      lineHeight: tokens.typography.lineHeights.snug,
                      color: task.completed ? tokens.colors.text.tertiary : tokens.colors.text.primary,
                      marginBottom: tokens.spacing.sm,
                      textDecoration: task.completed ? 'line-through' : 'none',
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.sm }}>
                              {([
                                { reason: 'time' as const,       emoji: '⏱️', label: 'No time today' },
                                { reason: 'health' as const,     emoji: '😓', label: 'Not feeling well' },
                                { reason: 'difficulty' as const, emoji: '😕', label: 'Too difficult' },
                                { reason: 'external' as const,   emoji: '📅', label: 'Something came up' },
                              ]).map(({ reason, emoji, label }) => (
                                <button
                                  key={reason}
                                  onClick={() => confirmSkip(task.id, reason, setCinemaTaskId)}
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

                    {/* Resource link + Cinema Mode hint */}
                    {!task.completed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, marginTop: tokens.spacing.md, flexWrap: 'wrap' as const }}>
                        {/* Direct resource link (always accessible) */}
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
                              opacity: 0.85,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.textDecoration = 'none'; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/>
                            </svg>
                            {task.resources.primary.title || 'Learning resource'}
                          </a>
                        )}
                        {/* Cinema Mode deep focus button */}
                        {hasCinema && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: tokens.spacing.xs,
                            color: tokens.colors.primary,
                            fontSize: tokens.typography.sizes.sm,
                            fontWeight: tokens.typography.weights.regular,
                            opacity: 0.8,
                          }}>
                            <Zap size={13} strokeWidth={1.5} />
                            <span>Open deep focus</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All Done */}
        {allDone && canAdvance && (
          <div style={{
            marginTop: tokens.spacing['3xl'],
            textAlign: 'center',
            padding: `${tokens.spacing['3xl']} 0`,
            animation: 'celebration 0.6s ease-out',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: tokens.spacing.md,
              marginBottom: tokens.spacing.xl,
            }}>
              <Sparkles size={32} strokeWidth={1.5} color={tokens.colors.primary} />
              <h3 style={{
                fontSize: tokens.typography.sizes['2xl'],
                fontWeight: tokens.typography.weights.light,
                color: tokens.colors.text.primary,
                margin: 0,
              }}>
                All tasks completed!
              </h3>
              <Sparkles size={32} strokeWidth={1.5} color={tokens.colors.primary} />
            </div>

            <p style={{
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing.xl,
            }}>
              Great work today. Ready to continue your journey?
            </p>

            <button
              onClick={handleAdvanceDay}
              style={{
                padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
                backgroundColor: tokens.colors.primary,
                color: tokens.colors.text.inverse,
                border: 'none',
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.sizes.base,
                fontWeight: tokens.typography.weights.regular,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                transition: tokens.transitions.all,
                boxShadow: tokens.shadows.sm,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
                e.currentTarget.style.boxShadow = tokens.shadows.md;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = tokens.shadows.sm;
              }}
            >
              Start Tomorrow
              <ArrowRight size={20} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {todaysTasks.length === 0 && (
          <div style={{
            ...card.standard,
            backgroundColor: tokens.colors.surface,
            textAlign: 'center',
            padding: tokens.spacing['4xl'],
            boxShadow: tokens.shadows.sm,
            border: `1px solid ${tokens.colors.borderLight}`,
            borderRadius: tokens.borderRadius.lg,
          }}>
            <p style={{
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.secondary,
              lineHeight: tokens.typography.lineHeights.relaxed,
            }}>
              No tasks for today. Check back tomorrow!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
