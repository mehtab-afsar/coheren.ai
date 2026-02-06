import { useState } from 'react';
import { tokens } from '../design-system';
import type { BuildingStone, StoneAnswer } from '../types/agents';

interface StoneQuestionsProps {
  stones: BuildingStone[];
  onComplete: (answers: StoneAnswer[]) => void;
}

export default function StoneQuestions({ stones, onComplete }: StoneQuestionsProps) {
  const [currentStoneIndex, setCurrentStoneIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string | number; impact: Record<string, unknown> }>>({});

  const currentStone = stones[currentStoneIndex];
  const progress = ((currentStoneIndex + 1) / stones.length) * 100;

  // Just update the answer without advancing (for text input)
  const updateAnswer = (optionValue: string | number, impact: Record<string, unknown>) => {
    setAnswers({
      ...answers,
      [currentStone.stoneId]: {
        answer: optionValue,
        impact
      }
    });
  };

  // Handle answer and auto-advance (for buttons)
  const handleAnswer = (optionValue: string, impact: Record<string, unknown>) => {
    const newAnswers = {
      ...answers,
      [currentStone.stoneId]: {
        answer: optionValue,
        impact
      }
    };
    setAnswers(newAnswers);

    // Move to next question or complete
    if (currentStoneIndex < stones.length - 1) {
      setCurrentStoneIndex(currentStoneIndex + 1);
    } else {
      // All questions answered
      const stoneAnswers: StoneAnswer[] = Object.entries(newAnswers).map(([stoneId, data]) => ({
        stoneId,
        answer: data.answer,
        impact: data.impact
      }));
      onComplete(stoneAnswers);
    }
  };

  const handleNext = () => {
    // Check if current question is answered
    if (!answers[currentStone.stoneId]) {
      return; // Don't advance if not answered
    }

    if (currentStoneIndex < stones.length - 1) {
      setCurrentStoneIndex(currentStoneIndex + 1);
    } else {
      // All questions answered - complete
      const stoneAnswers: StoneAnswer[] = Object.entries(answers).map(([stoneId, data]) => ({
        stoneId,
        answer: data.answer,
        impact: data.impact
      }));
      onComplete(stoneAnswers);
    }
  };

  const handleBack = () => {
    if (currentStoneIndex > 0) {
      setCurrentStoneIndex(currentStoneIndex - 1);
    }
  };

  if (!currentStone) return null;

  return (
    <div style={{
      padding: tokens.spacing.xl,
      backgroundColor: 'white',
      borderRadius: tokens.borderRadius.xl,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Progress Bar */}
      <div style={{
        marginBottom: tokens.spacing.xl
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing.xs,
          fontSize: tokens.typography.sizes.sm,
          color: tokens.colors.text.secondary
        }}>
          <span>Question {currentStoneIndex + 1} of {stones.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#F1F5F9',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: tokens.colors.primary,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Question Header */}
      <div style={{
        marginBottom: tokens.spacing.lg
      }}>
        <div style={{
          display: 'inline-block',
          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          backgroundColor: currentStone.importance === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(67, 56, 202, 0.1)',
          color: currentStone.importance === 'critical' ? '#EF4444' : tokens.colors.primary,
          borderRadius: tokens.borderRadius.md,
          fontSize: tokens.typography.sizes.xs,
          fontWeight: tokens.typography.weights.semibold,
          textTransform: 'uppercase',
          marginBottom: tokens.spacing.md
        }}>
          {currentStone.importance}
        </div>

        <h3 style={{
          fontSize: tokens.typography.sizes['2xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          marginBottom: tokens.spacing.sm
        }}>
          {currentStone.question.text}
        </h3>

        <p style={{
          fontSize: tokens.typography.sizes.sm,
          color: tokens.colors.text.secondary,
          lineHeight: 1.6
        }}>
          {currentStone.reasoning}
        </p>
      </div>

      {/* Options */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.md,
        marginBottom: tokens.spacing.xl
      }}>
        {currentStone.question.type === 'multiple_choice' && currentStone.question.options?.map((option) => (
          <button
            key={option.value}
            onClick={() => handleAnswer(option.value, option.impact)}
            style={{
              borderRadius: tokens.borderRadius.lg,
              fontWeight: tokens.typography.weights.medium,
              padding: tokens.spacing.lg,
              backgroundColor: answers[currentStone.stoneId]?.answer === option.value
                ? 'rgba(67, 56, 202, 0.1)'
                : 'white',
              border: answers[currentStone.stoneId]?.answer === option.value
                ? `2px solid ${tokens.colors.primary}`
                : '2px solid #E2E8F0',
              color: tokens.colors.text.primary,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (answers[currentStone.stoneId]?.answer !== option.value) {
                e.currentTarget.style.borderColor = tokens.colors.primary;
                e.currentTarget.style.backgroundColor = 'rgba(67, 56, 202, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (answers[currentStone.stoneId]?.answer !== option.value) {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <div style={{
              fontWeight: tokens.typography.weights.medium,
              marginBottom: tokens.spacing.xs
            }}>
              {option.label}
            </div>
            {option.impact && Object.keys(option.impact).length > 0 && (
              <div style={{
                fontSize: tokens.typography.sizes.sm,
                color: tokens.colors.text.secondary
              }}>
                {Object.entries(option.impact).slice(0, 2).map(([key, value]) => (
                  <div key={key}>• {String(value)}</div>
                ))}
              </div>
            )}
          </button>
        ))}

        {/* Open-ended / Yes-No / Scale questions */}
        {(currentStone.question.type === 'open_ended' ||
          currentStone.question.type === 'yes_no' ||
          currentStone.question.type === 'scale') && (
          <div style={{ marginTop: tokens.spacing.md }}>
            {currentStone.question.type === 'yes_no' && (
              <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                <button
                  onClick={() => handleAnswer('yes', { answer: 'yes' })}
                  style={{
                    flex: 1,
                    borderRadius: tokens.borderRadius.lg,
                    fontWeight: tokens.typography.weights.medium,
                    padding: tokens.spacing.lg,
                    backgroundColor: answers[currentStone.stoneId]?.answer === 'yes'
                      ? 'rgba(67, 56, 202, 0.1)'
                      : 'white',
                    border: answers[currentStone.stoneId]?.answer === 'yes'
                      ? `2px solid ${tokens.colors.primary}`
                      : '2px solid #E2E8F0',
                    color: tokens.colors.text.primary,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => handleAnswer('no', { answer: 'no' })}
                  style={{
                    flex: 1,
                    borderRadius: tokens.borderRadius.lg,
                    fontWeight: tokens.typography.weights.medium,
                    padding: tokens.spacing.lg,
                    backgroundColor: answers[currentStone.stoneId]?.answer === 'no'
                      ? 'rgba(67, 56, 202, 0.1)'
                      : 'white',
                    border: answers[currentStone.stoneId]?.answer === 'no'
                      ? `2px solid ${tokens.colors.primary}`
                      : '2px solid #E2E8F0',
                    color: tokens.colors.text.primary,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  No
                </button>
              </div>
            )}

            {currentStone.question.type === 'open_ended' && (
              <textarea
                value={(answers[currentStone.stoneId]?.answer as string) || ''}
                onChange={(e) => updateAnswer(e.target.value, { answer: e.target.value })}
                placeholder="Type your answer here..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  borderRadius: tokens.borderRadius.lg,
                  padding: tokens.spacing.lg,
                  border: '2px solid #E2E8F0',
                  fontSize: tokens.typography.sizes.base,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
              />
            )}

            {currentStone.question.type === 'scale' && (
              <div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={typeof answers[currentStone.stoneId]?.answer === 'number' ? answers[currentStone.stoneId].answer : 3}
                  onChange={(e) => updateAnswer(Number(e.target.value), { score: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    marginBottom: tokens.spacing.md
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: tokens.typography.sizes.sm,
                  color: tokens.colors.text.secondary
                }}>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
                <div style={{
                  textAlign: 'center',
                  marginTop: tokens.spacing.sm,
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.medium,
                  color: tokens.colors.text.primary
                }}>
                  Selected: {typeof answers[currentStone.stoneId]?.answer === 'number' ? answers[currentStone.stoneId].answer : 3}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: tokens.spacing.md,
        alignItems: 'center'
      }}>
        <button
          onClick={handleBack}
          disabled={currentStoneIndex === 0}
          style={{
            borderRadius: tokens.borderRadius.lg,
            fontWeight: tokens.typography.weights.medium,
            padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
            backgroundColor: 'white',
            border: `2px solid ${tokens.colors.primary}`,
            color: tokens.colors.primary,
            opacity: currentStoneIndex === 0 ? 0.5 : 1,
            cursor: currentStoneIndex === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          Back
        </button>

        <div style={{
          fontSize: tokens.typography.sizes.sm,
          color: tokens.colors.text.secondary,
          display: 'flex',
          alignItems: 'center'
        }}>
          {answers[currentStone.stoneId] ? '✓ Answered' : 'Select an option above'}
        </div>

        {/* Show Next button for open_ended and scale questions */}
        {(currentStone.question.type === 'open_ended' || currentStone.question.type === 'scale') && (
          <button
            onClick={handleNext}
            disabled={!answers[currentStone.stoneId]}
            style={{
              borderRadius: tokens.borderRadius.lg,
              fontWeight: tokens.typography.weights.medium,
              padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
              backgroundColor: answers[currentStone.stoneId] ? tokens.colors.primary : '#E2E8F0',
              border: 'none',
              color: 'white',
              opacity: answers[currentStone.stoneId] ? 1 : 0.5,
              cursor: answers[currentStone.stoneId] ? 'pointer' : 'not-allowed'
            }}
          >
            {currentStoneIndex === stones.length - 1 ? 'Complete' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}
