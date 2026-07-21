/**
 * TodayHero — the redesigned Today surface (spec V.1/V.2), built on primitives.
 *
 * Presentational: takes the day's task + handlers so it can be previewed in
 * isolation and dropped into TodayView without changing the daily-loop wiring.
 * One type system (Fraunces = moments, Inter = interaction); no ad-hoc styles.
 */
import { Flame, ChevronRight, Sparkles } from 'lucide-react';
import { Button, Chip, SegmentBar } from '@shared/components/ui/primitives';

const FR = "'Fraunces', serif";

export interface HeroTask {
  title: string;
  type?: string;
  duration: number;
  whyThisMatters?: string;
  successCriteria?: string;
  segments?: { label: string; minutes: number }[];
}

interface TodayHeroProps {
  firstName?: string;
  currentDay: number;
  phaseName?: string;
  streak: number;
  streakFrozen?: boolean;
  task: HeroTask | null;
  alsoTodayCount?: number;
  adjustedThisWeek?: boolean;
  onBegin: () => void;
  onMarkDone: () => void;
  onSkip: () => void;
  onShowAlsoToday?: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function TodayHero({
  firstName, currentDay, phaseName, streak, streakFrozen,
  task, alsoTodayCount = 0, adjustedThisWeek, onBegin, onMarkDone, onSkip, onShowAlsoToday,
}: TodayHeroProps) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 96px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontFamily: FR, fontSize: 26, fontWeight: 500, color: 'var(--c-text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
          {greeting()}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <div title={streakFrozen ? 'A freeze is protecting your streak' : `${streak}-day streak`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999,
            background: 'var(--c-streak-soft, rgba(232,85,58,.08))', color: 'var(--c-streak, #E8553A)', fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
          <Flame size={15} />{streak}
          {streakFrozen && <span title="Streak freeze active" style={{ fontSize: 12 }}>🛡️</span>}
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--c-text-tertiary)', marginBottom: 20 }}>
        Day {currentDay}{phaseName ? ` · ${phaseName}` : ''}
      </div>

      {/* Adjust banner (recalibration made visible) */}
      {adjustedThisWeek && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', marginBottom: 16,
          background: 'var(--c-accent-purple-soft)', border: '1px solid var(--c-accent-purple-border)', borderRadius: 12 }}>
          <Sparkles size={16} style={{ color: 'var(--c-accent-purple)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--c-text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--c-text-primary)' }}>This week was adjusted for you.</strong> Today's task reflects last week's progress.
          </div>
        </div>
      )}

      {/* THE hero task */}
      {task ? (
        <div style={{ background: 'var(--c-surface-card)', border: '1px solid var(--c-border-subtle)', borderRadius: 20, padding: 24, boxShadow: 'var(--c-shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Chip tone="accent">{task.type ?? 'Focus'}</Chip>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-tertiary)', letterSpacing: '0.02em' }}>{task.duration} MIN</span>
          </div>

          <h2 style={{ fontFamily: FR, fontSize: 24, fontWeight: 500, lineHeight: 1.25, color: 'var(--c-text-primary)', margin: '0 0 12px' }}>
            {task.title}
          </h2>

          {task.whyThisMatters && (
            <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--c-text-secondary)', lineHeight: 1.55, margin: '0 0 16px', paddingLeft: 12, borderLeft: '2px solid var(--c-accent-purple-border)' }}>
              {task.whyThisMatters}
            </p>
          )}

          {task.segments && task.segments.length > 0 && (
            <div style={{ marginBottom: 16 }}><SegmentBar segments={task.segments} /></div>
          )}

          {task.successCriteria && (
            <div style={{ fontSize: 13, color: 'var(--c-text-tertiary)', marginBottom: 20 }}>
              <span style={{ fontWeight: 600, color: 'var(--c-text-secondary)' }}>Done when: </span>{task.successCriteria}
            </div>
          )}

          <Button variant="primary" size="lg" full onClick={onBegin}>Begin session →</Button>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button variant="ghost" size="sm" full onClick={onMarkDone}>Mark done</Button>
            <Button variant="ghost" size="sm" full onClick={onSkip}>Skip for now</Button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--c-surface-card)', border: '1px solid var(--c-border-subtle)', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: FR, fontSize: 20, color: 'var(--c-text-primary)' }}>Preparing today's focus…</div>
        </div>
      )}

      {/* Also today */}
      {alsoTodayCount > 0 && (
        <button onClick={onShowAlsoToday} style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer', padding: '10px 4px', color: 'var(--c-text-secondary)', fontSize: 14, fontWeight: 500 }}>
          Also today ({alsoTodayCount}) <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
