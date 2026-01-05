import { useState } from 'react';
import { useStore } from '../store/useStore';
import { tokens, text, input, focusHandlers, card } from '../design-system';
import { PageLayout, ProgressIndicator, NavigationFooter } from '../components/layout';

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
      updateUniversalProfile({
        name: answers.name,
        dailyRoutine: {
          wakeTime: answers.wakeTime,
          sleepTime: answers.sleepTime,
          workHours: answers.workHours,
          freeTimeSlots: [],
        },
        energyPattern: answers.energyPattern?.toLowerCase(),
        weekendAvailability: 'flexible',
      });
      setStep(4);
    } else {
      setCurrentQ(currentQ + 1);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    } else {
      setStep(2);
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
    <PageLayout variant="onboarding" maxWidth="standard">
      <ProgressIndicator
        current={currentQ + 1}
        total={questions.length}
        showLabels
        labelFormat="question"
      />

      {/* Question */}
      <div style={{ marginBottom: tokens.spacing['2xl'] }}>
          <h2 style={{
            ...text.h2,
            marginBottom: tokens.spacing['2xl'],
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
              style={input.base}
              {...focusHandlers.input}
            />
          )}

          {/* Time input */}
          {question.type === 'time' && (
            <input
              type="time"
              value={answers[question.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
              autoFocus
              style={input.timeRange}
              {...focusHandlers.input}
            />
          )}

          {/* Time range */}
          {question.type === 'timeRange' && (
            <div style={{
              display: 'flex',
              gap: tokens.spacing.md,
              alignItems: 'center'
            }}>
              <input
                type="time"
                value={answers[question.id]?.start || ''}
                onChange={(e) => setAnswers({
                  ...answers,
                  [question.id]: { ...answers[question.id], start: e.target.value }
                })}
                style={{
                  ...input.timeRange,
                  flex: 1
                }}
                {...focusHandlers.input}
              />
              <span style={input.separator}>to</span>
              <input
                type="time"
                value={answers[question.id]?.end || ''}
                onChange={(e) => setAnswers({
                  ...answers,
                  [question.id]: { ...answers[question.id], end: e.target.value }
                })}
                style={{
                  ...input.timeRange,
                  flex: 1
                }}
                {...focusHandlers.input}
              />
            </div>
          )}

          {/* Choice buttons */}
          {question.type === 'choice' && (
            <div style={{ display: 'grid', gap: tokens.spacing.md }}>
              {question.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setAnswers({ ...answers, [question.id]: option });
                    setTimeout(handleNext, 200);
                  }}
                  style={card.selection(answers[question.id] === option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

      {/* Navigation */}
      {question.type !== 'choice' && (
        <NavigationFooter
          onBack={handleBack}
          onNext={handleNext}
          nextLabel={isLast ? 'Continue' : 'Next'}
          nextDisabled={!isAnswered()}
          showBack
          backLabel="Back"
        />
      )}
    </PageLayout>
  );
}
