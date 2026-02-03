import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RefreshCw, Clock, Target, Sparkles, Star } from 'lucide-react';
import { useStore } from '../store/useStore';
import { tokens } from '../design-system';

export default function Today() {
  const tasks = useStore((state) => state.tasks);
  const completeTask = useStore((state) => state.completeTask);
  const skipTask = useStore((state) => state.skipTask);

  const [showRecalibrateOptions, setShowRecalibrateOptions] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Feedback state
  const [difficultyRating, setDifficultyRating] = useState<number>(3);
  const [actualMinutes, setActualMinutes] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>('');

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
    // Initialize feedback with defaults
    setActualMinutes(todayTask.duration); // default to planned time
    setDifficultyRating(3); // default to medium
    setUserComment('');
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    setIsCompleting(true);

    // Update task with feedback before completing
    const taskIndex = tasks.findIndex(t => t.id === todayTask.id);
    if (taskIndex !== -1) {
      tasks[taskIndex].difficultyRating = difficultyRating;
      tasks[taskIndex].actualDuration = actualMinutes;
      tasks[taskIndex].userComment = userComment || undefined;
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    completeTask(todayTask.id);
    setShowFeedbackModal(false);
    setIsCompleting(false);
  };

  const handleSkip = (_reason: string) => {
    // TODO: Pass reason to skipTask when backend supports it
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

        {/* Feedback Modal */}
        <AnimatePresence>
          {showFeedbackModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: tokens.spacing.xl,
                zIndex: 1000
              }}
              onClick={() => !isCompleting && setShowFeedbackModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: 'white',
                  borderRadius: tokens.borderRadius.xl,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                  padding: tokens.spacing['2xl'],
                  maxWidth: '500px',
                  width: '100%'
                }}
              >
                <h3 style={{
                  fontSize: tokens.typography.sizes['2xl'],
                  fontWeight: tokens.typography.weights.semibold,
                  color: tokens.colors.text.primary,
                  marginBottom: tokens.spacing.sm
                }}>
                  How did it go?
                </h3>
                <p style={{
                  fontSize: tokens.typography.sizes.sm,
                  color: tokens.colors.text.secondary,
                  marginBottom: tokens.spacing.xl
                }}>
                  Your feedback helps me personalize your journey
                </p>

                {/* Difficulty Rating */}
                <div style={{ marginBottom: tokens.spacing.xl }}>
                  <label style={{
                    display: 'block',
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing.sm
                  }}>
                    How difficult was this task?
                  </label>
                  <div style={{
                    display: 'flex',
                    gap: tokens.spacing.sm,
                    justifyContent: 'center'
                  }}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <motion.button
                        key={rating}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setDifficultyRating(rating)}
                        style={{
                          width: '48px',
                          height: '48px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <Star
                          size={36}
                          fill={rating <= difficultyRating ? '#F59E0B' : 'none'}
                          stroke={rating <= difficultyRating ? '#F59E0B' : '#D1D5DB'}
                          strokeWidth={2}
                        />
                      </motion.button>
                    ))}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: tokens.spacing.xs,
                    fontSize: tokens.typography.sizes.xs,
                    color: tokens.colors.text.tertiary
                  }}>
                    <span>Easy</span>
                    <span>Very Hard</span>
                  </div>
                </div>

                {/* Time Taken */}
                <div style={{ marginBottom: tokens.spacing.xl }}>
                  <label style={{
                    display: 'block',
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing.sm
                  }}>
                    How long did it actually take?
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                    <input
                      type="number"
                      value={actualMinutes}
                      onChange={(e) => setActualMinutes(parseInt(e.target.value) || 0)}
                      min="0"
                      max="300"
                      style={{
                        flex: 1,
                        padding: tokens.spacing.md,
                        border: `2px solid ${tokens.colors.border}`,
                        borderRadius: tokens.borderRadius.md,
                        fontSize: tokens.typography.sizes.base,
                        color: tokens.colors.text.primary
                      }}
                    />
                    <span style={{
                      fontSize: tokens.typography.sizes.sm,
                      color: tokens.colors.text.secondary
                    }}>
                      minutes
                    </span>
                  </div>
                </div>

                {/* Optional Comment */}
                <div style={{ marginBottom: tokens.spacing.xl }}>
                  <label style={{
                    display: 'block',
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing.sm
                  }}>
                    Anything you struggled with? (Optional)
                  </label>
                  <textarea
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder="e.g., Found the F-chord transition difficult..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: tokens.spacing.md,
                      border: `2px solid ${tokens.colors.border}`,
                      borderRadius: tokens.borderRadius.md,
                      fontSize: tokens.typography.sizes.base,
                      color: tokens.colors.text.primary,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Submit Buttons */}
                <div style={{
                  display: 'flex',
                  gap: tokens.spacing.md
                }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitFeedback}
                    disabled={isCompleting}
                    style={{
                      flex: 1,
                      padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
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
                      opacity: isCompleting ? 0.7 : 1
                    }}
                  >
                    {isCompleting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <RefreshCw size={18} />
                        </motion.div>
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Complete Task
                      </>
                    )}
                  </motion.button>

                  {!isCompleting && (
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      style={{
                        padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                        backgroundColor: 'white',
                        color: tokens.colors.text.secondary,
                        border: `2px solid ${tokens.colors.border}`,
                        borderRadius: tokens.borderRadius.lg,
                        fontSize: tokens.typography.sizes.base,
                        fontWeight: tokens.typography.weights.medium,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
