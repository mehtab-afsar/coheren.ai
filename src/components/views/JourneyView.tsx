import { MapPin, Calendar, Target, CheckCircle, Circle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';

export default function JourneyView() {
  const { roadmap, currentDay, tasks } = useStore();

  if (!roadmap) {
    return (
      <div style={{
        ...card.standard,
        textAlign: 'center',
        padding: tokens.spacing['3xl']
      }}>
        <p style={{ ...text.body, color: tokens.colors.text.secondary }}>
          No journey data available
        </p>
      </div>
    );
  }

  const currentWeek = Math.ceil(currentDay / 7);
  const totalWeeks = roadmap.strategicPlan?.totalWeeks || Math.ceil((roadmap.duration || 3) * 4);
  const totalMonths = roadmap.duration || 3;

  // Group weeks by month
  const monthsData = Array.from({ length: totalMonths }, (_, monthIndex) => {
    const monthNumber = monthIndex + 1;
    const weeksInMonth = 4;
    const startWeek = monthIndex * 4 + 1;
    const endWeek = Math.min(startWeek + 3, totalWeeks);

    const weeks = Array.from(
      { length: endWeek - startWeek + 1 },
      (_, i) => startWeek + i
    );

    return {
      monthNumber,
      title: `Month ${monthNumber}`,
      weeks,
      isActive: currentWeek >= startWeek && currentWeek <= endWeek
    };
  });

  // Get week details from AI plan
  const getWeekDetails = (weekNumber: number) => {
    const weekTemplate = roadmap.strategicPlan?.weekTemplates?.find(
      (w: any) => w.weekNumber === weekNumber
    );

    if (weekTemplate) {
      return {
        focus: weekTemplate.focus,
        description: weekTemplate.description
      };
    }

    // Fallback phase names
    const phase = Math.ceil((weekNumber / totalWeeks) * 4);
    const phaseNames = ['Foundation', 'Development', 'Mastery', 'Excellence'];
    return {
      focus: phaseNames[phase - 1] || 'Progress',
      description: 'Continue building your skills'
    };
  };

  const getWeekProgress = (weekNumber: number) => {
    const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === weekNumber);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    return weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;
  };

  const getWeekStatus = (weekNumber: number) => {
    // A week is only completed if ALL its tasks are done
    const weekTasks = tasks.filter(t => Math.ceil(t.day / 7) === weekNumber);
    const weekCompleted = weekTasks.filter(t => t.completed).length;

    // If no tasks exist yet for this week, it's upcoming
    if (weekTasks.length === 0) return 'upcoming';

    // If all tasks are completed, mark as completed
    if (weekCompleted === weekTasks.length) return 'completed';

    // If current week or has any progress, mark as active
    if (weekNumber === currentWeek || weekCompleted > 0) return 'active';

    // Otherwise it's upcoming
    return 'upcoming';
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <h1 style={{
          ...text.h1,
          marginBottom: tokens.spacing.sm,
        }}>
          Your Journey
        </h1>
        <p style={{
          ...text.body,
          color: tokens.colors.text.secondary,
        }}>
          {roadmap.title} • {totalMonths} {totalMonths === 1 ? 'month' : 'months'} • {totalWeeks} weeks
        </p>
      </div>

      {/* Overview Card */}
      <div style={{
        ...card.standard,
        marginBottom: tokens.spacing['2xl'],
        backgroundColor: tokens.colors.primary
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.md
        }}>
          <Target size={24} color={tokens.colors.text.inverse} />
          <h3 style={{
            ...text.h3,
            color: tokens.colors.text.inverse,
            margin: 0
          }}>
            Current Progress
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: tokens.spacing.lg,
          marginBottom: tokens.spacing.lg
        }}>
          <div>
            <p style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.xs
            }}>
              Day
            </p>
            <p style={{
              ...text.h2,
              color: tokens.colors.text.inverse
            }}>
              {currentDay}
            </p>
          </div>

          <div>
            <p style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.xs
            }}>
              Week
            </p>
            <p style={{
              ...text.h2,
              color: tokens.colors.text.inverse
            }}>
              {currentWeek}
            </p>
          </div>

          <div>
            <p style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.xs
            }}>
              Remaining
            </p>
            <p style={{
              ...text.h2,
              color: tokens.colors.text.inverse
            }}>
              {totalWeeks - currentWeek}w
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: tokens.borderRadius.sm,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${(currentWeek / totalWeeks) * 100}%`,
            backgroundColor: tokens.colors.text.inverse,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Month-by-Month Breakdown */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.xl
      }}>
        {monthsData.map((month) => {
          const { focus: firstWeekFocus } = getWeekDetails(month.weeks[0]);

          return (
            <div key={month.monthNumber} style={card.standard}>
              {/* Month Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: tokens.spacing.lg,
                paddingBottom: tokens.spacing.md,
                borderBottom: `2px solid ${month.isActive ? tokens.colors.primary : tokens.colors.gray[200]}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md }}>
                  <Calendar
                    size={24}
                    color={month.isActive ? tokens.colors.primary : tokens.colors.text.secondary}
                  />
                  <div>
                    <h3 style={{
                      ...text.h3,
                      margin: 0,
                      color: month.isActive ? tokens.colors.primary : tokens.colors.text.primary
                    }}>
                      {month.title}
                    </h3>
                    <p style={{
                      ...text.caption,
                      color: tokens.colors.text.secondary,
                      marginTop: '4px'
                    }}>
                      Weeks {month.weeks[0]}-{month.weeks[month.weeks.length - 1]}
                    </p>
                  </div>
                </div>

                {month.isActive && (
                  <span style={{
                    ...text.caption,
                    padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
                    backgroundColor: tokens.colors.primary,
                    color: tokens.colors.text.inverse,
                    borderRadius: tokens.borderRadius.md,
                    fontWeight: tokens.typography.weights.medium
                  }}>
                    Current
                  </span>
                )}
              </div>

              {/* Weeks in Month */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing.md
              }}>
                {month.weeks.map((weekNumber) => {
                  const { focus, description } = getWeekDetails(weekNumber);
                  const progress = getWeekProgress(weekNumber);
                  const status = getWeekStatus(weekNumber);

                  return (
                    <div
                      key={weekNumber}
                      style={{
                        display: 'flex',
                        gap: tokens.spacing.md,
                        padding: tokens.spacing.md,
                        backgroundColor: status === 'active'
                          ? tokens.colors.gray[50]
                          : 'transparent',
                        borderRadius: tokens.borderRadius.md,
                        border: status === 'active'
                          ? `2px solid ${tokens.colors.primary}`
                          : '2px solid transparent'
                      }}
                    >
                      {/* Week Status Icon */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: status === 'completed'
                          ? tokens.colors.primary
                          : status === 'active'
                          ? tokens.colors.gray[200]
                          : tokens.colors.gray[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {status === 'completed' ? (
                          <CheckCircle size={18} color={tokens.colors.text.inverse} />
                        ) : status === 'active' ? (
                          <MapPin size={18} color={tokens.colors.primary} />
                        ) : (
                          <Circle size={18} color={tokens.colors.text.tertiary} />
                        )}
                      </div>

                      {/* Week Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: tokens.spacing.xs
                        }}>
                          <h4 style={{
                            ...text.h4,
                            margin: 0,
                            color: status === 'active'
                              ? tokens.colors.primary
                              : tokens.colors.text.primary
                          }}>
                            Week {weekNumber}: {focus}
                          </h4>

                          {status !== 'upcoming' && (
                            <span style={{
                              ...text.caption,
                              color: tokens.colors.text.secondary
                            }}>
                              {progress}%
                            </span>
                          )}
                        </div>

                        <p style={{
                          ...text.bodySmall,
                          color: tokens.colors.text.secondary,
                          margin: 0
                        }}>
                          {description}
                        </p>

                        {/* Week Progress Bar */}
                        {status !== 'upcoming' && (
                          <div style={{
                            marginTop: tokens.spacing.sm,
                            height: '4px',
                            backgroundColor: tokens.colors.gray[200],
                            borderRadius: tokens.borderRadius.sm,
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${progress}%`,
                              backgroundColor: status === 'active'
                                ? tokens.colors.primary
                                : tokens.colors.gray[600],
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
