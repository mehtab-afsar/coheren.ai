interface WeekHeartbeatProps {
  currentDay: number;
  tasks: { day: number; completed: boolean }[];
}

export default function WeekHeartbeat({ currentDay, tasks }: WeekHeartbeatProps) {
  const weekStart = Math.floor((currentDay - 1) / 7) * 7 + 1;
  const prevWeekStart = weekStart - 7;

  // Count completed days this week vs last week
  const thisWeekDays = Array.from({ length: 7 }, (_, i) => weekStart + i);
  const prevWeekDays = Array.from({ length: 7 }, (_, i) => prevWeekStart + i).filter(d => d >= 1);

  const countCompletedDay = (dayNum: number) => {
    const dayTasks = tasks.filter(t => t.day === dayNum && !t.completed === false);
    return dayTasks.length > 0 && dayTasks.every(t => t.completed);
  };

  const thisWeekCompleted = thisWeekDays.filter(d => d <= currentDay && countCompletedDay(d)).length;
  const prevWeekCompleted = prevWeekDays.filter(d => countCompletedDay(d)).length;

  // AI context line
  const contextLine = (() => {
    if (prevWeekCompleted === 0 && thisWeekCompleted > 0) {
      return `You've shown up ${thisWeekCompleted} day${thisWeekCompleted > 1 ? 's' : ''} this week — building momentum.`;
    }
    if (thisWeekCompleted > prevWeekCompleted) {
      return `${thisWeekCompleted} days this week vs ${prevWeekCompleted} last week — ahead of your own pace.`;
    }
    if (thisWeekCompleted === prevWeekCompleted && thisWeekCompleted > 0) {
      return `Matching last week's pace — ${thisWeekCompleted} day${thisWeekCompleted > 1 ? 's' : ''} in.`;
    }
    if (thisWeekCompleted < prevWeekCompleted && thisWeekCompleted > 0) {
      return `${thisWeekCompleted} of 7 days so far — last week you hit ${prevWeekCompleted}.`;
    }
    return "Start today and keep the streak alive.";
  })();

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 7 dots: Mon–Sun */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
          const dayNum = weekStart + i;
          const isToday = dayNum === currentDay;
          const isCompleted = dayNum < currentDay && countCompletedDay(dayNum);
          const isFuture = dayNum > currentDay;

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{
                fontSize: 9, letterSpacing: '0.04em',
                color: isToday ? '#C4552D' : '#9ca3af',
                fontWeight: isToday ? 700 : 400,
              }}>
                {label}
              </span>
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                backgroundColor: isCompleted ? '#C4552D'
                  : isToday ? 'rgba(196, 85, 45,0.12)'
                  : isFuture ? 'rgba(0,0,0,0.04)'
                  : 'rgba(0,0,0,0.06)',
                border: isToday ? '2px solid #C4552D' : isFuture ? '1px solid rgba(0,0,0,0.06)' : 'none',
                transition: 'background 200ms ease',
              }} />
            </div>
          );
        })}
      </div>

      {/* AI context line */}
      <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
        {contextLine}
      </p>
    </div>
  );
}
