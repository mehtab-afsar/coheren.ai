import { useState } from 'react';
import { User, Clock, Bell, Trash2, Sunrise, Target, Moon, Sun, Brain } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens, text, card } from '@core/design-system';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { updateProfile } from '@lib/database';

type YouTab = 'you' | 'settings';

// Maps stone type → { observation, aiAction }
const STONE_PATTERNS: Record<string, { observation: string; aiAction: string }> = {
  TimeConstraint:         { observation: "You have limited time each day",                         aiAction: "I keep tasks short and respect your daily time budget" },
  ResourceGap:            { observation: "You sometimes lack access to resources",                 aiAction: "I prioritise tasks using only what you already have" },
  EnvironmentFriction:    { observation: "Your environment can get in the way",                    aiAction: "I schedule tasks that work in your actual setting" },
  Inconsistency:          { observation: "You tend to have uneven consistency",                    aiAction: "I use micro-tasks to keep momentum on off days" },
  FearOfFailure:          { observation: "You tend to avoid starting when success is uncertain",   aiAction: "I build in low-stakes practice before any public step" },
  Perfectionism:          { observation: "You sometimes delay finishing while refining",           aiAction: "I set explicit 'ship-it' milestones to break the loop" },
  LowConfidence:          { observation: "Your confidence dips when progress slows",              aiAction: "I sequence wins early so momentum builds from day one" },
  UnrealisticExpectations:{ observation: "You expect fast results and get discouraged",           aiAction: "I show compound progress charts, not just daily output" },
  FocusFragility:         { observation: "Your attention scatters when tasks are vague",          aiAction: "I write single, concrete instructions for every task" },
  CognitiveFatigue:       { observation: "You fade mentally toward the end of the day",           aiAction: "I put demanding tasks in your peak-energy window" },
  SkillGap:               { observation: "You're still building foundational skills",             aiAction: "I scaffold each step on the last — no jumps" },
  ProcrastinationPattern: { observation: "Starting is harder than continuing for you",            aiAction: "I open every task with a 2-minute action step" },
  Overcommitment:         { observation: "You take on more than your schedule can hold",          aiAction: "I cap your daily load and protect rest days" },
};

