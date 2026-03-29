/**
 * CoachThread
 *
 * Slide-in panel (right on desktop, bottom sheet on mobile) showing a
 * chronological list of AI coach messages. Triggered by:
 *   - Sidebar "Coach" link
 *   - Center FAB on mobile
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { useCoachMessages } from '../hooks/useCoachMessages';
import type { CoachMessage } from '../hooks/useCoachMessages';
import { useStore } from '@core/store/useStore';
import { useWeeklyCheckIn } from '../hooks/useWeeklyCheckIn';
import { useCheckpoint } from '../hooks/useCheckpoint';
import { ap } from '@core/design-system/appleTokens';

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
  const pendingWeeklyCheckIn = useStore(s => s.pendingWeeklyCheckIn);

  const addWeeklyCheckIn = useStore(s => s.addWeeklyCheckIn);

  const { currentQuestion, submitAnswer, checkInAnswers, isComplete, step, totalQuestions, reset } = useWeeklyCheckIn();
  const { handleCheckpointComplete } = useCheckpoint();

  const [checkInMode, setCheckInMode] = useState(false);
  const [checkInMessages, setCheckInMessages] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([]);
  const [checkInInput, setCheckInInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [checkInMessages]);

  // Trigger check-in mode when pendingWeeklyCheckIn is set
  useEffect(() => {
    if (pendingWeeklyCheckIn !== null && !checkInMode && isOpen) {
      setCheckInMode(true);
      setCheckInMessages([
        {
          role: 'ai',
          text: `Week ${pendingWeeklyCheckIn} is done — that takes real commitment. Let's check in before I design Week ${pendingWeeklyCheckIn + 1}.`,
        },
        {
          role: 'ai',
          text: currentQuestion?.prompt ?? '',
        },
      ]);
    }
  }, [pendingWeeklyCheckIn, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // When step advances, add next AI question to checkInMessages
  useEffect(() => {
    if (!checkInMode || isComplete) return;
    if (step > 0 && currentQuestion) {
      setCheckInMessages(prev => [...prev, { role: 'ai', text: currentQuestion.prompt }]);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle check-in completion
  useEffect(() => {
    if (!isComplete || !checkInAnswers) return;

    addWeeklyCheckIn({
      weekNumber: pendingWeeklyCheckIn ?? 0,
      completedAt: new Date().toISOString(),
      answers: checkInAnswers,
    });

    setCheckInMessages(prev => [
      ...prev,
      { role: 'ai', text: `Thanks — I'm factoring this in with your Week ${pendingWeeklyCheckIn} data. Designing Week ${(pendingWeeklyCheckIn ?? 0) + 1} now...` },
    ]);

    setIsGenerating(true);
    handleCheckpointComplete(checkInAnswers).then(() => {
      setCheckInMessages(prev => [
        ...prev,
        { role: 'ai', text: `Week ${(pendingWeeklyCheckIn ?? 0) + 1} is ready. I've adjusted the plan based on your feedback. Check your Journey view.` },
      ]);
      setIsGenerating(false);
      setCheckInMode(false);
      reset();
    }).catch(() => {
      setCheckInMessages(prev => [
        ...prev,
        { role: 'ai', text: `There was an issue generating next week's plan. Your feedback has been saved — I'll apply it when you try again.` },
      ]);
      setIsGenerating(false);
    });
  }, [isComplete, checkInAnswers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate messages on open (side-effect only, no setState)
  useEffect(() => {
    if (!isOpen) return;
    const goalTitle = (currentGoal as { specificGoal?: string })?.specificGoal ?? 'your goal';
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

  const handleCheckInSend = () => {
    const text = checkInInput.trim();
    if (!text || isGenerating || isComplete) return;
    setCheckInMessages(prev => [...prev, { role: 'user', text }]);
    setCheckInInput('');
    submitAnswer(text);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.06)', zIndex: 49,
      }} />
      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, height: '100vh',
        width: isMobile ? '100%' : 370,
        backgroundColor: ap.bg, borderLeft: `1px solid ${ap.border}`,
        boxShadow: '-4px 0 24px rgba(0,0,0,.06)', zIndex: 50,
        display: 'flex', flexDirection: 'column', fontFamily: ap.font,
      }}>
        {/* Drag handle (mobile) */}
        {isMobile && (
          <div style={{ width: 36, height: 4, borderRadius: 99, background: ap.border, margin: '12px auto 0' }} />
        )}

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${ap.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: checkInMode ? ap.accent : ap.success }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: ap.textPrimary }}>
              {checkInMode ? `Week Check-In (${step + 1}/${totalQuestions})` : 'Coach'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ap.textTertiary, fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {checkInMode ? (
            <>
              {checkInMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '80%',
                    backgroundColor: msg.role === 'user' ? ap.accent : ap.surface,
                    border: `1px solid ${msg.role === 'user' ? ap.accent : ap.border}`,
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '10px 14px',
                  }}>
                    <p style={{ fontSize: 13, color: msg.role === 'user' ? '#fff' : ap.textPrimary, lineHeight: 1.65, margin: 0 }}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : (
            messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: ap.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Sparkles size={20} color={ap.accent} strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: ap.textPrimary, margin: '0 0 6px' }}>
                  Your coach is getting ready
                </p>
                <p style={{ fontSize: 13, color: ap.textTertiary, margin: 0, lineHeight: 1.5 }}>
                  Complete your first task — I'll send you a personalised message.
                </p>
              </div>
            ) : (
              [...messages].reverse().map(msg => (
                <div key={msg.id} style={{
                  backgroundColor: msg.type === 'intro' || msg.type === 'plan_adjustment'
                    ? ap.accentSoft
                    : ap.surface,
                  border: `1px solid ${msg.type === 'intro' || msg.type === 'plan_adjustment'
                    ? ap.accentMid
                    : ap.border}`,
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ap.accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {TYPE_LABELS[msg.type] ?? 'Coach'}
                    </span>
                    <span style={{ fontSize: 10, color: ap.textTertiary }}>
                      {formatRelativeTime(msg.timestamp)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: ap.textPrimary, lineHeight: 1.65, margin: 0 }}>
                    {msg.text}
                  </p>
                </div>
              ))
            )
          )}
        </div>

        {/* Check-in input */}
        {checkInMode && !isComplete && (
          <div style={{
            padding: '12px 16px',
            borderTop: `1px solid ${ap.border}`,
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}>
            <input
              value={checkInInput}
              onChange={e => setCheckInInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCheckInSend(); } }}
              placeholder="Type your answer..."
              disabled={isGenerating}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: `1px solid ${ap.border}`,
                background: ap.surface,
                color: ap.textPrimary,
                fontSize: 13,
                outline: 'none',
                fontFamily: ap.font,
              }}
            />
            <button
              onClick={handleCheckInSend}
              disabled={!checkInInput.trim() || isGenerating}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: checkInInput.trim() && !isGenerating ? ap.accent : ap.border,
                border: 'none',
                cursor: checkInInput.trim() && !isGenerating ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
        )}

        {/* Generating indicator */}
        {checkInMode && isGenerating && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${ap.border}`, flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: ap.textTertiary, margin: 0 }}>Generating your next week...</p>
          </div>
        )}
      </div>
    </>
  );
}
