import { Bell, Flame } from 'lucide-react';
import { useBreakpoint } from '@hooks/useBreakpoint';

interface TodayHeaderProps {
  userName: string;
  currentDay: number;
  streak: number;
  unreadCount: number;
  onNotificationTap: () => void;
  goalSubtitle?: string;
  tasks: { day: number; completed: boolean; duration?: number }[];
  currentDayNum?: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getWeekContext(currentDay: number, tasks: { day: number; completed: boolean }[]): string {
  const weekStart = Math.floor((currentDay - 1) / 7) * 7 + 1;
  const prevWeekStart = weekStart - 7;
  const thisWeekDays = Array.from({ length: 7 }, (_, i) => weekStart + i);
  const prevWeekDays = Array.from({ length: 7 }, (_, i) => prevWeekStart + i).filter(d => d >= 1);

  const countCompletedDay = (dayNum: number) => {
    const dayTasks = tasks.filter(t => t.day === dayNum);
    return dayTasks.length > 0 && dayTasks.every(t => t.completed);
  };

  const thisWeekCompleted = thisWeekDays.filter(d => d <= currentDay && countCompletedDay(d)).length;
  const prevWeekCompleted = prevWeekDays.filter(d => countCompletedDay(d)).length;

  if (prevWeekCompleted === 0 && thisWeekCompleted > 0) return `${thisWeekCompleted} day${thisWeekCompleted > 1 ? 's' : ''} this week — building momentum.`;
  if (thisWeekCompleted > prevWeekCompleted) return `${thisWeekCompleted} days this week vs ${prevWeekCompleted} last week — ahead of pace.`;
  if (thisWeekCompleted === prevWeekCompleted && thisWeekCompleted > 0) return `Matching last week — ${thisWeekCompleted} day${thisWeekCompleted > 1 ? 's' : ''} in.`;
  if (thisWeekCompleted < prevWeekCompleted && thisWeekCompleted > 0) return `${thisWeekCompleted} of 7 days so far — last week you hit ${prevWeekCompleted}.`;
  return 'Start today and keep the streak alive.';
}

export default function TodayHeader({
  userName,
  currentDay,
  streak,
  unreadCount,
  onNotificationTap,
  goalSubtitle,
  tasks,
}: TodayHeaderProps) {
  const { isMobile } = useBreakpoint();
  const contextLine = getWeekContext(currentDay, tasks);
  const weekNum = Math.ceil(currentDay / 7);
  const firstName = userName.split(' ')[0];

  return (
    <div style={{ marginBottom: 32 }}>

      {/* ── Top row: greeting text + day badge + bell ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Greeting */}
          <p style={{
            fontSize: 12,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.35)',
            margin: '0 0 4px',
            letterSpacing: '0.01em',
          }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </p>

          {/* Goal subtitle */}
          {goalSubtitle && (
            <p style={{
              fontSize: 13,
              color: 'rgba(167,139,250,0.55)',
              margin: 0,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: isMobile ? 220 : 400,
            }}>
              {goalSubtitle}
            </p>
          )}
        </div>

        {/* Right side: Day badge + streak + bell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Day badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            boxShadow: '0 2px 10px rgba(124,58,237,0.4)',
          }}>
            Day {currentDay}
          </span>

          {/* Streak badge */}
          {streak > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 99,
              flexShrink: 0,
            }}>
              <Flame size={12} strokeWidth={2} color="#f97316" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{streak}</span>
            </div>
          )}

          {/* Notification bell */}
          <button
            onClick={onNotificationTap}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.12)';
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)';
              e.currentTarget.style.color = '#c4b5fd';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            }}
          >
            <Bell size={15} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#7c3aed',
                border: '1.5px solid #08080f',
                boxShadow: '0 0 6px rgba(124,58,237,0.6)',
              }} />
            )}
          </button>
        </div>
      </div>

      {/* ── Divider + context line ── */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <p style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.35)',
          margin: 0,
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {contextLine}
        </p>
      </div>

      {/* ── Week dots ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontWeight: 600,
          marginRight: 4,
          flexShrink: 0,
        }}>
          Wk {weekNum}
        </span>
        {Array.from({ length: 7 }, (_, i) => {
          const dayNum = (weekNum - 1) * 7 + i + 1;
          const isToday = dayNum === currentDay;
          const dayTasks = tasks.filter(t => t.day === dayNum);
          const isComplete = dayTasks.length > 0 && dayTasks.every(t => t.completed);
          const isPartial = !isComplete && dayTasks.some(t => t.completed);
          const isPast = dayNum < currentDay;

          return (
            <div
              key={i}
              title={['M','T','W','T','F','S','S'][i]}
              style={{
                width: isToday ? 22 : 8,
                height: 8,
                borderRadius: 99,
                transition: 'all 300ms ease',
                flexShrink: 0,
                backgroundColor: isComplete
                  ? '#7c3aed'
                  : isPartial
                  ? 'rgba(124,58,237,0.4)'
                  : isToday
                  ? 'rgba(124,58,237,0.35)'
                  : isPast
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.06)',
                boxShadow: isToday ? '0 0 8px rgba(124,58,237,0.5)' : isComplete ? '0 0 4px rgba(124,58,237,0.3)' : 'none',
                border: isToday ? '1px solid rgba(124,58,237,0.5)' : '1px solid transparent',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
