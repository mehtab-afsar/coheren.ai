import { ArrowRight, Bell, Sun, Sunset, Moon } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { generateInitialTasks } from '../utils/taskGenerator';
import { tokens, text, button, input, card, hoverHandlers, focusHandlers } from '../design-system';
import { PageLayout } from '../components/layout';

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

    // Generate initial tasks for day 1 using the task generator utility
    if (roadmap) {
      const initialTasks = generateInitialTasks(roadmap.category, finalTime);
      useStore.getState().setTasks(initialTasks);
    }

    setStep(7); // Move to dashboard
  };

  return (
    <PageLayout variant="onboarding" maxWidth="standard">
      {/* Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        margin: `0 auto ${tokens.spacing['2xl']}`,
        backgroundColor: tokens.colors.gray[50],
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Bell size={24} color={tokens.colors.text.primary} />
      </div>

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: tokens.spacing['3xl']
      }}>
        <h2 style={{
          ...text.h2,
          marginBottom: tokens.spacing.md
        }}>
          When should I check in?
        </h2>
        <p style={text.body}>
          I'll send you a gentle reminder at this time each day with your tasks
        </p>
      </div>

      {/* Recommended time callout */}
      <div style={{
        padding: tokens.spacing.lg,
        backgroundColor: tokens.colors.gray[50],
        borderRadius: tokens.borderRadius.lg,
        marginBottom: tokens.spacing['2xl'],
        border: `1px solid ${tokens.colors.gray[200]}`
      }}>
        <div style={{
          ...text.caption,
          marginBottom: tokens.spacing.xs
        }}>
          Recommended for you
        </div>
        <div style={text.h4}>
          {roadmap?.recommendedTime || '7:00 AM'}
          <span style={{
            ...text.body,
            color: tokens.colors.text.tertiary,
            marginLeft: tokens.spacing.sm
          }}>
            (based on your {universalProfile.energyPattern || 'morning'} energy)
          </span>
        </div>
      </div>

      {/* Time options */}
      {!showCustom && (
        <div style={{
          display: 'grid',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing['2xl']
        }}>
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
                    ...card.standard,
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.md,
                    cursor: 'pointer',
                    textAlign: 'left' as const
                  }}
                  {...hoverHandlers.lightBg}
                >
                  <Icon size={20} color={tokens.colors.text.tertiary} />
                  <div style={{ flex: 1 }}>
                    <div style={text.body}>
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
                  ...card.selection(isSelected),
                  border: `1px solid ${isSelected ? tokens.colors.text.primary : isRecommended ? tokens.colors.text.primary : tokens.colors.gray[300]}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.md,
                  position: 'relative' as const
                }}
                {...(!isSelected ? hoverHandlers.lightBg : {})}
              >
                <Icon
                  size={20}
                  color={isSelected ? tokens.colors.primary : tokens.colors.text.tertiary}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    ...text.body,
                    color: isSelected ? tokens.colors.primary : tokens.colors.text.primary
                  }}>
                    {option.label}
                  </div>
                  <div style={{
                    ...text.caption,
                    color: isSelected ? tokens.colors.text.disabled : tokens.colors.text.tertiary
                  }}>
                    {option.period}
                  </div>
                </div>
                {isRecommended && !isSelected && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.text.primary,
                    backgroundColor: tokens.colors.gray[200],
                    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                    borderRadius: tokens.borderRadius.sm
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
        <div style={{ marginBottom: tokens.spacing['2xl'] }}>
          <label style={{
            ...text.body,
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing.sm,
            display: 'block'
          }}>
            Choose your time
          </label>
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            autoFocus
            style={{
              ...input.timeRange,
              width: '100%',
              marginBottom: tokens.spacing.md
            }}
            {...focusHandlers.input}
          />
          <button
            onClick={() => {
              setShowCustom(false);
              setCustomTime('');
            }}
            style={{
              ...text.body,
              color: tokens.colors.text.tertiary,
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
          ...(showCustom && !customTime ? button.disabled : button.primary),
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing.sm
        }}
        {...(!(showCustom && !customTime) ? hoverHandlers.darkBg : {})}
      >
        Start Tomorrow
        <ArrowRight size={20} />
      </button>

      <p style={{
        ...text.caption,
        textAlign: 'center',
        marginTop: tokens.spacing.lg
      }}>
        You can change this anytime in settings
      </p>
    </PageLayout>
  );
}
