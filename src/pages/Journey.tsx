import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Circle, Lock, Target, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { tokens } from '../design-system';

export default function Journey() {
  const roadmap = useStore((state) => state.roadmap);
  const tasks = useStore((state) => state.tasks);

  if (!roadmap) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing.xl,
        backgroundColor: tokens.colors.background
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <Target size={48} color={tokens.colors.text.secondary} style={{ marginBottom: '24px' }} />
          <h2 style={{
            fontSize: tokens.typography.sizes['2xl'],
            fontWeight: tokens.typography.weights.light,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.md
          }}>
            No journey yet
          </h2>
          <p style={{
            fontSize: tokens.typography.sizes.base,
            color: tokens.colors.text.secondary
          }}>
            Complete onboarding to generate your personalized roadmap.
          </p>
        </div>
      </div>
    );
  }

  // Calculate progress
  const totalDays = 90; // Default, can be dynamic based on roadmap
  const completedDays = tasks.filter(t => t.completed).length;
  const currentDay = Math.max(1, completedDays + 1);
  const progressPercent = (completedDays / totalDays) * 100;

  // Milestone days
  const milestones = [
    { day: 30, label: '30-Day Foundation', icon: '🎯' },
    { day: 60, label: '60-Day Mastery', icon: '🚀' },
    { day: 90, label: '90-Day Victory', icon: '🏆' }
  ];

  // Generate calendar grid (90 days grouped by weeks)
  const weeks = Array.from({ length: 13 }, (_, weekIndex) => {
    const startDay = weekIndex * 7 + 1;
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayNumber = startDay + dayIndex;
      if (dayNumber > totalDays) return null;

      const task = tasks.find(t => t.day === dayNumber);
      const isCompleted = task?.completed || false;
      const isCurrent = dayNumber === currentDay;
      const isPast = dayNumber < currentDay;
      const isMilestone = milestones.some(m => m.day === dayNumber);

      return {
        dayNumber,
        isCompleted,
        isCurrent,
        isPast,
        isMilestone,
        task
      };
    }).filter(Boolean);

    return { weekNumber: weekIndex + 1, days };
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: tokens.colors.background,
      padding: tokens.spacing.xl
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: tokens.spacing['2xl']
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: tokens.spacing.lg
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                marginBottom: tokens.spacing.sm
              }}>
                <Calendar size={28} color={tokens.colors.primary} />
                <h1 style={{
                  fontSize: tokens.typography.sizes['3xl'],
                  fontWeight: tokens.typography.weights.light,
                  color: tokens.colors.text.primary,
                  margin: 0
                }}>
                  Your Journey
                </h1>
              </div>
              <p style={{
                fontSize: tokens.typography.sizes.lg,
                color: tokens.colors.text.secondary,
                margin: 0
              }}>
                {roadmap.title}
              </p>
            </div>

            {/* Progress Circle */}
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px'
            }}>
              <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="52"
                  stroke={tokens.colors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - progressPercent / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  fontSize: tokens.typography.sizes['2xl'],
                  fontWeight: tokens.typography.weights.semibold,
                  color: tokens.colors.primary
                }}>
                  {Math.round(progressPercent)}%
                </div>
                <div style={{
                  fontSize: tokens.typography.sizes.xs,
                  color: tokens.colors.text.secondary
                }}>
                  Day {currentDay}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Phases */}
        {roadmap.phases && roadmap.phases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              marginBottom: tokens.spacing['2xl']
            }}
          >
            <h2 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.semibold,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.lg
            }}>
              Phases
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: tokens.spacing.lg
            }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {roadmap.phases.map((phase: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: tokens.borderRadius.lg,
                    padding: tokens.spacing.lg,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                    borderLeft: `4px solid ${
                      index === 0 ? '#6366F1' :
                      index === 1 ? '#10B981' :
                      index === 2 ? '#F59E0B' :
                      '#EF4444'
                    }`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: tokens.spacing.sm
                  }}>
                    <h3 style={{
                      fontSize: tokens.typography.sizes.lg,
                      fontWeight: tokens.typography.weights.semibold,
                      color: tokens.colors.text.primary,
                      margin: 0
                    }}>
                      {phase.title}
                    </h3>
                    <TrendingUp size={20} color={tokens.colors.text.secondary} />
                  </div>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing.sm,
                    lineHeight: 1.6
                  }}>
                    {phase.weeks || `Week ${index * 3 + 1}-${index * 3 + 3}`}
                  </p>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.colors.text.primary,
                    margin: 0,
                    lineHeight: 1.6
                  }}>
                    {phase.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 90-Day Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            backgroundColor: 'white',
            borderRadius: tokens.borderRadius.xl,
            padding: tokens.spacing.xl,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: tokens.spacing.xl
          }}>
            <h2 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.semibold,
              color: tokens.colors.text.primary,
              margin: 0
            }}>
              90-Day Progress
            </h2>
            <div style={{
              display: 'flex',
              gap: tokens.spacing.lg,
              fontSize: tokens.typography.sizes.sm,
              color: tokens.colors.text.secondary
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span>Completed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                <Circle size={16} color={tokens.colors.primary} />
                <span>Current</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                <Lock size={16} color="#CBD5E1" />
                <span>Upcoming</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.md
          }}>
            {weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto repeat(7, 1fr)',
                  gap: tokens.spacing.sm,
                  alignItems: 'center'
                }}
              >
                {/* Week label */}
                <div style={{
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium,
                  color: tokens.colors.text.secondary,
                  width: '60px'
                }}>
                  Week {week.weekNumber}
                </div>

                {/* Days */}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {week.days.map((day: any, dayIndex) => {
                  const milestone = milestones.find(m => m.day === day.dayNumber);

                  return (
                    <motion.div
                      key={dayIndex}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + weekIndex * 0.02 + dayIndex * 0.01 }}
                      whileHover={{ scale: 1.1 }}
                      style={{
                        aspectRatio: '1',
                        borderRadius: tokens.borderRadius.md,
                        backgroundColor: day.isCompleted ? '#10B981' :
                                       day.isCurrent ? tokens.colors.primary :
                                       day.isPast ? '#FEE2E2' :
                                       '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: tokens.typography.sizes.xs,
                        fontWeight: tokens.typography.weights.medium,
                        color: day.isCompleted || day.isCurrent ? 'white' :
                               day.isPast ? '#DC2626' :
                               tokens.colors.text.secondary,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                      }}
                      title={milestone ? milestone.label : `Day ${day.dayNumber}`}
                    >
                      {milestone ? (
                        <span style={{ fontSize: '16px' }}>{milestone.icon}</span>
                      ) : day?.isCompleted ? (
                        <CheckCircle2 size={14} />
                      ) : day?.isCurrent ? (
                        <Circle size={14} fill="white" />
                      ) : (
                        day?.dayNumber
                      )}

                      {/* Milestone indicator */}
                      {milestone && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-24px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '9px',
                          fontWeight: tokens.typography.weights.semibold,
                          color: tokens.colors.primary,
                          whiteSpace: 'nowrap',
                          textAlign: 'center'
                        }}>
                          {milestone.label.split('-')[0]}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Milestones Legend */}
          <div style={{
            marginTop: tokens.spacing['2xl'],
            paddingTop: tokens.spacing.xl,
            borderTop: `1px solid ${tokens.colors.border}`,
            display: 'flex',
            gap: tokens.spacing.xl,
            justifyContent: 'center'
          }}>
            {milestones.map((milestone, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm
                }}
              >
                <span style={{ fontSize: '20px' }}>{milestone.icon}</span>
                <div>
                  <div style={{
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.semibold,
                    color: tokens.colors.text.primary
                  }}>
                    {milestone.label}
                  </div>
                  <div style={{
                    fontSize: tokens.typography.sizes.xs,
                    color: tokens.colors.text.secondary
                  }}>
                    Day {milestone.day}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
