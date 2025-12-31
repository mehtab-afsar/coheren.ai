import { Bell, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { tokens, text, card, button, hoverHandlers } from '../design-system';
import {
  isNotificationSupported,
  getNotificationPermission,
  initializeNotifications
} from '../utils/notifications';

interface NotificationPromptProps {
  checkInTime: string;
  onDismiss: () => void;
}

export default function NotificationPrompt({ checkInTime, onDismiss }: NotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if notifications are supported and permission hasn't been decided
    if (isNotificationSupported()) {
      const permission = getNotificationPermission();
      setIsVisible(permission.prompt);
    }
  }, []);

  const handleEnable = async () => {
    const granted = await initializeNotifications(checkInTime);

    if (granted) {
      // Show success message
      alert('Notifications enabled! You\'ll receive daily reminders at ' + checkInTime);
    } else {
      // Show error or instructions
      alert('Unable to enable notifications. Please check your browser settings.');
    }

    setIsVisible(false);
    onDismiss();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style={{
      ...card.standard,
      border: `1px solid ${tokens.colors.gray[200]}`,
      marginBottom: tokens.spacing.xl
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: tokens.spacing.md
      }}>
        <div style={{
          display: 'flex',
          gap: tokens.spacing.md,
          flex: 1
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: tokens.colors.text.primary,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bell size={20} color={tokens.colors.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              ...text.body,
              fontWeight: tokens.typography.weights.medium,
              marginBottom: tokens.spacing.xs
            }}>
              Get daily reminders
            </h3>
            <p style={{
              ...text.bodySmall,
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing.md
            }}>
              We'll remind you at {checkInTime} each day to check in and complete your tasks.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `background-color ${tokens.transitions.fast}`,
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = tokens.colors.gray[100]}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={16} color={tokens.colors.text.tertiary} />
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: tokens.spacing.sm
      }}>
        <button
          onClick={handleEnable}
          style={{
            ...button.primary,
            flex: 1
          }}
          {...hoverHandlers.darkBg}
        >
          Enable notifications
        </button>
        <button
          onClick={handleDismiss}
          style={{
            ...button.secondary,
            flex: 1
          }}
          {...hoverHandlers.lightBg}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
