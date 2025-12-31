import { ArrowRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';

const goalsByCategory = {
  Fitness: ['Boxing', 'Running', 'Yoga', 'Weightlifting', 'Swimming', 'Cycling'],
  Exam: ['UPSC', 'GMAT', 'GRE', 'IELTS', 'Bar Exam', 'Medical Licensing'],
  Hobby: ['Cooking', 'Guitar', 'Piano', 'Painting', 'Photography', 'Gardening'],
  Learning: ['Spanish', 'Python', 'Writing', 'Public Speaking', 'Data Science'],
  Habit: ['Reading Daily', 'Meditation', 'Journaling', 'Sleep Routine', 'Exercise'],
  Creative: ['Write a Book', 'Start Podcast', 'YouTube Channel', 'Blog', 'Music Album'],
};

export default function SpecificGoal() {
  const { currentGoal, setSpecificGoal, setStep } = useStore();
  const [customGoal, setCustomGoal] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const category = currentGoal.category;
  const suggestions = category ? goalsByCategory[category] : [];

  const handleSelect = (goal: string) => {
    setSpecificGoal(goal);
    setStep(3); // Move to universal questions
  };

  const handleCustomSubmit = () => {
    if (customGoal.trim()) {
      setSpecificGoal(customGoal.trim());
      setStep(3);
    }
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
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {/* Back button */}
        <button
          onClick={() => setStep(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#999',
            fontSize: '14px',
            fontWeight: 300,
            cursor: 'pointer',
            marginBottom: '32px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'black'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '30px',
            fontWeight: 300,
            color: 'black',
            marginBottom: '8px'
          }}>
            What's your {category?.toLowerCase()} goal?
          </h2>
          <p style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#999'
          }}>
            Choose from suggestions or enter your own
          </p>
        </div>

        {/* Suggestions */}
        {!isCustom && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {suggestions.map((goal) => (
              <button
                key={goal}
                onClick={() => handleSelect(goal)}
                style={{
                  padding: '16px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: 'black',
                  transition: 'all 0.2s'
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
                {goal}
              </button>
            ))}
          </div>
        )}

        {/* Custom input toggle */}
        {!isCustom ? (
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              onClick={() => setIsCustom(true)}
              style={{
                fontSize: '14px',
                fontWeight: 300,
                color: '#999',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'black'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
            >
              Or enter your own goal
            </button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder={`e.g., ${suggestions[0]}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
              }}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 300,
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                outline: 'none',
                transition: 'border-color 0.2s',
                marginBottom: '16px'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setIsCustom(false);
                  setCustomGoal('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'white',
                  color: 'black',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 300,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Back to suggestions
              </button>

              <button
                onClick={handleCustomSubmit}
                disabled={!customGoal.trim()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: customGoal.trim() ? 'black' : '#e5e5e5',
                  color: customGoal.trim() ? 'white' : '#999',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 300,
                  cursor: customGoal.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (customGoal.trim()) e.currentTarget.style.backgroundColor = '#333';
                }}
                onMouseLeave={(e) => {
                  if (customGoal.trim()) e.currentTarget.style.backgroundColor = 'black';
                }}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
