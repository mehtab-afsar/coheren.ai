import { useState } from 'react';
import { User, Clock, Sunrise, Target, Moon, Sun, Trash2, ChevronDown } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { updateProfile } from '@lib/database';

// ── Stone label map ───────────────────────────────────────────────────────────

const STONE_LABELS: Record<string, string> = {
  TimeConstraint:          'Time Constraint',
  ResourceGap:             'Resource Gap',
  EnvironmentFriction:     'Environment Friction',
  Inconsistency:           'Inconsistency',
  FearOfFailure:           'Fear of Failure',
  Perfectionism:           'Perfectionism',
  LowConfidence:           'Low Confidence',
  UnrealisticExpectations: 'Unrealistic Expectations',
  FocusFragility:          'Focus Fragility',
  CognitiveFatigue:        'Cognitive Fatigue',
  SkillGap:                'Skill Gap',
  ProcrastinationPattern:  'Procrastination Pattern',
  Overcommitment:          'Overcommitment',
};

const STONE_AI_ACTION: Record<string, string> = {
  TimeConstraint:          'Tasks capped at your daily budget. Micro-session fallback on every task.',
  ResourceGap:             'Tasks use only tools you already have. No new purchases required.',
  EnvironmentFriction:     'Sessions scheduled to fit your actual setting and context.',
  Inconsistency:           'Never Miss Twice rule active. Micro-tasks on off days.',
  FearOfFailure:           'Low-stakes practice before any visible or public step.',
  Perfectionism:           'Explicit ship-it milestones to break the refinement loop.',
  LowConfidence:           'Early wins sequenced first so momentum builds from Day 1.',
  UnrealisticExpectations: 'Compound progress shown, not just daily output.',
  FocusFragility:          'Single, concrete instruction per task. No vague goals.',
  CognitiveFatigue:        'Demanding tasks placed in your peak-energy window.',
  SkillGap:                'Each step scaffolded on the last — no skipped prerequisites.',
  ProcrastinationPattern:  'Every task opens with a 2-minute action step.',
  Overcommitment:          'Daily load capped. Rest days protected.',
};

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Low:      { bg: 'rgba(34,197,94,0.06)',   border: 'rgba(34,197,94,0.25)',   text: '#16a34a' },
  Moderate: { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.25)',  text: '#d97706' },
  High:     { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.25)',   text: '#dc2626' },
  Critical: { bg: 'rgba(196, 85, 45,0.06)',  border: 'rgba(196, 85, 45,0.25)', text: '#C4552D' },
};

// ── Inline preference row ─────────────────────────────────────────────────────

