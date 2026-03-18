import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Lock, Sparkles, Target, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@core/store/useStore';
import { useBreakpoint } from '@hooks/useBreakpoint';
import UpcomingPreview from './journey/UpcomingPreview';

export default function RoadmapView() {
  const { roadmap, currentDay, tasks } = useStore();
  const agentRoadmap = useStore(s => s.agentRoadmap);
  const currentGoal = useStore(s => s.currentGoal);
  const { isMobile } = useBreakpoint();

  const phases = agentRoadmap?.roadmap?.phases ?? [];
  const totalWeeks = Math.ceil((agentRoadmap?.roadmap?.totalDays ?? (roadmap?.duration ?? 3) * 30) / 7);
  const currentWeek = Math.ceil(currentDay / 7);

  // Compute phase start/end day and status
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

  // "Why This Plan" text
  const whyText: string = (() => {
    const summary = agentRoadmap?.stoneModificationSummary;
    if (summary && typeof summary === 'string' && summary.length > 20) return summary;
    const pedagogy = agentRoadmap?.domainPedagogy;
    const firstRationale = phasesWithMeta[0]?.scienceRationale;
    if (pedagogy && firstRationale) return `This plan uses ${pedagogy} principles. ${firstRationale}`;
    if (firstRationale) return firstRationale;
    return "Your plan was built around your behavioral patterns and available time — designed to build lasting habits, not just complete tasks.";
  })();

  // Get weeks for a phase
  const getPhaseWeeks = (phase: PhaseWithMeta) => {
    const startWeek = Math.ceil(phase.startDay / 7);
    const endWeek = Math.ceil(phase.endDay / 7);
    return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i);
  };

  // Get tasks for a week
  const getWeekTasks = (weekNumber: number) => {
    const startDay = (weekNumber - 1) * 7 + 1;
    const endDay = weekNumber * 7;
    return tasks.filter(t => t.day >= startDay && t.day <= endDay);
  };

  // Get week description from phase data
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

  // Next week preview data
  const nextWeek = currentWeek + 1;
  const nextDetails = getWeekDetails(nextWeek);
  const nextTasks = getWeekTasks(nextWeek);
  const nextPractice = nextTasks.filter(t => t.type === 'practice').length;
  const nextLearning = nextTasks.filter(t => t.type === 'learning').length;
  const nextReflection = nextTasks.filter(t => t.type === 'reflection').length;

  // Goal info
  const goalTitle = currentGoal?.specificGoal ?? roadmap?.title ?? 'Your Goal';
  const goalTimeline = (currentGoal as Record<string, unknown>)?.timeline as Record<string, unknown> | undefined;
  const durationMonths = (goalTimeline?.estimatedDuration_months as number) ?? roadmap?.duration ?? 3;
  const dailyMinutes = (goalTimeline?.dailyTimeCommitment_minutes as number) ?? 30;
  const daysPerWeek = (goalTimeline?.daysPerWeek as number) ?? 5;

  if (!roadmap && phases.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Map size={32} color="#d1d5db" />
        <p style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>No roadmap data yet.</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* ── 1. Goal Hero card ── */}
      {(() => {
        const totalDays = agentRoadmap?.roadmap?.totalDays ?? ((roadmap?.duration ?? 3) * 30);
        const journeyPct = Math.min(1, currentDay / totalDays);
        const RING_SIZE = isMobile ? 60 : 80;
        const RING_R = isMobile ? 25 : 34;
        const RING_CIRC = 2 * Math.PI * RING_R;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'linear-gradient(145deg, #0d0d1a 0%, #1a0a2e 60%, #120820 100%)',
              border: '1px solid rgba(167,139,250,0.15)',
              borderRadius: 20,
              padding: '24px 20px',
              marginBottom: 16,
              boxShadow: '0 8px 32px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {/* Left: icon + title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'rgba(124,58,237,0.2)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Target size={18} color="#a78bfa" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: 'rgba(167,139,250,0.6)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                      Your Goal
                    </p>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.25 }}>
                      {goalTitle}
                    </h2>
                  </div>
                </div>

                {/* Stats pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {[
                    `${durationMonths * 4} weeks`,
                    `${daysPerWeek}d/wk`,
                    `${dailyMinutes}min`,
                  ].map((pill) => (
                    <span key={pill} style={{
                      fontSize: 11, color: 'rgba(196,181,253,0.7)',
                      background: 'rgba(124,58,237,0.12)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      borderRadius: 99, padding: '2px 9px',
                    }}>
                      {pill}
                    </span>
                  ))}
                </div>

                {/* Progress line */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
                      WEEK {currentWeek} OF {totalWeeks}
                    </span>
                    <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                      {Math.min(100, Math.round((currentWeek / totalWeeks) * 100))}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (currentWeek / totalWeeks) * 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: 99 }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: completion ring */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#c4b5fd" />
                    </linearGradient>
                  </defs>
                  <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={isMobile ? 4 : 5} />
                  <motion.circle
                    cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                    fill="none" stroke="url(#heroRingGrad)" strokeWidth={isMobile ? 4 : 5}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRC}
                    initial={{ strokeDashoffset: RING_CIRC }}
                    animate={{ strokeDashoffset: RING_CIRC * (1 - journeyPct) }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  />
                </svg>
                <span style={{ fontSize: 11, color: 'rgba(196,181,253,0.5)', marginTop: 6, fontWeight: 500 }}>
                  Day {currentDay}
                </span>
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
          practice:   { color: '#a78bfa', bg: 'rgba(124,58,237,0.08)' },
          learning:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
          reflection: { color: '#c4b5fd', bg: 'rgba(124,58,237,0.06)' },
          review:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
          challenge:  { color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
          retrieval:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
          assessment: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        };

        if (total === 0) return null;

        return (
          <div style={{
            background: '#fff',
            border: '1px solid #f0f0f5',
            borderRadius: 18,
            padding: '18px 18px',
            marginBottom: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>Week {currentWeek}</span>
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{done}/{total} tasks</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? '#22c55e' : '#7c3aed' }}>{pct}%</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: 99 }}
              />
            </div>

            {/* Today's remaining tasks */}
            {todayTasks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
                  Today
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {todayTasks.slice(0, 3).map(t => {
                    const tc = TYPE_COLORS[t.type] ?? { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' };
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: tc.color, background: tc.bg,
                          borderRadius: 99, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                        }}>{t.type}</span>
                        <span style={{ fontSize: 13, color: '#111', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{t.duration}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming this week */}
            {remainingWeekTasks.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
                  Still this week
                </p>
                <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: 6, overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {remainingWeekTasks.slice(0, 6).map(t => {
                    const tc = TYPE_COLORS[t.type] ?? { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' };
                    return (
                      <span key={t.id} style={{
                        fontSize: 11, color: tc.color, background: tc.bg,
                        borderRadius: 8, padding: '4px 10px', border: `1px solid ${tc.bg}`,
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        Day {t.day} · {t.title.length > 28 ? t.title.slice(0, 28) + '…' : t.title}
                      </span>
                    );
                  })}
                  {remainingWeekTasks.length > 6 && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>+{remainingWeekTasks.length - 6} more</span>
                  )}
                </div>
              </div>
            )}

            {done === total && total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <CheckCircle size={16} color="#22c55e" />
                <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Week complete! 🎉</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Why This Plan */}
      <div style={{
        borderLeft: '3px solid #7c3aed',
        paddingLeft: 16,
        marginBottom: 20,
        padding: '12px 0 12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Sparkles size={13} color="#7c3aed" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Why this plan</span>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
          {whyText}
        </p>
      </div>

      {/* ── 3. Phase Timeline ── */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>
          Phase Timeline
        </p>

        {/* ── Horizontal phase snake ── */}
        {phasesWithMeta.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            {phasesWithMeta.map((phase, i) => (
              <div key={phase.index} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 60 }}>
                {/* Node + label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: '50%',
                    background: phase.status === 'completed' ? '#7c3aed'
                      : phase.status === 'active' ? '#f5f3ff'
                      : '#f3f4f6',
                    border: phase.status === 'active' ? '2.5px solid #7c3aed'
                      : phase.status === 'completed' ? 'none'
                      : '2px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: phase.status === 'active' ? '0 0 0 4px rgba(124,58,237,0.1)' : 'none',
                  }}>
                    {phase.status === 'completed' ? (
                      <CheckCircle size={14} color="#fff" />
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: phase.status === 'active' ? '#7c3aed' : '#9ca3af',
                      }}>
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 500, marginTop: 5, textAlign: 'center',
                    color: phase.status === 'active' ? '#7c3aed'
                      : phase.status === 'completed' ? '#6b7280'
                      : '#9ca3af',
                    maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {phase.name}
                  </span>
                </div>
                {/* Connecting line */}
                {i < phasesWithMeta.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: '#f3f4f6', position: 'relative', marginBottom: 20, marginTop: -10 }}>
                    {phase.status === 'completed' && (
                      <div style={{ position: 'absolute', inset: 0, background: '#7c3aed', borderRadius: 1 }} />
                    )}
                    {phase.status === 'active' && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: `${phase.percentage}%`,
                        background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                        borderRadius: 1,
                      }} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
                  background: phase.status === 'active' ? '#faf8ff' : '#fff',
                  border: `1px solid ${phase.status === 'active' ? 'rgba(124,58,237,0.18)' : '#f3f4f6'}`,
                  borderLeft: `3px solid ${
                    phase.status === 'completed' ? '#7c3aed'
                    : phase.status === 'active' ? '#a78bfa'
                    : '#e2e8f0'
                  }`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: phase.status === 'active'
                    ? '0 0 0 2px rgba(124,58,237,0.15), 0 4px 20px rgba(124,58,237,0.08)'
                    : 'none',
                }}
              >
                {/* Phase header row */}
                <button
                  onClick={() => setExpandedPhase(isExpanded ? -1 : phase.index)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: isMobile ? '12px 14px' : '14px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {/* Status icon */}
                  <div style={{ flexShrink: 0 }}>
                    {phase.status === 'completed' ? (
                      <CheckCircle size={18} color="#7c3aed" />
                    ) : phase.status === 'active' ? (
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: '2px solid #7c3aed', background: '#f5f3ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed' }} />
                      </div>
                    ) : (
                      <Lock size={16} color="#d1d5db" />
                    )}
                  </div>

                  {/* Phase info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: phase.status === 'upcoming' ? '#9ca3af' : '#111',
                      }}>
                        {phase.name}
                      </span>
                      {phase.status === 'active' && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#7c3aed',
                          background: '#f5f3ff', border: '1px solid #ede9fe',
                          borderRadius: 99, padding: '1px 7px', letterSpacing: '0.04em',
                        }}>ACTIVE</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      Wk {Math.ceil(phase.startDay / 7)}–{Math.ceil(phase.endDay / 7)} · {Math.ceil(phase.durationDays / 7)} weeks
                    </span>
                  </div>

                  {/* Progress % + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {phase.status !== 'upcoming' && (
                      <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{phase.percentage}%</span>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={16} color="#9ca3af" />
                    ) : (
                      <ChevronRight size={16} color="#9ca3af" />
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
                      <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px 14px' }}>
                        {/* Primary goals — bulleted list */}
                        {phase.primaryGoals.length > 0 && (
                          <ul style={{ margin: '0 0 12px', padding: '0 0 0 16px', listStyle: 'disc' }}>
                            {phase.primaryGoals.map((goal, gi) => (
                              <li key={gi} style={{ fontSize: 12, color: '#374151', lineHeight: 1.55, marginBottom: 3 }}>
                                {goal}
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Science rationale callout */}
                        {phase.scienceRationale && (
                          <div style={{
                            background: 'rgba(124,58,237,0.04)',
                            border: '1px solid rgba(124,58,237,0.1)',
                            borderRadius: 10, padding: '10px 12px', marginBottom: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                              <Sparkles size={11} color="#7c3aed" />
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Why this works
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.55 }}>
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
                                  padding: '8px 10px', background: isCurrentWeek ? '#f5f3ff' : '#fafafa',
                                  border: `1px solid ${isCurrentWeek ? '#ede9fe' : '#f3f4f6'}`,
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
                                        <circle cx={10} cy={10} r={r} fill="none" stroke="#f3f4f6" strokeWidth={2.5} />
                                        {done > 0 && (
                                          <circle
                                            cx={10} cy={10} r={r} fill="none"
                                            stroke="#7c3aed" strokeWidth={2.5}
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
                                  flex: 1, fontSize: 12, fontWeight: isCurrentWeek ? 600 : 400,
                                  color: isCurrentWeek ? '#7c3aed' : isPastWeek ? '#9ca3af' : '#374151',
                                }}>
                                  Week {weekNum}
                                </span>

                                {weekTasks.length > 0 && (
                                  <span style={{ fontSize: 10, color: '#9ca3af' }}>
                                    {weekTasks.filter(t => t.completed).length}/{weekTasks.length}
                                  </span>
                                )}

                                {isWeekExpanded ? (
                                  <ChevronDown size={13} color="#9ca3af" />
                                ) : (
                                  <ChevronRight size={13} color="#9ca3af" />
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
                                            <CheckCircle size={13} color="#7c3aed" style={{ marginTop: 1, flexShrink: 0 }} />
                                          ) : (
                                            <Circle size={13} color="#d1d5db" style={{ marginTop: 1, flexShrink: 0 }} />
                                          )}
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                              fontSize: 12, margin: 0, lineHeight: 1.4,
                                              color: task.completed ? '#9ca3af' : '#374151',
                                              textDecoration: task.completed ? 'line-through' : 'none',
                                            }}>
                                              {task.title}
                                            </p>
                                          </div>
                                          <span style={{
                                            fontSize: 10, padding: '1px 6px', borderRadius: 99,
                                            background: task.type === 'practice' ? 'rgba(124,58,237,0.08)'
                                              : task.type === 'learning' ? 'rgba(14,165,233,0.08)'
                                              : 'rgba(139,92,246,0.08)',
                                            color: task.type === 'practice' ? '#7c3aed'
                                              : task.type === 'learning' ? '#0ea5e9'
                                              : '#8b5cf6',
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
