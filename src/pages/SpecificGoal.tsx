import { ArrowRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { tokens, layout, text, button, input, hoverHandlers, focusHandlers } from '../design-system';

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
    setStep(3);
  };

  const handleCustomSubmit = () => {
    if (customGoal.trim()) {
      setSpecificGoal(customGoal.trim());
      setStep(3);
    }
  };

  return (
    <div style={layout.fullPageCentered}>
      <div style={layout.contentContainer('600px')}>
        {/* Back button */}
        <button
          onClick={() => setStep(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            padding: tokens.spacing.sm,
            backgroundColor: 'transparent',
            border: 'none',
            color: tokens.colors.text.tertiary,
            fontSize: tokens.typography.sizes.md,
            fontWeight: tokens.typography.weights.light,
            cursor: 'pointer',
            marginBottom: tokens.spacing['2xl'],
            transition: tokens.transitions.all
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = tokens.colors.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = tokens.colors.text.tertiary}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: tokens.spacing['3xl']
        }}>
          <h2 style={text.h1}>
            What's your {category?.toLowerCase()} goal?
          </h2>
          <p style={{
            ...text.body,
            marginTop: tokens.spacing.sm
          }}>
            Choose from suggestions or enter your own
          </p>
        </div>

        {/* Suggestions */}
        {!isCustom && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: tokens.spacing.md,
            marginBottom: tokens.spacing.xl
          }}>
            {suggestions.map((goal) => (
              <button
                key={goal}
                onClick={() => handleSelect(goal)}
                style={{
                  ...button.secondary,
                  padding: tokens.spacing.lg
                }}
                {...hoverHandlers.lightBg}
              >
                {goal}
              </button>
            ))}
          </div>
        )}

        {/* Custom input toggle */}
        {!isCustom ? (
          <div style={{ textAlign: 'center', marginTop: tokens.spacing['2xl'] }}>
            <button
              onClick={() => setIsCustom(true)}
              style={{
                fontSize: tokens.typography.sizes.md,
                fontWeight: tokens.typography.weights.light,
                color: tokens.colors.text.tertiary,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                transition: tokens.transitions.all
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = tokens.colors.primary}
              onMouseLeave={(e) => e.currentTarget.style.color = tokens.colors.text.tertiary}
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
                ...input.base,
                marginBottom: tokens.spacing.lg
              }}
              {...focusHandlers.input}
            />

            <div style={{
              display: 'flex',
              gap: tokens.spacing.md
            }}>
              <button
                onClick={() => {
                  setIsCustom(false);
                  setCustomGoal('');
                }}
                style={{
                  ...button.secondary,
                  flex: 1
                }}
                {...hoverHandlers.lightBg}
              >
                Back to suggestions
              </button>

              <button
                onClick={handleCustomSubmit}
                disabled={!customGoal.trim()}
                style={{
                  ...(customGoal.trim() ? button.primary : button.disabled),
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing.sm
                }}
                {...(customGoal.trim() ? hoverHandlers.darkBg : {})}
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
