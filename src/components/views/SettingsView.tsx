import { User, Clock, Bell, Trash2, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { tokens, text, card } from '../../design-system';
import { useState } from 'react';

export default function SettingsView() {
  const {
    universalProfile,
    checkInTime,
    setCheckInTime,
    updateUniversalProfile,
    resetOnboarding
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

      {/* Profile Settings */}
      <div style={card.standard}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.xl
        }}>
          <User size={24} color={tokens.colors.text.secondary} />
          <h2 style={text.h3}>Profile</h2>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.lg
        }}>
          {/* Name */}
          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                style={{
                  width: '100%',
                  padding: tokens.spacing.md,
                  border: `1px solid ${tokens.colors.gray[300]}`,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.md,
                  fontFamily: tokens.typography.fontFamily.primary,
                }}
                placeholder="Enter your name"
              />
            ) : (
              <p style={text.body}>{universalProfile.name || 'Not set'}</p>
            )}
          </div>

          {/* Energy Pattern */}
          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Energy Pattern
            </label>
            <p style={text.body}>
              {universalProfile.energyPattern
                ? universalProfile.energyPattern.charAt(0).toUpperCase() + universalProfile.energyPattern.slice(1)
                : 'Not set'}
            </p>
          </div>

          {/* Wake Time */}
          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Wake Time
            </label>
            <p style={text.body}>
              {universalProfile.dailyRoutine?.wakeTime || 'Not set'}
            </p>
          </div>

          {/* Daily Commitment */}
          <div>
            <label style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              display: 'block',
              marginBottom: tokens.spacing.sm
            }}>
              Weekend Availability
            </label>
            <p style={text.body}>
              {universalProfile.weekendAvailability
                ? universalProfile.weekendAvailability.charAt(0).toUpperCase() + universalProfile.weekendAvailability.slice(1)
                : 'Not set'}
            </p>
          </div>

          {/* Edit/Save Button */}
          <div style={{ marginTop: tokens.spacing.md }}>
            {editMode ? (
              <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                <button
                  onClick={handleSaveProfile}
                  style={{
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    backgroundColor: tokens.colors.primary,
                    color: tokens.colors.text.inverse,
                    border: 'none',
                    borderRadius: tokens.borderRadius.md,
                    fontSize: tokens.typography.sizes.md,
                    fontWeight: tokens.typography.weights.regular,
                    cursor: 'pointer'
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
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    backgroundColor: 'transparent',
                    color: tokens.colors.text.secondary,
                    border: `1px solid ${tokens.colors.gray[300]}`,
                    borderRadius: tokens.borderRadius.md,
                    fontSize: tokens.typography.sizes.md,
                    fontWeight: tokens.typography.weights.regular,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                style={{
                  padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                  backgroundColor: tokens.colors.gray[100],
                  color: tokens.colors.text.primary,
                  border: 'none',
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.md,
                  fontWeight: tokens.typography.weights.regular,
                  cursor: 'pointer'
                }}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Check-in Time */}
      <div style={{
        ...card.standard,
        marginTop: tokens.spacing.xl
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.xl
        }}>
          <Clock size={24} color={tokens.colors.text.secondary} />
          <h2 style={text.h3}>Daily Check-in</h2>
        </div>

        <div>
          <label style={{
            ...text.caption,
            color: tokens.colors.text.secondary,
            display: 'block',
            marginBottom: tokens.spacing.sm
          }}>
            Preferred Check-in Time
          </label>
          {editMode ? (
            <input
              type="time"
              value={tempCheckInTime}
              onChange={(e) => setTempCheckInTime(e.target.value)}
              style={{
                padding: tokens.spacing.md,
                border: `1px solid ${tokens.colors.gray[300]}`,
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.sizes.md,
                fontFamily: tokens.typography.fontFamily.primary,
              }}
            />
          ) : (
            <p style={text.body}>{checkInTime}</p>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div style={{
        ...card.standard,
        marginTop: tokens.spacing.xl
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.xl
        }}>
          <Bell size={24} color={tokens.colors.text.secondary} />
          <h2 style={text.h3}>Notifications</h2>
        </div>

        <p style={{
          ...text.bodySmall,
          color: tokens.colors.text.secondary
        }}>
          Daily reminders help you stay consistent with your goals. Enable notifications in your browser settings to receive check-in reminders.
        </p>
      </div>

      {/* Danger Zone */}
      <div style={{
        ...card.standard,
        marginTop: tokens.spacing.xl,
        borderColor: tokens.colors.semantic.error,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.xl
        }}>
          <Trash2 size={24} color={tokens.colors.semantic.error} />
          <h2 style={{ ...text.h3, color: tokens.colors.semantic.error }}>Danger Zone</h2>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.lg
        }}>
          <div>
            <h4 style={{ ...text.h4, marginBottom: tokens.spacing.xs }}>
              Reset Progress
            </h4>
            <p style={{
              ...text.bodySmall,
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing.md
            }}>
              This will delete all your progress, tasks, and start fresh. This action cannot be undone.
            </p>

            {showResetConfirm ? (
              <div style={{
                padding: tokens.spacing.lg,
                backgroundColor: tokens.colors.gray[50],
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.semantic.error}`
              }}>
                <p style={{
                  ...text.body,
                  color: tokens.colors.semantic.error,
                  marginBottom: tokens.spacing.md
                }}>
                  Are you absolutely sure? This will permanently delete all your data.
                </p>
                <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                      backgroundColor: tokens.colors.semantic.error,
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
                      border: `1px solid ${tokens.colors.gray[300]}`,
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
                  padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                  backgroundColor: 'transparent',
                  color: tokens.colors.semantic.error,
                  border: `1px solid ${tokens.colors.semantic.error}`,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.md,
                  fontWeight: tokens.typography.weights.regular,
                  cursor: 'pointer'
                }}
              >
                Reset All Progress
              </button>
            )}
          </div>
        </div>
      </div>

      {/* App Info */}
      <div style={{
        ...card.standard,
        marginTop: tokens.spacing.xl,
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.md
        }}>
          <Info size={16} color={tokens.colors.text.tertiary} />
          <span style={{
            ...text.caption,
            color: tokens.colors.text.tertiary
          }}>
            Coheren.ai v1.0.0
          </span>
        </div>
        <p style={{
          ...text.caption,
          color: tokens.colors.text.tertiary
        }}>
          Your AI-powered coach for achieving goals
        </p>
      </div>
    </div>
  );
}
