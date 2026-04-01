import { motion } from 'framer-motion';
import { Play, CheckCircle2, SkipForward, Target, BookOpen, MessageCircle, RotateCcw, Zap, Clock, Flame } from 'lucide-react';
import { useState } from 'react';
import type { Task } from '@core/store/useStore';
import { useBreakpoint } from '@hooks/useBreakpoint';
import ResourceCard from '../../components/ResourceCard';

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

const TASK_TYPE_MAP: Record<string, { color: string; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }> }> = {
  practice:   { color: '#a78bfa', label: 'Practice',   Icon: Target },
  learning:   { color: '#38bdf8', label: 'Learning',   Icon: BookOpen },
  reflection: { color: '#c4b5fd', label: 'Reflection', Icon: MessageCircle },
  review:     { color: '#fbbf24', label: 'Review',     Icon: RotateCcw },
  challenge:  { color: '#f97316', label: 'Challenge',  Icon: Zap },
  retrieval:  { color: '#38bdf8', label: 'Recall',     Icon: RotateCcw },
  assessment: { color: '#f59e0b', label: 'Assessment', Icon: Target },
};

// Domain-specific motivational quote patterns
const DOMAIN_QUOTES: Record<string, string[]> = {
  boxing:     ["This is where precision becomes instinct. You're building the foundation every boxer needs.", "This is where hesitation dies. Every rep is a conversation between your body and the craft."],
  guitar:     ["This is where muscle memory takes over. You're not just playing notes—you're learning the language every guitarist speaks.", "This is where technique becomes feel. Your hands are learning what your ears already know."],
  coding:     ["This is where logic becomes intuition. You're not just writing code—you're thinking like engineers who built the web.", "This is where syntax becomes fluency. Every line trains you to see problems differently."],
  running:    ["This is where your body remembers. You're not just running—you're building the engine that carries you further.", "This is where effort becomes rhythm. The discomfort you push through today is tomorrow's baseline."],
  default:    ["This is where intention becomes action. You're not just doing a task—you're becoming the person who shows up.", "This is where the gap closes between who you are and who you're becoming."],
};

