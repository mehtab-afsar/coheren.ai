import { Flame, Calendar, TrendingUp, Settings, CheckCircle2, Circle, Clock, Play, ArrowRight, Lock, Map } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { tokens, text, card } from '../design-system';
import RoadmapModal from '../components/RoadmapModal';
import NotificationPrompt from '../components/NotificationPrompt';

export default function Dashboard() {
  const {
    universalProfile,
    roadmap,
    tasks,
    currentDay,
    streak,
    completionRate,
    completeTask,
    setStep,
    canAdvanceDay,
    advanceDay,
    checkInTime
  } = useStore();

  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);

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
    <div style={{
      minHeight: '100vh',
      backgroundColor: tokens.colors.gray[50],
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: tokens.colors.primary,
        borderBottom: `1px solid ${tokens.colors.gray[200]}`,
        padding: `${tokens.spacing.xl} ${tokens.spacing['2xl']}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              ...text.h3,
              color: tokens.colors.text.inverse,
              marginBottom: tokens.spacing.xs
            }}>
              {getGreeting()}, {universalProfile.name || 'there'}
            </h1>
            <p style={{
              ...text.body,
              color: tokens.colors.text.inverse
            }}>
              Day {currentDay} • {roadmap?.title}
            </p>
          </div>
          <button
            onClick={() => setStep(8)}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: tokens.colors.gray[50],
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `background-color ${tokens.transitions.fast}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = tokens.colors.gray[200]}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = tokens.colors.gray[50]}
          >
            <Settings size={20} color={tokens.colors.text.secondary} />
          </button>
        </div>
      </div>

      <div style={{ padding: tokens.spacing['2xl'] }}>
        {/* Stats cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing['2xl']
        }}>
          <div style={{
            ...card.standard,
            backgroundColor: tokens.colors.primary
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
              ...text.h3,
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

          <div style={{
            ...card.standard,
            backgroundColor: tokens.colors.primary
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
              ...text.h3,
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

          <div style={{
            ...card.standard,
            backgroundColor: tokens.colors.primary
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
              ...text.h3,
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

        {/* Notification Prompt */}
        {showNotificationPrompt && (
          <NotificationPrompt
            checkInTime={checkInTime}
            onDismiss={() => setShowNotificationPrompt(false)}
          />
        )}

        {/* Celebration & Next Day Button (when all tasks complete) */}
        {allDone && canAdvance && (
          <div style={{
            backgroundColor: tokens.colors.text.primary,
            color: tokens.colors.primary,
            padding: tokens.spacing.xl,
            borderRadius: tokens.borderRadius.lg,
            textAlign: 'center',
            marginBottom: tokens.spacing['2xl']
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: tokens.spacing.sm
            }}>🎉</div>
            <div style={{
              ...text.h4,
              color: tokens.colors.primary,
              marginBottom: tokens.spacing.xs
            }}>
              All done for today!
            </div>
            <div style={{
              ...text.body,
              color: tokens.colors.text.disabled,
              marginBottom: tokens.spacing.lg
            }}>
              Great work. Ready for tomorrow?
            </div>
            <button
              onClick={handleAdvanceDay}
              style={{
                width: '100%',
                padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                backgroundColor: tokens.colors.primary,
                color: tokens.colors.text.primary,
                border: `1px solid ${tokens.colors.text.primary}`,
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.sizes.md,
                fontWeight: tokens.typography.weights.medium,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing.sm,
                transition: `all ${tokens.transitions.fast}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.text.primary;
                e.currentTarget.style.color = tokens.colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.primary;
                e.currentTarget.style.color = tokens.colors.text.primary;
              }}
            >
              Start Day {currentDay + 1}
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Blocked State (already advanced today) */}
        {allDone && !canAdvance && (
          <div style={{
            backgroundColor: tokens.colors.gray[50],
            border: `1px solid ${tokens.colors.gray[200]}`,
            padding: tokens.spacing.xl,
            borderRadius: tokens.borderRadius.lg,
            textAlign: 'center',
            marginBottom: tokens.spacing['2xl']
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: `0 auto ${tokens.spacing.md}`,
              backgroundColor: tokens.colors.gray[100],
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={24} color={tokens.colors.text.tertiary} />
            </div>
            <div style={{
              ...text.h4,
              marginBottom: tokens.spacing.xs
            }}>
              Day {currentDay} Complete
            </div>
            <div style={{
              ...text.body,
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing.sm
            }}>
              You've already completed today's tasks.
            </div>
            <div style={{
              ...text.bodySmall,
              color: tokens.colors.text.tertiary
            }}>
              Next check-in: Tomorrow at {checkInTime}
            </div>
          </div>
        )}

        {/* Incomplete State (tasks remaining) */}
        {!allDone && todaysTasks.length > 0 && (
          <div style={{
            backgroundColor: tokens.colors.gray[50],
            border: `1px solid ${tokens.colors.gray[200]}`,
            padding: tokens.spacing.lg,
            borderRadius: tokens.borderRadius.lg,
            marginBottom: tokens.spacing['2xl']
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  ...text.body,
                  marginBottom: tokens.spacing.xs
                }}>
                  Keep going!
                </div>
                <div style={{
                  ...text.bodySmall,
                  color: tokens.colors.text.secondary
                }}>
                  {todaysTasks.length - completedTasks.length} {todaysTasks.length - completedTasks.length === 1 ? 'task' : 'tasks'} remaining
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: tokens.colors.primary,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.medium,
                color: tokens.colors.text.primary
              }}>
                {Math.round(completionRate)}%
              </div>
            </div>
          </div>
        )}

        {/* Today's tasks */}
        <div style={{ marginBottom: tokens.spacing['2xl'] }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: tokens.spacing.lg
          }}>
            <h2 style={text.h4}>
              Today's Tasks
            </h2>
            <span style={text.body}>
              {completedTasks.length} of {todaysTasks.length}
            </span>
          </div>

          {todaysTasks.length === 0 && (
            <div style={{
              ...card.standard,
              padding: tokens.spacing['3xl'],
              textAlign: 'center'
            }}>
              <p style={text.body}>
                No tasks for today. Check back tomorrow!
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column' as const,
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
                    transition: `opacity ${tokens.transitions.all}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: tokens.spacing.md
                  }}>
                    <button
                      onClick={() => !task.completed && completeTask(task.id)}
                      disabled={task.completed}
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: task.completed ? tokens.colors.text.primary : tokens.colors.primary,
                        border: `2px solid ${task.completed ? tokens.colors.text.primary : tokens.colors.gray[300]}`,
                        borderRadius: '50%',
                        cursor: task.completed ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: `all ${tokens.transitions.all}`,
                        marginTop: '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (!task.completed) e.currentTarget.style.borderColor = tokens.colors.text.primary;
                      }}
                      onMouseLeave={(e) => {
                        if (!task.completed) e.currentTarget.style.borderColor = tokens.colors.gray[300];
                      }}
                    >
                      {task.completed && <CheckCircle2 size={16} color={tokens.colors.primary} />}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.sm,
                        marginBottom: tokens.spacing.xs
                      }}>
                        <Icon size={14} color={tokens.colors.text.tertiary} />
                        <h3 style={{
                          ...text.body,
                          textDecoration: task.completed ? 'line-through' : 'none'
                        }}>
                          {task.title}
                        </h3>
                      </div>
                      <p style={{
                        ...text.bodySmall,
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing.sm
                      }}>
                        {task.description}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.xs,
                        ...text.caption
                      }}>
                        <Clock size={12} />
                        {formatDuration(task.duration)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current phase info */}
        {roadmap && (
          <button
            onClick={() => setShowRoadmapModal(true)}
            style={{
              ...card.standard,
              width: '100%',
              border: `1px solid ${tokens.colors.gray[200]}`,
              cursor: 'pointer',
              transition: `all ${tokens.transitions.fast}`,
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.text.primary;
              e.currentTarget.style.backgroundColor = tokens.colors.gray[50];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.gray[200];
              e.currentTarget.style.backgroundColor = tokens.colors.primary;
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: tokens.spacing.sm
            }}>
              <h3 style={text.body}>
                Current Phase
              </h3>
              <Map size={16} color={tokens.colors.text.tertiary} />
            </div>
            <p style={{
              ...text.h4,
              marginBottom: tokens.spacing.xs
            }}>
              {roadmap.phases[0]?.title}
            </p>
            <p style={{
              ...text.bodySmall,
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing.sm
            }}>
              {roadmap.phases[0]?.description}
            </p>
            <div style={{
              ...text.caption,
              color: tokens.colors.text.tertiary
            }}>
              Click to view full roadmap →
            </div>
          </button>
        )}
      </div>

      {/* Roadmap Modal */}
      <RoadmapModal
        isOpen={showRoadmapModal}
        onClose={() => setShowRoadmapModal(false)}
        roadmap={roadmap}
        currentDay={currentDay}
      />
    </div>
  );
}
