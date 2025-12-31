import { ArrowRight, Bell, Sun, Sunset, Moon } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';

const timeOptions = [
  { value: '06:00', label: '6:00 AM', icon: Sun, period: 'Early morning' },
  { value: '07:00', label: '7:00 AM', icon: Sun, period: 'Morning' },
  { value: '08:00', label: '8:00 AM', icon: Sun, period: 'Morning' },
  { value: '12:00', label: '12:00 PM', icon: Sun, period: 'Noon' },
  { value: '18:00', label: '6:00 PM', icon: Sunset, period: 'Evening' },
  { value: '19:00', label: '7:00 PM', icon: Sunset, period: 'Evening' },
  { value: '21:00', label: '9:00 PM', icon: Moon, period: 'Night' },
  { value: 'custom', label: 'Custom time', icon: Bell, period: 'Your choice' }
];

export default function CheckInSetup() {
  const { roadmap, universalProfile, setCheckInTime, setStep } = useStore();
  const [selectedTime, setSelectedTime] = useState(roadmap?.recommendedTime || '07:00');
  const [customTime, setCustomTime] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleContinue = () => {
    const finalTime = showCustom ? customTime : selectedTime;
    setCheckInTime(finalTime);

    // Generate initial tasks for day 1
    const initialTasks = generateInitialTasks(roadmap);
    useStore.getState().setTasks(initialTasks);

    setStep(7); // Move to dashboard
  };

  const generateInitialTasks = (roadmap: any) => {
    if (!roadmap) return [];

    const taskTemplates: Record<string, any[]> = {
      Fitness: [
        { title: 'Warm-up walk', description: 'Walk briskly for 10 minutes to prepare your body', type: 'practice', duration: 10 },
        { title: 'Basic stretching routine', description: 'Follow along with a 5-minute stretching video', type: 'learning', duration: 5 },
        { title: 'Cool down & reflect', description: 'How did it feel? Any soreness?', type: 'reflection', duration: 5 }
      ],
      Exam: [
        { title: 'Review syllabus', description: 'Understand what topics are covered', type: 'learning', duration: 30 },
        { title: 'Create study schedule', description: 'Plan your weekly study blocks', type: 'practice', duration: 20 },
        { title: 'Set up study space', description: 'Organize materials and eliminate distractions', type: 'practice', duration: 10 }
      ],
      Hobby: [
        { title: 'Learn the basics', description: 'Watch a beginner tutorial on your hobby', type: 'learning', duration: 15 },
        { title: 'First practice session', description: 'Try the simplest exercise or recipe', type: 'practice', duration: 20 },
        { title: 'Reflect on experience', description: 'What was fun? What was challenging?', type: 'reflection', duration: 5 }
      ],
      Learning: [
        { title: 'Introduction lesson', description: 'Complete the first lesson or chapter', type: 'learning', duration: 25 },
        { title: 'Practice exercises', description: 'Apply what you just learned', type: 'practice', duration: 15 },
        { title: 'Review notes', description: 'Summarize key concepts', type: 'reflection', duration: 10 }
      ],
      Habit: [
        { title: 'Start small', description: 'Do the minimum version of your habit', type: 'practice', duration: 5 },
        { title: 'Set daily reminder', description: 'Choose a trigger for your habit', type: 'learning', duration: 5 },
        { title: 'Track completion', description: 'Mark it done - celebrate!', type: 'reflection', duration: 2 }
      ],
      Creative: [
        { title: 'Brainstorm ideas', description: 'Write down all your ideas, no judgment', type: 'practice', duration: 20 },
        { title: 'Research examples', description: 'Look at what others have created', type: 'learning', duration: 25 },
        { title: 'Define scope', description: 'What will your project include?', type: 'reflection', duration: 15 }
      ]
    };

    const templates = taskTemplates[roadmap.category] || taskTemplates.Hobby;

    return templates.map((template, index) => ({
      id: `task-1-${index}`,
      ...template,
      completed: false,
      scheduledFor: finalTime || selectedTime,
      day: 1
    }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      padding: '48px 24px'
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        {/* Icon */}
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 24px',
          backgroundColor: '#fafafa',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Bell size={24} color="black" />
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 300,
            color: 'black',
            marginBottom: '12px'
          }}>
            When should I check in?
          </h2>
          <p style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#999',
            lineHeight: 1.6
          }}>
            I'll send you a gentle reminder at this time each day with your tasks
          </p>
        </div>

        {/* Recommended time callout */}
        <div style={{
          padding: '16px',
          backgroundColor: '#fafafa',
          borderRadius: '12px',
          marginBottom: '32px',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 400, color: '#666', marginBottom: '4px' }}>
            Recommended for you
          </div>
          <div style={{ fontSize: '16px', fontWeight: 400, color: 'black' }}>
            {roadmap?.recommendedTime || '7:00 AM'}
            <span style={{ fontSize: '14px', fontWeight: 300, color: '#999', marginLeft: '8px' }}>
              (based on your {universalProfile.energyPattern || 'morning'} energy)
            </span>
          </div>
        </div>

        {/* Time options */}
        {!showCustom && (
          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            {timeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedTime === option.value;
              const isRecommended = option.value === roadmap?.recommendedTime;

              if (option.value === 'custom') {
                return (
                  <button
                    key={option.value}
                    onClick={() => setShowCustom(true)}
                    style={{
                      padding: '16px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'black';
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e5e5';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <Icon size={20} color="#999" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 300, color: 'black' }}>
                        {option.label}
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedTime(option.value)}
                  style={{
                    padding: '16px',
                    backgroundColor: isSelected ? 'black' : 'white',
                    border: `1px solid ${isSelected ? 'black' : isRecommended ? 'black' : '#e5e5e5'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'black';
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = isRecommended ? 'black' : '#e5e5e5';
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <Icon size={20} color={isSelected ? 'white' : '#999'} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 300, color: isSelected ? 'white' : 'black' }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 300, color: isSelected ? '#ccc' : '#999' }}>
                      {option.period}
                    </div>
                  </div>
                  {isRecommended && !isSelected && (
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 400,
                      color: 'black',
                      backgroundColor: '#f0f0f0',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      Recommended
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom time input */}
        {showCustom && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: 300, color: '#666', marginBottom: '8px', display: 'block' }}>
              Choose your time
            </label>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 300,
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                outline: 'none',
                transition: 'border-color 0.2s',
                marginBottom: '12px'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
            />
            <button
              onClick={() => {
                setShowCustom(false);
                setCustomTime('');
              }}
              style={{
                fontSize: '14px',
                fontWeight: 300,
                color: '#999',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              ← Back to options
            </button>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={showCustom && !customTime}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            backgroundColor: (showCustom && !customTime) ? '#e5e5e5' : 'black',
            color: (showCustom && !customTime) ? '#999' : 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 400,
            cursor: (showCustom && !customTime) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!(showCustom && !customTime)) e.currentTarget.style.backgroundColor = '#333';
          }}
          onMouseLeave={(e) => {
            if (!(showCustom && !customTime)) e.currentTarget.style.backgroundColor = 'black';
          }}
        >
          Start Tomorrow
          <ArrowRight size={20} />
        </button>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 300,
          color: '#999',
          marginTop: '16px'
        }}>
          You can change this anytime in settings
        </p>
      </div>
    </div>
  );
}
