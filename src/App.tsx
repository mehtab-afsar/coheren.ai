import { useStore } from './store/useStore';
import LandingPage from './pages/LandingPage';
import ChatOnboarding from './pages/ChatOnboarding';
import GoalSelection from './pages/GoalSelection';
import SpecificGoal from './pages/SpecificGoal';
import UniversalQuestions from './pages/UniversalQuestions';
import CategoryQuestions from './pages/CategoryQuestions';
import RoadmapGeneration from './pages/RoadmapGeneration';
import CheckInSetup from './pages/CheckInSetup';
import WelcomeAnimation from './pages/WelcomeAnimation';
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
      {step === 2 && <GoalSelection key="goal-selection" />}
      {step === 3 && <SpecificGoal key="specific-goal" />}
      {step === 4 && <UniversalQuestions key="universal" />}
      {step === 5 && <CategoryQuestions key="category" />}
      {step === 6 && <RoadmapGeneration key="roadmap" />}
      {step === 7 && <CheckInSetup key="checkin" />}
      {step === 8 && <WelcomeAnimation key="welcome" />}
      {step === 9 && <Dashboard key="dashboard" />}
      {step === 10 && <Settings key="settings" />}
      {step >= 10 && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <p style={{ color: '#999', fontWeight: 300 }}>
            Step {step} - Coming soon...
          </p>
          <button
            onClick={() => {
              resetOnboarding();
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              background: 'black',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 300
            }}
          >
            Start Over
          </button>
        </div>
      )}

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
