import { Flame, Calendar, TrendingUp, CheckCircle2, Circle, Clock, Play, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';

export default function TodayView() {
  const {
    universalProfile,
    roadmap,
    tasks,
    currentDay,
    streak,
    completionRate,
    completeTask,
    canAdvanceDay,
    advanceDay,
  } = useStore();

  const todaysTasks = tasks.filter(t => t.day === currentDay);
  const completedTasks = todaysTasks.filter(t => t.completed);
  const allDone = todaysTasks.length > 0 && todaysTasks.every(t => t.completed);
  const canAdvance = canAdvanceDay();

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

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'practice':
        return Play;
      case 'learning':
        return Calendar;
      case 'reflection':
        return TrendingUp;
      default:
        return Circle;
    }
  };

  const handleAdvanceDay = () => {
    const success = advanceDay();
    if (success) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
        <h1 style={{
          ...text.h1,
          marginBottom: tokens.spacing.sm,
        }}>
          {getGreeting()}, {universalProfile.name || 'there'} 👋
        </h1>
        <p style={{
          ...text.body,
          color: tokens.colors.text.secondary,
        }}>
          Day {currentDay} • {roadmap?.title}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: tokens.spacing.lg,
        marginBottom: tokens.spacing['2xl']
      }}>
        {/* Streak Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.primary,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.sm
          }}>
            <Flame size={16} color={streak > 0 ? '#ff6b35' : tokens.colors.gray[700]} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse
            }}>Streak</span>
          </div>
          <div style={{
            ...text.h2,
            color: tokens.colors.text.inverse
          }}>
            {streak}
          </div>
          <div style={{
            ...text.caption,
            fontSize: '11px',
            color: tokens.colors.text.inverse
          }}>
            {streak === 1 ? 'day' : 'days'}
          </div>
        </div>

        {/* Progress Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.primary,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.sm
          }}>
            <TrendingUp size={16} color={tokens.colors.gray[300]} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse
            }}>Progress</span>
          </div>
          <div style={{
            ...text.h2,
            color: tokens.colors.text.inverse
          }}>
            {Math.round(completionRate)}%
          </div>
          <div style={{
            ...text.caption,
            fontSize: '11px',
            color: tokens.colors.text.inverse
          }}>
            today
          </div>
        </div>

        {/* Week Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.primary,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.sm
          }}>
            <Calendar size={16} color={tokens.colors.gray[300]} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse
            }}>Week</span>
          </div>
          <div style={{
            ...text.h2,
            color: tokens.colors.text.inverse
          }}>
            {Math.ceil(currentDay / 7)}
          </div>
          <div style={{
            ...text.caption,
            fontSize: '11px',
            color: tokens.colors.text.inverse
          }}>
            of {Math.ceil((roadmap?.duration || 6) * 4)}
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacing.lg
        }}>
          <h2 style={text.h2}>Today's Tasks</h2>
          <span style={{
            ...text.caption,
            color: tokens.colors.text.secondary
          }}>
            {completedTasks.length} of {todaysTasks.length} complete
          </span>
        </div>

        {/* Task List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.md
        }}>
          {todaysTasks.map((task) => {
            const Icon = getTaskIcon(task.type);

            return (
              <div
                key={task.id}
                style={{
                  ...card.standard,
                  opacity: task.completed ? 0.6 : 1,
                  transition: 'opacity 0.3s'
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: tokens.spacing.lg,
                  alignItems: 'flex-start'
                }}>
                  {/* Checkbox */}
                  <button
                    onClick={() => completeTask(task.id)}
                    disabled={task.completed}
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: task.completed ? tokens.colors.primary : tokens.colors.background,
                      border: `2px solid ${task.completed ? tokens.colors.primary : tokens.colors.gray[300]}`,
                      borderRadius: '50%',
                      cursor: task.completed ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {task.completed && <CheckCircle2 size={16} color={tokens.colors.text.inverse} />}
                  </button>

                  {/* Task Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      marginBottom: tokens.spacing.xs
                    }}>
                      <Icon size={14} color={tokens.colors.text.secondary} />
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.text.secondary,
                        textTransform: 'capitalize'
                      }}>
                        {task.type}
                      </span>
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.text.tertiary
                      }}>
                        •
                      </span>
                      <Clock size={14} color={tokens.colors.text.secondary} />
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.text.secondary
                      }}>
                        {formatDuration(task.duration)}
                      </span>
                    </div>

                    <h4 style={{
                      ...text.h4,
                      marginBottom: tokens.spacing.xs,
                      textDecoration: task.completed ? 'line-through' : 'none'
                    }}>
                      {task.title}
                    </h4>

                    <p style={{
                      ...text.bodySmall,
                      color: tokens.colors.text.secondary
                    }}>
                      {task.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All Done / Advance Day */}
        {allDone && canAdvance && (
          <div style={{
            ...card.standard,
            backgroundColor: tokens.colors.primary,
            textAlign: 'center',
            marginTop: tokens.spacing.lg
          }}>
            <div style={{ marginBottom: tokens.spacing.md }}>
              <h3 style={{
                ...text.h3,
                color: tokens.colors.text.inverse,
                marginBottom: tokens.spacing.xs
              }}>
                🎉 All done for today!
              </h3>
              <p style={{
                ...text.body,
                color: tokens.colors.text.inverse
              }}>
                Great work! Ready for tomorrow?
              </p>
            </div>

            <button
              onClick={handleAdvanceDay}
              style={{
                padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                backgroundColor: tokens.colors.background,
                color: tokens.colors.primary,
                border: 'none',
                borderRadius: tokens.borderRadius.lg,
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.regular,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Start Tomorrow
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {todaysTasks.length === 0 && (
          <div style={{
            ...card.standard,
            textAlign: 'center',
            padding: tokens.spacing['3xl']
          }}>
            <p style={{
              ...text.body,
              color: tokens.colors.text.secondary
            }}>
              No tasks for today. Check back tomorrow!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
