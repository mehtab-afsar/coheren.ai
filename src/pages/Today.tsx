import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RefreshCw, Clock, Target, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { tokens } from '../design-system';
import ResourceCard from '../components/ResourceCard';
import TaskFeedbackModal, { type TaskFeedback } from '../components/TaskFeedbackModal';
import { saveTaskFeedback } from '../lib/database';

export default function Today() {
  const tasks = useStore((state) => state.tasks);
  const completeTask = useStore((state) => state.completeTask);
  const skipTask = useStore((state) => state.skipTask);
  const user = useStore((state) => state.user);
  const currentGoal = useStore((state) => state.currentGoal);

  const [showRecalibrateOptions, setShowRecalibrateOptions] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Get today's task (first incomplete task)
  const todayTask = tasks.find(t => !t.completed && !t.skipped);

  if (!todayTask) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing.xl,
        backgroundColor: tokens.colors.background
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            maxWidth: '500px'
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1 0%, #10B981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 24px rgba(67, 56, 202, 0.3)'
          }}>
            <CheckCircle2 size={40} color="white" />
          </div>
          <h2 style={{
            fontSize: tokens.typography.sizes['3xl'],
            fontWeight: tokens.typography.weights.light,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.md
          }}>
            All caught up!
          </h2>
          <p style={{
            fontSize: tokens.typography.sizes.lg,
            color: tokens.colors.text.secondary,
            lineHeight: 1.6
          }}>
            You've completed today's task. Check back tomorrow for your next step.
          </p>
        </motion.div>
      </div>
    );
  }

  const handleComplete = () => {
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async (feedback: TaskFeedback) => {
    setIsCompleting(true);

    // Save to Supabase task_feedback table (if authenticated)
    if (user && currentGoal) {
      try {
        // Note: currentGoal should have an 'id' field from the database
        // If it doesn't exist yet, this will log a warning
        const goalId = (currentGoal as { id?: string }).id;

        if (goalId) {
          await saveTaskFeedback(
            user.id,
            todayTask.id,
            goalId,
            {
              difficultyScore: feedback.difficultyRating,
              actualDurationMins: feedback.actualDuration,
              feedbackTags: feedback.feedbackTags,
              userComment: feedback.userComment,
              completionStatus: 'completed'
            }
          );
          console.log('✅ Task feedback saved to task_feedback table');
        } else {
          console.warn('⚠️ No goal_id available - feedback saved to daily_tasks only');
        }
      } catch (error) {
        console.error('❌ Failed to save task feedback:', error);
        // Don't block task completion if feedback save fails
      }
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    completeTask(todayTask.id);
    setShowFeedbackModal(false);
    setIsCompleting(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSkip = (_reason: string) => {
    // TODO: Use reason parameter when backend supports it
    skipTask(todayTask.id);
    setShowRecalibrateOptions(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: tokens.colors.background,
      padding: tokens.spacing.xl
    }}>
      <div style={{
        maxWidth: '900px',
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
            gap: tokens.spacing.md,
            marginBottom: tokens.spacing.sm
          }}>
            <Target size={24} color={tokens.colors.primary} />
            <h1 style={{
              fontSize: tokens.typography.sizes['3xl'],
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.primary,
              margin: 0
            }}>
              Today's Mission
            </h1>
          </div>
          <p style={{
            fontSize: tokens.typography.sizes.base,
            color: tokens.colors.text.secondary,
            margin: 0
          }}>
            Day {todayTask.day || todayTask.dayNumber} of your journey
          </p>
        </motion.div>

        {/* Main Task Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={todayTask.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: 'white',
              borderRadius: tokens.borderRadius.xl,
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
              padding: tokens.spacing['2xl'],
              marginBottom: tokens.spacing.xl
            }}
          >
            {/* Task Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: tokens.spacing.xl
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'inline-block',
                  padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
                  backgroundColor: 'rgba(67, 56, 202, 0.1)',
                  color: tokens.colors.primary,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.semibold,
                  marginBottom: tokens.spacing.md,
                  textTransform: 'uppercase'
                }}>
                  {todayTask.type}
                </div>
                <h2 style={{
                  fontSize: tokens.typography.sizes['2xl'],
                  fontWeight: tokens.typography.weights.semibold,
                  color: tokens.colors.text.primary,
                  marginBottom: tokens.spacing.sm,
                  lineHeight: 1.3
                }}>
                  {todayTask.title}
                </h2>
                <p style={{
                  fontSize: tokens.typography.sizes.base,
                  color: tokens.colors.text.secondary,
                  lineHeight: 1.6
                }}>
                  {todayTask.description}
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.xs,
                padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                backgroundColor: '#F1F5F9',
                borderRadius: tokens.borderRadius.lg,
                marginLeft: tokens.spacing.lg
              }}>
                <Clock size={16} color={tokens.colors.text.secondary} />
                <span style={{
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium,
                  color: tokens.colors.text.secondary
                }}>
                  {todayTask.duration} min
                </span>
              </div>
            </div>

            {/* AI Reasoning */}
            {todayTask.successCriteria && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  padding: tokens.spacing.lg,
                  backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  borderLeft: `3px solid ${tokens.colors.primary}`,
                  borderRadius: tokens.borderRadius.md,
                  marginBottom: tokens.spacing.xl
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  marginBottom: tokens.spacing.sm
                }}>
                  <Sparkles size={16} color={tokens.colors.primary} />
                  <span style={{
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.semibold,
                    color: tokens.colors.primary
                  }}>
                    Why this task today
                  </span>
                </div>
                <p style={{
                  fontSize: tokens.typography.sizes.sm,
                  color: tokens.colors.text.secondary,
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {todayTask.successCriteria}
                </p>
              </motion.div>
            )}

            {/* Task Steps */}
            {todayTask.steps && todayTask.steps.length > 0 && (
              <div style={{ marginBottom: tokens.spacing.xl }}>
                <h3 style={{
                  fontSize: tokens.typography.sizes.lg,
                  fontWeight: tokens.typography.weights.semibold,
                  color: tokens.colors.text.primary,
                  marginBottom: tokens.spacing.md
                }}>
                  Steps to complete
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing.md
                }}>
                  {todayTask.steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      style={{
                        display: 'flex',
                        gap: tokens.spacing.md,
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{
                        minWidth: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(67, 56, 202, 0.1)',
                        color: tokens.colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: tokens.typography.sizes.sm,
                        fontWeight: tokens.typography.weights.semibold
                      }}>
                        {index + 1}
                      </div>
                      <p style={{
                        fontSize: tokens.typography.sizes.base,
                        color: tokens.colors.text.primary,
                        lineHeight: 1.6,
                        margin: 0,
                        flex: 1
                      }}>
                        {step}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {todayTask.tips && todayTask.tips.length > 0 && (
              <div style={{
                padding: tokens.spacing.lg,
                backgroundColor: '#FFF8F0',
                borderRadius: tokens.borderRadius.md,
                marginBottom: tokens.spacing.xl
              }}>
                <h4 style={{
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.semibold,
                  color: '#D97706',
                  marginBottom: tokens.spacing.sm
                }}>
                  💡 Pro Tips
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: tokens.spacing.lg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing.xs
                }}>
                  {todayTask.tips.map((tip, index) => (
                    <li
                      key={index}
                      style={{
                        fontSize: tokens.typography.sizes.sm,
                        color: '#92400E',
                        lineHeight: 1.6
                      }}
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Learning Resources */}
            {todayTask.resources && (
              <ResourceCard
                primary={todayTask.resources.primary}
                supplementary={todayTask.resources.supplementary || []}
                onRateHelpful={(resource) => {
                  console.log('👍 Resource rated helpful:', resource.title);
                  // TODO: Track helpful resources in Supabase
                }}
                onRateNotHelpful={(resource) => {
                  console.log('👎 Resource rated not helpful:', resource.title);
                  // TODO: Track unhelpful resources for improvement
                }}
              />
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: tokens.spacing.md,
              flexWrap: 'wrap'
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                disabled={isCompleting}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
                  backgroundColor: tokens.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: tokens.borderRadius.lg,
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.semibold,
                  cursor: isCompleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing.sm,
                  opacity: isCompleting ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {isCompleting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RefreshCw size={20} />
                    </motion.div>
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Mark as Complete
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowRecalibrateOptions(!showRecalibrateOptions)}
                style={{
                  padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
                  backgroundColor: 'white',
                  color: tokens.colors.text.secondary,
                  border: `2px solid ${tokens.colors.border}`,
                  borderRadius: tokens.borderRadius.lg,
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.primary;
                  e.currentTarget.style.color = tokens.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.border;
                  e.currentTarget.style.color = tokens.colors.text.secondary;
                }}
              >
                <RefreshCw size={20} />
                I can't do this today
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Recalibrate Options */}
        <AnimatePresence>
          {showRecalibrateOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                backgroundColor: 'white',
                borderRadius: tokens.borderRadius.xl,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                padding: tokens.spacing.xl,
                marginBottom: tokens.spacing.xl,
                overflow: 'hidden'
              }}
            >
              <h3 style={{
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md
              }}>
                What's the challenge?
              </h3>
              <p style={{
                fontSize: tokens.typography.sizes.sm,
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing.lg
              }}>
                Let me know why you can't complete this today, and I'll adjust accordingly.
              </p>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing.sm
              }}>
                {[
                  { label: 'Not enough time today', reason: 'time' },
                  { label: 'Feeling unwell', reason: 'health' },
                  { label: 'Task is too difficult', reason: 'difficulty' },
                  { label: 'External circumstances', reason: 'external' }
                ].map((option) => (
                  <button
                    key={option.reason}
                    onClick={() => handleSkip(option.reason)}
                    style={{
                      padding: tokens.spacing.md,
                      backgroundColor: 'white',
                      border: `2px solid ${tokens.colors.border}`,
                      borderRadius: tokens.borderRadius.md,
                      fontSize: tokens.typography.sizes.base,
                      color: tokens.colors.text.primary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tokens.colors.primary;
                      e.currentTarget.style.backgroundColor = 'rgba(67, 56, 202, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = tokens.colors.border;
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task Feedback Modal */}
        <TaskFeedbackModal
          isOpen={showFeedbackModal}
          taskTitle={todayTask.title}
          estimatedMinutes={todayTask.duration}
          onSubmit={handleSubmitFeedback}
          onClose={() => !isCompleting && setShowFeedbackModal(false)}
        />
      </div>
    </div>
  );
}
