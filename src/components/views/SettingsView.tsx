import { User, Clock, Bell, Trash2, Sunrise, Calendar, Target, Palette, Moon, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';
import { useState } from 'react';

export default function SettingsView() {
  const {
    universalProfile,
    checkInTime,
    setCheckInTime,
    updateUniversalProfile,
    resetOnboarding,
    roadmap,
  } = useStore();

  const [editMode, setEditMode] = useState(false);
  const [tempName, setTempName] = useState(universalProfile.name || '');
  const [tempCheckInTime, setTempCheckInTime] = useState(checkInTime);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveProfile = () => {
    if (tempName.trim()) {
      updateUniversalProfile({ name: tempName.trim() });
    }
    setCheckInTime(tempCheckInTime);
    setEditMode(false);
  };

  const handleReset = () => {
    resetOnboarding();
    window.location.href = '/';
  };

  return (
    <div>
      <h1 style={{ ...text.h1, marginBottom: tokens.spacing['2xl'] }}>
        Settings
      </h1>

      {/* Quick Stats - Like Today Page */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: tokens.spacing.lg,
        marginBottom: tokens.spacing['3xl']
      }}>
        {/* Profile Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.surface,
          padding: tokens.spacing.lg,
          transition: tokens.transitions.all,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <User size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              fontWeight: tokens.typography.weights.regular
            }}>Profile</span>
          </div>
          <div style={{
            fontSize: tokens.typography.sizes.lg,
            fontWeight: tokens.typography.weights.regular,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.xs,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {universalProfile.name || 'Not set'}
          </div>
          <div style={{
            ...text.caption,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.tertiary,
          }}>
            your name
          </div>
        </div>

        {/* Check-in Time Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.surface,
          padding: tokens.spacing.lg,
          transition: tokens.transitions.all,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Clock size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              fontWeight: tokens.typography.weights.regular
            }}>Check-in</span>
          </div>
          <div style={{
            fontSize: tokens.typography.sizes.lg,
            fontWeight: tokens.typography.weights.regular,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.xs
          }}>
            {checkInTime}
          </div>
          <div style={{
            ...text.caption,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.tertiary,
          }}>
            daily reminder
          </div>
        </div>

        {/* Energy Pattern Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.surface,
          padding: tokens.spacing.lg,
          transition: tokens.transitions.all,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            {universalProfile.energyPattern === 'morning' ? (
              <Sunrise size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            ) : universalProfile.energyPattern === 'evening' ? (
              <Moon size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            ) : (
              <Sun size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            )}
            <span style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              fontWeight: tokens.typography.weights.regular
            }}>Energy</span>
          </div>
          <div style={{
            fontSize: tokens.typography.sizes.lg,
            fontWeight: tokens.typography.weights.regular,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.xs,
            textTransform: 'capitalize'
          }}>
            {universalProfile.energyPattern || 'Not set'}
          </div>
          <div style={{
            ...text.caption,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.tertiary,
          }}>
            peak time
          </div>
        </div>

        {/* Daily Time Card */}
        <div style={{
          ...card.standard,
          backgroundColor: tokens.colors.surface,
          padding: tokens.spacing.lg,
          transition: tokens.transitions.all,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md
          }}>
            <Target size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              fontWeight: tokens.typography.weights.regular
            }}>Daily Time</span>
          </div>
          <div style={{
            fontSize: tokens.typography.sizes.lg,
            fontWeight: tokens.typography.weights.regular,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.xs
          }}>
            {roadmap?.dailyTime || 'Not set'}
          </div>
          <div style={{
            ...text.caption,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.tertiary,
          }}>
            commitment
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <div style={card.standard}>
        <h2 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>
          Account Settings
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: tokens.spacing.xl
        }}>
          {/* Name */}
          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Your Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                style={{
                  width: '100%',
                  padding: tokens.spacing.md,
                  border: `1px solid ${tokens.colors.borderLight}`,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.md,
                  fontFamily: tokens.typography.fontFamily.primary,
                  backgroundColor: tokens.colors.surface,
                }}
                placeholder="Enter your name"
              />
            ) : (
              <p style={{
                ...text.body,
                padding: tokens.spacing.md,
                backgroundColor: tokens.colors.gray[50],
                borderRadius: tokens.borderRadius.md,
                margin: 0
              }}>
                {universalProfile.name || 'Not set'}
              </p>
            )}
          </div>

          {/* Check-in Time */}
          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Daily Check-in Time
            </label>
            {editMode ? (
              <input
                type="time"
                value={tempCheckInTime}
                onChange={(e) => setTempCheckInTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: tokens.spacing.md,
                  border: `1px solid ${tokens.colors.borderLight}`,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.md,
                  fontFamily: tokens.typography.fontFamily.primary,
                  backgroundColor: tokens.colors.surface,
                }}
              />
            ) : (
              <p style={{
                ...text.body,
                padding: tokens.spacing.md,
                backgroundColor: tokens.colors.gray[50],
                borderRadius: tokens.borderRadius.md,
                margin: 0
              }}>
                {checkInTime}
              </p>
            )}
          </div>
        </div>

        {/* Wake Time & Weekend - Read Only */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: tokens.spacing.xl,
          marginTop: tokens.spacing.lg
        }}>
          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Wake Time
            </label>
            <p style={{
              ...text.body,
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.gray[50],
              borderRadius: tokens.borderRadius.md,
              margin: 0,
              color: tokens.colors.text.tertiary
            }}>
              {universalProfile.dailyRoutine?.wakeTime || 'Not set'}
            </p>
          </div>

          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Weekend Availability
            </label>
            <p style={{
              ...text.body,
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.gray[50],
              borderRadius: tokens.borderRadius.md,
              margin: 0,
              color: tokens.colors.text.tertiary,
              textTransform: 'capitalize'
            }}>
              {universalProfile.weekendAvailability || 'Not set'}
            </p>
          </div>
        </div>

        {/* Edit/Save Buttons */}
        <div style={{ marginTop: tokens.spacing.xl, display: 'flex', gap: tokens.spacing.md }}>
          {editMode ? (
            <>
              <button
                onClick={handleSaveProfile}
                style={{
                  padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                  backgroundColor: tokens.colors.primary,
                  color: tokens.colors.text.inverse,
                  border: 'none',
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.regular,
                  cursor: 'pointer',
                  transition: tokens.transitions.all,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.primaryHover;
                  e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.primary;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setTempName(universalProfile.name || '');
                  setTempCheckInTime(checkInTime);
                }}
                style={{
                  padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                  backgroundColor: 'transparent',
                  color: tokens.colors.text.secondary,
                  border: `1px solid ${tokens.colors.borderLight}`,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.regular,
                  cursor: 'pointer',
                  transition: tokens.transitions.all,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.state.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                backgroundColor: tokens.colors.surface,
                color: tokens.colors.text.primary,
                border: `1px solid ${tokens.colors.borderLight}`,
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.sizes.base,
                fontWeight: tokens.typography.weights.regular,
                cursor: 'pointer',
                transition: tokens.transitions.all,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.state.hover;
                e.currentTarget.style.borderColor = tokens.colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.surface;
                e.currentTarget.style.borderColor = tokens.colors.borderLight;
              }}
            >
              Edit Settings
            </button>
          )}
        </div>
      </div>

      {/* Preferences Section */}
      <div style={{
        ...card.standard,
        marginTop: tokens.spacing.xl
      }}>
        <h2 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>
          Preferences
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.lg
        }}>
          {/* Notifications */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: tokens.spacing.lg,
            padding: tokens.spacing.lg,
            backgroundColor: tokens.colors.gray[50],
            borderRadius: tokens.borderRadius.md,
          }}>
            <Bell size={24} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            <div style={{ flex: 1 }}>
              <h3 style={{
                ...text.h4,
                marginBottom: tokens.spacing.sm
              }}>
                Daily Reminders
              </h3>
              <p style={{
                ...text.bodySmall,
                color: tokens.colors.text.secondary,
                margin: 0
              }}>
                Enable browser notifications to receive check-in reminders at your preferred time.
              </p>
            </div>
          </div>

          {/* Theme (Placeholder for future) */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: tokens.spacing.lg,
            padding: tokens.spacing.lg,
            backgroundColor: tokens.colors.gray[50],
            borderRadius: tokens.borderRadius.md,
          }}>
            <Palette size={24} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            <div style={{ flex: 1 }}>
              <h3 style={{
                ...text.h4,
                marginBottom: tokens.spacing.sm
              }}>
                Appearance
              </h3>
              <p style={{
                ...text.bodySmall,
                color: tokens.colors.text.secondary,
                margin: 0
              }}>
                Theme customization coming soon. Currently using light mode.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{
        ...card.standard,
        marginTop: tokens.spacing.xl,
        borderColor: tokens.colors.error,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.lg
        }}>
          <Trash2 size={24} color={tokens.colors.error} />
          <h2 style={{ ...text.h3, color: tokens.colors.error, margin: 0 }}>Danger Zone</h2>
        </div>

        <p style={{
          ...text.bodySmall,
          color: tokens.colors.text.secondary,
          marginBottom: tokens.spacing.lg
        }}>
          Reset all your progress, tasks, and goals. This action cannot be undone.
        </p>

        {showResetConfirm ? (
          <div style={{
            padding: tokens.spacing.lg,
            backgroundColor: '#FEF2F2',
            borderRadius: tokens.borderRadius.md,
            border: `1px solid ${tokens.colors.error}`
          }}>
            <p style={{
              ...text.body,
              color: tokens.colors.error,
              marginBottom: tokens.spacing.md
            }}>
              Are you absolutely sure? This will permanently delete all your data.
            </p>
            <div style={{ display: 'flex', gap: tokens.spacing.md }}>
              <button
                onClick={handleReset}
                style={{
                  padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                  backgroundColor: tokens.colors.error,
                  color: tokens.colors.text.inverse,
                  border: 'none',
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.md,
                  fontWeight: tokens.typography.weights.regular,
                  cursor: 'pointer'
                }}
              >
                Yes, Reset Everything
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                  backgroundColor: 'transparent',
                  color: tokens.colors.text.secondary,
                  border: `1px solid ${tokens.colors.borderLight}`,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.md,
                  fontWeight: tokens.typography.weights.regular,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            style={{
              padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
              backgroundColor: 'transparent',
              color: tokens.colors.error,
              border: `1px solid ${tokens.colors.error}`,
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.regular,
              cursor: 'pointer',
              transition: tokens.transitions.all,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Reset All Progress
          </button>
        )}
      </div>
    </div>
  );
}