export default function YouView() {
  const {
    universalProfile,
    currentGoal,
    roadmap,
    currentDay,
    streak,
    checkInTime,
    setCheckInTime,
    updateUniversalProfile,
    resetOnboarding,
    stoneProfile,
  } = useStore();
  const user = useStore((state) => state.user);
  const { isMobile } = useBreakpoint();

  const [activeTab, setActiveTab] = useState<YouTab>('you');
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

  const initials = (universalProfile.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const goalTitle = currentGoal.specificGoal || roadmap?.title || 'Your Goal';

  const stones = stoneProfile?.stoneProfile?.stones || [];

  const TAB_ACTIVE_BG = `${tokens.colors.primary}12`;
  const TAB_ACTIVE_COLOR = tokens.colors.primary;
  const TAB_INACTIVE_COLOR = tokens.colors.text.tertiary;

  // Your Setup key-value rows
  const setupRows = [
    { label: 'Goal',        value: goalTitle },
    { label: 'Daily time',  value: roadmap?.dailyTime || `${((currentGoal as Record<string, unknown>)?.timeline as Record<string, unknown>)?.dailyTimeCommitment_minutes ?? 30} min` },
    { label: 'Focus time',  value: universalProfile.energyPattern ? `${universalProfile.energyPattern.charAt(0).toUpperCase()}${universalProfile.energyPattern.slice(1)}` : 'Not set' },
    { label: 'Wake-up',     value: universalProfile.dailyRoutine?.wakeTime || 'Not set' },
    { label: 'Weekends',    value: (universalProfile as Record<string, unknown>).weekendAvailability ? String((universalProfile as Record<string, unknown>).weekendAvailability).charAt(0).toUpperCase() + String((universalProfile as Record<string, unknown>).weekendAvailability).slice(1) : 'Not set' },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}>
        <h1 style={{
          flex: 1,
          fontSize: tokens.typography.sizes['2xl'],
          fontWeight: tokens.typography.weights.semibold,
          color: tokens.colors.text.primary,
          letterSpacing: '-0.03em',
          margin: 0,
        }}>
          You
        </h1>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '3px 10px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          borderRadius: '99px', fontSize: '11px',
          fontWeight: tokens.typography.weights.medium, color: '#fff',
          letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(124,58,237,0.35)', flexShrink: 0,
        }}>
          Day {currentDay}
        </span>
      </div>

      {/* ── Identity Hero Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)',
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing['2xl'],
        marginBottom: tokens.spacing.xl,
        boxShadow: '0 8px 32px rgba(124,58,237,0.25), 0 0 0 1px rgba(167,139,250,0.12)',
        position: 'relative' as const, overflow: 'hidden' as const,
      }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xl, position: 'relative' as const }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
            border: '2px solid rgba(167,139,250,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: 'clamp(17px, 5vw, 22px)',
              fontWeight: tokens.typography.weights.semibold,
              color: '#f3e8ff', letterSpacing: '-0.025em', margin: '0 0 4px', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              {universalProfile.name || 'Welcome'}
            </h2>
            <p style={{
              fontSize: tokens.typography.sizes.sm, color: 'rgba(196,181,253,0.65)', margin: 0,
              lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              Day {currentDay} of your {goalTitle.toLowerCase()} journey
            </p>
          </div>
        </div>

        {/* Contextual line */}
        <div style={{ marginTop: tokens.spacing.lg, paddingTop: tokens.spacing.md, borderTop: '1px solid rgba(167,139,250,0.12)', position: 'relative' as const }}>
          <p style={{ fontSize: 12, color: 'rgba(196,181,253,0.55)', margin: 0, fontStyle: 'italic' }}>
            Day {currentDay} — {streak > 0 ? `${streak}-day streak active` : 'Start your streak today'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: tokens.spacing['2xl'], backgroundColor: tokens.colors.gray[50], borderRadius: tokens.borderRadius.md, padding: 4, width: 'fit-content' }}>
        {([['you', 'You'], ['settings', 'Settings']] as [YouTab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '7px 18px', borderRadius: tokens.borderRadius.sm, border: 'none', cursor: 'pointer',
            fontSize: tokens.typography.sizes.sm,
            fontWeight: activeTab === tab ? tokens.typography.weights.medium : tokens.typography.weights.light,
            backgroundColor: activeTab === tab ? TAB_ACTIVE_BG : 'transparent',
            color: activeTab === tab ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR,
            transition: 'all 150ms ease', letterSpacing: activeTab === tab ? '-0.01em' : 'normal',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── YOU TAB ── */}
      {activeTab === 'you' && (
        <>
          {/* Your Setup — horizontal scroll */}
          <div style={{ marginBottom: tokens.spacing.xl }}>
            <h3 style={{ ...text.h3, marginBottom: tokens.spacing.md }}>Your Setup</h3>
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 4,
              scrollbarWidth: 'none',
            }}>
              {setupRows.map(({ label, value }) => (
                <div key={label} style={{
                  minWidth: 110,
                  padding: '12px 14px',
                  background: '#f9fafb',
                  borderRadius: 14,
                  border: '1px solid #f3f4f6',
                  flexShrink: 0,
                }}>
                  <p style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#9ca3af',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    margin: '0 0 4px',
                  }}>
                    {label}
                  </p>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: tokens.colors.text.primary,
                    margin: 0,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Your Patterns */}
          {stones.length > 0 && (
            <div style={{ ...card.standard, marginBottom: tokens.spacing.xl }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
                <Brain size={16} strokeWidth={1.5} color="#7c3aed" />
                <h3 style={{ ...text.h3, margin: 0 }}>Your Patterns</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
                {stones.map((stone, idx) => {
                  const pattern = STONE_PATTERNS[stone.type] ?? {
                    observation: `You have a pattern around ${stone.type.toLowerCase().replace(/([A-Z])/g, ' $1').trim()}`,
                    aiAction: "I've adjusted your plan to work with this pattern",
                  };
                  return (
                    <div key={idx} style={{
                      padding: '12px 14px',
                      background: '#f9fafb',
                      borderRadius: 12,
                      borderLeft: '3px solid #ede9fe',
                    }}>
                      <p style={{ fontSize: 13, color: '#374151', margin: '0 0 6px', lineHeight: 1.4, fontWeight: 500 }}>
                        {pattern.observation}
                      </p>
                      <p style={{ fontSize: 12, color: '#7c3aed', margin: 0, lineHeight: 1.4 }}>
                        → {pattern.aiAction}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Commitment */}
          {goalTitle && goalTitle !== 'Your Goal' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(109,40,217,0.03) 100%)',
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: tokens.borderRadius.lg,
              padding: tokens.spacing.xl,
            }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(124,58,237,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>
                My Commitment
              </p>
              <p style={{ ...text.body, margin: 0, fontStyle: 'italic', color: tokens.colors.text.primary, lineHeight: 1.5 }}>
                "{goalTitle}"
              </p>
            </div>
          )}
        </>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: tokens.spacing.lg, marginBottom: tokens.spacing['3xl'] }}>
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
                  <div style={{ fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.regular, color: tokens.colors.text.primary, marginBottom: tokens.spacing.xs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{universalProfile.name || 'Click to set'}</div>
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
                    style={{ width: '100%', fontSize: tokens.typography.sizes.lg, padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`, border: `1px solid ${tokens.colors.primary}`, borderRadius: tokens.borderRadius.sm, backgroundColor: tokens.colors.surface, marginBottom: tokens.spacing.sm }}
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

          </div>

          {/* Profile Details */}
          <div style={{ ...card.standard, marginBottom: tokens.spacing.xl }}>
            <h2 style={{ ...text.h3, marginBottom: tokens.spacing.lg }}>Profile Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: tokens.spacing.xl }}>
              {[
                { label: 'Wake Time', value: universalProfile.dailyRoutine?.wakeTime || 'Not set' },
                { label: 'Weekend Availability', value: (universalProfile as Record<string, unknown>).weekendAvailability as string || 'Not set', capitalize: true },
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
              Reset all your progress, tasks, and goals. This cannot be undone.
            </p>
            {showResetConfirm ? (
              <div style={{ padding: tokens.spacing.lg, backgroundColor: '#FEF2F2', borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.error}` }}>
                <p style={{ ...text.body, color: tokens.colors.error, marginBottom: tokens.spacing.md }}>Are you sure? This permanently deletes all your data.</p>
                <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                  <button onClick={handleReset} style={{ padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`, backgroundColor: tokens.colors.error, color: tokens.colors.text.inverse, border: 'none', borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.sizes.md, cursor: 'pointer' }}>Yes, Reset Everything</button>
                  <button onClick={() => setShowResetConfirm(false)} style={{ padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`, backgroundColor: 'transparent', color: tokens.colors.text.secondary, border: `1px solid ${tokens.colors.borderLight}`, borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.sizes.md, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowResetConfirm(true)}
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
