import { useState } from 'react';
import { useStore } from '@core/store/useStore';
import { ap } from '@core/design-system/appleTokens';
import { Chip, Bar, Label, Tile, Divider } from '@core/design-system/AppleUI';

export default function JourneyView() {
  const agentRoadmapV2 = useStore(s => s.agentRoadmapV2);
  const currentDay = useStore(s => s.currentDay);
  const tasks = useStore(s => s.tasks);
  const goalTitle = useStore(s => (s.currentGoal as { specificGoal?: string })?.specificGoal ?? s.roadmap?.title ?? 'Your Goal');

  const totalWeeks = agentRoadmapV2?.totalWeeks ?? 12;
  const currentWeek = Math.ceil((currentDay || 1) / 7);
  const currentMonth = agentRoadmapV2?.months.findIndex(m => currentDay >= m.startDay && currentDay <= m.endDay) ?? 0;
  const overallProgress = agentRoadmapV2
    ? Math.round(((currentDay - 1) / agentRoadmapV2.totalDays) * 100)
    : 0;
  const [expandedMonth, setExpandedMonth] = useState<number>(currentMonth);
  const [expandedWeek, setExpandedWeek] = useState<number>(currentWeek);

  return (
    <div style={{ fontFamily: ap.font }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: ap.textPrimary, margin: 0 }}>Journey</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip label={`w${totalWeeks}`} color={ap.textSecondary} bg={ap.surfaceAlt} />
          <Chip label={`Week ${currentWeek}`} color={ap.accent} bg={ap.accentSoft} />
        </div>
      </div>

      {/* Progress Summary Card */}
      <Tile style={{ marginBottom: 24 }}>
        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: ap.textTertiary, marginBottom: 4 }}>Journey</div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: ap.textPrimary }}>
                {goalTitle}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: ap.accent, fontFamily: ap.mono }}>{overallProgress}</span>
              <span style={{ fontSize: 16, color: ap.textTertiary }}>%</span>
            </div>
          </div>
          <Bar value={overallProgress} style={{ marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {[
              { val: String(currentDay), label: 'Day' },
              { val: String(currentWeek), label: 'Week' },
              { val: `${totalWeeks - currentWeek}w`, label: 'Remaining' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontSize: 17, fontWeight: 700, color: ap.textPrimary, fontFamily: ap.mono }}>{val}</div>
                <div style={{ fontSize: 11, color: ap.textTertiary, fontWeight: 500, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Tile>

      {/* Phase Map — derived from months */}
      {agentRoadmapV2?.months && agentRoadmapV2.months.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Label left="Phases" />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${agentRoadmapV2.months.length}, 1fr)`, gap: 6 }}>
            {agentRoadmapV2.months.map((m, i) => {
              const isCurrentM = i === currentMonth;
              const isCompletedM = i < currentMonth;
              const phaseProgress = isCompletedM ? 100 : isCurrentM
                ? Math.round(((currentDay - m.startDay) / (m.endDay - m.startDay + 1)) * 100)
                : 0;
              return (
                <div key={m.month} style={{
                  padding: '12px 14px', borderRadius: 10,
                  backgroundColor: isCurrentM ? ap.accentSoft : ap.surface,
                  border: `1px solid ${isCurrentM ? ap.accentMid : ap.border}`,
                }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: ap.textTertiary, marginBottom: 4 }}>
                    Month {m.month}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: ap.textPrimary, marginBottom: 8 }}>{m.title}</div>
                  <Bar value={phaseProgress} color={isCompletedM ? ap.success : ap.accent} height={3} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Breakdown — eagle view */}
      <div style={{ marginBottom: 24 }}>
        <Label left="Your Curriculum" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(agentRoadmapV2?.months ?? []).map((month, mIdx) => {
            const isCurrentMonthExpanded = expandedMonth === mIdx;
            const isCurrentM = mIdx === currentMonth;

            return (
              <Tile key={month.month} style={{ overflow: 'hidden' }}>
                {/* Month header — always visible */}
                <div
                  onClick={() => setExpandedMonth(isCurrentMonthExpanded ? -1 : mIdx)}
                  style={{
                    padding: '14px 18px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', cursor: 'pointer',
                    backgroundColor: isCurrentM ? ap.accentSoft : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: ap.textTertiary, fontFamily: ap.mono, minWidth: 60 }}>
                      Month {month.month}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: ap.textPrimary }}>{month.title}</span>
                    {isCurrentM && (
                      <Chip label="Current" color={ap.accent} bg={ap.accentSoft} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: ap.textTertiary }}>
                      Wk {month.startWeek}–{month.endWeek}
                    </span>
                    <span style={{ color: ap.textTertiary, fontSize: 12, transform: isCurrentMonthExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                  </div>
                </div>

                {/* Week rows — shown when month is expanded */}
                {isCurrentMonthExpanded && (
                  <div>
                    {month.weeks.map((week) => {
                      const isCurrentW = week.week === currentWeek;
                      const isCompletedW = week.week < currentWeek;
                      const isTentative = week.status === 'tentative' || week.status === 'locked';
                      const weekTasks = tasks.filter(t => t.day >= week.startDay && t.day <= week.endDay);
                      const weekCompleted = weekTasks.filter(t => t.completed).length;
                      const weekTotal = weekTasks.length || week.days.length || 7;
                      const isWeekExpanded = expandedWeek === week.week;

                      return (
                        <div key={week.week}>
                          <Divider />
                          <div
                            onClick={() => !isTentative && setExpandedWeek(isWeekExpanded ? -1 : week.week)}
                            style={{
                              padding: '13px 18px', display: 'flex',
                              alignItems: 'center', justifyContent: 'space-between',
                              backgroundColor: isCurrentW ? ap.accentSoft : 'transparent',
                              cursor: isTentative ? 'default' : 'pointer',
                              opacity: isTentative ? 0.5 : 1,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {isCompletedW ? (
                                <span style={{ color: ap.success, fontSize: 13, fontWeight: 700 }}>✓</span>
                              ) : isCurrentW ? (
                                <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ap.accent }} />
                              ) : (
                                <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ap.textTertiary, opacity: 0.4 }} />
                              )}
                              <span style={{ fontSize: 14, fontWeight: 500, color: ap.textPrimary }}>
                                Week {week.week}: {week.title}
                              </span>
                              {week.recalibratedFrom && (
                                <Chip label={`Adjusted · Wk ${week.recalibratedFrom} feedback`} color={ap.amber} bg={ap.amberSoft} />
                              )}
                              {isTentative && (
                                <span style={{ fontSize: 11, color: ap.textTertiary, fontStyle: 'italic' }}>
                                  Tentative · designed after Week {week.week - 1} check-in
                                </span>
                              )}
                            </div>
                            <span style={{
                              fontSize: 12, fontFamily: ap.mono,
                              color: isCompletedW ? ap.success : ap.textTertiary,
                            }}>
                              {isTentative ? '—' : `${weekCompleted}/${weekTotal}`}
                            </span>
                          </div>

                          {/* Day dots — shown when week is expanded */}
                          {isWeekExpanded && !isTentative && (
                            <div style={{ padding: '0 18px 14px 38px' }}>
                              <div style={{ display: 'flex', gap: 5 }}>
                                {(week.days.length > 0 ? week.days : Array.from({ length: 7 }, (_, i) => ({ day: week.startDay + i, weekDay: i + 1, type: 'practice' as const, title: '', theme: '', intensity: 0.5, focusArea: '' }))).map((d) => {
                                  const task = tasks.find(t => t.day === d.day);
                                  const isToday = d.day === currentDay;
                                  const isDone = task?.completed;
                                  const isRest = d.type === 'rest';
                                  return (
                                    <div key={d.day} title={`Day ${d.day}: ${d.title || d.theme}`} style={{
                                      width: 26, height: 26, borderRadius: 7,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      backgroundColor: isDone ? ap.successSoft : isToday ? ap.accent : ap.surfaceAlt,
                                      border: `1px solid ${isDone ? 'rgba(45,164,78,.2)' : isToday ? ap.accent : ap.border}`,
                                      fontSize: 10, color: isToday ? '#fff' : isDone ? ap.success : ap.textTertiary,
                                      fontWeight: 600,
                                    }}>
                                      {isDone ? '✓' : isToday ? '●' : isRest ? '~' : ''}
                                    </div>
                                  );
                                })}
                                <span style={{ fontSize: 10, color: ap.textTertiary, marginLeft: 6, alignSelf: 'center' }}>M T W T F S S</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Tile>
            );
          })}
        </div>
      </div>

      {/* Up Next */}
      {(() => {
        const nextWeek = agentRoadmapV2?.months.flatMap(m => m.weeks).find(w => w.week === currentWeek + 1);
        if (!nextWeek) return null;
        return (
          <div style={{
            backgroundColor: ap.surfaceAlt, border: `1px solid ${ap.border}`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: ap.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Up Next · Week {nextWeek.week}
            </div>
            <div style={{ fontSize: 15, fontWeight: 650, color: ap.textPrimary, marginBottom: 4 }}>
              {nextWeek.title}
            </div>
            <div style={{ fontSize: 12, color: ap.textTertiary }}>
              {nextWeek.theme}
              {nextWeek.status === 'tentative' && ' · Subject to change after your weekly check-in'}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
