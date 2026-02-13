/**
 * Checkpoint Screen
 *
 * Shown every 14 days to:
 * 1. Collect user feedback on the last sprint
 * 2. Display performance analysis
 * 3. Trigger Agent 5 recalibration
 * 4. Show the new roadmap for next 14 days
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { tokens } from '@core/design-system';

interface CheckpointScreenProps {
  checkpointDay: number;
  sprintNumber: number;
  completedTasks: number;
  totalTasks: number;
  avgDifficulty: number;
  strugglingAreas?: string[];
  masteringAreas?: string[];
  onComplete: (feedback: CheckpointFeedback) => void;
  isRecalibrating?: boolean;
  /** Agent 5 output — surfaced after recalibration completes */
  recalibrationResult?: {
    coachMessage: string;
    nextSprintFocus: string;
    stoneDirective?: string;
  } | null;
}

export interface CheckpointFeedback {
  overallConfidence: number; // 1-10
  energyLevel: 'exhausted' | 'tired' | 'good' | 'energized';
  timeManagement: 'no_time' | 'rushed' | 'comfortable' | 'extra_time';
  qualitativeFeedback: string;
  specificStruggles?: string;
}

export default function CheckpointScreen({
  checkpointDay,
  sprintNumber,
  completedTasks,
  totalTasks,
  avgDifficulty,
  strugglingAreas = [],
  masteringAreas = [],
  onComplete,
  isRecalibrating = false,
  recalibrationResult = null,
}: CheckpointScreenProps) {
  const [confidence, setConfidence] = useState(5);
  const [energy, setEnergy] = useState<CheckpointFeedback['energyLevel']>('good');
  const [timeManagement, setTimeManagement] = useState<CheckpointFeedback['timeManagement']>('comfortable');
  const [feedback, setFeedback] = useState('');
  const [struggles, setStruggles] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(true);

  const completionRate = (completedTasks / totalTasks) * 100;

  const handleSubmit = () => {
    onComplete({
      overallConfidence: confidence,
      energyLevel: energy,
      timeManagement,
      qualitativeFeedback: feedback,
      specificStruggles: struggles
    });
  };

  // Performance indicator
  const performanceLevel = avgDifficulty > 3.5 ? 'challenging' :
                          avgDifficulty < 2.5 ? 'easy' : 'balanced';

  const performanceColor = performanceLevel === 'challenging' ? tokens.colors.warning :
                           performanceLevel === 'easy' ? tokens.colors.success : tokens.colors.primary;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: tokens.colors.background,
      padding: tokens.spacing.xl,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '800px',
          width: '100%'
        }}
      >
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: tokens.spacing['2xl']
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: tokens.borderRadius.full,
            backgroundColor: `${tokens.colors.primary}15`,
            marginBottom: tokens.spacing.lg
          }}>
            <Sparkles size={40} color={tokens.colors.primary} />
          </div>

          <h1 style={{
            fontSize: tokens.typography.sizes['3xl'],
            fontWeight: tokens.typography.weights.regular,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.sm
          }}>
            Day {checkpointDay} Checkpoint
          </h1>

          <p style={{
            fontSize: tokens.typography.sizes.lg,
            color: tokens.colors.text.secondary,
            fontWeight: tokens.typography.weights.light
          }}>
            Sprint {sprintNumber} Complete • Let's analyze your progress
          </p>
        </div>

        {/* Performance Summary */}
        <AnimatePresence>
          {showAnalysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                backgroundColor: tokens.colors.surface,
                borderRadius: tokens.borderRadius['2xl'],
                padding: tokens.spacing.xl,
                marginBottom: tokens.spacing.xl,
                border: `1px solid ${tokens.colors.border}`
              }}
            >
              <h3 style={{
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.medium,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.lg
              }}>
                📊 Your Performance
              </h3>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: tokens.spacing.lg,
                marginBottom: tokens.spacing.lg
              }}>
                {/* Completion Rate */}
                <div>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.colors.text.tertiary,
                    marginBottom: tokens.spacing.xs
                  }}>
                    Completion Rate
                  </p>
                  <p style={{
                    fontSize: tokens.typography.sizes['2xl'],
                    fontWeight: tokens.typography.weights.medium,
                    color: completionRate > 85 ? tokens.colors.success : completionRate > 70 ? tokens.colors.primary : tokens.colors.warning
                  }}>
                    {Math.round(completionRate)}%
                  </p>
                  <div style={{
                    height: '4px',
                    backgroundColor: tokens.colors.gray[200],
                    borderRadius: tokens.borderRadius.full,
                    marginTop: tokens.spacing.xs,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${completionRate}%`,
                      backgroundColor: completionRate > 85 ? tokens.colors.success : completionRate > 70 ? tokens.colors.primary : tokens.colors.warning,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Average Difficulty */}
                <div>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.colors.text.tertiary,
                    marginBottom: tokens.spacing.xs
                  }}>
                    Average Difficulty
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                    <p style={{
                      fontSize: tokens.typography.sizes['2xl'],
                      fontWeight: tokens.typography.weights.medium,
                      color: performanceColor
                    }}>
                      {avgDifficulty.toFixed(1)}/5
                    </p>
                    {performanceLevel === 'challenging' && <TrendingUp size={20} color={tokens.colors.warning} />}
                    {performanceLevel === 'easy' && <TrendingDown size={20} color={tokens.colors.success} />}
                  </div>
                  <p style={{
                    fontSize: tokens.typography.sizes.xs,
                    color: tokens.colors.text.tertiary,
                    marginTop: tokens.spacing.xs
                  }}>
                    {performanceLevel === 'challenging' && 'Tasks were challenging'}
                    {performanceLevel === 'easy' && 'Tasks were too easy'}
                    {performanceLevel === 'balanced' && 'Good balance'}
                  </p>
                </div>

                {/* Tasks Completed */}
                <div>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.colors.text.tertiary,
                    marginBottom: tokens.spacing.xs
                  }}>
                    Tasks Completed
                  </p>
                  <p style={{
                    fontSize: tokens.typography.sizes['2xl'],
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.text.primary
                  }}>
                    {completedTasks}/{totalTasks}
                  </p>
                </div>
              </div>

              {/* Mastery & Struggles */}
              {(masteringAreas.length > 0 || strugglingAreas.length > 0) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: masteringAreas.length > 0 && strugglingAreas.length > 0 ? '1fr 1fr' : '1fr',
                  gap: tokens.spacing.lg
                }}>
                  {/* Mastering */}
                  {masteringAreas.length > 0 && (
                    <div style={{
                      padding: tokens.spacing.md,
                      backgroundColor: `${tokens.colors.success}10`,
                      borderRadius: tokens.borderRadius.xl,
                      border: `1px solid ${tokens.colors.success}30`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
                        <Award size={16} color={tokens.colors.success} />
                        <p style={{
                          fontSize: tokens.typography.sizes.sm,
                          fontWeight: tokens.typography.weights.medium,
                          color: tokens.colors.success
                        }}>
                          You're Mastering
                        </p>
                      </div>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                      }}>
                        {masteringAreas.map((area, i) => (
                          <li key={i} style={{
                            fontSize: tokens.typography.sizes.sm,
                            color: tokens.colors.text.secondary,
                            marginBottom: tokens.spacing.xs
                          }}>
                            ✓ {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Struggling */}
                  {strugglingAreas.length > 0 && (
                    <div style={{
                      padding: tokens.spacing.md,
                      backgroundColor: `${tokens.colors.warning}10`,
                      borderRadius: tokens.borderRadius.xl,
                      border: `1px solid ${tokens.colors.warning}30`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm }}>
                        <AlertCircle size={16} color={tokens.colors.warning} />
                        <p style={{
                          fontSize: tokens.typography.sizes.sm,
                          fontWeight: tokens.typography.weights.medium,
                          color: tokens.colors.warning
                        }}>
                          Needs More Practice
                        </p>
                      </div>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                      }}>
                        {strugglingAreas.map((area, i) => (
                          <li key={i} style={{
                            fontSize: tokens.typography.sizes.sm,
                            color: tokens.colors.text.secondary,
                            marginBottom: tokens.spacing.xs
                          }}>
                            • {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ── Your Next Sprint Focus (Agent 5 output) ─────────────────── */}
              {recalibrationResult && (
                <div style={{
                  marginTop: tokens.spacing.xl,
                  padding: tokens.spacing.lg,
                  backgroundColor: `${tokens.colors.primary}08`,
                  borderLeft: `4px solid ${tokens.colors.primary}`,
                  borderRadius: `0 ${tokens.borderRadius.xl} ${tokens.borderRadius.xl} 0`,
                }}>
                  <p style={{
                    fontSize: tokens.typography.sizes.xs,
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.primary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: tokens.spacing.sm,
                  }}>
                    Your Consistency Plan for Sprint {sprintNumber + 1}
                  </p>

                  {/* Coach's personalised message */}
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.colors.text.primary,
                    lineHeight: 1.6,
                    marginBottom: recalibrationResult.stoneDirective ? tokens.spacing.md : 0,
                    fontStyle: 'italic',
                  }}>
                    &ldquo;{recalibrationResult.coachMessage}&rdquo;
                  </p>

                  {/* Stone-specific directive (the most actionable piece) */}
                  {recalibrationResult.stoneDirective && (
                    <div style={{
                      marginTop: tokens.spacing.sm,
                      padding: tokens.spacing.md,
                      backgroundColor: tokens.colors.surface,
                      borderRadius: tokens.borderRadius.lg,
                      border: `1px solid ${tokens.colors.border}`,
                    }}>
                      <p style={{
                        fontSize: tokens.typography.sizes.xs,
                        fontWeight: tokens.typography.weights.medium,
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing.xs,
                      }}>
                        Coach's directive for your profile:
                      </p>
                      <p style={{
                        fontSize: tokens.typography.sizes.sm,
                        color: tokens.colors.text.primary,
                        lineHeight: 1.6,
                      }}>
                        {recalibrationResult.stoneDirective}
                      </p>
                    </div>
                  )}

                  {/* Next sprint focus theme */}
                  {recalibrationResult.nextSprintFocus && (
                    <p style={{
                      fontSize: tokens.typography.sizes.xs,
                      color: tokens.colors.text.tertiary,
                      marginTop: tokens.spacing.sm,
                    }}>
                      Sprint {sprintNumber + 1} focus: {recalibrationResult.nextSprintFocus}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowAnalysis(false)}
                style={{
                  marginTop: tokens.spacing.lg,
                  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                  backgroundColor: 'transparent',
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.borderRadius.lg,
                  color: tokens.colors.text.secondary,
                  fontSize: tokens.typography.sizes.sm,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm
                }}
              >
                Continue to Feedback <ArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Form */}
        {!showAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.borderRadius['2xl'],
              padding: tokens.spacing.xl,
              border: `1px solid ${tokens.colors.border}`
            }}
          >
            <h3 style={{
              fontSize: tokens.typography.sizes.lg,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.xl
            }}>
              Help us personalize your next sprint
            </h3>

            {/* Confidence Slider */}
            <div style={{ marginBottom: tokens.spacing.xl }}>
              <label style={{
                display: 'block',
                fontSize: tokens.typography.sizes.base,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md,
                fontWeight: tokens.typography.weights.medium
              }}>
                How confident do you feel with the skills you've learned?
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: tokens.borderRadius.full,
                  background: `linear-gradient(to right, ${tokens.colors.warning} 0%, ${tokens.colors.primary} 50%, ${tokens.colors.success} 100%)`,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: tokens.spacing.sm
              }}>
                <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>
                  Still struggling
                </span>
                <span style={{ fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.medium, color: tokens.colors.primary }}>
                  {confidence}/10
                </span>
                <span style={{ fontSize: tokens.typography.sizes.xs, color: tokens.colors.text.tertiary }}>
                  Fully mastered
                </span>
              </div>
            </div>

            {/* Energy Level */}
            <div style={{ marginBottom: tokens.spacing.xl }}>
              <label style={{
                display: 'block',
                fontSize: tokens.typography.sizes.base,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md,
                fontWeight: tokens.typography.weights.medium
              }}>
                How's your energy level?
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: tokens.spacing.sm
              }}>
                {(['exhausted', 'tired', 'good', 'energized'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setEnergy(level)}
                    style={{
                      padding: tokens.spacing.md,
                      borderRadius: tokens.borderRadius.lg,
                      border: energy === level ? `2px solid ${tokens.colors.primary}` : `1px solid ${tokens.colors.border}`,
                      backgroundColor: energy === level ? `${tokens.colors.primary}10` : 'transparent',
                      color: energy === level ? tokens.colors.primary : tokens.colors.text.secondary,
                      fontSize: tokens.typography.sizes.sm,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize'
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Management */}
            <div style={{ marginBottom: tokens.spacing.xl }}>
              <label style={{
                display: 'block',
                fontSize: tokens.typography.sizes.base,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md,
                fontWeight: tokens.typography.weights.medium
              }}>
                How was the time commitment?
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: tokens.spacing.sm
              }}>
                {(['no_time', 'rushed', 'comfortable', 'extra_time'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setTimeManagement(level)}
                    style={{
                      padding: tokens.spacing.md,
                      borderRadius: tokens.borderRadius.lg,
                      border: timeManagement === level ? `2px solid ${tokens.colors.primary}` : `1px solid ${tokens.colors.border}`,
                      backgroundColor: timeManagement === level ? `${tokens.colors.primary}10` : 'transparent',
                      color: timeManagement === level ? tokens.colors.primary : tokens.colors.text.secondary,
                      fontSize: tokens.typography.sizes.sm,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize'
                    }}
                  >
                    {level.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div style={{ marginBottom: tokens.spacing.xl }}>
              <label style={{
                display: 'block',
                fontSize: tokens.typography.sizes.base,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md,
                fontWeight: tokens.typography.weights.medium
              }}>
                Anything specific you want the AI to know?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., I loved the variety, but need more rest days..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: tokens.spacing.md,
                  borderRadius: tokens.borderRadius.lg,
                  border: `1px solid ${tokens.colors.border}`,
                  backgroundColor: tokens.colors.background,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.sizes.base,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {/* Struggles (optional) */}
            <div style={{ marginBottom: tokens.spacing.xl }}>
              <label style={{
                display: 'block',
                fontSize: tokens.typography.sizes.base,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md,
                fontWeight: tokens.typography.weights.medium
              }}>
                What was the hardest part? (optional)
              </label>
              <textarea
                value={struggles}
                onChange={(e) => setStruggles(e.target.value)}
                placeholder="e.g., My fingers hurt, footwork drills were confusing..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: tokens.spacing.md,
                  borderRadius: tokens.borderRadius.lg,
                  border: `1px solid ${tokens.colors.border}`,
                  backgroundColor: tokens.colors.background,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.sizes.base,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isRecalibrating}
              style={{
                width: '100%',
                padding: tokens.spacing.lg,
                borderRadius: tokens.borderRadius.xl,
                border: 'none',
                backgroundColor: isRecalibrating ? tokens.colors.gray[300] : tokens.colors.primary,
                color: 'white',
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.medium,
                cursor: isRecalibrating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing.sm
              }}
            >
              {isRecalibrating ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Recalibrating your roadmap...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Recalibrate My Roadmap
                </>
              )}
            </button>

            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
