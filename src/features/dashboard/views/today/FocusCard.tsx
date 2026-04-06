import { motion } from 'framer-motion';
import { Play, CheckCircle2, SkipForward, Target, BookOpen, MessageCircle, RotateCcw, Zap, Clock, Flame } from 'lucide-react';
import { useState } from 'react';
import type { Task } from '@core/store/useStore';
import { useBreakpoint } from '@hooks/useBreakpoint';
import ResourceCard from '../../components/ResourceCard';

// ─── Inline YouTube Mini Player ───────────────────────────────────────────────

const YT_REGEX = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})[^\s]*/;

function extractYouTubeId(text: string): { id: string; cleaned: string } | null {
  const m = text.match(YT_REGEX);
  if (!m) return null;
  const cleaned = text
    .replace(m[0], '')
    .replace(/\s+at\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[.'"]$/, '');
  return { id: m[1], cleaned };
}

function StepInstruction({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const parsed = extractYouTubeId(text);

  if (!parsed) {
    return <span style={{ flex: 1, fontSize: 14, color: 'var(--c-text-primary)', lineHeight: 1.5 }}>{text}</span>;
  }

  const embedSrc = `https://www.youtube.com/embed/${parsed.id}?autoplay=1&rel=0`;

  return (
    <div style={{ flex: 1 }}>
      {parsed.cleaned && (
        <span style={{ fontSize: 14, color: 'var(--c-text-primary)', lineHeight: 1.5, display: 'block', marginBottom: 10 }}>
          {parsed.cleaned}
        </span>
      )}

      {/* Mini player */}
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
        aspectRatio: '16/9',
        maxWidth: 340,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}>
        {playing ? (
          <iframe
            src={embedSrc}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              border: 'none', cursor: 'pointer', padding: 0,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}>
              <Play size={22} color="#1a1a2e" fill="#1a1a2e" style={{ marginLeft: 3 }} />
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Tap to watch</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface FocusCardProps {
  task: Task;
  tasksRemainingCount: number;
  isCompleting: boolean;
  isSkipping: boolean;
  onStartFocus: (task: Task) => void;
  onMarkDone: (task: Task) => void;
  onSkip: (task: Task) => void;
  onShowMore: () => void;
  streak?: number;
  currentDay?: number;
}

const TASK_TYPE_MAP: Record<string, { label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }> }> = {
  practice:   { label: 'Practice',   Icon: Target },
  learning:   { label: 'Learning',   Icon: BookOpen },
  reflection: { label: 'Reflection', Icon: MessageCircle },
  review:     { label: 'Review',     Icon: RotateCcw },
  challenge:  { label: 'Challenge',  Icon: Zap },
  retrieval:  { label: 'Recall',     Icon: RotateCcw },
  assessment: { label: 'Assessment', Icon: Target },
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface StepObj {
  instruction?: string;
  duration?: string;
  details?: string;
}

export default function FocusCard({
  task,
  tasksRemainingCount,
  isCompleting,
  isSkipping,
  onStartFocus,
  onMarkDone,
  onSkip,
  onShowMore,
  streak = 0,
  currentDay,
}: FocusCardProps) {
  const [doneHover, setDoneHover] = useState(false);
  const { isMobile } = useBreakpoint();

  const typeInfo = TASK_TYPE_MAP[task.type] ?? { label: task.type, Icon: Zap };
  const TypeIcon = typeInfo.Icon;

  // Rich agent data
  const taskExt = task as unknown as Record<string, unknown>;
  const whyThisMatters = typeof taskExt.whyThisMatters === 'string' ? taskExt.whyThisMatters : null;
  const successCriteria = typeof taskExt.successCriteria === 'string' ? taskExt.successCriteria : null;

  const segments = Array.isArray(task.segments) && task.segments.length > 0 ? task.segments : null;

  const rawSteps = taskExt.stepsData ?? task.steps;
  const steps: { duration?: string; instruction: string }[] = Array.isArray(rawSteps)
    ? rawSteps.map((s) => {
        if (typeof s === 'string') return { instruction: s };
        const o = s as StepObj;
        return { duration: o.duration, instruction: o.instruction ?? String(s) };
      })
    : [];

  const quote = whyThisMatters;
  const dayLabel = currentDay ? `Day ${currentDay}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        backgroundColor: 'var(--c-bg-primary)',
        border: '1px solid var(--c-border-subtle)',
        borderRadius: 20,
        padding: isMobile ? '24px 20px' : '32px 28px',
        marginBottom: 16,
        boxShadow: 'var(--c-shadow-raised)',
      }}
    >
      {/* ── Section label + streak ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--c-text-quaternary)',
          fontFamily: 'var(--c-font-body)',
        }}>
          {dayLabel ? `${dayLabel} · Today's Focus` : "Today's Focus"}
        </span>

        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Flame size={13} strokeWidth={2} color="var(--c-accent-green)" />
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-accent-green)',
              fontFamily: 'var(--c-font-body)',
            }}>
              {streak}
            </span>
          </div>
        )}
      </div>

      {/* ── Title ── */}
      <h2 style={{
        fontFamily: 'var(--c-font-display)',
        fontSize: isMobile ? 'clamp(22px, 7vw, 28px)' : 'clamp(26px, 4vw, 34px)',
        fontWeight: 500,
        lineHeight: 1.15,
        letterSpacing: '-0.02em',
        color: 'var(--c-text-primary)',
        margin: '0 0 10px',
      }}>
        {task.title}
      </h2>

      {/* ── Type chip + duration ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: quote ? 20 : 24,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          backgroundColor: 'var(--c-surface-card)',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 99,
        }}>
          <TypeIcon size={11} strokeWidth={2} color="var(--c-text-tertiary)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-tertiary)', letterSpacing: '0.03em' }}>
            {typeInfo.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} strokeWidth={1.8} color="var(--c-text-quaternary)" />
          <span style={{ fontSize: 13, color: 'var(--c-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDuration(task.duration)}
          </span>
        </div>
      </div>

      {/* ── Motivational quote / why this matters ── */}
      {quote && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            fontFamily: 'var(--c-font-display)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--c-text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 24px',
            paddingLeft: 14,
            borderLeft: '2px solid var(--c-border-medium)',
          }}
        >
          {quote}
        </motion.p>
      )}

      {/* ── 30-30-40 Segment blocks ── */}
      {segments && (
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--c-text-quaternary)',
            fontFamily: 'var(--c-font-body)',
            margin: '0 0 10px',
          }}>
            Your Flow
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {segments.map((seg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: 'var(--c-surface-card)',
                  border: '1px solid var(--c-border-subtle)',
                }}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--c-accent-purple)',
                  backgroundColor: 'var(--c-accent-purple-soft)',
                  borderRadius: 99,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginTop: 1,
                }}>
                  {seg.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--c-text-tertiary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {seg.duration} min
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13,
                    color: 'var(--c-text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    {seg.description}
                  </p>
                  {seg.tip && (
                    <p style={{
                      fontSize: 11,
                      color: 'var(--c-text-quaternary)',
                      fontStyle: 'italic',
                      margin: '4px 0 0',
                      lineHeight: 1.4,
                    }}>
                      {seg.tip}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Steps fallback (when no segments) ── */}
      {!segments && steps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--c-text-quaternary)',
            fontFamily: 'var(--c-font-body)',
            margin: '0 0 12px',
          }}>
            Steps
          </p>
          <div>
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < steps.length - 1 ? '1px solid var(--c-border-subtle)' : 'none',
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--c-text-quaternary)',
                  minWidth: step.duration ? 40 : 20,
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}>
                  {step.duration ?? `${i + 1}`}
                </span>
                <StepInstruction text={step.instruction} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Success criteria ── */}
      {successCriteria && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '12px 14px',
          backgroundColor: 'var(--c-accent-purple-soft)',
          border: '1px solid var(--c-accent-purple-border)',
          borderRadius: 12,
          marginBottom: 24,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--c-accent-purple)',
            flexShrink: 0,
            paddingTop: 1,
          }}>
            Done when:
          </span>
          <span style={{
            fontSize: 13,
            color: 'var(--c-text-secondary)',
            lineHeight: 1.5,
          }}>
            {successCriteria}
          </span>
        </div>
      )}

      {/* ── Resource (video / article) ── */}
      {task.resources?.primary && (
        <div style={{ marginBottom: 20 }}>
          <ResourceCard
            primary={task.resources.primary}
            supplementary={task.resources.supplementary}
          />
        </div>
      )}

      {/* ── Begin Session (primary CTA) ── */}
      <button
        onClick={() => onStartFocus(task)}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 14,
          border: 'none',
          cursor: 'pointer',
          backgroundColor: 'var(--c-accent-purple)',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '0.01em',
          fontFamily: 'var(--c-font-body)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 12,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        <Play size={14} strokeWidth={2.5} fill="#ffffff" color="#ffffff" />
        Begin Session
      </button>

      {/* ── Secondary actions ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        <button
          onClick={() => onMarkDone(task)}
          disabled={isCompleting}
          onMouseEnter={() => setDoneHover(true)}
          onMouseLeave={() => setDoneHover(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '9px 18px',
            backgroundColor: doneHover && !isCompleting ? 'var(--c-surface-card)' : 'transparent',
            border: '1px solid var(--c-border-medium)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            color: isCompleting ? 'var(--c-text-quaternary)' : 'var(--c-text-secondary)',
            cursor: isCompleting ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--c-font-body)',
          }}
        >
          <CheckCircle2 size={13} strokeWidth={2} />
          Mark Done
        </button>

        <button
          onClick={() => onSkip(task)}
          disabled={isSkipping}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '9px 14px',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 10,
            fontSize: 13,
            color: isSkipping ? 'var(--c-text-quaternary)' : 'var(--c-text-quaternary)',
            cursor: isSkipping ? 'default' : 'pointer',
            transition: 'color 0.15s ease',
            fontFamily: 'var(--c-font-body)',
          }}
          onMouseEnter={e => { if (!isSkipping) e.currentTarget.style.color = 'var(--c-text-tertiary)'; }}
          onMouseLeave={e => { if (!isSkipping) e.currentTarget.style.color = 'var(--c-text-quaternary)'; }}
        >
          {isSkipping ? (
            <span style={{ width: 12, height: 12, border: '2px solid var(--c-border-subtle)', borderTopColor: 'var(--c-text-tertiary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <SkipForward size={13} strokeWidth={2} />
          )}
          Skip for now
        </button>
      </div>

      {/* More tasks */}
      {tasksRemainingCount > 0 && (
        <button
          onClick={onShowMore}
          style={{
            display: 'block',
            margin: '14px auto 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--c-text-quaternary)',
            padding: 0,
            fontFamily: 'var(--c-font-body)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-text-tertiary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-quaternary)'; }}
        >
          +{tasksRemainingCount} more task{tasksRemainingCount !== 1 ? 's' : ''} today →
        </button>
      )}
    </motion.div>
  );
}
