import { useStore } from './store/useStore';
import Welcome from './pages/Welcome';
import GoalSelection from './pages/GoalSelection';
import SpecificGoal from './pages/SpecificGoal';
import UniversalQuestions from './pages/UniversalQuestions';
import CategoryQuestions from './pages/CategoryQuestions';
import RoadmapGeneration from './pages/RoadmapGeneration';

function App() {
  const step = useStore((state) => state.step);

  return (
    <>
      {step === 0 && <Welcome />}
      {step === 1 && <GoalSelection />}
      {step === 2 && <SpecificGoal />}
      {step === 3 && <UniversalQuestions />}
      {step === 4 && <CategoryQuestions />}
      {step === 5 && <RoadmapGeneration />}
      {step >= 6 && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <p style={{ color: '#999', fontWeight: 300 }}>
            Step {step} - Coming soon...
          </p>
        </div>
      )}
    </>
  );
}

export default App;
