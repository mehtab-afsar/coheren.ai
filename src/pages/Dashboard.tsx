import { useState, useEffect } from 'react';
import { tokens } from '../design-system';
import DashboardSidebar from '../components/DashboardSidebar';
import TodayView from '../components/views/TodayView';
import JourneyView from '../components/views/JourneyView';
import ProfileView from '../components/views/ProfileView';
import ProgressView from '../components/views/ProgressView';
import GoalsView from '../components/views/GoalsView';
import SettingsView from '../components/views/SettingsView';
import CheckpointScreen from '../components/CheckpointScreen';
import { isCheckpointDay, getSprintNumber } from '../lib/checkpointHelpers';
import { useStore, type Task } from '../store/useStore';
import { getRecentFeedback } from '../lib/database';
import { handleCheckpoint } from '../agents/orchestrator';
import type { StoneAnswer } from '../types/agents';

type ViewType = 'today' | 'journey' | 'profile' | 'progress' | 'goals' | 'settings';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [checkpointData, setCheckpointData] = useState<{
    completedTasks: number;
    totalTasks: number;
    avgDifficulty: number;
    strugglingAreas: string[];
    masteringAreas: string[];
    recentFeedback: Array<{
      difficulty_score: number;
      completion_status: string;
      feedback_tags?: string[];
      actual_duration_mins?: number;
      user_comment?: string;
    }>;
  } | null>(null);

  const currentDay = useStore((state) => state.currentDay);
  const user = useStore((state) => state.user);
  const currentGoal = useStore((state) => state.currentGoal);
  const roadmap = useStore((state) => state.roadmap);
  const setTasks = useStore((state) => state.setTasks);

  // Check if today is a checkpoint day
  const isCheckpoint = isCheckpointDay(currentDay, 14);

  // Fetch checkpoint data when it's a checkpoint day
  useEffect(() => {
    if (isCheckpoint && user && currentGoal) {
      const fetchCheckpointData = async () => {
        try {
          const goalId = (currentGoal as { id?: string }).id;
          if (!goalId) return;

          // Fetch last 14 days of feedback
          const recentFeedback = await getRecentFeedback(goalId, 14);

          // Calculate performance metrics
          const completedCount = recentFeedback.filter(f => f.completion_status === 'completed').length;
          const totalTasks = 14;
          const avgDifficulty = recentFeedback.length > 0
            ? recentFeedback.reduce((sum, f) => sum + f.difficulty_score, 0) / recentFeedback.length
            : 3;

          // Identify struggling areas (tasks with difficulty >= 4)
          const strugglingTasks = recentFeedback.filter(f => f.difficulty_score >= 4);
          const strugglingAreas = [...new Set(strugglingTasks.flatMap(f => f.feedback_tags || []))];

          // Identify mastering areas (tasks with difficulty <= 2)
          const masteringTasks = recentFeedback.filter(f => f.difficulty_score <= 2);
          const masteringAreas = [...new Set(masteringTasks.flatMap(f => f.feedback_tags || []))];

          setCheckpointData({
            completedTasks: completedCount,
            totalTasks,
            avgDifficulty: Math.round(avgDifficulty * 10) / 10,
            strugglingAreas,
            masteringAreas,
            recentFeedback
          });
        } catch (error) {
          console.error('Failed to fetch checkpoint data:', error);
        }
      };

      fetchCheckpointData();
    }
  }, [isCheckpoint, user, currentGoal]);

  const handleCheckpointComplete = async () => {
    setIsRecalibrating(true);

    try {
      const goalId = (currentGoal as { id?: string }).id;
      if (!goalId || !roadmap || !checkpointData) {
        throw new Error('Missing required data for checkpoint');
      }

      // Convert recent feedback to Agent 5 format
      const taskFeedback = checkpointData.recentFeedback.map((f) => ({
        dayNumber: currentDay - 13 + checkpointData.recentFeedback.indexOf(f), // Approximate day number
        title: 'Task', // We don't have task titles in feedback table
        difficultyRating: f.difficulty_score,
        completionTime: f.actual_duration_mins,
        userComment: f.user_comment,
        skipped: f.completion_status === 'skipped',
        skipReason: undefined
      }));

      // Get user's Stone answers (we'll need to fetch these or get from store)
      const stoneAnswers: StoneAnswer[] = []; // TODO: Fetch from database if available

      // Run Agent 5 checkpoint analysis
      const result = await handleCheckpoint(
        (currentGoal as { specificGoal?: string }).specificGoal || 'Continue your journey',
        90, // Default timeline
        30, // Default daily time
        (roadmap.strategicPlan || roadmap) as unknown as import('../types/agents').Roadmap,
        stoneAnswers,
        taskFeedback as unknown as Task[],
        currentDay,
        {
          userId: user!.id,
          goalId: goalId,
          supabase: undefined // Supabase client will be used from the orchestrator
        }
      );

      // Convert adapted tasks to store format
      const convertedTasks = result.adaptedTasks.map((dailyTask) => ({
        id: String(dailyTask.day),
        title: dailyTask.task.title,
        description: dailyTask.task.description,
        type: 'practice' as const,
        duration: dailyTask.task.estimatedMinutes,
        completed: false,
        skipped: false,
        scheduledFor: new Date().toISOString().split('T')[0],
        day: dailyTask.day,
        dayNumber: dailyTask.day,
        steps: dailyTask.task.steps.map(step => step.instruction),
        tips: dailyTask.task.tips,
        successCriteria: dailyTask.task.successCriteria.primary,
        resources: dailyTask.task.resources // Include matched resources
      }));

      // Update local tasks with new sprint tasks
      setTasks(convertedTasks);

      // Show success message
      alert(`🎉 Checkpoint Complete!\n\n${result.analysis.recalibratedSprint.personalizedMessage}`);

      setIsRecalibrating(false);
    } catch (error) {
      console.error('Checkpoint failed:', error);
      alert('Failed to recalibrate roadmap. Please try again.');
      setIsRecalibrating(false);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView />;
      case 'journey':
        return <JourneyView />;
      case 'profile':
        return <ProfileView />;
      case 'progress':
        return <ProgressView />;
      case 'goals':
        return <GoalsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TodayView />;
    }
  };

  // If it's a checkpoint day, show checkpoint screen instead of normal views
  if (isCheckpoint && checkpointData) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: tokens.colors.background,
      }}>
        {/* Sidebar */}
        <DashboardSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isOpen={sidebarOpen}
          onToggle={setSidebarOpen}
        />

        {/* Checkpoint Screen */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          transition: 'margin-left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
          marginLeft: sidebarOpen ? '260px' : '0',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '800px',
            padding: `${tokens.spacing['4xl']} ${tokens.spacing['4xl']}`,
            paddingLeft: sidebarOpen ? tokens.spacing['4xl'] : 'calc(44px + 48px)',
          }}>
            <CheckpointScreen
              checkpointDay={currentDay}
              sprintNumber={getSprintNumber(currentDay)}
              completedTasks={checkpointData.completedTasks}
              totalTasks={checkpointData.totalTasks}
              avgDifficulty={checkpointData.avgDifficulty}
              strugglingAreas={checkpointData.strugglingAreas}
              masteringAreas={checkpointData.masteringAreas}
              onComplete={handleCheckpointComplete}
              isRecalibrating={isRecalibrating}
            />
          </div>
        </div>
      </div>
    );
  }

  // Normal dashboard view
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: tokens.colors.background,
    }}>
      {/* Sidebar */}
      <DashboardSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />

      {/* Main Content - Centered with smooth transition */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        transition: 'margin-left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
        marginLeft: sidebarOpen ? '260px' : '0',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          padding: `${tokens.spacing['4xl']} ${tokens.spacing['4xl']}`,
          paddingLeft: sidebarOpen ? tokens.spacing['4xl'] : 'calc(44px + 48px)', // Space for toggle button
        }}>
          {renderView()}
        </div>
      </div>
    </div>
  );
}
