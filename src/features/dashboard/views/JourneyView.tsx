import { useRef, useEffect, useState } from 'react';
import { Calendar, Target, CheckCircle, TrendingUp } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';
import PhaseMap from './journey/PhaseMap';
import type { PhaseMapPhase } from './journey/PhaseMap';
import WeekCard from './journey/WeekCard';
import type { DayDot, WeekTaskRow } from './journey/WeekCard';
import UpcomingPreview from './journey/UpcomingPreview';

export default function JourneyView() {
  const { roadmap, currentDay, tasks } = useStore();
  const agentRoadmap = useStore(s => s.agentRoadmap);
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  // Scroll to current week on mount
  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  if (!roadmap) {
    return (
      <div style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing['3xl'],
        textAlign: 'center',
      }}>
        <p style={{ fontSize: tokens.typography.sizes.base, color: tokens.colors.text.secondary }}>
          No journey data available
        </p>
      </div>
    );
  }

  const currentWeek = Math.ceil(currentDay / 7);
  const totalDays = agentRoadmap?.roadmap?.totalDays ?? (roadmap.strategicPlan?.totalWeeks ?? Math.ceil((roadmap.duration || 3) * 4)) * 7;
  const totalWeeks = Math.ceil(totalDays / 7);
  const totalMonths = agentRoadmap?.roadmap?.totalDays
    ? Math.ceil(agentRoadmap.roadmap.totalDays / 30)
    : (roadmap.duration || 3);
  const overallProgress = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));

  // Group weeks by month
  const monthsData = Array.from({ length: totalMonths }, (_, monthIndex) => {
    const monthNumber = monthIndex + 1;
    const startWeek = monthIndex * 4 + 1;
    const endWeek = Math.min(startWeek + 3, totalWeeks);
    const weeks = Array.from({ length: endWeek - startWeek + 1 }, (_, i) => startWeek + i);
    return {
      monthNumber,
      title: `Month ${monthNumber}`,
      weeks,
      isActive: currentWeek >= startWeek && currentWeek <= endWeek,
      isCompleted: currentWeek > endWeek,
    };
  });

  const getWeekDetails = (weekNumber: number) => {
    // If we have Agent 3 roadmap, look up the phase that covers this week's days
    if (agentRoadmap?.roadmap?.phases) {
      const weekStartDay = (weekNumber - 1) * 7 + 1;
      let elapsed = 0;
      for (const p of agentRoadmap.roadmap.phases) {
        const dur = p.durationDays ?? 14;
        if (weekStartDay <= elapsed + dur) {
          return {
            focus: p.phaseName,
            description: p.primaryGoals?.[0] ?? p.scienceRationale ?? 'Continue building your skills',
          };
        }
        elapsed += dur;
      }
      // Beyond all phases — use last phase
      const last = agentRoadmap.roadmap.phases[agentRoadmap.roadmap.phases.length - 1];
      return { focus: last.phaseName, description: last.primaryGoals?.[0] ?? '' };
    }
    // Legacy fallback
    const weekTemplate = roadmap.strategicPlan?.weekTemplates?.find(
      (w: { weekNumber: number }) => w.weekNumber === weekNumber
    );
    if (weekTemplate) return { focus: weekTemplate.focus, description: weekTemplate.description };
    const phase = Math.ceil((weekNumber / totalWeeks) * 4);
    const phaseNames = ['Foundation', 'Development', 'Mastery', 'Excellence'];
    return { focus: phaseNames[phase - 1] || 'Progress', description: 'Continue building your skills' };
  };

  const getWeekStatus = (weekNumber: number) => {
    const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === weekNumber);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    if (weekTasks.length === 0) return 'upcoming';
    if (weekCompleted === weekTasks.length) return 'completed';
    if (weekNumber === currentWeek || weekCompleted > 0) return 'active';
    return 'upcoming';
  };

  // ── PhaseMap data ──────────────────────────────────────────────────────────
  const phaseMapPhases: PhaseMapPhase[] =
    agentRoadmap?.roadmap?.phases?.map((p, i) => {
      let elapsed = 0;
      for (let j = 0; j < i; j++) {
        elapsed += agentRoadmap.roadmap.phases[j].durationDays ?? 14;
      }
      const phaseStart = elapsed + 1;
      const phaseEnd = elapsed + (p.durationDays ?? 14);
      const daysInPhase = p.durationDays ?? 14;
      const daysCompleted = Math.max(0, Math.min(currentDay - phaseStart + 1, daysInPhase));
      const percentage = Math.round((daysCompleted / daysInPhase) * 100);
      const status: 'completed' | 'active' | 'upcoming' =
        currentDay > phaseEnd ? 'completed' : currentDay >= phaseStart ? 'active' : 'upcoming';
      return {
        name: p.phaseName,
        status,
        percentage:
          status === 'completed' ? 100 : status === 'upcoming' ? 0 : percentage,
        description: p.primaryGoals?.[0] ?? p.scienceRationale ?? '',
      };
    }) ?? [];

  const currentPhaseIndex = Math.max(
    0,
    phaseMapPhases.findIndex(p => p.status === 'active')
  );

  // ── Upcoming preview data ─────────────────────────────────────────────────
  const nextWeekNum = currentWeek + 1;
  const showUpcomingPreview = nextWeekNum <= totalWeeks && !!agentRoadmap;
  const nextWeekDetail = showUpcomingPreview ? getWeekDetails(nextWeekNum) : null;
  const nextWeekTasks = showUpcomingPreview
    ? tasks.filter(
        t => t.day >= (nextWeekNum - 1) * 7 + 1 && t.day <= nextWeekNum * 7
      )
    : [];
  const nextWeekPracticeCount = nextWeekTasks.filter(t => t.type === 'practice').length;
  const nextWeekLearningCount = nextWeekTasks.filter(t => t.type === 'learning').length;
  const nextWeekReflectionCount = nextWeekTasks.filter(t => t.type === 'reflection').length;

  return (
    <div>
      {/* Animation keyframes */}
      <style>{`
        @keyframes journey-pulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(124,58,237,0.3), 0 0 0 0 rgba(124,58,237,0.4); }
          50% { box-shadow: 0 2px 8px rgba(124,58,237,0.3), 0 0 0 6px rgba(124,58,237,0); }
        }
        @keyframes journey-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes journey-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header — single inline row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}>
        <h1 style={{
          fontSize: tokens.typography.sizes['2xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          margin: 0,
          lineHeight: 1,
          flex: 1,
        }}>
          Journey
        </h1>
        <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary, whiteSpace: 'nowrap' as const }}>
          {totalWeeks}w
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          borderRadius: '99px',
          fontSize: '11px',
          fontWeight: tokens.typography.weights.medium,
          color: '#fff',
          letterSpacing: '0.02em',
          boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
          flexShrink: 0,
        }}>
          Week {currentWeek}
        </span>
      </div>

      {/* Hero Progress Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)',
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing['2xl'],
        marginBottom: tokens.spacing['2xl'],
        boxShadow: '0 20px 60px rgba(124,58,237,0.35), 0 0 0 1px rgba(167,139,250,0.2)',
        position: 'relative' as const,
        overflow: 'hidden' as const,
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.md, marginBottom: tokens.spacing.xl, position: 'relative' as const }}>
          <div style={{
            width: '40px', height: '40px', flexShrink: 0,
            background: 'rgba(167,139,250,0.15)',
            border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: tokens.borderRadius.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={20} color="#c4b5fd" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: 'rgba(196,181,253,0.55)', fontWeight: tokens.typography.weights.medium, letterSpacing: '0.06em', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>
              Journey
            </p>
            <h2 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.semibold,
              color: '#f3e8ff',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
            }}>
              {roadmap.title}
            </h2>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.5)', letterSpacing: '0.05em', margin: '0 0 2px', textTransform: 'uppercase' as const }}>Overall</p>
            <p style={{ fontSize: tokens.typography.sizes.sm, color: '#c4b5fd', fontWeight: tokens.typography.weights.semibold, margin: 0 }}>
              {overallProgress}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: tokens.spacing.xl, position: 'relative' as const }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(196,181,253,0.6)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>Progress</span>
            <span style={{ fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.semibold, color: '#c4b5fd' }}>
              Week {currentWeek} of {totalWeeks}
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${overallProgress}%`,
              background: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)',
              borderRadius: '99px',
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 0 8px rgba(167,139,250,0.6)',
            }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tokens.spacing.lg, position: 'relative' as const }}>
          {[
            { label: 'Day', value: String(currentDay) },
            { label: 'Week', value: String(currentWeek) },
            { label: 'Remaining', value: `${totalWeeks - currentWeek}w` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: tokens.typography.sizes.base, fontWeight: tokens.typography.weights.semibold, color: '#e9d5ff', margin: 0, letterSpacing: '-0.01em' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PhaseMap ── */}
      {phaseMapPhases.length > 0 && (
        <PhaseMap phases={phaseMapPhases} currentPhaseIndex={currentPhaseIndex} />
      )}

      {/* Month-by-Month Breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
        <h2 style={{ fontSize: tokens.typography.sizes.xl, fontWeight: tokens.typography.weights.semibold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
          By Month
        </h2>
        <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>
          {totalMonths} total
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
        {monthsData.map((month) => (
          <div
            key={month.monthNumber}
            style={{
              backgroundColor: month.isActive ? 'rgba(124,58,237,0.03)' : tokens.colors.surface,
              border: `1px solid ${month.isActive ? 'rgba(124,58,237,0.2)' : month.isCompleted ? 'rgba(124,58,237,0.15)' : tokens.colors.borderLight}`,
              borderLeft: month.isActive
                ? '4px solid #7c3aed'
                : month.isCompleted
                ? '4px solid #6d28d9'
                : `4px solid ${tokens.colors.gray[200]}`,
              borderRadius: tokens.borderRadius.lg,
              overflow: 'hidden' as const,
              opacity: month.isCompleted ? 0.85 : !month.isActive && !month.isCompleted ? 0.65 : 1,
              boxShadow: month.isActive ? '0 4px 16px rgba(124,58,237,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Month Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
              borderBottom: `1px solid ${month.isActive ? 'rgba(124,58,237,0.1)' : tokens.colors.borderLight}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md }}>
                <div style={{
                  width: '32px', height: '32px',
                  background: month.isActive
                    ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                    : month.isCompleted
                    ? 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
                    : tokens.colors.gray[100],
                  borderRadius: tokens.borderRadius.md,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: month.isActive ? '0 4px 12px rgba(124,58,237,0.3)' : month.isCompleted ? '0 4px 12px rgba(109,40,217,0.2)' : 'none',
                }}>
                  <Calendar size={15} color={month.isActive || month.isCompleted ? '#fff' : tokens.colors.text.tertiary} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: tokens.typography.sizes.base,
                    fontWeight: tokens.typography.weights.semibold,
                    color: month.isActive ? '#7c3aed' : tokens.colors.text.primary,
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}>
                    {month.title}
                  </h3>
                  <p style={{ fontSize: '11px', color: tokens.colors.text.tertiary, margin: '2px 0 0' }}>
                    Weeks {month.weeks[0]}–{month.weeks[month.weeks.length - 1]}
                  </p>
                </div>
              </div>

              {month.isActive && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(109,40,217,0.06) 100%)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: '99px',
                }}>
                  <TrendingUp size={11} color="#7c3aed" strokeWidth={2} />
                  <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: tokens.typography.weights.semibold, letterSpacing: '0.02em' }}>
                    Current
                  </span>
                </div>
              )}
              {month.isCompleted && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  background: 'rgba(109,40,217,0.08)',
                  border: '1px solid rgba(109,40,217,0.2)',
                  borderRadius: '99px',
                }}>
                  <CheckCircle size={11} color="#6d28d9" strokeWidth={2} />
                  <span style={{ fontSize: '11px', color: '#6d28d9', fontWeight: tokens.typography.weights.semibold }}>
                    Done
                  </span>
                </div>
              )}
            </div>

            {/* Weeks — using new WeekCard component */}
            <div style={{ padding: tokens.spacing.lg, display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
              {month.weeks.map((weekNumber) => {
                const { focus } = getWeekDetails(weekNumber);
                const status = getWeekStatus(weekNumber);
                const isCurrentWeek = weekNumber === currentWeek;

                const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === weekNumber);
                const completedCount = weekTasks.filter(t => t.completed).length;
                const totalCount = weekTasks.length;
                const isExpanded = expandedWeek === weekNumber;

                // Day dots
                const weekDays: DayDot[] = Array.from({ length: 7 }, (_, i) => {
                  const dayNum = (weekNumber - 1) * 7 + i + 1;
                  const dayTasks = tasks.filter(t => t.day === dayNum);
                  return {
                    dayNumber: dayNum,
                    completed: dayTasks.length > 0 && dayTasks.every(t => t.completed),
                    skipped:
                      dayTasks.length > 0 &&
                      dayTasks.every(t => t.skipped) &&
                      !dayTasks.some(t => t.completed),
                    isToday: dayNum === currentDay,
                    isRest: dayNum % 7 === 0,
                    isFuture: dayNum > currentDay,
                  };
                });

                // Task rows for expanded drill-down
                const weekTaskRows: WeekTaskRow[] = weekTasks
                  .sort((a, b) => a.day - b.day)
                  .map(t => ({
                    id: t.id,
                    title: t.title,
                    taskType: t.type ?? 'practice',
                    duration: t.duration ?? 30,
                    completed: t.completed,
                    skipped: t.skipped ?? false,
                    isToday: t.day === currentDay,
                    day: t.day,
                    description: t.description,
                    mood: t.difficultyRating,
                    reflection: t.userComment,
                    hasNotes: Boolean(localStorage.getItem(`note_entries_${t.id}`)),
                  }));

                return (
                  <div key={weekNumber} ref={isCurrentWeek ? currentWeekRef : undefined}>
                    <WeekCard
                      weekNumber={weekNumber}
                      focus={focus}
                      completedCount={completedCount}
                      totalCount={totalCount}
                      isActive={isCurrentWeek || status === 'active'}
                      isCompleted={status === 'completed'}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedWeek(isExpanded ? null : weekNumber)}
                      days={weekDays}
                      tasks={weekTaskRows}
                    />

                    {/* "Up next" teaser below current week (legacy inline preview) */}
                    {isCurrentWeek && currentWeek < totalWeeks && (() => {
                      const nextWk = currentWeek + 1;
                      const { focus: nextFocus } = getWeekDetails(nextWk);
                      return (
                        <div style={{
                          marginTop: tokens.spacing.xs,
                          padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                          background: 'rgba(124,58,237,0.03)',
                          border: '1px dashed rgba(124,58,237,0.15)',
                          borderRadius: tokens.borderRadius.md,
                          display: 'flex',
                          alignItems: 'center',
                          gap: tokens.spacing.sm,
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, border: '1.5px dashed rgba(124,58,237,0.4)' }} />
                          <div>
                            <p style={{ fontSize: '10px', color: 'rgba(124,58,237,0.55)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, margin: '0 0 2px' }}>
                              Up next · Week {nextWk}
                            </p>
                            <p style={{ fontSize: '11px', color: tokens.colors.text.secondary, margin: 0, fontWeight: 500 }}>
                              {nextFocus}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── UpcomingPreview ── */}
      {showUpcomingPreview && nextWeekDetail && (
        <UpcomingPreview
          weekNumber={nextWeekNum}
          focus={nextWeekDetail.focus}
          description={nextWeekDetail.description}
          practiceCount={nextWeekPracticeCount}
          learningCount={nextWeekLearningCount}
          reflectionCount={nextWeekReflectionCount}
        />
      )}

      {/* Spacer for bottom nav */}
      <div style={{ height: 32 }} />
    </div>
  );
}

