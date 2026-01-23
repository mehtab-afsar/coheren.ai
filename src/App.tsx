import { useStore } from './store/useStore';
import LandingPage from './pages/LandingPage';
import ChatOnboarding from './pages/ChatOnboarding';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

function App() {
  const step = useStore((state) => state.step);
  const resetOnboarding = useStore((state) => state.resetOnboarding);

  // Developer reset button (visible with keyboard shortcut)
  const handleKeyDown = (e: KeyboardEvent) => {
    // Press Ctrl/Cmd + Shift + R to reset
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'r') {
      e.preventDefault();
      if (confirm('Reset all data and start over?')) {
        resetOnboarding();
        window.location.reload();
      }
    }
  };

  // Add keyboard listener
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  return (
    <>
      {step === 0 && <LandingPage key="landing" />}
      {step === 1 && <ChatOnboarding key="chat" />}
      {step === 2 && <Dashboard key="dashboard" />}
      {step === 10 && <Settings key="settings" />}

      {/* Quick reset button - bottom right corner for development */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999
      }}>
        <button
          onClick={() => {
            if (confirm('Reset everything and start fresh?')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          style={{
            padding: '8px 16px',
            background: '#ef5350',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 300,
            opacity: 0.3,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.3'}
          title="Reset all data (or press Ctrl+Shift+R)"
        >
          Reset
        </button>
      </div>
    </>
  );
}

export default App;
