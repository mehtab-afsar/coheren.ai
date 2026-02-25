import { useRef, useEffect, useState } from 'react';
import { MapPin, Calendar, Target, CheckCircle, Circle, TrendingUp, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  practice:   { bg: 'rgba(124,58,237,0.1)',  text: '#7c3aed' },
  learning:   { bg: 'rgba(14,165,233,0.1)',  text: '#0284c7' },
  reflection: { bg: 'rgba(124,58,237,0.1)',  text: '#7c3aed' },
};

export default function JourneyView() {
  const { roadmap, currentDay, tasks } = useStore();
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
  const totalWeeks = roadmap.strategicPlan?.totalWeeks || Math.ceil((roadmap.duration || 3) * 4);
  const totalMonths = roadmap.duration || 3;
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
    const weekTemplate = roadmap.strategicPlan?.weekTemplates?.find(
      (w: { weekNumber: number }) => w.weekNumber === weekNumber
    );
    if (weekTemplate) return { focus: weekTemplate.focus, description: weekTemplate.description };
    const phase = Math.ceil((weekNumber / totalWeeks) * 4);
    const phaseNames = ['Foundation', 'Development', 'Mastery', 'Excellence'];
    return { focus: phaseNames[phase - 1] || 'Progress', description: 'Continue building your skills' };
  };

  const getWeekProgress = (weekNumber: number) => {
    const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === weekNumber);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    return weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;
  };

  const getWeekStatus = (weekNumber: number) => {
    const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === weekNumber);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    if (weekTasks.length === 0) return 'upcoming';
    if (weekCompleted === weekTasks.length) return 'completed';
    if (weekNumber === currentWeek || weekCompleted > 0) return 'active';
    return 'upcoming';
  };

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

            {/* Weeks */}
            <div style={{ padding: tokens.spacing.lg, display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
              {month.weeks.map((weekNumber) => {
                const { focus, description } = getWeekDetails(weekNumber);
                const progress = getWeekProgress(weekNumber);
                const status = getWeekStatus(weekNumber);
                const isCurrentWeek = weekNumber === currentWeek;
                const isNextSprint = weekNumber === currentWeek + 1;

                const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === weekNumber);
                const isExpanded = expandedWeek === weekNumber;
                const canExpand = weekTasks.length > 0;

                return (
                  <div key={weekNumber} ref={isCurrentWeek ? currentWeekRef : undefined}>
                    {/* Week row — tappable to expand */}
                    <div
                      onClick={() => canExpand && setExpandedWeek(isExpanded ? null : weekNumber)}
                      style={{
                        display: 'flex',
                        gap: tokens.spacing.md,
                        padding: tokens.spacing.md,
                        backgroundColor: isCurrentWeek
                          ? 'rgba(124,58,237,0.05)'
                          : isNextSprint
                          ? 'rgba(124,58,237,0.01)'
                          : 'transparent',
                        border: isCurrentWeek
                          ? '1px solid rgba(124,58,237,0.2)'
                          : isNextSprint
                          ? '1px solid rgba(124,58,237,0.08)'
                          : '1px solid transparent',
                        borderRadius: isExpanded ? `${tokens.borderRadius.md} ${tokens.borderRadius.md} 0 0` : tokens.borderRadius.md,
                        animation: isCurrentWeek ? 'journey-fadein 0.4s ease both' : 'none',
                        cursor: canExpand ? 'pointer' : 'default',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {/* Status icon */}
                      <div style={{
                        width: '30px', height: '30px', flexShrink: 0,
                        borderRadius: '50%',
                        background: status === 'completed'
                          ? 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
                          : isCurrentWeek
                          ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                          : isNextSprint
                          ? 'rgba(124,58,237,0.08)'
                          : tokens.colors.gray[100],
                        border: isNextSprint ? '1px dashed rgba(124,58,237,0.3)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: isCurrentWeek ? 'journey-pulse 2.2s ease-in-out infinite' : 'none',
                      }}>
                        {status === 'completed' ? (
                          <CheckCircle size={15} color="#fff" />
                        ) : isCurrentWeek ? (
                          <MapPin size={15} color="#fff" />
                        ) : isNextSprint ? (
                          <Lock size={13} color="rgba(124,58,237,0.5)" strokeWidth={2} />
                        ) : (
                          <Circle size={15} color={tokens.colors.text.tertiary} />
                        )}
                      </div>

                      {/* Week details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                          <h4 style={{
                            fontSize: tokens.typography.sizes.sm,
                            fontWeight: tokens.typography.weights.semibold,
                            color: isCurrentWeek ? '#7c3aed' : isNextSprint ? 'rgba(124,58,237,0.6)' : tokens.colors.text.primary,
                            margin: 0,
                            letterSpacing: '-0.01em',
                          }}>
                            Week {weekNumber}
                            {isCurrentWeek && (
                              <span style={{
                                marginLeft: '6px',
                                fontSize: '10px',
                                padding: '1px 6px',
                                background: 'rgba(124,58,237,0.12)',
                                color: '#7c3aed',
                                borderRadius: '99px',
                                fontWeight: tokens.typography.weights.medium,
                                letterSpacing: '0.02em',
                              }}>
                                NOW
                              </span>
                            )}
                            {isNextSprint && (
                              <span style={{
                                marginLeft: '6px',
                                fontSize: '10px',
                                padding: '1px 6px',
                                background: 'rgba(124,58,237,0.06)',
                                color: 'rgba(124,58,237,0.55)',
                                border: '1px dashed rgba(124,58,237,0.25)',
                                borderRadius: '99px',
                                fontWeight: tokens.typography.weights.medium,
                                letterSpacing: '0.02em',
                              }}>
                                NEXT
                              </span>
                            )}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {status !== 'upcoming' && (
                              <span style={{ fontSize: '11px', color: status === 'completed' ? '#6d28d9' : tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium }}>
                                {progress}%
                              </span>
                            )}
                            {canExpand && (
                              isExpanded
                                ? <ChevronUp size={14} color={tokens.colors.text.tertiary} />
                                : <ChevronDown size={14} color={tokens.colors.text.tertiary} />
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: '11px', color: isNextSprint ? 'rgba(124,58,237,0.5)' : tokens.colors.text.secondary, margin: '0 0 6px', fontWeight: tokens.typography.weights.medium }}>
                          {focus}
                        </p>
                        <p style={{ fontSize: '11px', color: tokens.colors.text.tertiary, margin: 0, lineHeight: 1.45 }}>
                          {description}
                        </p>

                        {/* Progress bar */}
                        {status !== 'upcoming' && (
                          <div style={{
                            marginTop: '8px',
                            height: '3px',
                            backgroundColor: tokens.colors.gray[100],
                            borderRadius: '99px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${progress}%`,
                              background: status === 'completed'
                                ? 'linear-gradient(90deg, #6d28d9, #a78bfa)'
                                : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                              borderRadius: '99px',
                              boxShadow: progress > 0 ? '0 0 6px rgba(124,58,237,0.4)' : 'none',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable task drill-down */}
                    {isExpanded && (
                      <div style={{
                        borderLeft: isCurrentWeek ? '1px solid rgba(124,58,237,0.2)' : `1px solid ${tokens.colors.borderLight}`,
                        borderRight: isCurrentWeek ? '1px solid rgba(124,58,237,0.2)' : `1px solid ${tokens.colors.borderLight}`,
                        borderBottom: isCurrentWeek ? '1px solid rgba(124,58,237,0.2)' : `1px solid ${tokens.colors.borderLight}`,
                        borderRadius: `0 0 ${tokens.borderRadius.md} ${tokens.borderRadius.md}`,
                        backgroundColor: 'rgba(0,0,0,0.015)',
                        overflow: 'hidden',
                      }}>
                        {weekTasks.map((task, idx) => {
                          const isTaskDone = task.completed;
                          const isTaskSkipped = task.skipped;
                          const typeStyle = TYPE_COLORS[task.type] ?? TYPE_COLORS.practice;
                          return (
                            <div
                              key={task.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: tokens.spacing.sm,
                                padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                                borderTop: idx === 0 ? 'none' : `1px solid ${tokens.colors.borderLight}`,
                                opacity: isTaskSkipped ? 0.45 : 1,
                              }}
                            >
                              {/* completion dot */}
                              <div style={{
                                marginTop: '2px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isTaskDone
                                  ? 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)'
                                  : 'transparent',
                                border: isTaskDone ? 'none' : `1.5px solid ${tokens.colors.gray[300]}`,
                              }}>
                                {isTaskDone && <CheckCircle size={10} color="#fff" />}
                              </div>

                              {/* task info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontSize: tokens.typography.sizes.xs,
                                  fontWeight: tokens.typography.weights.medium,
                                  color: isTaskDone ? tokens.colors.text.secondary : tokens.colors.text.primary,
                                  margin: '0 0 4px',
                                  textDecoration: isTaskSkipped ? 'line-through' : 'none',
                                  lineHeight: 1.4,
                                }}>
                                  Day {task.day} — {task.title}
                                </p>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' as const }}>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: tokens.typography.weights.medium,
                                    color: typeStyle.text,
                                    background: typeStyle.bg,
                                    borderRadius: '99px',
                                    padding: '1px 7px',
                                    textTransform: 'capitalize' as const,
                                    letterSpacing: '0.02em',
                                  }}>
                                    {task.type}
                                  </span>
                                  <span style={{ fontSize: '10px', color: tokens.colors.text.tertiary }}>
                                    {task.duration}m
                                  </span>
                                  {task.userComment && (
                                    <span style={{
                                      fontSize: '10px',
                                      color: tokens.colors.text.tertiary,
                                      fontStyle: 'italic',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap' as const,
                                      maxWidth: '160px',
                                    }}>
                                      "{task.userComment}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
