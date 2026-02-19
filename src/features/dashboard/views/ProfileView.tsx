import { useState } from 'react';
import { User, Clock, Bell, Trash2, Sunrise, Target, Palette, Moon, Sun } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { updateProfile } from '@lib/database';

type ProfileTab = 'profile' | 'settings';

export default function ProfileView() {
  const {
    universalProfile,
    currentGoal,
    roadmap,
    checkInTime,
    setCheckInTime,
    updateUniversalProfile,
    resetOnboarding,
  } = useStore();
  const user = useStore((state) => state.user);
  const { isMobile } = useBreakpoint();

  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [tempName, setTempName] = useState(universalProfile.name || '');
  const [tempCheckInTime, setTempCheckInTime] = useState(checkInTime);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveCard = (cardType: string) => {
    if (cardType === 'name') {
      const trimmed = tempName.trim();
      if (trimmed) {
        updateUniversalProfile({ name: trimmed });
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

  // ── Tab bar styles ──────────────────────────────────────────────────────────
  const TAB_ACTIVE_BG = `${tokens.colors.primary}12`;
  const TAB_ACTIVE_COLOR = tokens.colors.primary;
  const TAB_INACTIVE_COLOR = tokens.colors.text.tertiary;

  return (
    <div>
      {/* Page header */}
      <h1 style={{ ...text.h1, marginBottom: tokens.spacing.xl }}>
        {universalProfile.name || 'Profile'}
      </h1>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: tokens.spacing['2xl'],
        backgroundColor: tokens.colors.gray[50],
        borderRadius: tokens.borderRadius.md,
        padding: 4,
        width: 'fit-content',
      }}>
        {(['profile', 'settings'] as ProfileTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 18px',
              borderRadius: tokens.borderRadius.sm,
              border: 'none',
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: activeTab === tab ? tokens.typography.weights.medium : tokens.typography.weights.light,
              backgroundColor: activeTab === tab ? TAB_ACTIVE_BG : 'transparent',
              color: activeTab === tab ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR,
              transition: 'all 150ms ease',
              letterSpacing: activeTab === tab ? '-0.01em' : 'normal',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <>
          {/* Avatar + name */}
          <div style={{ ...card.standard, marginBottom: tokens.spacing.xl, display: 'flex', alignItems: 'center', gap: tokens.spacing.xl }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, #6d28d9 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <User size={34} color="#fff" strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ ...text.h2, marginBottom: tokens.spacing.xs }}>
                {universalProfile.name || 'User'}
              </h2>
              <p style={{ ...text.body, color: tokens.colors.text.secondary, margin: 0 }}>
                {currentGoal.specificGoal || 'No goal set'}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: tokens.spacing.lg,
            marginBottom: tokens.spacing.xl,
          }}>
            <div style={card.standard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <Sunrise size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <h3 style={{ ...text.h4, margin: 0 }}>Energy Pattern</h3>
              </div>
              <p style={{ ...text.h3, textTransform: 'capitalize', margin: 0 }}>
                {universalProfile.energyPattern || 'Not set'}
              </p>
            </div>

            <div style={card.standard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <Clock size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <h3 style={{ ...text.h4, margin: 0 }}>Wake Time</h3>
              </div>
              <p style={{ ...text.h3, margin: 0 }}>
                {universalProfile.dailyRoutine?.wakeTime || 'Not set'}
              </p>
            </div>

            <div style={card.standard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <Clock size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <h3 style={{ ...text.h4, margin: 0 }}>Daily Commitment</h3>
              </div>
              <p style={{ ...text.h3, margin: 0 }}>
                {roadmap?.dailyTime || 'Not set'}
              </p>
            </div>
          </div>

          {/* Goal details */}
          <div style={card.standard}>
            <h3 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>Current Goal</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
              {[
                { label: 'Goal', value: currentGoal.specificGoal || 'No goal set' },
                { label: 'Category', value: currentGoal.category || 'Not set', capitalize: true },
                { label: 'Duration', value: roadmap?.duration ? `${roadmap.duration} months` : 'Not set' },
              ].map(({ label, value, capitalize }) => (
                <div key={label}>
                  <p style={{ ...text.caption, color: tokens.colors.text.secondary, marginBottom: tokens.spacing.xs }}>{label}</p>
                  <p style={{ ...text.body, margin: 0, textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: tokens.spacing.lg,
            marginBottom: tokens.spacing['3xl'],
          }}>
            {/* Name */}
            <div
              style={{ ...card.standard, backgroundColor: tokens.colors.surface, padding: tokens.spacing.lg, transition: tokens.transitions.all, cursor: editingCard ? 'default' : 'pointer' }}
              onClick={() => !editingCard && setEditingCard('name')}
              onMouseEnter={(e) => { if (!editingCard) { e.currentTarget.style.borderColor = tokens.colors.primary; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={(e) => { if (!editingCard) { e.currentTarget.style.borderColor = tokens.colors.borderLight; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <User size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <span style={{ ...text.caption, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.regular }}>Your Name</span>
              </div>
              {editingCard === 'name' ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <input autoFocus type="text" value={tempName} onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCard('name'); if (e.key === 'Escape') handleCancelEdit(); }}
                    style={{ width: '100%', fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.regular, padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`, border: `1px solid ${tokens.colors.primary}`, borderRadius: tokens.borderRadius.sm, backgroundColor: tokens.colors.surface, marginBottom: tokens.spacing.sm }}
                    placeholder="Enter your name"
                  />
                  <div style={{ display: 'flex', gap: tokens.spacing.xs }}>
                    <button onClick={() => handleSaveCard('name')} style={{ flex: 1, padding: tokens.spacing.xs, fontSize: tokens.typography.sizes.sm, backgroundColor: tokens.colors.primary, color: tokens.colors.text.inverse, border: 'none', borderRadius: tokens.borderRadius.sm, cursor: 'pointer' }}>Save</button>
                    <button onClick={handleCancelEdit} style={{ flex: 1, padding: tokens.spacing.xs, fontSize: tokens.typography.sizes.sm, backgroundColor: 'transparent', color: tokens.colors.text.secondary, border: `1px solid ${tokens.colors.borderLight}`, borderRadius: tokens.borderRadius.sm, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.regular, color: tokens.colors.text.primary, marginBottom: tokens.spacing.xs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {universalProfile.name || 'Click to set'}
                  </div>
                  <div style={{ ...text.caption, fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary }}>click to edit</div>
                </>
              )}
            </div>

            {/* Check-in Time */}
            <div
              style={{ ...card.standard, backgroundColor: tokens.colors.surface, padding: tokens.spacing.lg, transition: tokens.transitions.all, cursor: editingCard ? 'default' : 'pointer' }}
              onClick={() => !editingCard && setEditingCard('checkin')}
              onMouseEnter={(e) => { if (!editingCard) { e.currentTarget.style.borderColor = tokens.colors.primary; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={(e) => { if (!editingCard) { e.currentTarget.style.borderColor = tokens.colors.borderLight; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <Clock size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <span style={{ ...text.caption, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.regular }}>Daily Check-in</span>
              </div>
              {editingCard === 'checkin' ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <input autoFocus type="time" value={tempCheckInTime} onChange={(e) => setTempCheckInTime(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCard('checkin'); if (e.key === 'Escape') handleCancelEdit(); }}
                    style={{ width: '100%', fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.regular, padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`, border: `1px solid ${tokens.colors.primary}`, borderRadius: tokens.borderRadius.sm, backgroundColor: tokens.colors.surface, marginBottom: tokens.spacing.sm }}
                  />
                  <div style={{ display: 'flex', gap: tokens.spacing.xs }}>
                    <button onClick={() => handleSaveCard('checkin')} style={{ flex: 1, padding: tokens.spacing.xs, fontSize: tokens.typography.sizes.sm, backgroundColor: tokens.colors.primary, color: tokens.colors.text.inverse, border: 'none', borderRadius: tokens.borderRadius.sm, cursor: 'pointer' }}>Save</button>
                    <button onClick={handleCancelEdit} style={{ flex: 1, padding: tokens.spacing.xs, fontSize: tokens.typography.sizes.sm, backgroundColor: 'transparent', color: tokens.colors.text.secondary, border: `1px solid ${tokens.colors.borderLight}`, borderRadius: tokens.borderRadius.sm, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.regular, color: tokens.colors.text.primary, marginBottom: tokens.spacing.xs }}>{checkInTime}</div>
                  <div style={{ ...text.caption, fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary }}>click to edit</div>
                </>
              )}
            </div>

            {/* Energy Pattern */}
            <div style={{ ...card.standard, backgroundColor: tokens.colors.surface, padding: tokens.spacing.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                {universalProfile.energyPattern === 'morning' ? <Sunrise size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} /> : universalProfile.energyPattern === 'evening' ? <Moon size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} /> : <Sun size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />}
                <span style={{ ...text.caption, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.regular }}>Energy Pattern</span>
              </div>
              <div style={{ fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.regular, color: tokens.colors.text.primary, marginBottom: tokens.spacing.xs, textTransform: 'capitalize' }}>{universalProfile.energyPattern || 'Not set'}</div>
              <div style={{ ...text.caption, fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary }}>peak time</div>
            </div>

            {/* Daily Commitment */}
            <div style={{ ...card.standard, backgroundColor: tokens.colors.surface, padding: tokens.spacing.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <Target size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <span style={{ ...text.caption, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.regular }}>Daily Commitment</span>
              </div>
              <div style={{ fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.regular, color: tokens.colors.text.primary, marginBottom: tokens.spacing.xs }}>{roadmap?.dailyTime || 'Not set'}</div>
              <div style={{ ...text.caption, fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary }}>commitment</div>
            </div>

            {/* Notifications */}
            <div style={{ ...card.standard, backgroundColor: tokens.colors.surface, padding: tokens.spacing.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <Bell size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <span style={{ ...text.caption, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.regular }}>Notifications</span>
              </div>
              <div style={{ fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.light, color: tokens.colors.text.secondary, lineHeight: tokens.typography.lineHeights.relaxed }}>
                Enable in browser settings for daily reminders
              </div>
            </div>

            {/* Appearance */}
            <div style={{ ...card.standard, backgroundColor: tokens.colors.surface, padding: tokens.spacing.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md }}>
                <Palette size={18} strokeWidth={1.5} color={tokens.colors.text.secondary} />
                <span style={{ ...text.caption, color: tokens.colors.text.secondary, fontWeight: tokens.typography.weights.regular }}>Appearance</span>
              </div>
              <div style={{ fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.light, color: tokens.colors.text.secondary, lineHeight: tokens.typography.lineHeights.relaxed }}>
                Light mode · Dark mode coming soon
              </div>
            </div>
          </div>

          {/* Profile details */}
          <div style={{ ...card.standard, marginBottom: tokens.spacing.xl }}>
            <h2 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>Profile Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.xl }}>
              {[
                { label: 'Wake Time', value: universalProfile.dailyRoutine?.wakeTime || 'Not set' },
                { label: 'Weekend Availability', value: universalProfile.weekendAvailability || 'Not set', capitalize: true },
              ].map(({ label, value, capitalize }) => (
                <div key={label}>
                  <label style={{ ...text.caption, color: tokens.colors.text.secondary, display: 'block', marginBottom: tokens.spacing.sm }}>{label}</label>
                  <p style={{ ...text.body, padding: tokens.spacing.md, backgroundColor: tokens.colors.gray[50], borderRadius: tokens.borderRadius.md, margin: 0, color: tokens.colors.text.tertiary, textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div style={{ ...card.standard, borderColor: tokens.colors.error, borderWidth: '1px', borderStyle: 'solid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, marginBottom: tokens.spacing.lg }}>
              <Trash2 size={22} color={tokens.colors.error} />
              <h2 style={{ ...text.h3, color: tokens.colors.error, margin: 0 }}>Danger Zone</h2>
            </div>
            <p style={{ ...text.bodySmall, color: tokens.colors.text.secondary, marginBottom: tokens.spacing.lg }}>
              Reset all your progress, tasks, and goals. This action cannot be undone.
            </p>
            {showResetConfirm ? (
              <div style={{ padding: tokens.spacing.lg, backgroundColor: '#FEF2F2', borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.error}` }}>
                <p style={{ ...text.body, color: tokens.colors.error, marginBottom: tokens.spacing.md }}>Are you absolutely sure? This will permanently delete all your data.</p>
                <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                  <button onClick={handleReset} style={{ padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`, backgroundColor: tokens.colors.error, color: tokens.colors.text.inverse, border: 'none', borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.sizes.md, cursor: 'pointer' }}>Yes, Reset Everything</button>
                  <button onClick={() => setShowResetConfirm(false)} style={{ padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`, backgroundColor: 'transparent', color: tokens.colors.text.secondary, border: `1px solid ${tokens.colors.borderLight}`, borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.sizes.md, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                style={{ padding: `${tokens.spacing.md} ${tokens.spacing.xl}`, backgroundColor: 'transparent', color: tokens.colors.error, border: `1px solid ${tokens.colors.error}`, borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.sizes.base, cursor: 'pointer', transition: tokens.transitions.all }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                Reset All Progress
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
