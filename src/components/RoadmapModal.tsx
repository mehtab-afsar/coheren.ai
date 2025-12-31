import { X, Calendar, Clock, Target, CheckCircle2 } from 'lucide-react';
import { tokens, text, card } from '../design-system';

interface RoadmapPhase {
  title: string;
  weeks: string;
  description: string;
}

interface Roadmap {
  title: string;
  category: string;
  duration: number;
  dailyTime: string;
  recommendedTime: string;
  phases: RoadmapPhase[];
  startDate: string;
  endDate: string;
}

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  roadmap: Roadmap | null;
  currentDay: number;
}

export default function RoadmapModal({ isOpen, onClose, roadmap, currentDay }: RoadmapModalProps) {
  if (!isOpen || !roadmap) return null;

  const totalDays = roadmap.duration * 30; // Approximate
  const progressPercentage = (currentDay / totalDays) * 100;

  // Determine which phase the user is currently in
  const getCurrentPhaseIndex = () => {
    const currentWeek = Math.ceil(currentDay / 7);
    for (let i = 0; i < roadmap.phases.length; i++) {
      const phase = roadmap.phases[i];
      const [startWeek, endWeek] = phase.weeks.split('-').map(w => parseInt(w));
      if (currentWeek >= startWeek && currentWeek <= endWeek) {
        return i;
      }
    }
    return 0;
  };

  const isPhaseComplete = (phaseIndex: number) => {
    return phaseIndex < getCurrentPhaseIndex();
  };

  const isCurrentPhase = (phaseIndex: number) => {
    return phaseIndex === getCurrentPhaseIndex();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          backgroundColor: tokens.colors.primary,
          borderRadius: tokens.borderRadius.lg,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 1001,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: tokens.spacing.xl,
          borderBottom: `1px solid ${tokens.colors.gray[200]}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              ...text.h3,
              marginBottom: tokens.spacing.xs
            }}>
              {roadmap.title}
            </h1>
            <p style={{
              ...text.bodySmall,
              color: tokens.colors.text.secondary
            }}>
              Your personalized roadmap
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `background-color ${tokens.transitions.fast}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = tokens.colors.gray[100]}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} color={tokens.colors.text.primary} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: tokens.spacing.xl
        }}>
          {/* Overview Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: tokens.spacing.md,
            marginBottom: tokens.spacing['2xl']
          }}>
            <div style={{
              ...card.standard,
              textAlign: 'center',
              backgroundColor: tokens.colors.gray[50]
            }}>
              <Calendar size={20} style={{
                color: tokens.colors.text.tertiary,
                margin: `0 auto ${tokens.spacing.sm}`
              }} />
              <div style={{
                ...text.h4,
                marginBottom: tokens.spacing.xs
              }}>
                {roadmap.duration} {roadmap.duration === 1 ? 'month' : 'months'}
              </div>
              <div style={text.caption}>
                Duration
              </div>
            </div>

            <div style={{
              ...card.standard,
              textAlign: 'center',
              backgroundColor: tokens.colors.gray[50]
            }}>
              <Clock size={20} style={{
                color: tokens.colors.text.tertiary,
                margin: `0 auto ${tokens.spacing.sm}`
              }} />
              <div style={{
                ...text.h4,
                marginBottom: tokens.spacing.xs
              }}>
                {roadmap.dailyTime}
              </div>
              <div style={text.caption}>
                Daily time
              </div>
            </div>

            <div style={{
              ...card.standard,
              textAlign: 'center',
              backgroundColor: tokens.colors.gray[50]
            }}>
              <Target size={20} style={{
                color: tokens.colors.text.tertiary,
                margin: `0 auto ${tokens.spacing.sm}`
              }} />
              <div style={{
                ...text.h4,
                marginBottom: tokens.spacing.xs
              }}>
                Day {currentDay}
              </div>
              <div style={text.caption}>
                Progress
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            marginBottom: tokens.spacing['2xl']
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: tokens.spacing.sm
            }}>
              <span style={text.body}>Overall Progress</span>
              <span style={text.body}>{Math.round(progressPercentage)}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: tokens.colors.gray[100],
              borderRadius: tokens.borderRadius.full,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${progressPercentage}%`,
                backgroundColor: tokens.colors.text.primary,
                transition: 'width 0.3s ease-out'
              }} />
            </div>
          </div>

          {/* Phases */}
          <div>
            <h3 style={{
              ...text.h4,
              marginBottom: tokens.spacing.lg
            }}>
              Your Journey
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing.lg
            }}>
              {roadmap.phases.map((phase, index) => {
                const isComplete = isPhaseComplete(index);
                const isCurrent = isCurrentPhase(index);

                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: tokens.spacing.md,
                      opacity: isCurrent ? 1 : isComplete ? 0.8 : 0.6
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: isCurrent
                        ? tokens.colors.text.primary
                        : isComplete
                        ? tokens.colors.text.primary
                        : tokens.colors.gray[100],
                      color: isCurrent || isComplete ? tokens.colors.primary : tokens.colors.text.tertiary,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isComplete ? (
                        <CheckCircle2 size={20} color={tokens.colors.primary} />
                      ) : (
                        <span style={{
                          fontSize: tokens.typography.sizes.sm,
                          fontWeight: tokens.typography.weights.medium
                        }}>
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: tokens.spacing.xs
                      }}>
                        <div style={{
                          ...text.body,
                          fontWeight: isCurrent ? tokens.typography.weights.medium : tokens.typography.weights.regular
                        }}>
                          {phase.title}
                          {isCurrent && (
                            <span style={{
                              marginLeft: tokens.spacing.sm,
                              fontSize: tokens.typography.sizes.xs,
                              color: tokens.colors.text.tertiary
                            }}>
                              (Current)
                            </span>
                          )}
                        </div>
                        <div style={text.caption}>
                          Weeks {phase.weeks}
                        </div>
                      </div>
                      <div style={{
                        ...text.bodySmall,
                        color: tokens.colors.text.secondary
                      }}>
                        {phase.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: tokens.spacing.xl,
          borderTop: `1px solid ${tokens.colors.gray[200]}`,
          backgroundColor: tokens.colors.gray[50]
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.sm
          }}>
            <Calendar size={16} color={tokens.colors.text.tertiary} />
            <span style={{
              ...text.bodySmall,
              color: tokens.colors.text.secondary
            }}>
              Estimated completion: {new Date(roadmap.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}
