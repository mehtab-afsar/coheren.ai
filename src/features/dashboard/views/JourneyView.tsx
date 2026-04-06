/**
 * JourneyView — "Your Map"
 *
 * Phases as section dividers with progress bars.
 * Week rows as single horizontal lines (✓/▶/·).
 * Inline day expansion (no modal/drawer).
 * Locked phases visible but muted — builds anticipation.
 */

import { useState } from 'react';
import { Lock, Check } from 'lucide-react';
import { useStore } from '@core/store/useStore';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDayRange(startDay: number, endDay: number): string {
  const toDate = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + (d - 1));
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  return `${toDate(startDay)} – ${toDate(endDay)}`;
}

export default function JourneyView() {
  const agentRoadmapV2 = useStore(s => s.agentRoadmapV2);
  const currentDay = useStore(s => s.currentDay);
  const tasks = useStore(s => s.tasks);
  const goalTitle = useStore(s =>
    (s.currentGoal as { specificGoal?: string })?.specificGoal ?? s.roadmap?.title ?? 'Your Journey'
  );

  const totalDays = agentRoadmapV2?.totalDays ?? 90;
  const currentWeek = Math.ceil((currentDay || 1) / 7);
  const overallProgress = agentRoadmapV2
    ? Math.min(100, Math.round(((currentDay - 1) / totalDays) * 100))
    : 0;

  const currentMonthIdx = agentRoadmapV2?.months.findIndex(
    m => currentDay >= m.startDay && currentDay <= m.endDay
  ) ?? 0;

  const [expandedWeek, setExpandedWeek] = useState<number>(currentWeek);

  return (
    <div style={{ fontFamily: 'var(--c-font-body)', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <h1 style={{
          fontFamily: 'var(--c-font-display)',
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'var(--c-text-primary)',
          margin: 0,
        }}>
          My Journey
        </h1>
        <span style={{
          fontSize: 12,
          color: 'var(--c-text-tertiary)',
          paddingTop: 8,
          flexShrink: 0,
        }}>
          Day {currentDay} of {totalDays}
        </span>
      </div>

      {/* Goal subtitle */}
      <p style={{
        fontSize: 13,
        color: 'var(--c-text-tertiary)',
        margin: '0 0 24px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {goalTitle}
      </p>

      {/* Overall progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 11, color: 'var(--c-text-quaternary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Overall progress</span>
          <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{overallProgress}%</span>
        </div>
        <div style={{
          height: 4,
          backgroundColor: 'var(--c-surface-card)',
          borderRadius: 9999,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${overallProgress}%`,
            backgroundColor: 'var(--c-accent-purple)',
            borderRadius: 9999,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Phases / Months */}
      {(agentRoadmapV2?.months ?? []).map((month, mIdx) => {
        const isCurrentPhase = mIdx === currentMonthIdx;
        const isCompletedPhase = mIdx < currentMonthIdx;
        const isLockedPhase = mIdx > currentMonthIdx;

        // Phase progress
        const phaseDays = month.endDay - month.startDay + 1;
        const daysIntoPhase = isCompletedPhase
          ? phaseDays
          : isCurrentPhase
          ? Math.max(0, currentDay - month.startDay)
          : 0;
        const phaseProgress = Math.round((daysIntoPhase / phaseDays) * 100);

        // Phase label: title may say "Month 1 — Foundation" or similar
        const phaseLabel = month.title ?? `Phase ${mIdx + 1}`;
        const phaseName = month.phaseName ?? '';

        return (
          <div key={month.month} style={{ marginBottom: 32 }}>

            {/* Phase section header */}
            <div style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: isLockedPhase ? 'var(--c-text-quaternary)' : isCurrentPhase ? 'var(--c-accent-purple)' : 'var(--c-text-tertiary)',
                  }}>
                    {phaseLabel}
                    {phaseName ? ` · ${phaseName}` : ''}
                  </span>
                  {isLockedPhase && (
                    <Lock size={10} color="var(--c-text-quaternary)" strokeWidth={2} />
                  )}
                </div>
                <span style={{
                  fontSize: 11,
                  color: 'var(--c-text-quaternary)',
                }}>
                  Days {month.startDay}–{month.endDay}
                </span>
              </div>

              {/* Phase progress bar */}
              <div style={{
                height: 3,
                backgroundColor: 'var(--c-surface-card)',
                borderRadius: 9999,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${phaseProgress}%`,
                  backgroundColor: isLockedPhase
                    ? 'transparent'
                    : isCompletedPhase
                    ? '#22c55e'
                    : 'var(--c-accent-purple)',
                  borderRadius: 9999,
                  transition: 'width 0.6s ease',
                }} />
              </div>

              {/* Locked phase teaser */}
              {isLockedPhase && month.weeks[0]?.theme && (
                <p style={{
                  fontSize: 12,
                  color: 'var(--c-text-quaternary)',
                  margin: '6px 0 0',
                  fontStyle: 'italic',
                }}>
                  {month.weeks[0].theme} — unlocks after Phase {mIdx} completes.
                </p>
              )}
            </div>

            {/* Week rows */}
            {!isLockedPhase && (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--c-border-subtle)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: 'var(--c-shadow-card)',
              }}>
                {month.weeks.map((week, wIdx) => {
                  const isCurrentW = week.week === currentWeek;
                  const isCompletedW = week.week < currentWeek;
                  const isTentative = week.status === 'tentative' || week.status === 'locked';
                  const weekTasks = tasks.filter(t => t.day >= week.startDay && t.day <= week.endDay);
                  const weekCompleted = weekTasks.filter(t => t.completed).length;
                  const weekTotal = weekTasks.length || week.days?.length || 7;
                  const completionPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
                  const isWeekExpanded = expandedWeek === week.week && !isTentative;
                  const canExpand = !isTentative;

                  return (
                    <div key={week.week} style={{
                      borderTop: wIdx > 0 ? '1px solid var(--c-border-subtle)' : 'none',
                    }}>
                      {/* Week row */}
                      <div
                        onClick={() => canExpand && setExpandedWeek(isWeekExpanded ? -1 : week.week)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '11px 14px',
                          cursor: canExpand ? 'pointer' : 'default',
                          backgroundColor: isCurrentW ? 'var(--c-accent-purple-soft)' : 'transparent',
                          transition: 'background-color 0.12s ease',
                          opacity: isTentative ? 0.45 : 1,
                        }}
                        onMouseEnter={e => {
                          if (canExpand && !isCurrentW) e.currentTarget.style.backgroundColor = 'var(--c-surface-elevated)';
                        }}
                        onMouseLeave={e => {
                          if (canExpand && !isCurrentW) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Status indicator */}
                        <div style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                          {isCompletedW ? (
                            <Check size={13} color="#22c55e" strokeWidth={2.5} />
                          ) : isCurrentW ? (
                            <div style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              backgroundColor: 'var(--c-accent-purple)',
                            }} />
                          ) : (
                            <div style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              backgroundColor: 'var(--c-border-medium)',
                            }} />
                          )}
                        </div>

                        {/* Week info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontSize: 13,
                            fontWeight: isCurrentW ? 600 : 450,
                            color: isCurrentW ? 'var(--c-accent-purple)' : 'var(--c-text-primary)',
                          }}>
                            Week {week.week}
                            {week.title ? ` · ${week.title}` : ''}
                          </span>
                        </div>

                        {/* Date range */}
                        <span style={{
                          fontSize: 11,
                          color: 'var(--c-text-quaternary)',
                          flexShrink: 0,
                          display: 'none',
                        }}
                          className="week-dates"
                        >
                          {formatDayRange(week.startDay, week.endDay)}
                        </span>

                        {/* Completion or tentative label */}
                        <span style={{
                          fontSize: 12,
                          color: isCompletedW ? '#22c55e' : 'var(--c-text-quaternary)',
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 32,
                          textAlign: 'right',
                        }}>
                          {isTentative ? '—' : isCompletedW ? '100%' : isCurrentW ? `${completionPct}%` : '—'}
                        </span>

                        {/* Expand chevron */}
                        {canExpand && (
                          <span style={{
                            color: 'var(--c-text-quaternary)',
                            fontSize: 14,
                            transform: isWeekExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s ease',
                            marginLeft: 2,
                          }}>
                            ›
                          </span>
                        )}
                      </div>

                      {/* Inline day expansion */}
                      {isWeekExpanded && (
                        <div style={{
                          padding: '8px 14px 12px 40px',
                          borderTop: '1px solid var(--c-border-subtle)',
                          backgroundColor: 'var(--c-surface-elevated)',
                        }}>
                          {(week.days && week.days.length > 0
                            ? week.days
                            : Array.from({ length: 7 }, (_, i) => ({
                                day: week.startDay + i,
                                weekDay: i + 1,
                                type: 'practice' as const,
                                title: '',
                                theme: '',
                                intensity: 0.5,
                                focusArea: '',
                              }))
                          ).map((d, di) => {
                            const task = tasks.find(t => t.day === d.day);
                            const isToday = d.day === currentDay;
                            const isDone = task?.completed;
                            const isRest = (d.type as string) === 'rest' ||
                              task?.title?.toLowerCase().includes('rest');
                            const dayLabel = DAY_NAMES[di] ?? `Day ${d.day}`;
                            const taskTitle = task?.title ?? d.title ?? d.theme ?? '';

                            return (
                              <div key={d.day} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 0',
                                borderBottom: di < 6 ? '1px solid var(--c-border-subtle)' : 'none',
                                opacity: d.day > currentDay ? 0.5 : 1,
                              }}>
                                {/* Day status */}
                                <div style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                  {isDone ? (
                                    <Check size={12} color="#22c55e" strokeWidth={2.5} />
                                  ) : isToday ? (
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--c-accent-purple)' }} />
                                  ) : (
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--c-border-medium)' }} />
                                  )}
                                </div>

                                {/* Day name */}
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--c-text-quaternary)',
                                  width: 28,
                                  flexShrink: 0,
                                }}>
                                  {dayLabel}
                                </span>

                                {/* Task title */}
                                <span style={{
                                  fontSize: 12,
                                  color: isToday ? 'var(--c-accent-purple)' : isDone ? 'var(--c-text-tertiary)' : 'var(--c-text-secondary)',
                                  fontWeight: isToday ? 600 : 400,
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {isRest ? 'Rest' : taskTitle || `Day ${d.day}`}
                                </span>

                                {/* Duration */}
                                {task?.duration && !isRest && (
                                  <span style={{
                                    fontSize: 11,
                                    color: 'var(--c-text-quaternary)',
                                    flexShrink: 0,
                                  }}>
                                    {task.duration}m
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Locked phase — muted placeholder */}
            {isLockedPhase && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'var(--c-surface-elevated)',
                border: '1px solid var(--c-border-subtle)',
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 12, color: 'var(--c-text-quaternary)', fontStyle: 'italic' }}>
                  {month.weeks.length} weeks — designed after Phase {mIdx} completes.
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {(!agentRoadmapV2?.months || agentRoadmapV2.months.length === 0) && (
        <div style={{
          padding: '48px 0',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 15, color: 'var(--c-text-tertiary)', margin: 0 }}>
            Your journey will appear here once your plan is ready.
          </p>
        </div>
      )}
    </div>
  );
}
