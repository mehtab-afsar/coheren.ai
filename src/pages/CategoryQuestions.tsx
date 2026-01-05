import { useState } from 'react';
import { useStore } from '../store/useStore';
import { tokens, text, input, focusHandlers, card, checkbox } from '../design-system';
import { PageLayout, ProgressIndicator, NavigationFooter } from '../components/layout';

// Category-specific question configurations
const categoryQuestions = {
  Fitness: [
    {
      id: 'fitnessLevel',
      question: 'What\'s your current fitness level?',
      type: 'choice' as const,
      options: [
        { value: 'beginner', label: 'Beginner', description: 'Can\'t jog for 10 minutes' },
        { value: 'intermediate', label: 'Intermediate', description: 'Can jog 20+ minutes comfortably' },
        { value: 'advanced', label: 'Advanced', description: 'Regular athlete' }
      ]
    },
    {
      id: 'injuries',
      question: 'Do you have any injuries or physical limitations?',
      type: 'text' as const,
      placeholder: 'e.g., old knee injury, or type "none"'
    },
    {
      id: 'equipment',
      question: 'What equipment/spaces do you have access to?',
      type: 'multiChoice' as const,
      options: [
        { value: 'gym', label: 'Gym membership' },
        { value: 'home', label: 'Home equipment' },
        { value: 'outdoor', label: 'Outdoor space (park, etc.)' },
        { value: 'none', label: 'None (bodyweight only)' }
      ]
    }
  ],
  Exam: [
    {
      id: 'examDate',
      question: 'When is your exam date?',
      type: 'date' as const,
      placeholder: 'Select exam date'
    },
    {
      id: 'attempt',
      question: 'Have you studied for this before, or starting fresh?',
      type: 'choice' as const,
      options: [
        { value: 'first', label: 'First attempt', description: 'Starting from scratch' },
        { value: 'retaking', label: 'Retaking', description: 'I\'ve studied before' }
      ]
    },
    {
      id: 'studyCapacity',
      question: 'How many hours per day can you realistically study?',
      type: 'choice' as const,
      options: [
        { value: '1-2', label: '1-2 hours', description: 'Part-time alongside work' },
        { value: '3-4', label: '3-4 hours', description: 'Dedicated preparation' },
        { value: '5+', label: '5+ hours', description: 'Full-time preparation' }
      ]
    }
  ],
  Hobby: [
    {
      id: 'experience',
      question: 'Complete beginner, or have you tried this hobby before?',
      type: 'choice' as const,
      options: [
        { value: 'beginner', label: 'Complete beginner', description: 'Never tried it' },
        { value: 'some', label: 'Some experience', description: 'Tried it before' },
        { value: 'intermediate', label: 'Intermediate', description: 'Practiced regularly' }
      ]
    },
    {
      id: 'equipment',
      question: 'Do you have the necessary tools/equipment?',
      type: 'choice' as const,
      options: [
        { value: 'yes', label: 'Yes, I have everything', description: '' },
        { value: 'partial', label: 'Have some basics', description: '' },
        { value: 'no', label: 'Need to buy', description: '' }
      ]
    },
    {
      id: 'goal',
      question: 'What\'s your goal with this hobby?',
      type: 'choice' as const,
      options: [
        { value: 'fun', label: 'Just for fun', description: 'Casual enjoyment' },
        { value: 'proficient', label: 'Want to get really good', description: 'Master the skill' },
        { value: 'project', label: 'Specific project', description: 'e.g., cook for family' }
      ]
    }
  ],
  Learning: [
    {
      id: 'purpose',
      question: 'Why do you want to learn this skill?',
      type: 'text' as const,
      placeholder: 'e.g., career change, personal interest, travel'
    },
    {
      id: 'experience',
      question: 'Any prior experience with this?',
      type: 'choice' as const,
      options: [
        { value: 'none', label: 'No experience', description: 'Starting from zero' },
        { value: 'basic', label: 'Basic knowledge', description: 'Know the fundamentals' },
        { value: 'intermediate', label: 'Intermediate', description: 'Can use it somewhat' }
      ]
    },
    {
      id: 'targetLevel',
      question: 'What\'s your target level?',
      type: 'choice' as const,
      options: [
        { value: 'basic', label: 'Basic understanding', description: 'Just the essentials' },
        { value: 'functional', label: 'Conversational/functional', description: 'Daily use' },
        { value: 'professional', label: 'Professional/fluent', description: 'Expert level' }
      ]
    }
  ],
  Habit: [
    {
      id: 'pastAttempts',
      question: 'Have you tried building this habit before?',
      type: 'choice' as const,
      options: [
        { value: 'never', label: 'Never tried', description: 'First time' },
        { value: 'failed', label: 'Tried but failed', description: 'Couldn\'t make it stick' },
        { value: 'lapsed', label: 'Used to do it', description: 'Stopped doing it' }
      ]
    },
    {
      id: 'target',
      question: 'What\'s your target frequency?',
      type: 'text' as const,
      placeholder: 'e.g., 15 min/day, 3 times/week'
    }
  ],
  Creative: [
    {
      id: 'project',
      question: 'What\'s the project you want to complete?',
      type: 'text' as const,
      placeholder: 'e.g., write a sci-fi novel, start cooking YouTube channel'
    },
    {
      id: 'timeline',
      question: 'When do you want to launch/finish?',
      type: 'date' as const,
      placeholder: 'Target completion date'
    },
    {
      id: 'experience',
      question: 'Any experience with this type of project?',
      type: 'choice' as const,
      options: [
        { value: 'none', label: 'No experience', description: 'First time' },
        { value: 'some', label: 'Some experience', description: 'Done similar before' },
        { value: 'experienced', label: 'Experienced', description: 'Done this many times' }
      ]
    },
    {
      id: 'blocker',
      question: 'What\'s the biggest blocker you expect?',
      type: 'choice' as const,
      options: [
        { value: 'start', label: 'Don\'t know where to start', description: '' },
        { value: 'time', label: 'Time management', description: '' },
        { value: 'perfectionism', label: 'Perfectionism', description: '' },
        { value: 'technical', label: 'Technical skills', description: '' }
      ]
    }
  ]
};