function PrefRow({
  icon,
  label,
  value,
  isEditing,
  onEdit,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={() => !isEditing && children && onEdit()}
      style={{
        display: 'flex',
        alignItems: isEditing ? 'flex-start' : 'center',
        gap: 14,
        padding: '14px 16px',
        cursor: !isEditing && children ? 'pointer' : 'default',
        borderBottom: '1px solid var(--c-border-subtle)',
      }}
      onMouseEnter={e => { if (!isEditing && children) e.currentTarget.style.backgroundColor = 'var(--c-surface-elevated)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <div style={{ color: 'var(--c-text-quaternary)', flexShrink: 0, marginTop: isEditing ? 2 : 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
          marginBottom: 3, fontFamily: 'var(--c-font-body)',
        }}>
          {label}
        </div>
        {isEditing ? (
          <div onClick={e => e.stopPropagation()}>
            {children}
          </div>
        ) : (
          <div style={{
            fontSize: 14, fontWeight: 500,
            color: 'var(--c-text-primary)',
            fontFamily: 'var(--c-font-body)',
          }}>
            {value}
          </div>
        )}
      </div>
      {!isEditing && children && (
        <span style={{ fontSize: 13, color: 'var(--c-text-quaternary)', flexShrink: 0 }}>›</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const user = useStore(s => s.user);

  const [editingPref, setEditingPref]       = useState<string | null>(null);
  const [tempName, setTempName]             = useState(universalProfile.name || '');
  const [tempCheckIn, setTempCheckIn]       = useState(checkInTime);
  const [expandedStone, setExpandedStone]   = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSavePref = (pref: string) => {
    if (pref === 'name') {
      const trimmed = tempName.trim();
      if (trimmed) {
        updateUniversalProfile({ name: trimmed });
        if (user?.id) {
          updateProfile(user.id, { full_name: trimmed }).catch(err =>
            console.warn('Could not sync name to DB:', err)
          );
        }
      }
    } else if (pref === 'checkin') {
      setCheckInTime(tempCheckIn);
    }
    setEditingPref(null);
  };

  const handleCancelPref = () => {
    setTempName(universalProfile.name || '');
    setTempCheckIn(checkInTime);
    setEditingPref(null);
  };

  const handleReset = async () => {
    await resetOnboarding(); // await the DB delete before navigating away
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
  const dailyMinutes = roadmap?.dailyTime || `${((currentGoal as Record<string, unknown>)?.timeline as Record<string, unknown>)?.dailyTimeCommitment_minutes ?? 30} min`;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 14,
    padding: '8px 0',
    border: 'none',
    borderBottom: '1.5px solid var(--c-accent-purple)',
    background: 'transparent',
    color: 'var(--c-text-primary)',
    outline: 'none',
    marginBottom: 10,
    fontFamily: 'var(--c-font-body)',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ fontFamily: 'var(--c-font-body)', paddingBottom: 80 }}>

      {/* ── Identity header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        {/* Initials circle */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          backgroundColor: 'var(--c-accent-purple)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'var(--c-font-display)',
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--c-text-primary)',
            margin: '0 0 2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {universalProfile.name || 'Welcome'}
          </h1>
          <p style={{
            fontSize: 13,
            color: 'var(--c-text-tertiary)',
            margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            Day {currentDay} · {streak > 0 ? `${streak}-day streak` : goalTitle}
          </p>
        </div>
      </div>

      {/* ── Your Stones ── */}
      {stones.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
            marginBottom: 12,
          }}>
            Your Patterns
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--c-border-subtle)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: 'var(--c-shadow-card)',
          }}>
            {stones.map((stone, idx) => {
              const sev = stone.severity ?? 'Low';
              const colors = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.Low;
              const isExpanded = expandedStone === stone.type;
              const barWidth = Math.max(8, Math.round((stone.riskImpact ?? 0.5) * 100));

              return (
                <div key={stone.type} style={{
                  borderTop: idx > 0 ? '1px solid var(--c-border-subtle)' : 'none',
                }}>
                  {/* Stone row */}
                  <div
                    onClick={() => setExpandedStone(isExpanded ? null : stone.type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '13px 16px',
                      cursor: 'pointer',
                      backgroundColor: isExpanded ? 'var(--c-surface-elevated)' : 'transparent',
                    }}
                  >
                    {/* Name */}
                    <span style={{
                      fontSize: 13, fontWeight: 500,
                      color: 'var(--c-text-primary)', flex: 1,
                    }}>
                      {STONE_LABELS[stone.type] ?? stone.type}
                    </span>

                    {/* Impact bar */}
                    <div style={{
                      width: 80, height: 4,
                      backgroundColor: 'var(--c-surface-elevated)',
                      borderRadius: 9999, overflow: 'hidden', flexShrink: 0,
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        backgroundColor: colors.text,
                        borderRadius: 9999,
                      }} />
                    </div>

                    {/* Severity chip */}
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: colors.text,
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      padding: '2px 7px', borderRadius: 9999,
                      flexShrink: 0,
                    }}>
                      {sev}
                    </span>

                    {/* Chevron */}
                    <ChevronDown
                      size={13}
                      color="var(--c-text-quaternary)"
                      strokeWidth={2}
                      style={{
                        flexShrink: 0,
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 14px 16px',
                      borderTop: '1px solid var(--c-border-subtle)',
                      backgroundColor: 'var(--c-surface-elevated)',
                    }}>
                      <p style={{
                        fontSize: 12,
                        color: 'var(--c-text-tertiary)',
                        margin: '12px 0 8px',
                        lineHeight: 1.55,
                      }}>
                        {stone.trigger}
                      </p>
                      <p style={{
                        fontSize: 12,
                        color: 'var(--c-accent-purple)',
                        margin: 0,
                        lineHeight: 1.55,
                      }}>
                        → {STONE_AI_ACTION[stone.type] ?? 'Your plan has been adapted for this pattern.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Preferences ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
          marginBottom: 12,
        }}>
          Preferences
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--c-shadow-card)',
        }}>
          {/* Name */}
          <PrefRow
            icon={<User size={14} strokeWidth={1.8} />}
            label="Your Name"
            value={universalProfile.name || 'Tap to set'}
            isEditing={editingPref === 'name'}
            onEdit={() => { setTempName(universalProfile.name || ''); setEditingPref('name'); }}
          >
            <>
              <input
                autoFocus
                type="text"
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSavePref('name'); if (e.key === 'Escape') handleCancelPref(); }}
                style={inputStyle}
                placeholder="Your name"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleSavePref('name')} style={{
                  flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                  background: 'var(--c-accent-purple)', color: '#fff', border: 'none',
                  borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--c-font-body)',
                }}>Save</button>
                <button onClick={handleCancelPref} style={{
                  flex: 1, padding: '7px 0', fontSize: 12,
                  background: 'transparent', color: 'var(--c-text-tertiary)',
                  border: '1px solid var(--c-border-subtle)', borderRadius: 8,
                  cursor: 'pointer', fontFamily: 'var(--c-font-body)',
                }}>Cancel</button>
              </div>
            </>
          </PrefRow>

          {/* Check-in time */}
          <PrefRow
            icon={<Clock size={14} strokeWidth={1.8} />}
            label="Daily Check-in"
            value={checkInTime}
            isEditing={editingPref === 'checkin'}
            onEdit={() => { setTempCheckIn(checkInTime); setEditingPref('checkin'); }}
          >
            <>
              <input
                autoFocus
                type="time"
                value={tempCheckIn}
                onChange={e => setTempCheckIn(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSavePref('checkin'); if (e.key === 'Escape') handleCancelPref(); }}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleSavePref('checkin')} style={{
                  flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                  background: 'var(--c-accent-purple)', color: '#fff', border: 'none',
                  borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--c-font-body)',
                }}>Save</button>
                <button onClick={handleCancelPref} style={{
                  flex: 1, padding: '7px 0', fontSize: 12,
                  background: 'transparent', color: 'var(--c-text-tertiary)',
                  border: '1px solid var(--c-border-subtle)', borderRadius: 8,
                  cursor: 'pointer', fontFamily: 'var(--c-font-body)',
                }}>Cancel</button>
              </div>
            </>
          </PrefRow>

          {/* Energy pattern — read-only */}
          <PrefRow
            icon={
              universalProfile.energyPattern === 'morning' ? <Sunrise size={14} strokeWidth={1.8} /> :
              universalProfile.energyPattern === 'evening' ? <Moon size={14} strokeWidth={1.8} /> :
              <Sun size={14} strokeWidth={1.8} />
            }
            label="Energy Peak"
            value={universalProfile.energyPattern
              ? universalProfile.energyPattern.charAt(0).toUpperCase() + universalProfile.energyPattern.slice(1)
              : 'Not set'}
            isEditing={false}
            onEdit={() => {}}
          />

          {/* Daily commitment — read-only, no border on last item */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
          }}>
            <div style={{ color: 'var(--c-text-quaternary)', flexShrink: 0 }}>
              <Target size={14} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
                marginBottom: 3,
              }}>
                Daily Commitment
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text-primary)' }}>
                {dailyMinutes}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
          marginBottom: 12,
        }}>
          Account
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--c-shadow-card)',
        }}>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left',
              }}
            >
              <Trash2 size={14} strokeWidth={1.8} color="#ef4444" />
              <span style={{ fontSize: 14, color: '#ef4444', fontFamily: 'var(--c-font-body)' }}>
                Reset all progress
              </span>
            </button>
          ) : (
            <div style={{ padding: '16px' }}>
              <p style={{
                fontSize: 13, color: 'var(--c-text-secondary)',
                margin: '0 0 14px', lineHeight: 1.5,
                fontFamily: 'var(--c-font-body)',
              }}>
                This permanently deletes all your progress, tasks, and goals. Cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
                    background: '#ef4444', color: '#fff', border: 'none',
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--c-font-body)',
                  }}
                >
                  Yes, reset everything
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 13,
                    background: 'transparent', color: 'var(--c-text-tertiary)',
                    border: '1px solid var(--c-border-subtle)', borderRadius: 8,
                    cursor: 'pointer', fontFamily: 'var(--c-font-body)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