function getMotivationalQuote(taskTitle: string, goalText?: string): string {
  const combined = `${taskTitle} ${goalText ?? ''}`.toLowerCase();
  for (const [domain, quotes] of Object.entries(DOMAIN_QUOTES)) {
    if (domain !== 'default' && combined.includes(domain)) {
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
  }
  const d = DOMAIN_QUOTES.default;
  return d[Math.floor(Math.random() * d.length)];
}

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
  const [shimmerHover, setShimmerHover] = useState(false);
  const { isMobile } = useBreakpoint();

  const typeInfo = TASK_TYPE_MAP[task.type] ?? { color: '#9ca3af', label: task.type, Icon: Zap };

  // Rich agent data
  const taskExt = task as unknown as Record<string, unknown>;
  const whyThisMatters = typeof taskExt.whyThisMatters === 'string' ? taskExt.whyThisMatters : null;
  const successCriteria = typeof taskExt.successCriteria === 'string' ? taskExt.successCriteria : null;

  // 30-30-40 segments
  const segments = Array.isArray(task.segments) && task.segments.length > 0 ? task.segments : null;

  // Segment color palette (matches dark card background)
  const SEG_COLORS = [
    { border: 'rgba(14,165,233,0.25)', bg: 'rgba(14,165,233,0.06)', pill: '#0ea5e9', label: 'rgba(14,165,233,0.9)' },
    { border: 'rgba(167,139,250,0.25)', bg: 'rgba(124,58,237,0.06)', pill: '#a78bfa', label: 'rgba(167,139,250,0.9)' },
    { border: 'rgba(52,211,153,0.25)', bg: 'rgba(16,185,129,0.06)', pill: '#34d399', label: 'rgba(52,211,153,0.9)' },
  ];

  // Structured steps — try objects first, fall back to string array
  const rawSteps = taskExt.stepsData ?? task.steps;
  const steps: { duration?: string; instruction: string }[] = Array.isArray(rawSteps)
    ? rawSteps.map((s) => {
        if (typeof s === 'string') return { instruction: s };
        const o = s as StepObj;
        return { duration: o.duration, instruction: o.instruction ?? String(s) };
      })
    : [];


  // Motivational quote — prefer whyThisMatters, else generate one
  const quote = whyThisMatters ?? getMotivationalQuote(task.title, typeof taskExt.goalText === 'string' ? taskExt.goalText : undefined);

  const dayLabel = currentDay ? `Day ${currentDay}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: 'linear-gradient(145deg, #12102a 0%, #1e1040 40%, #1a0a3c 100%)',
        border: '1px solid rgba(167,139,250,0.1)',
        borderRadius: 28,
        padding: isMobile ? '32px 24px' : '48px 40px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(124,58,237,0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Ambient glow top-right */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'ambient-pulse 8s ease-in-out infinite',
      }} />

      {/* ── Header: Day · Type + Cinema ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
        position: 'relative',
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(167,139,250,0.7)',
        }}>
          {dayLabel && `${dayLabel} · `}{typeInfo.label}
        </span>

        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Flame size={13} strokeWidth={2} color="#fbbf24" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{streak}</span>
          </div>
        )}
      </div>

      {/* ── Title (hero element) ── */}
      <motion.h2
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
        style={{
          fontSize: isMobile ? 'clamp(26px, 8vw, 32px)' : 'clamp(32px, 5vw, 42px)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          margin: '0 0 8px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(196,181,253,0.9) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          position: 'relative',
        }}
      >
        {task.title}
      </motion.h2>

      {/* ── Duration dots line ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 32,
        position: 'relative',
      }}>
        <div style={{
          flex: 1,
          height: 1,
          background: 'linear-gradient(90deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.3) 50%, rgba(167,139,250,0.1) 100%)',
        }} />
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'rgba(167,139,250,0.8)',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
        }}>
          <Clock size={13} strokeWidth={1.8} color="rgba(167,139,250,0.6)" />
          {formatDuration(task.duration)}
        </span>
      </div>

      {/* ── Motivational Quote ── */}
      {quote && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={{
            position: 'relative',
            paddingLeft: 20,
            marginBottom: 36,
            borderLeft: '2px solid rgba(124,58,237,0.25)',
          }}
        >
          {/* Opening quote mark */}
          <span style={{
            position: 'absolute',
            left: -10,
            top: -12,
            fontSize: 48,
            fontWeight: 700,
            color: 'rgba(124,58,237,0.15)',
            lineHeight: 1,
            fontFamily: 'Georgia, serif',
            pointerEvents: 'none',
          }}>"</span>
          <p style={{
            fontSize: isMobile ? 15 : 16,
            fontWeight: 400,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.65)',
            fontStyle: 'italic',
            margin: 0,
          }}>
            {quote}
          </p>
        </motion.div>
      )}

      {/* ── Divider ── */}
      <div style={{
        width: '100%',
        height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent 100%)',
        marginBottom: 28,
      }} />

      {/* ── 30-30-40 Segment blocks ── */}
      {segments && (
        <div style={{ marginBottom: 28 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(167,139,250,0.6)',
            margin: '0 0 14px',
          }}>
            Your Flow Today
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {segments.map((seg, i) => {
              const c = SEG_COLORS[i % SEG_COLORS.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px', borderRadius: 14,
                    background: c.bg, border: `1px solid ${c.border}`,
                  }}
                >
                  <div style={{ flexShrink: 0, paddingTop: 1 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#12102a',
                      background: c.pill, borderRadius: 99, padding: '2px 8px',
                      whiteSpace: 'nowrap',
                    }}>
                      {seg.label}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.label }}>{seg.duration} min</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45, margin: 0 }}>
                      {seg.description}
                    </p>
                    {seg.tip && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', margin: '4px 0 0', lineHeight: 1.4 }}>
                        {seg.tip}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Your Flow Today (steps fallback — shown when no segments) ── */}
      {!segments && steps.length > 0 && (
        <div style={{ marginBottom: 28, position: 'relative' }}>
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(167,139,250,0.6)',
            margin: '0 0 20px',
          }}>
            Your Flow Today
          </p>
          <div>
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 14,
                  padding: '13px 0',
                  borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                {step.duration ? (
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'rgba(167,139,250,0.9)',
                    minWidth: 48,
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}>
                    {step.duration}
                  </span>
                ) : (
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'rgba(167,139,250,0.5)',
                    minWidth: 24,
                    flexShrink: 0,
                    textAlign: 'center',
                  }}>
                    {i + 1}
                  </span>
                )}
                <span style={{
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: 14,
                  flexShrink: 0,
                }}>→</span>
                <span style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.5,
                }}>
                  {step.instruction}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}


      {/* ── Success Criteria ── */}
      {successCriteria && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '16px 20px',
          background: 'rgba(124,58,237,0.04)',
          border: '1px solid rgba(124,58,237,0.12)',
          borderRadius: 16,
          marginBottom: 32,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(167,139,250,0.7)',
            flexShrink: 0,
            paddingTop: 1,
          }}>
            Done when:
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.5,
          }}>
            {successCriteria}
          </span>
        </div>
      )}

      {/* ── Resource (video / article) ── */}
      {task.resources?.primary && (
        <div style={{ marginBottom: 24 }}>
          <ResourceCard
            primary={task.resources.primary}
            supplementary={task.resources.supplementary}
          />
        </div>
      )}

      {/* ── Begin Session (primary CTA) ── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <button
          onClick={() => onStartFocus(task)}
          onMouseEnter={() => setShimmerHover(true)}
          onMouseLeave={() => setShimmerHover(false)}
          style={{
            width: '100%',
            height: 64,
            borderRadius: 18,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.8) 0%, rgba(167,139,250,0.7) 100%)',
            boxShadow: shimmerHover
              ? '0 12px 40px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
              : '0 8px 28px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            transform: shimmerHover ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {/* Shimmer sweep */}
          <span style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            animation: 'shimmer-sweep 3s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <Play size={16} strokeWidth={2.5} fill="rgba(255,255,255,0.98)" color="rgba(255,255,255,0.98)" />
          <span style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'rgba(255,255,255,0.98)',
            position: 'relative',
          }}>
            Begin Session
          </span>
        </button>
      </div>

      {/* ── Secondary actions (Done + Skip) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => onMarkDone(task)}
          disabled={isCompleting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            color: isCompleting ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
            cursor: isCompleting ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { if (!isCompleting) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
          onMouseLeave={e => { if (!isCompleting) { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
        >
          {isCompleting ? (
            <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <CheckCircle2 size={13} strokeWidth={2} />
          )}
          Mark Done
        </button>

        <button
          onClick={() => onSkip(task)}
          disabled={isSkipping}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '10px 16px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            fontSize: 13,
            color: isSkipping ? 'rgba(255,255,255,0.2)' : 'rgba(196,181,253,0.35)',
            cursor: isSkipping ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { if (!isSkipping) e.currentTarget.style.color = 'rgba(196,181,253,0.65)'; }}
          onMouseLeave={e => { if (!isSkipping) e.currentTarget.style.color = 'rgba(196,181,253,0.35)'; }}
        >
          {isSkipping ? (
            <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(196,181,253,0.5)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <SkipForward size={13} strokeWidth={2} />
          )}
          Skip
        </button>
      </div>

      {/* More tasks link */}
      {tasksRemainingCount > 0 && (
        <button
          onClick={onShowMore}
          style={{
            display: 'block',
            margin: '16px auto 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'rgba(196,181,253,0.4)',
            padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(196,181,253,0.75)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(196,181,253,0.4)'; }}
        >
          +{tasksRemainingCount} more task{tasksRemainingCount !== 1 ? 's' : ''} today →
        </button>
      )}

      <style>{`
        @keyframes ambient-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </motion.div>
  );
}
