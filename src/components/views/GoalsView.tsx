import { Target, Calendar, TrendingUp, CheckCircle2, Circle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';

export default function GoalsView() {
  const { roadmap, currentGoal, currentDay } = useStore();

  if (!roadmap) {
    return (
      <div>
        <h1 style={{ ...text.h1, marginBottom: tokens.spacing['2xl'] }}>
          Your Goals
        </h1>
        <div style={{
          ...card.standard,
          textAlign: 'center',
          padding: tokens.spacing['3xl']
        }}>
          <p style={{
            ...text.body,
            color: tokens.colors.text.secondary
          }}>
            No roadmap generated yet. Complete the onboarding to get started!
          </p>
        </div>
      </div>
    );
  }

  const totalDays = Math.ceil(roadmap.duration * 7 * 4); // duration in months → days
  const progressPercent = Math.round((currentDay / totalDays) * 100);

  return (
    <div>
      <h1 style={{ ...text.h1, marginBottom: tokens.spacing['2xl'] }}>
        Your Roadmap
      </h1>

      {/* Goal Overview Card */}
      <div style={{
        ...card.standard,
        backgroundColor: tokens.colors.primary,
        marginBottom: tokens.spacing['2xl']
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: tokens.spacing.lg,
          marginBottom: tokens.spacing.xl
        }}>
          <Target size={32} color={tokens.colors.text.inverse} />
          <div style={{ flex: 1 }}>
            <h2 style={{
              ...text.h2,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.sm
            }}>
              {roadmap.title}
            </h2>
            <p style={{
              ...text.body,
              color: tokens.colors.text.inverse,
              opacity: 0.9
            }}>
              {currentGoal.specificGoal}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: tokens.spacing.md }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: tokens.spacing.xs
          }}>
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse
            }}>
              Overall Progress
            </span>
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              fontWeight: tokens.typography.weights.medium
            }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{
            height: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: tokens.borderRadius.sm,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: tokens.colors.background,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: tokens.spacing.lg,
          marginTop: tokens.spacing.lg
        }}>
          <div>
            <p style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.xs
            }}>
              Duration
            </p>
            <p style={{
              ...text.h4,
              color: tokens.colors.text.inverse
            }}>
              {roadmap.duration} months
            </p>
          </div>
          <div>
            <p style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.xs
            }}>
              Current Day
            </p>
            <p style={{
              ...text.h4,
              color: tokens.colors.text.inverse
            }}>
              {currentDay} / {totalDays}
            </p>
          </div>
          <div>
            <p style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.xs
            }}>
              Daily Time
            </p>
            <p style={{
              ...text.h4,
              color: tokens.colors.text.inverse
            }}>
              {roadmap.dailyTime}
            </p>
          </div>
        </div>
      </div>

      {/* Phases */}
      <h2 style={{
        ...text.h2,
        marginBottom: tokens.spacing.lg
      }}>
        Learning Phases
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.lg
      }}>
        {roadmap.phases.map((phase, index) => {
          const [start, end] = phase.weeks.split('-').map(w => parseInt(w.trim()));
          const currentWeek = Math.ceil(currentDay / 7);
          const isActive = currentWeek >= start && currentWeek <= end;
          const isCompleted = currentWeek > end;

          return (
            <div
              key={index}
              style={{
                ...card.standard,
                borderLeft: isActive
                  ? `4px solid ${tokens.colors.primary}`
                  : isCompleted
                  ? `4px solid ${tokens.colors.semantic.success}`
                  : `4px solid ${tokens.colors.gray[200]}`,
                opacity: isActive ? 1 : isCompleted ? 0.8 : 0.6
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: tokens.spacing.lg
              }}>
                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: isActive
                    ? tokens.colors.primary
                    : isCompleted
                    ? tokens.colors.semantic.success
                    : tokens.colors.gray[200],
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isCompleted ? (
                    <CheckCircle2 size={20} color={tokens.colors.text.inverse} />
                  ) : (
                    <Circle size={20} color={isActive ? tokens.colors.text.inverse : tokens.colors.text.secondary} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: tokens.spacing.sm
                  }}>
                    <h3 style={{
                      ...text.h4,
                      color: isActive ? tokens.colors.primary : tokens.colors.text.primary
                    }}>
                      {phase.title}
                    </h3>
                    <span style={{
                      ...text.caption,
                      color: tokens.colors.text.secondary,
                      backgroundColor: isActive ? tokens.colors.gray[100] : 'transparent',
                      padding: isActive ? `${tokens.spacing.xs} ${tokens.spacing.sm}` : 0,
                      borderRadius: tokens.borderRadius.sm
                    }}>
                      {phase.weeks}
                    </span>
                  </div>

                  <p style={{
                    ...text.bodySmall,
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing.md
                  }}>
                    {phase.description}
                  </p>

                  {isActive && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      padding: tokens.spacing.sm,
                      backgroundColor: tokens.colors.gray[50],
                      borderRadius: tokens.borderRadius.sm
                    }}>
                      <TrendingUp size={16} color={tokens.colors.primary} />
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.primary,
                        fontWeight: tokens.typography.weights.medium
                      }}>
                        Current Phase
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{
        ...card.standard,
        marginTop: tokens.spacing['2xl']
      }}>
        <h3 style={{
          ...text.h3,
          marginBottom: tokens.spacing.lg
        }}>
          Timeline
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.spacing.lg
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.sm,
              marginBottom: tokens.spacing.xs
            }}>
              <Calendar size={16} color={tokens.colors.text.secondary} />
              <span style={{
                ...text.caption,
                color: tokens.colors.text.secondary
              }}>
                Start Date
              </span>
            </div>
            <p style={text.body}>
              {new Date(roadmap.startDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.sm,
              marginBottom: tokens.spacing.xs
            }}>
              <Target size={16} color={tokens.colors.text.secondary} />
              <span style={{
                ...text.caption,
                color: tokens.colors.text.secondary
              }}>
                Target End Date
              </span>
            </div>
            <p style={text.body}>
              {new Date(roadmap.endDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.sm,
              marginBottom: tokens.spacing.xs
            }}>
              <CheckCircle2 size={16} color={tokens.colors.text.secondary} />
              <span style={{
                ...text.caption,
                color: tokens.colors.text.secondary
              }}>
                Recommended Time
              </span>
            </div>
            <p style={text.body}>
              {roadmap.recommendedTime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
