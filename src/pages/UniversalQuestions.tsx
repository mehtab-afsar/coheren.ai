import { ArrowRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';

const questions = [
  {
    id: 'name',
    question: "What's your name?",
    placeholder: 'Your name',
    type: 'text' as const,
  },
  {
    id: 'wakeTime',
    question: 'What time do you usually wake up?',
    type: 'time' as const,
  },
  {
    id: 'sleepTime',
    question: 'What time do you usually sleep?',
    type: 'time' as const,
  },
  {
    id: 'workHours',
    question: 'When do you work?',
    type: 'timeRange' as const,
    placeholder: { start: 'Start time', end: 'End time' },
  },
  {
    id: 'energyPattern',
    question: 'When do you feel most energized?',
    type: 'choice' as const,
    options: ['Morning', 'Afternoon', 'Evening', 'Late night'],
  },
];

export default function UniversalQuestions() {
  const { updateUniversalProfile, setStep } = useStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const question = questions[currentQ];
  const isLast = currentQ === questions.length - 1;

  const handleNext = () => {
    if (isLast) {
      // Save all answers to store
      updateUniversalProfile({
        name: answers.name,
        dailyRoutine: {
          wakeTime: answers.wakeTime,
          sleepTime: answers.sleepTime,
          workHours: answers.workHours,
          freeTimeSlots: [], // Will be calculated
        },
        energyPattern: answers.energyPattern?.toLowerCase(),
        weekendAvailability: 'flexible', // Default
      });
      setStep(4); // Move to category-specific questions
    } else {
      setCurrentQ(currentQ + 1);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    } else {
      setStep(2); // Back to specific goal
    }
  };

  const isAnswered = () => {
    const answer = answers[question.id];
    if (question.type === 'timeRange') {
      return answer?.start && answer?.end;
    }
    return answer && answer.trim();
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
        {/* Progress */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
              Question {currentQ + 1} of {questions.length}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
              {Math.round(((currentQ + 1) / questions.length) * 100)}%
            </span>
          </div>
          <div style={{
            height: '2px',
            backgroundColor: '#f5f5f5',
            borderRadius: '1px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${((currentQ + 1) / questions.length) * 100}%`,
              backgroundColor: 'black',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* Question */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 300,
            color: 'black',
            marginBottom: '32px',
            lineHeight: 1.3
          }}>
            {question.question}
          </h2>

          {/* Text input */}
          {question.type === 'text' && (
            <input
              type="text"
              value={answers[question.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
              placeholder={question.placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isAnswered()) handleNext();
              }}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 300,
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
            />
          )}

          {/* Time input */}
          {question.type === 'time' && (
            <input
              type="time"
              value={answers[question.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
              autoFocus
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 300,
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
            />
          )}

          {/* Time range */}
          {question.type === 'timeRange' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="time"
                value={answers[question.id]?.start || ''}
                onChange={(e) => setAnswers({
                  ...answers,
                  [question.id]: { ...answers[question.id], start: e.target.value }
                })}
                placeholder="Start"
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 300,
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
              />
              <span style={{ color: '#999', fontWeight: 300 }}>to</span>
              <input
                type="time"
                value={answers[question.id]?.end || ''}
                onChange={(e) => setAnswers({
                  ...answers,
                  [question.id]: { ...answers[question.id], end: e.target.value }
                })}
                placeholder="End"
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 300,
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
              />
            </div>
          )}

          {/* Choice buttons */}
          {question.type === 'choice' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {question.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setAnswers({ ...answers, [question.id]: option });
                    setTimeout(handleNext, 200);
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: answers[question.id] === option ? 'black' : 'white',
                    color: answers[question.id] === option ? 'white' : 'black',
                    border: `1px solid ${answers[question.id] === option ? 'black' : '#e5e5e5'}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 300,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (answers[question.id] !== option) {
                      e.currentTarget.style.borderColor = 'black';
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (answers[question.id] !== option) {
                      e.currentTarget.style.borderColor = '#e5e5e5';
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        {question.type !== 'choice' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
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
              <ChevronLeft size={16} />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!isAnswered()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: isAnswered() ? 'black' : '#e5e5e5',
                color: isAnswered() ? 'white' : '#999',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 300,
                cursor: isAnswered() ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (isAnswered()) e.currentTarget.style.backgroundColor = '#333';
              }}
              onMouseLeave={(e) => {
                if (isAnswered()) e.currentTarget.style.backgroundColor = 'black';
              }}
            >
              {isLast ? 'Continue' : 'Next'}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
