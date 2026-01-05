import { Dumbbell, BookOpen, Palette, Brain, CheckSquare, Video } from 'lucide-react';
import { useStore } from '../store/useStore';
import { tokens, text, card } from '../design-system';
import { PageLayout } from '../components/layout';
import type { GoalCategory } from '../types/index.js';

const categories = [
  {
    id: 'Fitness' as GoalCategory,
    icon: Dumbbell,
    label: 'Fitness',
    examples: 'Boxing, Running, Yoga'
  },
  {
    id: 'Exam' as GoalCategory,
    icon: BookOpen,
    label: 'Exam Prep',
    examples: 'UPSC, GMAT, Certifications'
  },
  {
    id: 'Hobby' as GoalCategory,
    icon: Palette,
    label: 'Hobby',
    examples: 'Cooking, Guitar, Photography'
  },
  {
    id: 'Learning' as GoalCategory,
    icon: Brain,
    label: 'Learning',
    examples: 'Languages, Programming'
  },
  {
    id: 'Habit' as GoalCategory,
    icon: CheckSquare,
    label: 'Habit',
    examples: 'Reading, Meditation'
  },
  {
    id: 'Creative' as GoalCategory,
    icon: Video,
    label: 'Creative Project',
    examples: 'Book, Podcast, YouTube'
  },
];

export default function GoalSelection() {
  const { setGoalCategory, setStep } = useStore();

  const handleSelect = (category: GoalCategory) => {
    setGoalCategory(category);
    setStep(2);
  };

  const handleCardHover = (e: React.MouseEvent<HTMLButtonElement>, isEntering: boolean) => {
    const button = e.currentTarget;
    const iconDiv = button.querySelector('div') as HTMLElement;

    if (isEntering) {
      button.style.borderColor = tokens.colors.primary;
      button.style.boxShadow = tokens.shadows.lg;
      if (iconDiv) {
        iconDiv.style.backgroundColor = tokens.colors.primary;
        iconDiv.style.color = tokens.colors.text.inverse;
      }
    } else {
      button.style.borderColor = tokens.colors.gray[300];
      button.style.boxShadow = 'none';
      if (iconDiv) {
        iconDiv.style.backgroundColor = tokens.colors.gray[100];
        iconDiv.style.color = tokens.colors.primary;
      }
    }
  };

  return (
    <PageLayout variant="onboarding" maxWidth="wide">
      <div style={{
        textAlign: 'center',
        marginBottom: tokens.spacing['3xl']
      }}>
        <h2 style={text.h1}>
          What do you want to get consistent at?
        </h2>
        <p style={{
          ...text.body,
          marginTop: tokens.spacing.sm
        }}>
          Choose a category to start
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: tokens.spacing.lg
      }}>
        {categories.map(({ id, icon: Icon, label, examples }) => (
          <button
            key={id}
            onClick={() => handleSelect(id)}
            style={{
              ...card.interactive,
              padding: tokens.spacing.xl,
              borderRadius: tokens.borderRadius.xl,
              display: 'flex',
              alignItems: 'start',
              gap: tokens.spacing.lg,
              textAlign: 'left'
            }}
            onMouseEnter={(e) => handleCardHover(e, true)}
            onMouseLeave={(e) => handleCardHover(e, false)}
          >
            <div style={{
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.gray[100],
              borderRadius: tokens.borderRadius.lg,
              transition: tokens.transitions.all,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                ...text.h3,
                marginBottom: tokens.spacing.xs
              }}>
                {label}
              </h3>
              <p style={text.caption}>
                {examples}
              </p>
            </div>
          </button>
        ))}
      </div>

      <p style={{
        ...text.caption,
        textAlign: 'center',
        marginTop: tokens.spacing['2xl']
      }}>
        You can add multiple goals later
      </p>
    </PageLayout>
  );
}
