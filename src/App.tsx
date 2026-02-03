import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ChatOnboarding from './pages/ChatOnboarding';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { onAuthStateChange, supabase } from './lib/supabase';

function App() {
  const step = useStore((state) => state.step);
  const resetOnboarding = useStore((state) => state.resetOnboarding);
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const checkAuth = useStore((state) => state.checkAuth);
  const roadmap = useStore((state) => state.roadmap);

  const [showLogin, setShowLogin] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    checkAuth().then(() => setAuthInitialized(true));

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (session?.user) {
        setUser(session.user);

        // Check if user has a roadmap in Supabase
        const { data: goals } = await supabase
          .from('user_goals')
          .select('*, roadmaps(*)')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .single();

        if (goals && goals.roadmaps) {
          // User has an active goal/roadmap - go to dashboard
          // TODO: Load roadmap and tasks from Supabase
          if (step === 0 || step === 1) {
            useStore.setState({ step: 2 });
          }
        } else if (roadmap) {
          // User has local roadmap - go to dashboard
          if (step === 0 || step === 1) {
            useStore.setState({ step: 2 });
          }
        } else {
          // User has no roadmap - go to onboarding
          if (step === 0) {
            useStore.setState({ step: 1 });
          }
        }
      } else {
        setUser(null);
        // Not authenticated - stay on landing or login
        if (step !== 0) {
          useStore.setState({ step: 0 });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading while checking auth
  if (!authInitialized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E5E7EB',
            borderTopColor: '#6366F1',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show login page if showLogin is true
  if (showLogin && !user) {
    return <Login onSuccess={() => setShowLogin(false)} />;
  }

  return (
    <>
      {step === 0 && !user && <LandingPage key="landing" onGetStarted={() => setShowLogin(true)} />}
      {step === 1 && user && <ChatOnboarding key="chat" />}
      {step === 2 && user && <Dashboard key="dashboard" />}
      {step === 10 && user && <Settings key="settings" />}

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
