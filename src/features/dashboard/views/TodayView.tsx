import { Flame, Calendar, TrendingUp, CheckCircle2, Clock, ArrowRight, Sparkles, SkipForward, X, Zap, BookOpen, FileText } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { useRef, useState, useCallback, useEffect } from 'react';
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
  // Ease Back Mode — auto-limits to 1 task on re-engagement, dismissed when user wants all
  const [easeBackMode, setEaseBackMode] = useState(true);
  // Cinema Mode panel: null = closed, 'guide' | 'notes' = open
  const [cinemaTab, setCinemaTab] = useState<'guide' | 'notes' | null>(null);
  // Ref to the YouTube iframe so we can postMessage it
  const cinemaIframeRef = useRef<HTMLIFrameElement>(null);
  // Tracks current video playback position from YouTube infoDelivery messages
  const cinemaCurrentTimeRef = useRef<number>(0);
  // Saved resume position (seconds) from a previous session
  const [cinemaResumeTime, setCinemaResumeTime] = useState<number | null>(null);
  // Override the embed start time (null = use watchFrom, number = resume/seek target)
  const [cinemaStartOverride, setCinemaStartOverride] = useState<number | null>(null);
  // Notes: persisted in localStorage keyed by task id
  const [cinemaNote, setCinemaNote] = useState('');
  const loadNoteForTask = (taskId: string) => localStorage.getItem(`note_${taskId}`) || '';
  const saveNote = (taskId: string, note: string) => {
    localStorage.setItem(`note_${taskId}`, note);
  };

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

  // Pause the embedded YouTube video via postMessage (requires enablejsapi=1)
  const pauseYouTube = useCallback(() => {
    cinemaIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
      '*'
    );
  }, []);

  // Seek back N seconds in the YouTube video
  const seekBack = useCallback((seconds = 10) => {
    const target = Math.max(0, cinemaCurrentTimeRef.current - seconds);
    cinemaIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [target, true] }),
      '*'
    );
    cinemaCurrentTimeRef.current = target;
  }, []);

  // Switch cinema panel — pause video whenever switching
  const switchCinemaTab = useCallback((tab: 'guide' | 'notes') => {
    pauseYouTube();
    setCinemaTab(prev => prev === tab ? null : tab); // toggle: click active = close
  }, [pauseYouTube]);
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

  // Re-engagement: streak broken, not first day, nothing done today
  const showReEngagement = streak === 0 && currentDay > 1 && completedTasks.length === 0;

  // Tasks to render — full list, Quick Mode (1 task), or Ease Back Mode (1 task on return)
  const incompleteTasks = todaysTasks.filter(t => !t.completed);
  const visibleTasks = (quickMode || (showReEngagement && easeBackMode))
    ? [...completedTasks, ...incompleteTasks.slice(0, 1)]
    : todaysTasks;

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
    // cinemaStartOverride: user chose Resume (specific second) or seek back
    if (cinemaStartOverride !== null) {
      p.set('start', String(cinemaStartOverride));
    } else if (cinemaResource?.watchFrom) {
      p.set('start', String(timeToSeconds(cinemaResource.watchFrom)));
    }
    if (cinemaResource?.watchTo) p.set('end', String(timeToSeconds(cinemaResource.watchTo)));
    p.set('autoplay', '1');
    p.set('rel', '0');
    p.set('enablejsapi', '1'); // required for postMessage pause/play/seek control
    return `https://www.youtube.com/embed/${cinemaVideoId}?${p.toString()}`;
  })() : null;

  const hasCinemaMode = (task: typeof todaysTasks[0]) =>
    !task.completed && (
      (task.resources?.primary?.type === 'video') ||
      (task.steps?.length ?? 0) > 0 ||
      (task.tips?.length ?? 0) > 0
    );

  // Check if a task has a saved resume position
  const hasResumePosition = (task: typeof todaysTasks[0]) => {
    if (!hasCinemaMode(task)) return false;
    const vidId = task.resources?.primary?.type === 'video'
      ? getYouTubeId(task.resources.primary.url)
      : null;
    const savedRaw = vidId ? localStorage.getItem(`cinema_pos_${vidId}`) : null;
    const savedSecs = savedRaw ? parseInt(savedRaw) : 0;
    return savedSecs > 10;
  };

  // Open cinema: check for saved resume position, load note, open guide panel
  const openCinema = (taskId: string) => {
    const task = todaysTasks.find(t => t.id === taskId);
    const vidId = task?.resources?.primary?.type === 'video'
      ? getYouTubeId(task.resources.primary.url)
      : null;
    const savedRaw = vidId ? localStorage.getItem(`cinema_pos_${vidId}`) : null;
    const savedSecs = savedRaw ? parseInt(savedRaw) : 0;
    cinemaCurrentTimeRef.current = 0;
    setCinemaResumeTime(savedSecs > 10 ? savedSecs : null); // only offer resume if meaningfully past start
    setCinemaStartOverride(null);
    setCinemaTaskId(taskId);
    setCinemaNote(loadNoteForTask(taskId));
    setCinemaTab('guide');
  };

  // Close cinema: save current position for future resume, then pause & close
  const closeCinema = () => {
    if (cinemaVideoId && cinemaCurrentTimeRef.current > 5) {
      localStorage.setItem(`cinema_pos_${cinemaVideoId}`, String(Math.floor(cinemaCurrentTimeRef.current)));
    }
    pauseYouTube();
    setCinemaTaskId(null);
    setCinemaStartOverride(null);
    setCinemaResumeTime(null);
  };

  // Format raw seconds as M:SS for resume prompt
  const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // Format MM:SS for display
  const formatTimestamp = (t?: string) => {
    if (!t) return null;
    const parts = t.split(':').map(Number);
    if (parts.length === 2) return `${parts[0]}:${String(parts[1]).padStart(2, '0')}`;
    if (parts.length === 3) return `${parts[0]}h ${parts[1]}m ${String(parts[2]).padStart(2, '0')}s`;
    return t;
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
      `}</style>

      {/* ── Cinema / Focus Mode ─────────────────────────────────────────── */}
      {cinemaTask && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9800, display: 'flex', backgroundColor: '#04040c' }}>

          {/* ── Main area: video + footer ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

            {/* Task meta — top bar */}
            <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                {(() => {
                  const typeColors: Record<string, { bg: string; text: string }> = {
                    practice: { bg: 'rgba(124,58,237,0.15)', text: '#a78bfa' },
                    learning: { bg: 'rgba(14,165,233,0.15)', text: '#38bdf8' },
                    reflection: { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
                  };
                  const c = typeColors[cinemaTask.type] ?? { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.5)' };
                  return (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: c.text, backgroundColor: c.bg, padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                      {cinemaTask.type}
                    </span>
                  );
                })()}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, letterSpacing: '-0.01em', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cinemaTask.title}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <Clock size={11} strokeWidth={1.5} /> {formatDuration(cinemaTask.duration)}
                </span>
              </div>
              {/* Close button */}
              <button
                onClick={closeCinema}
                title="Close and save position"
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Resume banner — shown when a previous session position was saved */}
            {cinemaResumeTime && cinemaVideoId && (
              <div style={{ margin: '10px 24px 0', padding: '10px 16px', backgroundColor: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, animation: 'cinemaSlideIn 0.2s ease' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', flex: 1 }}>
                  Last session: <span style={{ color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums' }}>{formatSeconds(cinemaResumeTime)}</span>
                </span>
                <button
                  onClick={() => { setCinemaStartOverride(cinemaResumeTime); setCinemaResumeTime(null); }}
                  style={{ padding: '5px 14px', backgroundColor: tokens.colors.primary, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Resume
                </button>
                <button
                  onClick={() => setCinemaResumeTime(null)}
                  style={{ padding: '5px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                >
                  Start over
                </button>
              </div>
            )}

            {/* Video — centered */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', minHeight: 0 }}>
              {cinemaVideoId && cinemaEmbedUrl ? (
                <div style={{ width: '100%', maxWidth: 960 }}>
                  <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
                    <iframe
                      key={cinemaEmbedUrl} /* remount when URL changes (resume/start-over) */
                      ref={cinemaIframeRef}
                      src={cinemaEmbedUrl}
                      title={cinemaTask.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => {
                        // Subscribe to YouTube infoDelivery events
                        cinemaIframeRef.current?.contentWindow?.postMessage('{"event":"listening"}', '*');
                      }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', borderRadius: 10 }}
                    />
                  </div>

                  {/* Video controls row — rewind + timeline */}
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Rewind 10s button */}
                    <button
                      onClick={() => seekBack(10)}
                      title="Go back 10 seconds"
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      ↩ 10s
                    </button>

                    {/* Timeline indicator */}
                    {(cinemaResource?.watchFrom || cinemaResource?.watchTo) && (
                      <div style={{ flex: 1, padding: '7px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: tokens.colors.primary, boxShadow: `0 0 5px ${tokens.colors.primary}`, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: tokens.colors.primary, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Segment</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatTimestamp(cinemaResource?.watchFrom) ?? '0:00'}
                          </span>
                          <div style={{ flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: `linear-gradient(90deg, ${tokens.colors.primary}70, ${tokens.colors.primary})`, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatTimestamp(cinemaResource?.watchTo) ?? '—'}
                          </span>
                          {cinemaResource?.watchMinutes && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>{cinemaResource.watchMinutes} min</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video title / channel */}
                  {cinemaResource?.title && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 8, lineHeight: 1.5 }}>
                      {cinemaResource.title}
                      {cinemaResource.channel && <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.14)' }}>· {cinemaResource.channel}</span>}
                    </p>
                  )}
                </div>
              ) : (
                /* No video — show description centered */
                <div style={{ maxWidth: 600, textAlign: 'center' }}>
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>{cinemaTask.description}</p>
                </div>
              )}
            </div>

            {/* Action footer */}
            <div style={{ padding: '0 24px 24px', flexShrink: 0 }}>
              {skipReasonTaskId === cinemaTask.id ? (
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10, textAlign: 'center' }}>What's getting in the way?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {([
                      { reason: 'time' as const, emoji: '⏱️', label: 'No time' },
                      { reason: 'health' as const, emoji: '😓', label: 'Not well' },
                      { reason: 'difficulty' as const, emoji: '😕', label: 'Too hard' },
                      { reason: 'external' as const, emoji: '📅', label: 'Came up' },
                    ]).map(({ reason, emoji, label }) => (
                      <button
                        key={reason}
                        onClick={() => confirmSkip(cinemaTask.id, reason, setCinemaTaskId)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.6)', transition: 'all 120ms ease' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
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
                    onClick={() => handleCompleteTask(cinemaTask.id, window.innerWidth / 2, window.innerHeight / 2)}
                    style={{ flex: 1, padding: '12px 0', backgroundColor: tokens.colors.primary, color: '#fff', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: `0 4px 20px ${tokens.colors.primary}45`, transition: 'all 0.15s', letterSpacing: '-0.01em' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 26px ${tokens.colors.primary}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 20px ${tokens.colors.primary}45`; }}
                  >
                    <CheckCircle2 size={15} strokeWidth={2.5} /> Mark done
                  </button>
                  <button
                    onClick={e => handleSkipTask(cinemaTask.id, e)}
                    style={{ padding: '12px 18px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                  >
                    <SkipForward size={13} /> Skip
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel: Guide or Notes ── */}
          {cinemaTab && (
            <div
              style={{
                width: 340,
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                backgroundColor: '#0B0C13',
                display: 'flex',
                flexDirection: 'column',
                animation: 'panelSlideIn 0.22s cubic-bezier(0.22,1,0.36,1)',
                flexShrink: 0,
              }}
            >
              {/* Panel header */}
              <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 2, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3 }}>
                  {(['guide', 'notes'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => switchCinemaTab(tab)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
                        backgroundColor: cinemaTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: cinemaTab === tab ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {tab === 'guide' ? <BookOpen size={12} /> : <FileText size={12} />}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cinemaTab === 'guide' && (
                  <>
                    {cinemaTask.description && (
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, margin: 0 }}>
                        {cinemaTask.description}
                      </p>
                    )}

                    {(cinemaTask.steps?.length ?? 0) > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Steps</p>
                        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {cinemaTask.steps!.map((step, i) => (
                            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', backgroundColor: `${tokens.colors.primary}20`, border: `1px solid ${tokens.colors.primary}35`, color: tokens.colors.primary, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {i + 1}
                              </span>
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, paddingTop: 1 }}>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {(cinemaTask.tips?.length ?? 0) > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Tips</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {cinemaTask.tips!.map((tip, i) => (
                            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <span style={{ color: tokens.colors.primary, fontSize: 14, lineHeight: 1.4, flexShrink: 0, marginTop: 1 }}>·</span>
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {cinemaTask.successCriteria && (
                      <div style={{ padding: '12px 14px', backgroundColor: `${tokens.colors.primary}10`, borderRadius: 10, border: `1px solid ${tokens.colors.primary}22` }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: tokens.colors.primary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Done when</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0 }}>{cinemaTask.successCriteria}</p>
                      </div>
                    )}
                  </>
                )}

                {cinemaTab === 'notes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: 0, lineHeight: 1.5 }}>
                      Capture key takeaways while watching. Notes are saved per task.
                    </p>
                    <textarea
                      value={cinemaNote}
                      onChange={e => setCinemaNote(e.target.value)}
                      placeholder="Type your notes here..."
                      autoFocus
                      style={{
                        flex: 1, minHeight: 220,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, padding: '12px 14px',
                        fontSize: 13, color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.7, resize: 'none', outline: 'none', fontFamily: 'inherit',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = `${tokens.colors.primary}50`; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                    />
                    <button
                      onClick={() => saveNote(cinemaTask.id, cinemaNote)}
                      style={{ alignSelf: 'flex-end', padding: '7px 18px', backgroundColor: tokens.colors.primary, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Save note
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Right rail: side buttons ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 12px', backgroundColor: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
            {/* Guide button */}
            <button
              onClick={() => switchCinemaTab('guide')}
              title="Guide"
              style={{
                width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                backgroundColor: cinemaTab === 'guide' ? tokens.colors.primary : 'rgba(255,255,255,0.06)',
                color: cinemaTab === 'guide' ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: cinemaTab === 'guide' ? `0 4px 16px ${tokens.colors.primary}50` : 'none',
              }}
              onMouseEnter={e => { if (cinemaTab !== 'guide') { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
              onMouseLeave={e => { if (cinemaTab !== 'guide') { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
            >
              <BookOpen size={16} />
            </button>

            {/* Notes button */}
            <button
              onClick={() => switchCinemaTab('notes')}
              title="Notes"
              style={{
                width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                backgroundColor: cinemaTab === 'notes' ? tokens.colors.primary : 'rgba(255,255,255,0.06)',
                color: cinemaTab === 'notes' ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: cinemaTab === 'notes' ? `0 4px 16px ${tokens.colors.primary}50` : 'none',
              }}
              onMouseEnter={e => { if (cinemaTab !== 'notes') { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
              onMouseLeave={e => { if (cinemaTab !== 'notes') { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
            >
              <FileText size={16} />
            </button>

            {/* Spacer then close */}
            <div style={{ flex: 1 }} />
            <button
              onClick={closeCinema}
              title="Close"
              style={{ width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <p style={{
          fontSize: tokens.typography.sizes.sm,
          fontWeight: tokens.typography.weights.regular,
          color: tokens.colors.text.tertiary,
          marginBottom: tokens.spacing.xs,
          letterSpacing: '0.01em',
        }}>
          {getGreeting()}
        </p>
        <h1 style={{
          fontSize: tokens.typography.sizes['3xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          marginBottom: tokens.spacing.md,
          lineHeight: 1.15,
        }}>
          {universalProfile.name || 'Welcome back'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'wrap' as const }}>
          {roadmap?.title && (
            <span style={{
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.secondary,
            }}>
              {roadmap.title}
            </span>
          )}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            borderRadius: '99px',
            fontSize: '11px',
            fontWeight: tokens.typography.weights.medium,
            color: '#fff',
            letterSpacing: '0.02em',
            boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
          }}>
            Day {currentDay}
          </span>
        </div>
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
          background: streak > 0
            ? 'linear-gradient(135deg, #fff7ed 0%, #fffbf5 100%)'
            : tokens.colors.surface,
          border: `1px solid ${streak > 0 ? 'rgba(249,115,22,0.2)' : tokens.colors.borderLight}`,
          borderLeft: `4px solid ${streak > 0 ? '#f97316' : tokens.colors.gray[200]}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.lg,
          boxShadow: streak > 0 ? '0 4px 16px rgba(249,115,22,0.1)' : tokens.shadows.xs,
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spacing.md }}>
            <Flame size={15} strokeWidth={streak > 0 ? 2 : 1.5} color={streak > 0 ? '#f97316' : tokens.colors.gray[300]} style={{ filter: streak > 0 ? 'drop-shadow(0 0 4px rgba(249,115,22,0.5))' : 'none' }} />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: streak > 0 ? '#ea580c' : tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Streak
            </span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: tokens.typography.weights.semibold, color: streak > 0 ? '#c2410c' : tokens.colors.text.primary, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px' }}>
            {streak}
          </div>
          <div style={{ fontSize: tokens.typography.sizes.xs, color: streak > 0 ? '#ea580c' : tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.regular }}>
            {streak === 1 ? 'day in a row' : 'days in a row'}
          </div>
        </div>

        {/* Progress */}
        <div
          ref={progressCardRef}
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(109,40,217,0.02) 100%)',
            border: '1px solid rgba(124,58,237,0.18)',
            borderLeft: '4px solid #7c3aed',
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing.lg,
            boxShadow: '0 4px 16px rgba(124,58,237,0.1)',
            animation: particles.length > 0 ? 'progressPulse 1s ease-in-out' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spacing.md }}>
            <TrendingUp size={15} strokeWidth={2} color="#7c3aed" style={{ filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))' }} />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: '#7c3aed', fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Today
            </span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: tokens.typography.weights.semibold, color: '#5b21b6', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '8px' }}>
            {Math.round(completionRate)}%
          </div>
          {/* Progress bar with gradient */}
          <div style={{ height: '4px', backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round(completionRate)}%`,
              background: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)',
              borderRadius: '99px',
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 0 6px rgba(124,58,237,0.5)',
            }} />
          </div>
        </div>

        {/* Week */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #fafcff 100%)',
          border: '1px solid rgba(14,165,233,0.2)',
          borderLeft: '4px solid #0ea5e9',
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.lg,
          boxShadow: '0 4px 16px rgba(14,165,233,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spacing.md }}>
            <Calendar size={15} strokeWidth={2} color="#0ea5e9" style={{ filter: 'drop-shadow(0 0 4px rgba(14,165,233,0.4))' }} />
            <span style={{ fontSize: tokens.typography.sizes.xs, color: '#0284c7', fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Week
            </span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: tokens.typography.weights.semibold, color: '#0369a1', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px' }}>
            {Math.ceil(currentDay / 7)}
          </div>
          <div style={{ fontSize: tokens.typography.sizes.xs, color: '#0284c7', fontWeight: tokens.typography.weights.regular }}>
            of {Math.ceil((roadmap?.duration || 6) * 4)} weeks
          </div>
        </div>
      </div>

      {/* ── Ease Back In Banner ───────────────────────────────────────────── */}
      {showReEngagement && (
        <div style={{
          marginBottom: tokens.spacing['2xl'],
          padding: tokens.spacing.xl,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(99,102,241,0.03) 100%)',
          border: '1px solid rgba(124,58,237,0.14)',
          borderLeft: '3px solid #7c3aed',
          borderRadius: tokens.borderRadius.lg,
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '6px' }}>
            <Sparkles size={15} color="#7c3aed" strokeWidth={1.8} />
            <span style={{
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.primary,
            }}>
              Welcome back — ease back in.
            </span>
          </div>

          {/* Body */}
          <p style={{
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.secondary,
            margin: '0 0 12px 0',
            fontWeight: tokens.typography.weights.light,
            lineHeight: 1.55,
            paddingLeft: '23px',
          }}>
            Life got busy — that's okay. We've queued up just one task so you can rebuild momentum without pressure.
          </p>

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.lg, paddingLeft: '23px' }}>
            {easeBackMode && incompleteTasks.length > 1 && (
              <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>
                Showing 1 of {incompleteTasks.length} tasks
              </span>
            )}
            {easeBackMode && incompleteTasks.length > 1 && (
              <button
                onClick={() => setEaseBackMode(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: tokens.typography.sizes.xs,
                  fontWeight: tokens.typography.weights.medium,
                  color: '#7c3aed',
                  letterSpacing: '0.01em',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                I'm ready — show all {incompleteTasks.length} tasks
              </button>
            )}
            {(!easeBackMode || incompleteTasks.length <= 1) && (
              <span style={{ fontSize: tokens.typography.sizes.xs, color: '#7c3aed', fontWeight: tokens.typography.weights.medium }}>
                ✓ Showing all {incompleteTasks.length} {incompleteTasks.length === 1 ? 'task' : 'tasks'} today
              </span>
            )}
          </div>
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
                          reflection: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16,185,129,0.35)', label: 'Reflect' },
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
                      {/* Resume badge — shows when task has saved position */}
                      {hasResumePosition(task) && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: tokens.typography.weights.semibold,
                          color: '#fff',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                          padding: '3px 10px',
                          borderRadius: '99px',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.06em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <span>↩</span> Resume
                        </span>
                      )}
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
              </div>
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

              <button
                onClick={handleAdvanceDay}
                style={{
                  padding: `14px ${tokens.spacing['3xl']}`,
                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.semibold,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  boxShadow: '0 6px 24px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.01em',
                  position: 'relative' as const,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'; }}
              >
                Start Day {currentDay + 1} <ArrowRight size={18} strokeWidth={2} />
              </button>
            </div>
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
