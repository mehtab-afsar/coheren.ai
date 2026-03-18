import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { tokens } from '@core/design-system';
import { getNotifications } from './notification-utils';
import type { AppNotification } from './notification-utils';
import { useBreakpoint } from '@hooks/useBreakpoint';

const STORAGE_KEY = 'app_notifications';

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  onClose: () => void;
}

export default function NotificationCenter({ onClose }: Props) {
  const { isMobile } = useBreakpoint();
  const notifications = useMemo(() => getNotifications(), []);

  useEffect(() => {
    // Mark all as read
    const marked = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(marked));
  }, [notifications]);

  const TYPE_ICONS: Record<AppNotification['type'], string> = {
    plan_adjustment: '🔧',
    milestone: '🏆',
    weekly_summary: '📊',
    coach_insight: '💡',
    system: '⚙️',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'flex-start',
        justifyContent: isMobile ? 'center' : 'flex-end',
        zIndex: 9998,
        padding: isMobile ? 0 : '16px',
        paddingTop: isMobile ? 0 : '60px',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: isMobile ? '20px 20px 0 0' : tokens.borderRadius.xl,
          width: '100%',
          maxWidth: isMobile ? '100%' : '360px',
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          animation: 'notif-slide-in 0.18s ease both',
        }}
      >
        <style>{`
          @keyframes notif-slide-in {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
          borderBottom: `1px solid ${tokens.colors.borderLight}`,
          backgroundColor: tokens.colors.surface,
        }}>
          <h2 style={{
            fontSize: tokens.typography.sizes.base,
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.colors.text.primary,
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Updates
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <X size={17} color={tokens.colors.text.tertiary} />
          </button>
        </div>

        {/* Notification list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: tokens.spacing['3xl'], textAlign: 'center' }}>
              <Bell size={28} color={tokens.colors.text.tertiary} style={{ marginBottom: tokens.spacing.md }} />
              <p style={{ fontSize: tokens.typography.sizes.sm, color: tokens.colors.text.tertiary, margin: 0 }}>
                No updates yet
              </p>
            </div>
          ) : (
            notifications.map((n, idx) => (
              <div key={n.id} style={{
                padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                borderTop: idx === 0 ? 'none' : `1px solid ${tokens.colors.borderLight}`,
                backgroundColor: !n.read ? 'rgba(124,58,237,0.03)' : 'transparent',
                display: 'flex',
                gap: tokens.spacing.sm,
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0, marginTop: 1 }}>
                  {TYPE_ICONS[n.type]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.medium,
                    color: tokens.colors.text.primary,
                    margin: '0 0 3px',
                    lineHeight: 1.3,
                  }}>
                    {n.title}
                  </p>
                  <p style={{
                    fontSize: tokens.typography.sizes.xs,
                    color: tokens.colors.text.secondary,
                    margin: '0 0 4px',
                    lineHeight: 1.45,
                  }}>
                    {n.body}
                  </p>
                  <p style={{ fontSize: '10px', color: tokens.colors.text.tertiary, margin: 0 }}>
                    {formatTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#7c3aed', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
