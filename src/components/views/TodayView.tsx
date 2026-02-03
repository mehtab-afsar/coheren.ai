import { Flame, Calendar, TrendingUp, CheckCircle2, Circle, Clock, Play, ArrowRight, Sparkles, SkipForward } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';
import { useState, useRef } from 'react';

export default function TodayView() {
  const {
    universalProfile,
    roadmap,
    tasks,
    currentDay,
    streak,
    completionRate,
    completeTask,
    skipTask,
    canAdvanceDay,
    advanceDay,
  } = useStore();

  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [showSkipMessage, setShowSkipMessage] = useState(false);
  const progressCardRef = useRef<HTMLDivElement>(null);

  const todaysTasks = tasks.filter(t => t.day === currentDay && !t.skipped);
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

  const handleCompleteTask = (taskId: string, event: React.MouseEvent) => {
    const taskElement = (event.currentTarget as HTMLElement).closest('[data-task-card]');
    if (!taskElement || !progressCardRef.current) {
      completeTask(taskId);
      return;
    }

    const taskRect = taskElement.getBoundingClientRect();

    // Create particles for animation
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: `${taskId}-${i}-${Date.now()}`,
      x: taskRect.left + taskRect.width / 2,
      y: taskRect.top + taskRect.height / 2,
    }));

    setParticles(prev => [...prev, ...newParticles]);
    setCompletingTaskId(taskId);

    // Trigger vanish animation then complete
    setTimeout(() => {
      completeTask(taskId);
      setCompletingTaskId(null);
    }, 400);

    // Remove particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !p.id.startsWith(taskId)));
    }, 1900);
  };

  const handleSkipTask = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    setSkippingTaskId(taskId);

    // Todoist-style subtle animation (300ms with ease-out)
    setTimeout(() => {
      skipTask(taskId, 'external');
      setSkippingTaskId(null);
      setShowSkipMessage(true);

      // Hide message after 3 seconds
      setTimeout(() => {
        setShowSkipMessage(false);
      }, 3000);
    }, 300);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Animated Particles */}
      {particles.map((particle, index) => {
        const progressRect = progressCardRef.current?.getBoundingClientRect();
        const targetX = progressRect ? progressRect.left + progressRect.width / 2 : particle.x;
        const targetY = progressRect ? progressRect.top + progressRect.height / 2 : particle.y;

        return (
          <div
            key={particle.id}
            style={{
              position: 'fixed',
              left: particle.x,
              top: particle.y,
              width: '8px',
              height: '8px',
              pointerEvents: 'none',
              zIndex: 10000,
              opacity: 0,
              animation: `floatToProgress 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s forwards`,
              '--target-x': `${targetX - particle.x}px`,
              '--target-y': `${targetY - particle.y}px`,
            } as React.CSSProperties}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill={tokens.colors.primary}
                style={{
                  filter: `drop-shadow(0 0 6px ${tokens.colors.primary})`,
                }}
              />
            </svg>
          </div>
        );
      })}

      <style>{`
        /* Todoist-inspired animations with Material Design timing */
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-16px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes floatToProgress {
          0% {
            transform: translate(-4px, -4px) scale(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            transform: translate(-4px, -4px) scale(1.2) rotate(45deg);
            opacity: 1;
          }
          80% {
            transform: translate(var(--target-x), var(--target-y)) scale(1) rotate(360deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--target-x), var(--target-y)) scale(0) rotate(450deg);
            opacity: 0;
          }
        }

        @keyframes magicVanish {
          0% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
            filter: blur(0px);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.95) rotate(2deg);
            filter: blur(2px);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) rotate(-2deg);
            filter: blur(8px);
          }
        }

        @keyframes progressPulse {
          0% {
            box-shadow: ${tokens.shadows.sm};
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 30px ${tokens.colors.primary}60, ${tokens.shadows.md};
            transform: scale(1.03);
          }
          100% {
            box-shadow: ${tokens.shadows.sm};
            transform: scale(1);
          }
        }

        @keyframes celebration {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          50% {
            transform: translateY(-5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Header - Centered */}
      <div style={{
        marginBottom: tokens.spacing['3xl'],
        textAlign: 'center',
      }}>
        <h1 style={{
          ...text.h1,
          marginBottom: tokens.spacing.md,
        }}>
          {getGreeting()}, {universalProfile.name || 'there'} 👋
        </h1>
        <p style={{
          fontSize: tokens.typography.sizes.sm,
          fontWeight: tokens.typography.weights.light,
          color: tokens.colors.text.tertiary,
          marginBottom: tokens.spacing.xs,
        }}>
          Your Journey
        </p>
        <p style={{
          fontSize: tokens.typography.sizes.md,
          fontWeight: tokens.typography.weights.regular,
          color: tokens.colors.text.secondary,
        }}>
          {roadmap?.title} • {roadmap?.duration} months • {Math.ceil((roadmap?.duration || 3) * 4)} weeks
        </p>
      </div>

      {/* Skip Confirmation Message - Todoist-inspired toast */}
      {showSkipMessage && (
        <div style={{
          position: 'fixed',
          top: tokens.spacing.xl,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.gray[200]}`,
          borderRadius: tokens.borderRadius.md,
          boxShadow: tokens.shadows.lg,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          animation: 'slideDown 300ms cubic-bezier(.4,0,.2,1)',
        }}>
          <CheckCircle2 size={18} color={tokens.colors.success} strokeWidth={2} />
          <span style={{
            ...text.body,
            color: tokens.colors.text.primary,
            fontWeight: tokens.typography.weights.medium,
          }}>
            Task skipped. Tomorrow's task will be adjusted accordingly.
          </span>
        </div>
      )}

      {/* Stats Grid - Single row layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: tokens.spacing.lg,
        marginBottom: tokens.spacing['3xl']
      }}>
        {/* Streak Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.primary,
          boxShadow: tokens.shadows.sm,
          padding: tokens.spacing.lg,
          transition: tokens.transitions.all,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Flame size={18} strokeWidth={1.5} color={streak > 0 ? '#ff6b35' : tokens.colors.gray[300]} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              fontWeight: tokens.typography.weights.regular
            }}>Streak</span>
          </div>
          <div style={{
            ...text.h2,
            color: tokens.colors.text.inverse,
            fontSize: tokens.typography.sizes['3xl'],
            marginBottom: tokens.spacing.xs
          }}>
            {streak}
          </div>
          <div style={{
            ...text.caption,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.inverse,
            opacity: 0.8
          }}>
            {streak === 1 ? 'day' : 'days'}
          </div>
        </div>

        {/* Progress Card with ref */}
        <div
          ref={progressCardRef}
          style={{
            ...card.standard,
            backgroundColor: tokens.colors.primary,
            boxShadow: tokens.shadows.sm,
            padding: tokens.spacing.lg,
            transition: 'all 0.4s ease',
            animation: particles.length > 0 ? 'progressPulse 1s ease-in-out' : 'none',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <TrendingUp size={18} strokeWidth={1.5} color={tokens.colors.gray[300]} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              fontWeight: tokens.typography.weights.regular
            }}>Progress</span>
          </div>
          <div style={{
            ...text.h2,
            color: tokens.colors.text.inverse,
            fontSize: tokens.typography.sizes['3xl'],
            marginBottom: tokens.spacing.xs
          }}>
            {Math.round(completionRate)}%
          </div>
          <div style={{
            ...text.caption,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.inverse,
            opacity: 0.8
          }}>
            today
          </div>
        </div>

        {/* Week Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.primary,
          boxShadow: tokens.shadows.sm,
          padding: tokens.spacing.lg,
          transition: tokens.transitions.all,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Calendar size={18} strokeWidth={1.5} color={tokens.colors.gray[300]} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.inverse,
              fontWeight: tokens.typography.weights.regular
            }}>Week</span>
          </div>
          <div style={{
            ...text.h2,
            color: tokens.colors.text.inverse,
            fontSize: tokens.typography.sizes['3xl'],
            marginBottom: tokens.spacing.xs
          }}>
            {Math.ceil(currentDay / 7)}
          </div>
          <div style={{
            ...text.caption,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.inverse,
            opacity: 0.8
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

        {/* Task List - Premium cards with generous spacing */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.xl
        }}>
          {todaysTasks.map((task) => {
            const Icon = getTaskIcon(task.type);
            const isVanishing = completingTaskId === task.id;

            return (
              <div
                key={task.id}
                data-task-card
                style={{
                  ...card.standard,
                  backgroundColor: tokens.colors.surface,
                  padding: tokens.spacing['2xl'],
                  boxShadow: tokens.shadows.sm,
                  border: `1px solid ${tokens.colors.borderLight}`,
                  borderRadius: tokens.borderRadius.lg,
                  opacity: task.completed ? 0 : 1,
                  transition: isVanishing ? 'none' : tokens.transitions.all,
                  cursor: task.completed ? 'default' : 'pointer',
                  animation: isVanishing ? 'magicVanish 0.4s ease-out forwards' : 'none',
                  pointerEvents: isVanishing ? 'none' : 'auto',
                  display: task.completed && !isVanishing ? 'none' : 'block',
                }}
                onMouseEnter={(e) => {
                  if (!task.completed && !isVanishing) {
                    e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
                    e.currentTarget.style.boxShadow = tokens.shadows.md;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isVanishing) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = tokens.shadows.sm;
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: tokens.spacing.xl,
                  alignItems: 'flex-start'
                }}>
                  {/* Elegant Checkbox */}
                  <button
                    onClick={(e) => handleCompleteTask(task.id, e)}
                    disabled={task.completed}
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: task.completed ? tokens.colors.primary : 'transparent',
                      border: `1.5px solid ${task.completed ? tokens.colors.primary : tokens.colors.gray[300]}`,
                      borderRadius: '50%',
                      cursor: task.completed ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: tokens.transitions.all,
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                    onMouseEnter={(e) => {
                      if (!task.completed) {
                        e.currentTarget.style.borderColor = tokens.colors.primary;
                        e.currentTarget.style.borderWidth = '2px';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!task.completed) {
                        e.currentTarget.style.borderColor = tokens.colors.gray[300];
                        e.currentTarget.style.borderWidth = '1.5px';
                      }
                    }}
                  >
                    {task.completed && <CheckCircle2 size={18} strokeWidth={2} color={tokens.colors.text.inverse} />}
                  </button>

                  {/* Task Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      marginBottom: tokens.spacing.md
                    }}>
                      <Icon size={16} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.text.secondary,
                        textTransform: 'capitalize',
                        fontWeight: tokens.typography.weights.regular
                      }}>
                        {task.type}
                      </span>
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.text.tertiary
                      }}>
                        •
                      </span>
                      <Clock size={16} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.text.secondary,
                        fontWeight: tokens.typography.weights.regular
                      }}>
                        {formatDuration(task.duration)}
                      </span>
                    </div>

                    <h4 style={{
                      fontSize: tokens.typography.sizes.base,
                      fontWeight: tokens.typography.weights.regular,
                      lineHeight: tokens.typography.lineHeights.snug,
                      color: tokens.colors.text.primary,
                      marginBottom: tokens.spacing.sm,
                      textDecoration: task.completed ? 'line-through' : 'none'
                    }}>
                      {task.title}
                    </h4>

                    <p style={{
                      fontSize: tokens.typography.sizes.md,
                      fontWeight: tokens.typography.weights.light,
                      lineHeight: tokens.typography.lineHeights.normal,
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing.md
                    }}>
                      {task.description}
                    </p>

                    {/* Skip Button - Todoist-inspired subtle action */}
                    {!task.completed && (
                      <button
                        onClick={(e) => handleSkipTask(task.id, e)}
                        disabled={skippingTaskId === task.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: tokens.spacing.xs,
                          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                          backgroundColor: 'transparent',
                          border: `1px solid ${tokens.colors.gray[200]}`,
                          borderRadius: tokens.borderRadius.sm,
                          cursor: skippingTaskId === task.id ? 'default' : 'pointer',
                          fontSize: tokens.typography.sizes.sm,
                          fontWeight: tokens.typography.weights.regular,
                          color: tokens.colors.text.secondary,
                          transition: 'all 200ms cubic-bezier(.4,0,.2,1)', // Todoist-style easing
                          opacity: skippingTaskId === task.id ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (skippingTaskId !== task.id) {
                            e.currentTarget.style.backgroundColor = tokens.colors.gray[50];
                            e.currentTarget.style.borderColor = tokens.colors.gray[300];
                            e.currentTarget.style.color = tokens.colors.text.primary;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = tokens.colors.gray[200];
                          e.currentTarget.style.color = tokens.colors.text.secondary;
                        }}
                      >
                        <SkipForward size={14} strokeWidth={1.5} />
                        <span>Not Today</span>
                      </button>
                    )}

                    {/* Adjusted Task Badge */}
                    {task.adjustedDifficulty === 'easier' && task.rescheduledFrom && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: tokens.spacing.xs,
                        marginTop: tokens.spacing.sm,
                        padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                        backgroundColor: tokens.colors.primary + '10',
                        borderRadius: tokens.borderRadius.sm,
                        fontSize: tokens.typography.sizes.xs,
                        color: tokens.colors.primary,
                        fontWeight: tokens.typography.weights.medium,
                      }}>
                        ✨ Adjusted for today - made easier based on yesterday
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All Done - Elegant celebration */}
        {allDone && canAdvance && (
          <div style={{
            marginTop: tokens.spacing['3xl'],
            textAlign: 'center',
            padding: `${tokens.spacing['3xl']} 0`,
            animation: 'celebration 0.6s ease-out',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: tokens.spacing.md,
              marginBottom: tokens.spacing.xl,
            }}>
              <Sparkles size={32} strokeWidth={1.5} color={tokens.colors.primary} />
              <h3 style={{
                fontSize: tokens.typography.sizes['2xl'],
                fontWeight: tokens.typography.weights.light,
                color: tokens.colors.text.primary,
                margin: 0,
              }}>
                All tasks completed!
              </h3>
              <Sparkles size={32} strokeWidth={1.5} color={tokens.colors.primary} />
            </div>

            <p style={{
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing.xl,
            }}>
              Great work today. Ready to continue your journey?
            </p>

            <button
              onClick={handleAdvanceDay}
              style={{
                padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
                backgroundColor: tokens.colors.primary,
                color: tokens.colors.text.inverse,
                border: 'none',
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.sizes.base,
                fontWeight: tokens.typography.weights.regular,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                transition: tokens.transitions.all,
                boxShadow: tokens.shadows.sm,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
                e.currentTarget.style.boxShadow = tokens.shadows.md;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = tokens.shadows.sm;
              }}
            >
              Start Tomorrow
              <ArrowRight size={20} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {todaysTasks.length === 0 && (
          <div style={{
            ...card.standard,
            backgroundColor: tokens.colors.surface,
            textAlign: 'center',
            padding: tokens.spacing['4xl'],
            boxShadow: tokens.shadows.sm,
            border: `1px solid ${tokens.colors.borderLight}`,
            borderRadius: tokens.borderRadius.lg,
          }}>
            <p style={{
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.secondary,
              lineHeight: tokens.typography.lineHeights.relaxed
            }}>
              No tasks for today. Check back tomorrow!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
