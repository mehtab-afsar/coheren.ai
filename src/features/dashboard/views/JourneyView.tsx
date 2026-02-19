import { MapPin, Calendar, Target, CheckCircle, Circle, TrendingUp } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';

export default function JourneyView() {
  const { roadmap, currentDay, tasks } = useStore();

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
      {/* Header */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary, marginBottom: tokens.spacing.xs, letterSpacing: '0.01em' }}>
          Week by week
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
          <h1 style={{
            fontSize: tokens.typography.sizes['3xl'],
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.colors.text.primary,
            letterSpacing: '-0.03em',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Your Journey
          </h1>
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
          }}>
            Week {currentWeek}
          </span>
        </div>
        <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.secondary, margin: 0 }}>
          {roadmap.title} • {totalMonths} {totalMonths === 1 ? 'month' : 'months'} • {totalWeeks} weeks
        </p>
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
              border: `1px solid ${month.isActive ? 'rgba(124,58,237,0.2)' : month.isCompleted ? 'rgba(16,185,129,0.15)' : tokens.colors.borderLight}`,
              borderLeft: month.isActive
                ? '4px solid #7c3aed'
                : month.isCompleted
                ? '4px solid #10b981'
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
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : tokens.colors.gray[100],
                  borderRadius: tokens.borderRadius.md,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: month.isActive ? '0 4px 12px rgba(124,58,237,0.3)' : month.isCompleted ? '0 4px 12px rgba(16,185,129,0.2)' : 'none',
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
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '99px',
                }}>
                  <CheckCircle size={11} color="#10b981" strokeWidth={2} />
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: tokens.typography.weights.semibold }}>
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

                return (
                  <div
                    key={weekNumber}
                    style={{
                      display: 'flex',
                      gap: tokens.spacing.md,
                      padding: tokens.spacing.md,
                      backgroundColor: isCurrentWeek ? 'rgba(124,58,237,0.04)' : 'transparent',
                      border: isCurrentWeek ? '1px solid rgba(124,58,237,0.15)' : '1px solid transparent',
                      borderRadius: tokens.borderRadius.md,
                    }}
                  >
                    {/* Status icon */}
                    <div style={{
                      width: '30px', height: '30px', flexShrink: 0,
                      borderRadius: '50%',
                      background: status === 'completed'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : isCurrentWeek
                        ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                        : tokens.colors.gray[100],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: status === 'completed'
                        ? '0 2px 8px rgba(16,185,129,0.25)'
                        : isCurrentWeek
                        ? '0 2px 8px rgba(124,58,237,0.3)'
                        : 'none',
                    }}>
                      {status === 'completed' ? (
                        <CheckCircle size={15} color="#fff" />
                      ) : isCurrentWeek ? (
                        <MapPin size={15} color="#fff" />
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
                          color: isCurrentWeek ? '#7c3aed' : tokens.colors.text.primary,
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
                        </h4>
                        {status !== 'upcoming' && (
                          <span style={{ fontSize: '11px', color: status === 'completed' ? '#10b981' : tokens.colors.text.tertiary, fontWeight: tokens.typography.weights.medium, flexShrink: 0 }}>
                            {progress}%
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: tokens.colors.text.secondary, margin: '0 0 6px', fontWeight: tokens.typography.weights.medium }}>
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
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                            borderRadius: '99px',
                            boxShadow: progress > 0
                              ? status === 'completed'
                                ? '0 0 6px rgba(16,185,129,0.4)'
                                : '0 0 6px rgba(124,58,237,0.4)'
                              : 'none',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      )}
                    </div>
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
