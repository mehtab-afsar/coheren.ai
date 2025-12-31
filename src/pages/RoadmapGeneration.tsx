import { ArrowRight, Sparkles, Calendar, Clock, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { tokens, layout, text, button, card, progress as progressStyles, hoverHandlers } from '../design-system';

// Simple roadmap generator based on category and user data
const generateRoadmap = (goal: any, universalProfile: any) => {
  const category = goal.category;
  const specificGoal = goal.specificGoal;

  // Base templates for each category
  const roadmapTemplates: Record<string, any> = {
    Fitness: {
      duration: 6, // months
      dailyTime: '30-45 min',
      phases: [
        { title: 'Cardio foundation', weeks: '1-4', description: 'Build endurance base' },
        { title: 'Technique basics', weeks: '5-8', description: 'Learn fundamental movements' },
        { title: 'Skill development', weeks: '9-16', description: 'Master core techniques' },
        { title: 'Advanced practice', weeks: '17-24', description: 'Combine skills, build flow' }
      ]
    },
    Exam: {
      duration: 12, // months (default, adjusts based on exam date)
      dailyTime: '3-4 hours',
      phases: [
        { title: 'Foundation building', weeks: '1-8', description: 'Cover basic concepts' },
        { title: 'Deep dive', weeks: '9-20', description: 'Master each subject' },
        { title: 'Practice & revision', weeks: '21-40', description: 'Solve problems, revise' },
        { title: 'Mock tests & polish', weeks: '41-48', description: 'Full-length practice' }
      ]
    },
    Hobby: {
      duration: 3, // months
      dailyTime: '20-30 min',
      phases: [
        { title: 'Basics & setup', weeks: '1-2', description: 'Get comfortable with tools' },
        { title: 'Fundamental techniques', weeks: '3-6', description: 'Learn core skills' },
        { title: 'Practice & exploration', weeks: '7-10', description: 'Build confidence' },
        { title: 'Creative application', weeks: '11-12', description: 'Start creating independently' }
      ]
    },
    Learning: {
      duration: 6, // months
      dailyTime: '45-60 min',
      phases: [
        { title: 'Fundamentals', weeks: '1-6', description: 'Core concepts & basics' },
        { title: 'Intermediate skills', weeks: '7-14', description: 'Apply what you learned' },
        { title: 'Advanced topics', weeks: '15-20', description: 'Deeper understanding' },
        { title: 'Mastery & practice', weeks: '21-24', description: 'Real-world application' }
      ]
    },
    Habit: {
      duration: 3, // months (66 days for habit formation)
      dailyTime: '10-15 min',
      phases: [
        { title: 'Initial commitment', weeks: '1-2', description: 'Build the routine' },
        { title: 'Consistency building', weeks: '3-6', description: 'Make it automatic' },
        { title: 'Habit solidification', weeks: '7-10', description: 'Increase intensity' },
        { title: 'Long-term maintenance', weeks: '11-12', description: 'Own the habit' }
      ]
    },
    Creative: {
      duration: 6, // months
      dailyTime: '1-2 hours',
      phases: [
        { title: 'Planning & research', weeks: '1-4', description: 'Define scope, gather resources' },
        { title: 'Core creation', weeks: '5-16', description: 'Main work & iteration' },
        { title: 'Refinement', weeks: '17-20', description: 'Polish & improve' },
        { title: 'Launch preparation', weeks: '21-24', description: 'Final touches, release' }
      ]
    }
  };

  const template = roadmapTemplates[category];

  // Calculate schedule based on universal profile
  const { wakeTime, energyPattern } = universalProfile;
  let recommendedTime = '7:00 AM';

  if (energyPattern === 'morning' && wakeTime) {
    const wake = new Date(`2000-01-01T${wakeTime}`);
    wake.setMinutes(wake.getMinutes() + 30);
    recommendedTime = wake.toTimeString().slice(0, 5);
  } else if (energyPattern === 'evening') {
    recommendedTime = '7:30 PM';
  } else if (energyPattern === 'afternoon') {
    recommendedTime = '2:00 PM';
  }

  return {
    title: specificGoal || category,
    category,
    duration: template.duration,
    dailyTime: template.dailyTime,
    recommendedTime,
    phases: template.phases,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + template.duration * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
};

export default function RoadmapGeneration() {
  const { universalProfile, currentGoal, setStep } = useStore();
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate AI generation with progress
    const steps = [
      'Analyzing your schedule...',
      'Understanding your goal...',
      'Creating skill progression...',
      'Scheduling micro-tasks...',
      'Finalizing roadmap...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps.length) * 100);

      if (currentStep >= steps.length) {
        clearInterval(interval);
        // Generate the roadmap
        const generatedRoadmap = generateRoadmap(currentGoal, universalProfile);
        setRoadmap(generatedRoadmap);
        setTimeout(() => setLoading(false), 500);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [currentGoal, universalProfile]);

  const handleContinue = () => {
    // Save roadmap to store
    if (roadmap) {
      useStore.getState().setRoadmap(roadmap);
    }
    setStep(6); // Move to daily check-in setup
  };

  if (loading) {
    return (
      <div style={layout.fullPageCentered}>
        <div style={{
          ...layout.contentContainer('500px'),
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: `0 auto ${tokens.spacing['2xl']}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles
              size={40}
              style={{ color: tokens.colors.text.primary, animation: 'pulse 2s infinite' }}
            />
          </div>

          <h2 style={{
            ...text.h3,
            marginBottom: tokens.spacing.lg
          }}>
            Building your roadmap...
          </h2>

          <p style={{
            ...text.body,
            marginBottom: tokens.spacing['2xl']
          }}>
            This will just take a moment
          </p>

          {/* Progress bar */}
          <div style={progressStyles.container}>
            <div style={{
              ...progressStyles.fill(progress),
              transition: 'width 0.5s ease-out'
            }} />
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={layout.fullPageCentered}>
      <div style={layout.contentContainer('600px')}>
        {/* Success animation */}
        <div style={{
          width: '48px',
          height: '48px',
          margin: `0 auto ${tokens.spacing['2xl']}`,
          backgroundColor: tokens.colors.text.primary,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Target size={24} color={tokens.colors.primary} />
        </div>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: tokens.spacing['3xl']
        }}>
          <h1 style={{
            ...text.h1,
            marginBottom: tokens.spacing.sm
          }}>
            Your {roadmap.title} Roadmap
          </h1>
          <p style={text.body}>
            A personalized plan built just for you
          </p>
        </div>

        {/* Key metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: tokens.spacing.lg,
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
              ...text.h3,
              marginBottom: tokens.spacing.xs
            }}>
              {roadmap.duration} {roadmap.duration === 1 ? 'month' : 'months'}
            </div>
            <div style={text.caption}>
              Timeline
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
              ...text.h3,
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
              ...text.h3,
              marginBottom: tokens.spacing.xs
            }}>
              {roadmap.recommendedTime}
            </div>
            <div style={text.caption}>
              Best time
            </div>
          </div>
        </div>

        {/* Phases */}
        <div style={{
          ...card.standard,
          marginBottom: tokens.spacing['2xl']
        }}>
          <h3 style={{
            ...text.h4,
            marginBottom: tokens.spacing.xl
          }}>
            Your Journey
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column' as const,
            gap: tokens.spacing.lg
          }}>
            {roadmap.phases.map((phase: any, index: number) => (
              <div key={index} style={{
                display: 'flex',
                gap: tokens.spacing.lg
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: index === 0 ? tokens.colors.text.primary : tokens.colors.gray[100],
                  color: index === 0 ? tokens.colors.primary : tokens.colors.text.tertiary,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium,
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline' as const,
                    marginBottom: tokens.spacing.xs
                  }}>
                    <div style={text.body}>
                      {phase.title}
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
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          style={{
            ...button.primary,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.sm
          }}
          {...hoverHandlers.darkBg}
        >
          Start Your Journey
          <ArrowRight size={20} />
        </button>

        <p style={{
          ...text.caption,
          textAlign: 'center',
          marginTop: tokens.spacing.lg
        }}>
          You can adjust this plan anytime
        </p>
      </div>
    </div>
  );
}
