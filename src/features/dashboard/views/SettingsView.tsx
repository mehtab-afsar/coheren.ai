import { User, Clock, Bell, Trash2, Sunrise, Target, Palette, Moon, Sun } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { useState } from 'react';
import { updateProfile } from '@lib/database';
import { useBreakpoint } from '@hooks/useBreakpoint';

export default function SettingsView() {
  const {
    universalProfile,
    checkInTime,
    setCheckInTime,
    updateUniversalProfile,
    resetOnboarding,
    roadmap,
  } = useStore();

  const { isMobile } = useBreakpoint();
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [tempName, setTempName] = useState(universalProfile.name || '');
  const [tempCheckInTime, setTempCheckInTime] = useState(checkInTime);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const user = useStore((state) => state.user);

  const handleSaveCard = (cardType: string) => {
    if (cardType === 'name') {
      const trimmed = tempName.trim();
      if (trimmed) {
        updateUniversalProfile({ name: trimmed });
        // Persist to Supabase profiles table
        if (user?.id) {
          updateProfile(user.id, { full_name: trimmed }).catch((err) =>
            console.warn('Could not sync name to DB:', err)
          );
        }
      }
    } else if (cardType === 'checkin') {
      setCheckInTime(tempCheckInTime);
    }
    setEditingCard(null);
  };

  const handleCancelEdit = () => {
    setTempName(universalProfile.name || '');
    setTempCheckInTime(checkInTime);
    setEditingCard(null);
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

      {/* Quick Stats Grid - 3 rows x 2 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: tokens.spacing.lg,
        marginBottom: tokens.spacing['3xl']
      }}>
        {/* Row 1 - Profile & Check-in */}
        {/* Profile Card */}
        <div
          style={{
            ...card.standard,
            backgroundColor: tokens.colors.surface,
            padding: tokens.spacing.lg,
            transition: tokens.transitions.all,
            cursor: editingCard ? 'default' : 'pointer',
          }}
          onClick={() => !editingCard && setEditingCard('name')}
          onMouseEnter={(e) => {
            if (!editingCard) {
              e.currentTarget.style.borderColor = tokens.colors.primary;
              e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
            }
          }}
          onMouseLeave={(e) => {
            if (!editingCard) {
              e.currentTarget.style.borderColor = tokens.colors.borderLight;
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
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
            }}>Your Name</span>
          </div>

          {editingCard === 'name' ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCard('name');
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                style={{
                  width: '100%',
                  fontSize: tokens.typography.sizes.lg,
                  fontWeight: tokens.typography.weights.regular,
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  border: `1px solid ${tokens.colors.primary}`,
                  borderRadius: tokens.borderRadius.sm,
                  backgroundColor: tokens.colors.surface,
                  marginBottom: tokens.spacing.sm,
                }}
                placeholder="Enter your name"
              />
              <div style={{ display: 'flex', gap: tokens.spacing.xs }}>
                <button
                  onClick={() => handleSaveCard('name')}
                  style={{
                    flex: 1,
                    padding: tokens.spacing.xs,
                    fontSize: tokens.typography.sizes.sm,
                    backgroundColor: tokens.colors.primary,
                    color: tokens.colors.text.inverse,
                    border: 'none',
                    borderRadius: tokens.borderRadius.sm,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    flex: 1,
                    padding: tokens.spacing.xs,
                    fontSize: tokens.typography.sizes.sm,
                    backgroundColor: 'transparent',
                    color: tokens.colors.text.secondary,
                    border: `1px solid ${tokens.colors.borderLight}`,
                    borderRadius: tokens.borderRadius.sm,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.regular,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.xs,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {universalProfile.name || 'Click to set'}
              </div>
              <div style={{
                ...text.caption,
                fontSize: tokens.typography.sizes.sm,
                color: tokens.colors.text.tertiary,
              }}>
                click to edit
              </div>
            </>
          )}
        </div>

        {/* Check-in Time Card */}
        <div
          style={{
            ...card.standard,
            backgroundColor: tokens.colors.surface,
            padding: tokens.spacing.lg,
            transition: tokens.transitions.all,
            cursor: editingCard ? 'default' : 'pointer',
          }}
          onClick={() => !editingCard && setEditingCard('checkin')}
          onMouseEnter={(e) => {
            if (!editingCard) {
              e.currentTarget.style.borderColor = tokens.colors.primary;
              e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
            }
          }}
          onMouseLeave={(e) => {
            if (!editingCard) {
              e.currentTarget.style.borderColor = tokens.colors.borderLight;
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
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
            }}>Daily Check-in</span>
          </div>

          {editingCard === 'checkin' ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                type="time"
                value={tempCheckInTime}
                onChange={(e) => setTempCheckInTime(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCard('checkin');
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                style={{
                  width: '100%',
                  fontSize: tokens.typography.sizes.lg,
                  fontWeight: tokens.typography.weights.regular,
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  border: `1px solid ${tokens.colors.primary}`,
                  borderRadius: tokens.borderRadius.sm,
                  backgroundColor: tokens.colors.surface,
                  marginBottom: tokens.spacing.sm,
                }}
              />
              <div style={{ display: 'flex', gap: tokens.spacing.xs }}>
                <button
                  onClick={() => handleSaveCard('checkin')}
                  style={{
                    flex: 1,
                    padding: tokens.spacing.xs,
                    fontSize: tokens.typography.sizes.sm,
                    backgroundColor: tokens.colors.primary,
                    color: tokens.colors.text.inverse,
                    border: 'none',
                    borderRadius: tokens.borderRadius.sm,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    flex: 1,
                    padding: tokens.spacing.xs,
                    fontSize: tokens.typography.sizes.sm,
                    backgroundColor: 'transparent',
                    color: tokens.colors.text.secondary,
                    border: `1px solid ${tokens.colors.borderLight}`,
                    borderRadius: tokens.borderRadius.sm,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
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
                click to edit
              </div>
            </>
          )}
        </div>

        {/* Row 2 - Energy & Daily Time */}
        {/* Energy Pattern Card - Read Only */}
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
            }}>Energy Pattern</span>
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

        {/* Daily Time Card - Read Only */}
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
            }}>Daily Commitment</span>
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

        {/* Row 3 - Notifications & Appearance */}
        {/* Notifications Card */}
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
            <Bell size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              fontWeight: tokens.typography.weights.regular
            }}>Notifications</span>
          </div>
          <div style={{
            fontSize: tokens.typography.sizes.sm,
            fontWeight: tokens.typography.weights.light,
            color: tokens.colors.text.secondary,
            lineHeight: tokens.typography.lineHeights.relaxed,
          }}>
            Enable in browser settings for daily reminders
          </div>
        </div>

        {/* Appearance Card */}
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
            <Palette size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
            <span style={{
              ...text.caption,
              color: tokens.colors.text.secondary,
              fontWeight: tokens.typography.weights.regular
            }}>Appearance</span>
          </div>
          <div style={{
            fontSize: tokens.typography.sizes.sm,
            fontWeight: tokens.typography.weights.light,
            color: tokens.colors.text.secondary,
            lineHeight: tokens.typography.lineHeights.relaxed,
          }}>
            Light mode • Dark mode coming soon
          </div>
        </div>
      </div>

      {/* Additional Profile Details - Read Only */}
      <div style={card.standard}>
        <h2 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>
          Profile Details
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: tokens.spacing.xl
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
