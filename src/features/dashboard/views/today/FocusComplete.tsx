import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { haptics } from '@utils/haptics';

interface FocusCompleteProps {
  taskId: string;
  taskTitle: string;
  timeSpentSeconds: number;
  newStreak: number;
  onComplete: (mood: number, reflection: string) => void;
  onClose: () => void;
}

type Step = 'mood' | 'reflection' | 'celebration';

const MOODS = [
  { value: 1, emoji: '😫', label: 'Hard' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'OK' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Great' },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export default function FocusComplete({
  timeSpentSeconds,
  newStreak,
  onComplete,
  onClose,
}: FocusCompleteProps) {
  const [step, setStep] = useState<Step>('mood');
  const [selectedMood, setSelectedMood] = useState<number>(0);
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    if (step !== 'celebration') return;
    const tid = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(tid);
  }, [step, onClose]);

  const handleMoodSelect = (value: number) => {
    haptics.light();
    setSelectedMood(value);
    setTimeout(() => setStep('reflection'), 300);
  };

  const handleComplete = (text: string) => {
    onComplete(selectedMood, text);
    setStep('celebration');
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9900,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#0d0d14',
    borderRadius: '20px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panelStyle}>
        {/* sparkle keyframes */}
        <style>{`
          @keyframes sparkleWiggle {
            0%   { transform: rotate(0deg) scale(1); }
            20%  { transform: rotate(15deg) scale(1.1); }
            40%  { transform: rotate(-15deg) scale(1.1); }
            60%  { transform: rotate(10deg) scale(1.05); }
            80%  { transform: rotate(-10deg) scale(1.05); }
            100% { transform: rotate(0deg) scale(1); }
          }
        `}</style>

        <AnimatePresence mode="wait">
          {step === 'mood' && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, textAlign: 'center', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                How did that feel?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', margin: '0 0 32px' }}>
                Tap to rate this session
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => handleMoodSelect(m.value)}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      border: '2px solid',
                      borderColor: selectedMood === m.value ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)',
                      backgroundColor: selectedMood === m.value ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      fontSize: 28,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      transform: selectedMood === m.value ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                    title={m.label}
                  >
                    <span>{m.emoji}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'reflection' && (
            <motion.div
              key="reflection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, textAlign: 'center', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                Quick thought?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', margin: '0 0 24px' }}>
                Optional
              </p>
              <textarea
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder="I noticed that..."
                rows={4}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.8)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'none',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleComplete('')}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                >
                  Skip
                </button>
                <button
                  onClick={() => handleComplete(reflection)}
                  style={{
                    flex: 2,
                    padding: '11px 0',
                    backgroundColor: '#7c3aed',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}

          {step === 'celebration' && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <Sparkles
                  size={48}
                  color="#a78bfa"
                  strokeWidth={1.5}
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(167,139,250,0.7))',
                    animation: 'sparkleWiggle 0.6s ease-in-out',
                  }}
                />
              </div>
              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
                Task complete! 🎉
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#c4b5fd', letterSpacing: '-0.02em' }}>
                    {formatTime(timeSpentSeconds)}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Time Spent
                  </p>
                </div>
                <div style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fdba74', letterSpacing: '-0.02em' }}>
                    {newStreak}d
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Streak
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  backgroundColor: '#7c3aed',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.45)',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                Back to Today
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
