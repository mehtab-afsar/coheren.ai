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
  if (hour < 5)  return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good evening';
}

export default function TodayHeader({
  userName,
  currentDay,
  goalSubtitle,
}: TodayHeaderProps) {
  const { isMobile } = useBreakpoint();
  const weekNum = Math.ceil(currentDay / 7);
  const firstName = userName.split(' ')[0] || '';

  return (
    <div style={{ marginBottom: isMobile ? 20 : 28 }}>
      {/* Greeting — Fraunces, prominent */}
      <h1 style={{
        fontFamily: 'var(--c-font-display)',
        fontSize: isMobile ? 24 : 28,
        fontWeight: 500,
        color: 'var(--c-text-primary)',
        letterSpacing: '-0.02em',
        margin: '0 0 6px',
        lineHeight: 1.15,
      }}>
        {getGreeting()}{firstName ? `, ${firstName}.` : '.'}
      </h1>

      {/* Context line — Day · Week · Phase */}
      <p style={{
        fontFamily: 'var(--c-font-body)',
        fontSize: 13,
        fontWeight: 400,
        color: 'var(--c-text-tertiary)',
        margin: 0,
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {goalSubtitle
          ? goalSubtitle
          : `Day ${currentDay} · Week ${weekNum}`
        }
      </p>
    </div>
  );
}
