import { Dumbbell, BookOpen, Palette, Brain, CheckSquare, Video } from 'lucide-react';
import { useStore } from '../store/useStore';
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      padding: '48px 24px'
    }}>
      <div style={{ maxWidth: '672px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '30px',
            fontWeight: 300,
            color: 'black',
            marginBottom: '8px'
          }}>
            What do you want to get consistent at?
          </h2>
          <p style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#999'
          }}>
            Choose a category to start
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {categories.map(({ id, icon: Icon, label, examples }) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              style={{
                padding: '24px',
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'start',
                gap: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'black';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
                const iconDiv = e.currentTarget.querySelector('div') as HTMLElement;
                if (iconDiv) {
                  iconDiv.style.backgroundColor = 'black';
                  iconDiv.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.boxShadow = 'none';
                const iconDiv = e.currentTarget.querySelector('div') as HTMLElement;
                if (iconDiv) {
                  iconDiv.style.backgroundColor = '#f5f5f5';
                  iconDiv.style.color = 'black';
                }
              }}
            >
              <div style={{
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '12px',
                transition: 'all 0.3s'
              }}>
                <Icon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 300,
                  color: 'black',
                  marginBottom: '4px'
                }}>
                  {label}
                </h3>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 300,
                  color: '#999'
                }}>
                  {examples}
                </p>
              </div>
            </button>
          ))}
        </div>

        <p style={{
          fontSize: '12px',
          fontWeight: 300,
          color: '#ccc',
          textAlign: 'center',
          marginTop: '32px'
        }}>
          You can add multiple goals later
        </p>
      </div>
    </div>
  );
}
