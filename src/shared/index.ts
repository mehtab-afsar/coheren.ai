// Shared UI Components
export { default as LoadingAnimation } from './components/LoadingAnimation';
export { default as SkeletonLoader, SkeletonText, SkeletonCard, SkeletonTaskList } from './components/ui/SkeletonLoader';
export { default as EmptyState, NoTasksEmptyState, NoGoalsEmptyState } from './components/ui/EmptyState';
export { Button } from './components/ui/button';

// Shared Utils
export { generateTasksForDay, generateTasksFromAIPlan, generateInitialTasks } from './utils/taskGenerator';
export { detectCategory } from './utils/categoryDetection';
