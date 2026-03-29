import { Home, Map, BarChart2, BookMarked, User, MessageCircle } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { useUserLevel } from '@hooks/useUserLevel';
import { ap } from '@core/design-system/appleTokens';

interface DashboardSidebarProps {
  currentView: 'today' | 'roadmap' | 'insights' | 'library' | 'you';
  onViewChange: (view: 'today' | 'roadmap' | 'insights' | 'library' | 'you') => void;
  onCoachOpen?: () => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export default function DashboardSidebar({ currentView, onViewChange, onCoachOpen }: DashboardSidebarProps) {
  const setStep = useStore((state) => state.setStep);
  const { universalProfile, roadmap } = useStore();
  const level = useUserLevel();

  const userName = universalProfile?.name || '';

  const navItems = [
    { id: 'today'    as const, icon: Home,      label: 'Today' },
    { id: 'roadmap'  as const, icon: Map,        label: 'Journey' },
    { id: 'insights' as const, icon: BarChart2,  label: 'Progress' },
    { id: 'library'  as const, icon: BookMarked, label: 'Library' },
    { id: 'you'      as const, icon: User,        label: 'You' },
  ];

  return (
    <div style={{
      width: 220, minWidth: 220, height: '100vh', position: 'fixed', left: 0, top: 0,
      backgroundColor: ap.surface, borderRight: `1px solid ${ap.border}`,
      display: 'flex', flexDirection: 'column', fontFamily: ap.font, zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 18px 16px' }}>
        <button
          onClick={() => {
            setStep(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: ap.textPrimary }}>
            coheren<span style={{ color: ap.accent }}>.</span>ai
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: ap.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
            Think less · Do more
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ id, icon: Icon, label }) => {
          const active = currentView === id;
          return (
            <button key={id} onClick={() => onViewChange(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                backgroundColor: active ? ap.surfaceAlt : 'transparent',
                color: active ? ap.textPrimary : ap.textSecondary,
                fontWeight: active ? 600 : 500, fontSize: 14,
                fontFamily: ap.font, transition: 'background 0.15s',
                textAlign: 'left', width: '100%',
              }}>
              <Icon size={19} strokeWidth={1.2} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Divider + Coach */}
      <div style={{ margin: '8px 10px' }}>
        <div style={{ height: 1, backgroundColor: ap.border }} />
      </div>
      <div style={{ padding: '0 10px' }}>
        <button onClick={() => onCoachOpen?.()}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
            backgroundColor: 'transparent', color: ap.textSecondary,
            fontWeight: 500, fontSize: 14, fontFamily: ap.font,
            textAlign: 'left', width: '100%',
          }}>
          <MessageCircle size={19} strokeWidth={1.2} />
          Coach
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User card */}
      <div style={{ padding: 12 }}>
        <div style={{
          backgroundColor: ap.surfaceAlt, borderRadius: 10,
          border: `1px solid ${ap.border}`, padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: `linear-gradient(135deg, ${ap.accent}, #8B7CF6)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700,
            }}>
              {(userName || 'AB').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: ap.textPrimary, lineHeight: 1.2 }}>{userName || 'User'}</div>
              <div style={{ fontSize: 11, color: ap.textTertiary, lineHeight: 1.3, marginTop: 1 }}>
                {roadmap?.title || 'Your Journey'}
              </div>
            </div>
          </div>
          <div style={{ height: 3, borderRadius: 3, backgroundColor: 'rgba(0,0,0,.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${level.progress}%`, backgroundColor: ap.accent, borderRadius: 3, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: ap.textTertiary, marginTop: 4 }}>{level.label} · {level.progress}%</div>
        </div>
      </div>
    </div>
  );
}
