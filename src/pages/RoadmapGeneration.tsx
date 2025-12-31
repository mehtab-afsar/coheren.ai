import { ArrowRight, Sparkles, Calendar, Clock, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

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
  const { wakeTime, workHours, energyPattern } = universalProfile;
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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        padding: '48px 24px'
      }}>
        <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={40} style={{ color: 'black', animation: 'pulse 2s infinite' }} />
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 300,
            color: 'black',
            marginBottom: '16px'
          }}>
            Building your roadmap...
          </h2>

          <p style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#999',
            marginBottom: '32px'
          }}>
            This will just take a moment
          </p>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#f5f5f5',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: 'black',
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      padding: '48px 24px'
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {/* Success animation */}
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 24px',
          backgroundColor: 'black',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Target size={24} color="white" />
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 300,
            color: 'black',
            marginBottom: '8px'
          }}>
            Your {roadmap.title} Roadmap
          </h1>
          <p style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#999'
          }}>
            A personalized plan built just for you
          </p>
        </div>

        {/* Key metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <Calendar size={20} style={{ color: '#999', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '20px', fontWeight: 400, color: 'black', marginBottom: '4px' }}>
              {roadmap.duration} {roadmap.duration === 1 ? 'month' : 'months'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
              Timeline
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <Clock size={20} style={{ color: '#999', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '20px', fontWeight: 400, color: 'black', marginBottom: '4px' }}>
              {roadmap.dailyTime}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
              Daily time
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <Target size={20} style={{ color: '#999', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '20px', fontWeight: 400, color: 'black', marginBottom: '4px' }}>
              {roadmap.recommendedTime}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
              Best time
            </div>
          </div>
        </div>

        {/* Phases */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 400,
            color: 'black',
            marginBottom: '20px'
          }}>
            Your Journey
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {roadmap.phases.map((phase: any, index: number) => (
              <div key={index} style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: index === 0 ? 'black' : '#f5f5f5',
                  color: index === 0 ? 'white' : '#999',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 400,
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '4px'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: 400, color: 'black' }}>
                      {phase.title}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
                      Weeks {phase.weeks}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 300, color: '#666' }}>
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
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            backgroundColor: 'black',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 400,
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'black'}
        >
          Start Your Journey
          <ArrowRight size={20} />
        </button>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 300,
          color: '#999',
          marginTop: '16px'
        }}>
          You can adjust this plan anytime
        </p>
      </div>
    </div>
  );
}