export default function CategoryQuestions() {
  const { currentGoal, updateCurrentGoal, setStep } = useStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const category = currentGoal.category;
  const questions = category ? categoryQuestions[category] : [];
  const question = questions[currentQ];
  const isLast = currentQ === questions.length - 1;

  if (!category) {
    setStep(1);
    return null;
  }

  const handleNext = () => {
    if (isLast) {
      const categoryData = {
        [`${category.toLowerCase()}Data`]: answers
      };
      updateCurrentGoal(categoryData);
      setStep(5);
    } else {
      setCurrentQ(currentQ + 1);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    } else {
      setStep(3);
    }
  };

  const isAnswered = () => {
    const answer = answers[question.id];
    if (question.type === 'multiChoice') {
      return answer && answer.length > 0;
    }
    return answer && (typeof answer === 'string' ? answer.trim() : true);
  };

  const toggleMultiChoice = (value: string) => {
    const current = answers[question.id] || [];
    const newValue = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    setAnswers({ ...answers, [question.id]: newValue });
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

          {/* Date input */}
          {question.type === 'date' && (
            <input
              type="date"
              value={answers[question.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
              autoFocus
              style={input.base}
              {...focusHandlers.input}
            />
          )}

          {/* Choice buttons */}
          {question.type === 'choice' && (
            <div style={{ display: 'grid', gap: tokens.spacing.md }}>
              {question.options?.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setAnswers({ ...answers, [question.id]: option.value });
                    setTimeout(handleNext, 200);
                  }}
                  style={card.selection(answers[question.id] === option.value)}
                >
                  <div style={{ fontWeight: tokens.typography.weights.regular }}>{option.label}</div>
                  {option.description && (
                    <div style={{
                      ...text.caption,
                      marginTop: tokens.spacing.xs,
                      color: answers[question.id] === option.value
                        ? tokens.colors.text.disabled
                        : tokens.colors.text.tertiary
                    }}>
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Multi-choice checkboxes */}
          {question.type === 'multiChoice' && (
            <div style={{ display: 'grid', gap: tokens.spacing.md }}>
              {question.options?.map((option) => {
                const isSelected = (answers[question.id] || []).includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleMultiChoice(option.value)}
                    style={{
                      ...card.selection(isSelected),
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.md
                    }}
                  >
                    <div style={{
                      ...checkbox.square,
                      borderColor: isSelected ? tokens.colors.text.inverse : tokens.colors.gray[300],
                      backgroundColor: isSelected ? tokens.colors.text.inverse : 'transparent',
                      flexShrink: 0
                    }}>
                      {isSelected && (
                        <div style={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: tokens.colors.primary,
                          borderRadius: tokens.borderRadius.sm
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>{option.label}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      {/* Navigation */}
      {question.type !== 'choice' && (
        <NavigationFooter
          onBack={handleBack}
          onNext={handleNext}
          nextLabel={isLast ? 'Generate Roadmap' : 'Next'}
          nextDisabled={!isAnswered()}
          showBack
          backLabel="Back"
        />
      )}
    </PageLayout>
  );
}
