import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Lock, Sparkles, Target, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@core/store/useStore';
import { useBreakpoint } from '@hooks/useBreakpoint';
import UpcomingPreview from './journey/UpcomingPreview';
import { ap } from '@core/design-system/appleTokens';

export default function RoadmapView() {
  const { roadmap, currentDay, tasks } = useStore();
  const agentRoadmap = useStore(s => s.agentRoadmap);
  const currentGoal = useStore(s => s.currentGoal);
  const { isMobile } = useBreakpoint();

  const phases = agentRoadmap?.roadmap?.phases ?? [];
  const totalWeeks = Math.ceil((agentRoadmap?.roadmap?.totalDays ?? (roadmap?.duration ?? 3) * 30) / 7);
  const currentWeek = Math.ceil(currentDay / 7);

  type PhaseWithMeta = {
    name: string;
    durationDays: number;
    startDay: number;
    endDay: number;
    status: 'completed' | 'active' | 'upcoming';
    percentage: number;
    primaryGoals: string[];
    scienceRationale: string;
    index: number;
  };

  const phasesWithMeta: PhaseWithMeta[] = phases.reduce<{ items: PhaseWithMeta[]; elapsed: number }>(
    (acc, p, i) => {
      const dur = p.durationDays ?? 14;
      const startDay = acc.elapsed + 1;
      const endDay = acc.elapsed + dur;
      const status: 'completed' | 'active' | 'upcoming' =
        currentDay > endDay ? 'completed' :
        currentDay >= startDay ? 'active' : 'upcoming';
      const daysCompleted = status === 'completed' ? dur : status === 'active' ? currentDay - startDay + 1 : 0;
      const percentage = Math.min(100, Math.round((daysCompleted / dur) * 100));
      acc.items.push({
        name: p.phaseName ?? `Phase ${i + 1}`,
        durationDays: dur,
        startDay,
        endDay,
        status,
        percentage,
        primaryGoals: p.primaryGoals ?? [],
        scienceRationale: p.scienceRationale ?? '',
        index: i,
      });
      acc.elapsed = endDay;
      return acc;
    },
    { items: [], elapsed: 0 },
  ).items;

  const activePhaseIndex = phasesWithMeta.findIndex(p => p.status === 'active');
  const [expandedPhase, setExpandedPhase] = useState<number>(activePhaseIndex >= 0 ? activePhaseIndex : 0);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const whyText: string = (() => {
    const summary = agentRoadmap?.stoneModificationSummary;
    if (summary && typeof summary === 'string' && summary.length > 20) return summary;
    const pedagogy = agentRoadmap?.domainPedagogy;
    const firstRationale = phasesWithMeta[0]?.scienceRationale;
    if (pedagogy && firstRationale) return `This plan uses ${pedagogy} principles. ${firstRationale}`;
    if (firstRationale) return firstRationale;
    return "Your plan was built around your behavioral patterns and available time — designed to build lasting habits, not just complete tasks.";
  })();

  const getPhaseWeeks = (phase: PhaseWithMeta) => {
    const startWeek = Math.ceil(phase.startDay / 7);
    const endWeek = Math.ceil(phase.endDay / 7);
    return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i);
  };

  const getWeekTasks = (weekNumber: number) => {
    const startDay = (weekNumber - 1) * 7 + 1;
    const endDay = weekNumber * 7;
    return tasks.filter(t => t.day >= startDay && t.day <= endDay);
  };

  const getWeekDetails = (weekNumber: number) => {
    const weekStartDay = (weekNumber - 1) * 7 + 1;
    let acc = 0;
    for (const p of phases) {
      const dur = p.durationDays ?? 14;
      if (weekStartDay <= acc + dur) {
        return {
          focus: p.phaseName ?? '',
          description: p.primaryGoals?.[0] ?? p.scienceRationale ?? 'Continue building your skills',
        };
      }
      acc += dur;
    }
    return { focus: '', description: 'Continue building your skills' };
  };

  const nextWeek = currentWeek + 1;
  const nextDetails = getWeekDetails(nextWeek);
  const nextTasks = getWeekTasks(nextWeek);
  const nextPractice = nextTasks.filter(t => t.type === 'practice').length;
  const nextLearning = nextTasks.filter(t => t.type === 'learning').length;
  const nextReflection = nextTasks.filter(t => t.type === 'reflection').length;

  const goalTitle = currentGoal?.specificGoal ?? roadmap?.title ?? 'Your Goal';
  const goalTimeline = (currentGoal as Record<string, unknown>)?.timeline as Record<string, unknown> | undefined;
  const durationMonths = (goalTimeline?.estimatedDuration_months as number) ?? roadmap?.duration ?? 3;
  const dailyMinutes = (goalTimeline?.dailyTimeCommitment_minutes as number) ?? 30;
  const daysPerWeek = (goalTimeline?.daysPerWeek as number) ?? 5;

  if (!roadmap && phases.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: ap.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Map size={28} color={ap.textTertiary} />
        </div>
        <p style={{ color: ap.textPrimary, fontWeight: 600, fontSize: 16, margin: 0 }}>Your plan isn't ready yet</p>
        <p style={{ color: ap.textSecondary, fontSize: 14, margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
          Something went wrong while building your roadmap. Go back to Today and your plan will be generated automatically.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32, fontFamily: ap.font }}>

      {/* ── 1. Goal Hero card ── */}
      {(() => {
        const totalDays = agentRoadmap?.roadmap?.totalDays ?? ((roadmap?.duration ?? 3) * 30);
        const journeyPct = Math.min(1, currentDay / totalDays);
        const weekPct = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));
        const RING_SIZE = isMobile ? 62 : 72;
        const RING_R = isMobile ? 25 : 29;
        const RING_CIRC = 2 * Math.PI * RING_R;

        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: ap.surface,
              border: `1px solid ${ap.border}`,
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            {/* Top: goal info + ring */}
            <div style={{
              padding: isMobile ? '20px 18px 16px' : '24px 24px 18px',
              borderBottom: `1px solid ${ap.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 16,
            }}>
              {/* Left: label + title + pills */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: ap.accentSoft, border: `1px solid ${ap.accentMid}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Target size={14} color={ap.accent} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ap.textTertiary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Your Goal
                  </span>
                </div>

                <h2 style={{
                  fontSize: isMobile ? 19 : 21,
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontWeight: 500,
                  color: ap.textPrimary,
                  margin: '0 0 12px',
                  lineHeight: 1.25,
                  letterSpacing: '-0.02em',
                }}>
                  {goalTitle}
                </h2>

                {/* Stats pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    `${durationMonths * 4} weeks`,
                    `${daysPerWeek}d/wk`,
                    `${dailyMinutes}min`,
                  ].map((pill) => (
                    <span key={pill} style={{
                      fontSize: 11, color: ap.textSecondary,
                      background: ap.surfaceAlt,
                      border: `1px solid ${ap.border}`,
                      borderRadius: 99, padding: '3px 10px', fontWeight: 500,
                    }}>
                      {pill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: completion ring */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ position: 'relative' }}>
                  <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                      fill="none" stroke={ap.surfaceAlt} strokeWidth={isMobile ? 4.5 : 5}
                    />
                    <motion.circle
                      cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                      fill="none" stroke={ap.accent} strokeWidth={isMobile ? 4.5 : 5}
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRC}
                      initial={{ strokeDashoffset: RING_CIRC }}
                      animate={{ strokeDashoffset: RING_CIRC * (1 - journeyPct) }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: ap.textPrimary, lineHeight: 1 }}>
                      {Math.round(journeyPct * 100)}%
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: ap.textTertiary, fontWeight: 500 }}>
                  Day {currentDay}
                </span>
              </div>
            </div>

            {/* Bottom: week progress */}
            <div style={{ padding: '13px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: ap.textTertiary, fontWeight: 500 }}>
                  Week {currentWeek} of {totalWeeks}
                </span>
                <span style={{ fontSize: 12, color: ap.accent, fontWeight: 600 }}>{weekPct}%</span>
              </div>
              <div style={{ height: 5, background: ap.surfaceAlt, borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${weekPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: ap.accent, borderRadius: 99 }}
                />
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* ── 2. This Week card ── */}
      {(() => {
        const weekTasks = getWeekTasks(currentWeek);
        const done = weekTasks.filter(t => t.completed).length;
        const total = weekTasks.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const todayTasks = weekTasks.filter(t => t.day === currentDay && !t.completed);
        const remainingWeekTasks = weekTasks.filter(t => t.day > currentDay && !t.completed);

        const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
          practice:   { color: ap.accent,   bg: ap.accentSoft },
          learning:   { color: '#0ea5e9',   bg: 'rgba(14,165,233,0.08)' },
          reflection: { color: '#CE6B45',   bg: 'rgba(206, 107, 69,0.08)' },
          review:     { color: ap.amber,    bg: ap.amberSoft },
          challenge:  { color: ap.streak,   bg: ap.streakSoft },
          retrieval:  { color: '#0ea5e9',   bg: 'rgba(14,165,233,0.08)' },
          assessment: { color: ap.amber,    bg: ap.amberSoft },
        };

        if (total === 0) return null;

        return (
          <div style={{
            background: ap.surface,
            border: `1px solid ${ap.border}`,
            borderRadius: 18,
            padding: '18px',
            marginBottom: 14,
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: ap.textPrimary }}>Week {currentWeek}</span>
                <span style={{ fontSize: 11, color: ap.textTertiary, marginLeft: 8 }}>{done}/{total} tasks</span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: pct >= 100 ? ap.success : ap.accent,
              }}>{pct}%</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 5, background: ap.surfaceAlt, borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: pct >= 100 ? ap.success : ap.accent,
                  borderRadius: 99,
                }}
              />
            </div>

            {/* Today's remaining tasks */}
            {todayTasks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: ap.accent, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
                  Today
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {todayTasks.slice(0, 3).map(t => {
                    const tc = TYPE_COLORS[t.type] ?? { color: ap.textTertiary, bg: ap.surfaceAlt };
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: tc.color, background: tc.bg,
                          borderRadius: 99, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                        }}>{t.type}</span>
                        <span style={{ fontSize: 13, color: ap.textPrimary, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                        <span style={{ fontSize: 11, color: ap.textTertiary, flexShrink: 0 }}>{t.duration}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming this week */}
            {remainingWeekTasks.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: ap.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
                  Still this week
                </p>
                <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: 6, overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {remainingWeekTasks.slice(0, 6).map(t => {
                    const tc = TYPE_COLORS[t.type] ?? { color: ap.textTertiary, bg: ap.surfaceAlt };
                    return (
                      <span key={t.id} style={{
                        fontSize: 11, color: tc.color, background: tc.bg,
                        borderRadius: 8, padding: '4px 10px',
                        border: `1px solid ${tc.bg}`,
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        Day {t.day} · {t.title.length > 28 ? t.title.slice(0, 28) + '…' : t.title}
                      </span>
                    );
                  })}
                  {remainingWeekTasks.length > 6 && (
                    <span style={{ fontSize: 11, color: ap.textTertiary }}>+{remainingWeekTasks.length - 6} more</span>
                  )}
                </div>
              </div>
            )}

            {done === total && total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <CheckCircle size={16} color={ap.success} />
                <span style={{ fontSize: 13, color: ap.success, fontWeight: 600 }}>Week complete!</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Why This Plan ── */}
      <div style={{
        background: ap.surface,
        border: `1px solid ${ap.border}`,
        borderLeft: `3px solid ${ap.accent}`,
        borderRadius: 12,
        padding: '13px 16px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Sparkles size={12} color={ap.accent} />
          <span style={{ fontSize: 10, fontWeight: 700, color: ap.accent, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Why this plan</span>
        </div>
        <p style={{ fontSize: 13, color: ap.textSecondary, lineHeight: 1.6, margin: 0 }}>
          {whyText}
        </p>
      </div>

      {/* ── 3. Phase Timeline ── */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: ap.textTertiary, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>
          Phase Timeline
        </p>

        {/* Horizontal phase snake */}
        {phasesWithMeta.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            {phasesWithMeta.map((phase, i) => (
              <div key={phase.index} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 60 }}>
                {/* Node + label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: '50%',
                    background: phase.status === 'completed' ? ap.accent
                      : phase.status === 'active' ? ap.accentSoft
                      : ap.surfaceAlt,
                    border: phase.status === 'active' ? `2.5px solid ${ap.accent}`
                      : phase.status === 'completed' ? 'none'
                      : `2px solid ${ap.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: phase.status === 'active' ? `0 0 0 4px ${ap.accentSoft}` : 'none',
                  }}>
                    {phase.status === 'completed' ? (
                      <CheckCircle size={14} color="#fff" />
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: phase.status === 'active' ? ap.accent : ap.textTertiary,
                      }}>
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 500, marginTop: 5, textAlign: 'center',
                    color: phase.status === 'active' ? ap.accent
                      : phase.status === 'completed' ? ap.textSecondary
                      : ap.textTertiary,
                    maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {phase.name}
                  </span>
                </div>

                {/* Connecting line */}
                {i < phasesWithMeta.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: ap.surfaceAlt, position: 'relative', marginBottom: 20, marginTop: -10 }}>
                    {phase.status === 'completed' && (
                      <div style={{ position: 'absolute', inset: 0, background: ap.accent, borderRadius: 1 }} />
                    )}
                    {phase.status === 'active' && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: `${phase.percentage}%`,
                        background: ap.accent,
                        borderRadius: 1,
                      }} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Phase accordion cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {phasesWithMeta.map((phase) => {
            const isExpanded = expandedPhase === phase.index;
            const phaseWeeks = getPhaseWeeks(phase);

            return (
              <motion.div
                key={phase.index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: phase.index * 0.06 }}
                style={{
                  background: ap.surface,
                  border: `1px solid ${phase.status === 'active' ? ap.accentMid : ap.border}`,
                  borderLeft: `3px solid ${
                    phase.status === 'completed' ? ap.accent
                    : phase.status === 'active' ? ap.accent
                    : ap.border
                  }`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: phase.status === 'active' ? ap.shadow : 'none',
                }}
              >
                {/* Phase header */}
                <button
                  onClick={() => setExpandedPhase(isExpanded ? -1 : phase.index)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: isMobile ? '12px 14px' : '14px 16px',
                    background: phase.status === 'active' ? ap.accentSoft : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {/* Status icon */}
                  <div style={{ flexShrink: 0 }}>
                    {phase.status === 'completed' ? (
                      <CheckCircle size={18} color={ap.accent} />
                    ) : phase.status === 'active' ? (
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: `2px solid ${ap.accent}`, background: ap.accentSoft,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: ap.accent }} />
                      </div>
                    ) : (
                      <Lock size={16} color={ap.textTertiary} />
                    )}
                  </div>

                  {/* Phase info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: phase.status === 'upcoming' ? ap.textTertiary : ap.textPrimary,
                      }}>
                        {phase.name}
                      </span>
                      {phase.status === 'active' && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: ap.accent,
                          background: ap.accentSoft, border: `1px solid ${ap.accentMid}`,
                          borderRadius: 99, padding: '1px 7px', letterSpacing: '0.04em',
                        }}>ACTIVE</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: ap.textTertiary }}>
                      Wk {Math.ceil(phase.startDay / 7)}–{Math.ceil(phase.endDay / 7)} · {Math.ceil(phase.durationDays / 7)} weeks
                    </span>
                  </div>

                  {/* Progress % + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {phase.status !== 'upcoming' && (
                      <span style={{ fontSize: 12, color: ap.accent, fontWeight: 600 }}>{phase.percentage}%</span>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={16} color={ap.textTertiary} />
                    ) : (
                      <ChevronRight size={16} color={ap.textTertiary} />
                    )}
                  </div>
                </button>

                {/* Expanded: week list */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ borderTop: `1px solid ${ap.border}`, padding: '12px 16px 14px' }}>
                        {/* Primary goals */}
                        {phase.primaryGoals.length > 0 && (
                          <ul style={{ margin: '0 0 12px', padding: '0 0 0 16px', listStyle: 'disc' }}>
                            {phase.primaryGoals.map((goal, gi) => (
                              <li key={gi} style={{ fontSize: 12, color: ap.textSecondary, lineHeight: 1.55, marginBottom: 3 }}>
                                {goal}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Science rationale callout */}
                        {phase.scienceRationale && (
                          <div style={{
                            background: ap.accentSoft,
                            border: `1px solid ${ap.accentMid}`,
                            borderRadius: 10, padding: '10px 12px', marginBottom: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                              <Sparkles size={11} color={ap.accent} />
                              <span style={{ fontSize: 10, fontWeight: 700, color: ap.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Why this works
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: ap.textSecondary, margin: 0, lineHeight: 1.55 }}>
                              {phase.scienceRationale}
                            </p>
                          </div>
                        )}

                        {/* Week rows */}
                        {phaseWeeks.map((weekNum) => {
                          const isWeekExpanded = expandedWeek === weekNum;
                          const weekTasks = getWeekTasks(weekNum);
                          const isCurrentWeek = weekNum === currentWeek;
                          const isPastWeek = weekNum < currentWeek;

                          return (
                            <div key={weekNum} style={{ marginBottom: 4 }}>
                              <button
                                onClick={() => setExpandedWeek(isWeekExpanded ? null : weekNum)}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '8px 10px',
                                  background: isCurrentWeek ? ap.accentSoft : ap.surfaceAlt,
                                  border: `1px solid ${isCurrentWeek ? ap.accentMid : ap.border}`,
                                  borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                }}
                              >
                                {/* Mini completion ring */}
                                {(() => {
                                  const wt = weekTasks;
                                  const done = wt.filter(t => t.completed).length;
                                  const total = wt.length || 1;
                                  const pct = done / total;
                                  const r = 8;
                                  const circ = 2 * Math.PI * r;
                                  return (
                                    <div style={{ flexShrink: 0, width: 20, height: 20, position: 'relative' }}>
                                      <svg width={20} height={20} style={{ transform: 'rotate(-90deg)' }}>
                                        <circle cx={10} cy={10} r={r} fill="none" stroke={ap.border} strokeWidth={2.5} />
                                        {done > 0 && (
                                          <circle
                                            cx={10} cy={10} r={r} fill="none"
                                            stroke={ap.accent} strokeWidth={2.5}
                                            strokeLinecap="round"
                                            strokeDasharray={circ}
                                            strokeDashoffset={circ * (1 - pct)}
                                          />
                                        )}
                                      </svg>
                                    </div>
                                  );
                                })()}

                                <span style={{
                                  flex: 1, fontSize: 12,
                                  fontWeight: isCurrentWeek ? 600 : 400,
                                  color: isCurrentWeek ? ap.accent : isPastWeek ? ap.textTertiary : ap.textSecondary,
                                }}>
                                  Week {weekNum}
                                </span>

                                {weekTasks.length > 0 && (
                                  <span style={{ fontSize: 10, color: ap.textTertiary }}>
                                    {weekTasks.filter(t => t.completed).length}/{weekTasks.length}
                                  </span>
                                )}

                                {isWeekExpanded ? (
                                  <ChevronDown size={13} color={ap.textTertiary} />
                                ) : (
                                  <ChevronRight size={13} color={ap.textTertiary} />
                                )}
                              </button>

                              {/* Expanded tasks */}
                              <AnimatePresence>
                                {isWeekExpanded && weekTasks.length > 0 && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <div style={{ padding: '6px 10px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {weekTasks.map((task) => (
                                        <div key={task.id} style={{
                                          display: 'flex', alignItems: 'flex-start', gap: 8,
                                          padding: '6px 0',
                                        }}>
                                          {task.completed ? (
                                            <CheckCircle size={13} color={ap.accent} style={{ marginTop: 1, flexShrink: 0 }} />
                                          ) : (
                                            <Circle size={13} color={ap.textTertiary} style={{ marginTop: 1, flexShrink: 0 }} />
                                          )}
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                              fontSize: 12, margin: 0, lineHeight: 1.4,
                                              color: task.completed ? ap.textTertiary : ap.textSecondary,
                                              textDecoration: task.completed ? 'line-through' : 'none',
                                            }}>
                                              {task.title}
                                            </p>
                                          </div>
                                          <span style={{
                                            fontSize: 10, padding: '1px 6px', borderRadius: 99,
                                            background: task.type === 'practice' ? ap.accentSoft
                                              : task.type === 'learning' ? 'rgba(14,165,233,0.08)'
                                              : ap.accentSoft,
                                            color: task.type === 'practice' ? ap.accent
                                              : task.type === 'learning' ? '#0ea5e9'
                                              : '#CE6B45',
                                            flexShrink: 0,
                                          }}>
                                            {task.type}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Next Week Preview ── */}
      {nextWeek <= totalWeeks && (
        <UpcomingPreview
          weekNumber={nextWeek}
          focus={nextDetails.focus || `Week ${nextWeek}`}
          description={nextDetails.description || 'Continue building your skills'}
          practiceCount={nextPractice}
          learningCount={nextLearning}
          reflectionCount={nextReflection}
        />
      )}
    </div>
  );
}
