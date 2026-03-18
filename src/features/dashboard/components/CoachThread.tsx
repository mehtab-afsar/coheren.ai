/**
 * CoachThread
 *
 * Slide-in panel (right on desktop, bottom sheet on mobile) showing a
 * chronological list of AI coach messages. Triggered by:
 *   - Sidebar "Coach" link
 *   - Center FAB on mobile
 */

import { useEffect, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { tokens } from '@core/design-system';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { useCoachMessages } from '../hooks/useCoachMessages';
import type { CoachMessage } from '../hooks/useCoachMessages';
import { useStore } from '@core/store/useStore';

interface CoachThreadProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_LABELS: Record<CoachMessage['type'], string> = {
  daily_brief:         'Daily Brief',
  task_complete:       'Task Done',
  streak_milestone:    'Milestone',
  plan_adjustment:     'Plan Update',
  pattern_observation: 'Observation',
  intro:               'Getting Started',
};

export default function CoachThread({ isOpen, onClose }: CoachThreadProps) {
  const { isMobile } = useBreakpoint();
  const { getMessages, markAllRead, generateIntroMessages, generateDailyBrief } = useCoachMessages();

  const currentGoal = useStore(s => s.currentGoal);
  const tasks = useStore(s => s.tasks);
  const currentDay = useStore(s => s.currentDay);

  // Generate messages on open (side-effect only, no setState)
  useEffect(() => {
    if (!isOpen) return;
    const goalTitle = currentGoal?.specificGoal ?? 'your goal';
    generateIntroMessages(goalTitle);
    const todayTasks = tasks.filter(t => t.day === currentDay && !t.skipped && !t.completed);
    if (todayTasks.length > 0) {
      generateDailyBrief(todayTasks[0].title, currentDay);
    }
    markAllRead();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive messages from storage when panel is open
  const messages = useMemo(() => {
    if (!isOpen) return [];
    return getMessages();
  }, [isOpen, getMessages]);

  if (!isOpen) return null;

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9900,
        backgroundColor: tokens.colors.surface,
        borderRadius: '20px 20px 0 0',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }
    : {
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9900,
        width: 360, backgroundColor: tokens.colors.surface,
        borderLeft: `1px solid ${tokens.colors.border}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.08)',
      };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9850, backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div style={panelStyle}>
        {/* Drag handle (mobile) */}
        {isMobile && (
          <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e5e7eb', margin: '12px auto 0' }} />
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: isMobile ? '16px 20px 14px' : '20px 20px 14px',
          borderBottom: `1px solid ${tokens.colors.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sparkles size={14} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
              AI Coach
            </p>
            <p style={{ fontSize: 11, color: tokens.colors.text.tertiary, margin: 0 }}>
              Personalised to your journey
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.04)', color: tokens.colors.text.tertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Sparkles size={20} color="#7c3aed" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: tokens.colors.text.primary, margin: '0 0 6px' }}>
                Your coach is getting ready
              </p>
              <p style={{ fontSize: 13, color: tokens.colors.text.tertiary, margin: 0, lineHeight: 1.5 }}>
                Complete your first task — I'll send you a personalised message.
              </p>
            </div>
          ) : (
            [...messages].reverse().map(msg => (
              <div key={msg.id} style={{
                backgroundColor: msg.type === 'intro' || msg.type === 'plan_adjustment'
                  ? '#f5f3ff'
                  : tokens.colors.background,
                border: `1px solid ${msg.type === 'intro' || msg.type === 'plan_adjustment'
                  ? 'rgba(124,58,237,0.15)'
                  : tokens.colors.border}`,
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {TYPE_LABELS[msg.type] ?? 'Coach'}
                  </span>
                  <span style={{ fontSize: 10, color: tokens.colors.text.tertiary }}>
                    {formatRelativeTime(msg.timestamp)}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: tokens.colors.text.primary, lineHeight: 1.65, margin: 0 }}>
                  {msg.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
