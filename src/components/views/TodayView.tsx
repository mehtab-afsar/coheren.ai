import { Flame, Calendar, TrendingUp, CheckCircle2, Circle, Clock, Play, ArrowRight, Sparkles, SkipForward, X, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';
import { useState, useRef } from 'react';

// ── YouTube helpers ────────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? m[2] : null;
}
function timeToSeconds(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

export default function TodayView() {
  const {
    universalProfile,
    roadmap,
    tasks,
    currentDay,
    streak,
    completionRate,
    completeTask,
    skipTask,
    canAdvanceDay,
    advanceDay,
  } = useStore();

  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);
  const [skipReasonTaskId, setSkipReasonTaskId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [showSkipMessage, setShowSkipMessage] = useState(false);
  const [cinemaTaskId, setCinemaTaskId] = useState<string | null>(null);
  const progressCardRef = useRef<HTMLDivElement>(null);

  const todaysTasks = tasks.filter(t => t.day === currentDay && !t.skipped);
  const completedTasks = todaysTasks.filter(t => t.completed);
  const allDone = todaysTasks.length > 0 && todaysTasks.every(t => t.completed);
  const canAdvance = canAdvanceDay();

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

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'practice': return Play;
      case 'learning': return Calendar;
      case 'reflection': return TrendingUp;
      default: return Circle;
    }
  };

  const handleAdvanceDay = () => {
    const success = advanceDay();
    if (success) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteTask = (taskId: string, sourceX?: number, sourceY?: number) => {
    const x = sourceX ?? window.innerWidth / 2;
    const y = sourceY ?? window.innerHeight / 2;

    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: `${taskId}-${i}-${Date.now()}`,
      x, y,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setCompletingTaskId(taskId);
    setCinemaTaskId(null);

    completeTask(taskId);
    setTimeout(() => setCompletingTaskId(null), 450);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !p.id.startsWith(taskId)));
    }, 1900);
  };

  const handleSkipTask = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSkipReasonTaskId(prev => prev === taskId ? null : taskId);
  };

  const confirmSkip = (taskId: string, reason: 'time' | 'health' | 'difficulty' | 'external') => {
    setSkipReasonTaskId(null);
    setCinemaTaskId(null);
    setSkippingTaskId(taskId);
    setTimeout(() => {
      skipTask(taskId, reason);
      setSkippingTaskId(null);
      setShowSkipMessage(true);
      setTimeout(() => setShowSkipMessage(false), 3000);
    }, 300);
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
                        onClick={() => confirmSkip(cinemaTask.id, reason)}
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
      <div style={{ marginBottom: tokens.spacing['3xl'], textAlign: 'center' }}>
        <h1 style={{ ...text.h1, marginBottom: tokens.spacing.md }}>
          {getGreeting()}, {universalProfile.name || 'there'} 👋
        </h1>
        <p style={{
          fontSize: tokens.typography.sizes.sm,
          fontWeight: tokens.typography.weights.light,
          color: tokens.colors.text.tertiary,
          marginBottom: tokens.spacing.xs,
        }}>
          Your Journey
        </p>
        <p style={{
          fontSize: tokens.typography.sizes.md,
          fontWeight: tokens.typography.weights.regular,
          color: tokens.colors.text.secondary,
        }}>
          {roadmap?.title} • {roadmap?.duration} months • {Math.ceil((roadmap?.duration || 3) * 4)} weeks
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
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: tokens.spacing.lg,
        marginBottom: tokens.spacing['3xl'],
      }}>
        {[
          {
            icon: <Flame size={18} strokeWidth={1.5} color={streak > 0 ? '#ff6b35' : tokens.colors.gray[300]} />,
            label: 'Streak',
            value: streak,
            sub: streak === 1 ? 'day' : 'days',
          },
          {
            icon: <TrendingUp size={18} strokeWidth={1.5} color={tokens.colors.gray[300]} />,
            label: 'Progress',
            value: `${Math.round(completionRate)}%`,
            sub: 'today',
            ref: progressCardRef,
          },
          {
            icon: <Calendar size={18} strokeWidth={1.5} color={tokens.colors.gray[300]} />,
            label: 'Week',
            value: Math.ceil(currentDay / 7),
            sub: `of ${Math.ceil((roadmap?.duration || 6) * 4)}`,
          },
        ].map((stat, i) => (
          <div
            key={i}
            ref={i === 1 ? progressCardRef : undefined}
            style={{
              ...card.standard,
              backgroundColor: tokens.colors.primary,
              boxShadow: tokens.shadows.sm,
              padding: tokens.spacing.lg,
              transition: tokens.transitions.all,
              animation: i === 1 && particles.length > 0 ? 'progressPulse 1s ease-in-out' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
              {stat.icon}
              <span style={{ ...text.caption, color: tokens.colors.text.inverse, fontWeight: tokens.typography.weights.regular }}>
                {stat.label}
              </span>
            </div>
            <div style={{ ...text.h2, color: tokens.colors.text.inverse, fontSize: tokens.typography.sizes['3xl'], marginBottom: tokens.spacing.xs }}>
              {stat.value}
            </div>
            <div style={{ ...text.caption, fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.inverse, opacity: 0.8 }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tasks Section ────────────────────────────────────────────────── */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacing.lg,
        }}>
          <h2 style={text.h2}>Today's Tasks</h2>
          <span style={{ ...text.caption, color: tokens.colors.text.secondary }}>
            {completedTasks.length} of {todaysTasks.length} complete
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xl }}>
          {todaysTasks.map((task) => {
            const Icon = getTaskIcon(task.type);
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
                      <Icon size={16} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                      <span style={{ ...text.caption, color: tokens.colors.text.secondary, textTransform: 'capitalize', fontWeight: tokens.typography.weights.regular }}>
                        {task.type}
                      </span>
                      <span style={{ ...text.caption, color: tokens.colors.text.tertiary }}>•</span>
                      <Clock size={16} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                      <span style={{ ...text.caption, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.regular }}>
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
                                  onClick={() => confirmSkip(task.id, reason)}
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

                    {/* Cinema Mode hint */}
                    {!task.completed && hasCinema && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.xs,
                        marginTop: tokens.spacing.md,
                        color: tokens.colors.primary,
                        fontSize: tokens.typography.sizes.sm,
                        fontWeight: tokens.typography.weights.regular,
                        opacity: 0.8,
                      }}>
                        <Zap size={13} strokeWidth={1.5} />
                        <span>Open deep focus session</span>
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
