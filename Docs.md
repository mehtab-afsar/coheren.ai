




Side by Side


claude-opus-4-6

kimi-k2-thinking-turbo

Login
claude-opus-4-6

Coheren.ai — Complete Product Improvement & Launch Blueprint
Honest Assessment of Where You Are
I've mapped your entire codebase against what a user actually experiences. Here's the truth:

What's genuinely impressive:

The 4-agent AI pipeline is sophisticated — most habit apps use static templates
Stone-based behavioral profiling is a real differentiator
Cinema Mode with resume position is thoughtful
The 14-day recalibrator means the system actually adapts
What's holding it back:

The UI is developer-designed, not user-designed. Dark gradient hero cards everywhere create visual monotony
Feature density is high but emotional impact is low
The AI does incredible work behind the scenes but the user never feels it
Mobile nav has 5 items but the hierarchy is wrong — Goals and Progress before Today?
No onboarding guidance after the AI chat — users land on a complex dashboard cold
Zero social/sharing/accountability mechanisms
The "Behavioral Stones" naming is internal jargon leaked to the UI
Phase 0: Foundation Fixes (Week 1-2)
Fix what's broken before building what's new

0.1 — Navigation Hierarchy Fix
Current mobile nav order: Goals · Progress · ◉ Today · Journey · Profile

Problem: A user opens the app to do their daily task. Today should be the default landing, but Goals is the first tab. Progress is second. The two most "check occasionally" views are in the two most prominent positions.

Fixed order:

text

┌──────────────────────────────────────────────┐
│  Today     Journey     ◉ DO     Progress    Me│
│   🏠        🗺️        (●)       📊        👤 │
└──────────────────────────────────────────────┘
Changes:

Today moves to position 1 (leftmost = default in LTR languages)
Goals gets absorbed into the Profile/Me tab (it's one card of information, not a full view)
Library gets absorbed into Journey (completed tasks are accessible via week drill-down)
The center FAB becomes "DO" — instant task launcher
"Profile" renames to "Me" (shorter label, fits mobile)
Component changes needed:

text

src/components/navigation/
├── BottomNav.tsx          // Reorder tabs, update icons
├── BottomNavItem.tsx       // No changes
├── DesktopSidebar.tsx     // Keep all 6 views on desktop
└── MobileTabRouter.tsx    // New — handles tab state + deep links
0.2 — Visual Hierarchy Reset
Problem: Every view has a dark gradient hero card. When everything is emphasized, nothing is emphasized.

New visual hierarchy system:

text

Level 1 — Hero:       Only on TODAY view (the Focus Card)
Level 2 — Section:    Subtle card with border, no gradient
Level 3 — List item:  Flat row with divider
Level 4 — Metadata:   Inline text, no container
Design token updates:

TypeScript

// src/design/tokens.ts — ADD these
export const elevation = {
  hero: 'bg-gradient-to-br from-purple-900/90 to-indigo-950/90 border border-purple-500/20 shadow-2xl shadow-purple-500/10',
  section: 'bg-gray-900/60 border border-gray-800/50 rounded-2xl',
  listItem: 'bg-transparent border-b border-gray-800/30',
  metadata: 'text-gray-500 text-sm',
} as const;

// REMOVE: reuse of hero gradient on Goals, Journey, Profile, Progress
// Those views should use section-level cards
Before → After examples:

Goals hero card → Simple section card with goal text + progress bar
Journey hero card → Section card with roadmap title + stats
Profile hero card → Identity card with avatar + name (no full gradient)
Progress hero card → Remove entirely, stats strip is enough

0.3 — Rename User-Facing Jargon
Internal Term	User-Facing Term	Where It Appears
Behavioral Stones	Growth Challenges	Goals view, Profile
Shadow Extractor	(never shown)	—
Curriculum Builder	(never shown)	—
Stone severity: Critical	High Priority	Stone cards
Recalibrator	Plan Adjustment	Checkpoint notification
Cinema Mode	Focus Session	Today view
RAG Knowledge Base	(never shown)	—
FocusFragility	Attention Management	Stone cards
CognitiveFatigue	Mental Energy Management	Stone cards
ProcrastinationPattern	Starting Difficulty	Stone cards
Implementation:

TypeScript

// src/utils/stone-labels.ts — NEW
export const STONE_DISPLAY_NAMES: Record<StoneType, string> = {
  TimeConstraint: 'Time Management',
  ResourceGap: 'Resource Access',
  EnvironmentFriction: 'Environment Setup',
  Inconsistency: 'Consistency Building',
  FearOfFailure: 'Fear of Failure',
  Perfectionism: 'Perfectionism',
  LowConfidence: 'Confidence Building',
  UnrealisticExpectations: 'Expectation Calibration',
  FocusFragility: 'Attention Management',
  CognitiveFatigue: 'Mental Energy',
  SkillGap: 'Skill Foundation',
  ProcrastinationPattern: 'Starting Difficulty',
  Overcommitment: 'Load Management',
};

export const SEVERITY_DISPLAY: Record<string, string> = {
  Critical: 'High Priority',
  High: 'Important',
  Moderate: 'Moderate',
  Low: 'Minor',
};
0.4 — Auto Day Advancement
Current: User manually clicks "Start Day X" to advance.

Problem: If they forget to click, the app looks broken the next morning. "Why am I still on yesterday?"

Fix:

TypeScript

// src/hooks/useAutoAdvance.ts — NEW
export function useAutoAdvance() {
  const { wakeTime, currentDay } = useUserStore();
  
  useEffect(() => {
    const checkAdvance = () => {
      const now = new Date();
      const lastActiveDate = localStorage.getItem('coheren_last_active_date');
      const today = now.toISOString().split('T')[0];
      
      if (lastActiveDate && lastActiveDate !== today) {
        const daysMissed = daysBetween(lastActiveDate, today);
        
        if (daysMissed === 1) {
          // Normal advance
          advanceDay();
        } else if (daysMissed > 1) {
          // Missed days — trigger re-engagement
          advanceDay(daysMissed);
          triggerReEngagement(daysMissed);
        }
      }
      
      localStorage.setItem('coheren_last_active_date', today);
    };

    checkAdvance();
    
    // Also check when tab becomes visible (user returns to app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAdvance();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
}
0.5 — Haptic Feedback System
TypeScript

// src/utils/haptics.ts — NEW
export const haptics = {
  light: () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
  },
  medium: () => {
    if ('vibrate' in navigator) navigator.vibrate(25);
  },
  success: () => {
    if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
  },
  error: () => {
    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
  },
  celebration: () => {
    if ('vibrate' in navigator) navigator.vibrate([10, 30, 10, 30, 50]);
  },
};

// Usage: haptics.success() after task completion
// Usage: haptics.light() on tab switch
// Usage: haptics.celebration() on streak milestone
Phase 1: Today View Rebuild (Week 2-3)
Make the daily experience feel like a personal coach, not a task manager

1.1 — Today View Component Architecture
text

src/components/today/
├── TodayView.tsx                    // Main container
├── TodayHeader.tsx                  // Greeting + day + week dots
├── StatsStrip.tsx                   // Streak + Energy bar
├── SmartBannerSlot.tsx              // Max 1 banner, priority stack
│   ├── WeekRecapBanner.tsx
│   ├── StreakMilestoneBanner.tsx
│   ├── ReEngagementBanner.tsx
│   └── PlanAdjustmentBanner.tsx     // NEW
├── OnboardingChecklist.tsx          // NEW — first week only
├── FocusCard.tsx                    // Hero card — single task
├── TaskList.tsx                     // Expandable remaining tasks
├── DailyInsight.tsx                 // NEW — AI micro-insight
├── RestDayCard.tsx                  // NEW
├── AllDoneCard.tsx                  // Simplified celebration
└── EmptyState.tsx                   // No plan yet
1.2 — TodayHeader Component
React

// src/components/today/TodayHeader.tsx
interface TodayHeaderProps {
  userName: string;
  currentDay: number;
  currentWeekDay: number; // 1-7
  completedDaysThisWeek: number[];
}

export function TodayHeader({ userName, currentDay, currentWeekDay, completedDaysThisWeek }: TodayHeaderProps) {
  const greeting = getTimeGreeting(); // Good morning / afternoon / evening
  
  return (
    <div className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{greeting}</p>
          <h1 className="text-white text-2xl font-bold">{userName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-300 bg-purple-500/15 px-2.5 py-1 rounded-full font-medium">
            Day {currentDay}
          </span>
          <button onClick={openNotifications} className="relative p-2">
            <Bell className="w-5 h-5 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Week dots — 7 dots showing this week's progress */}
      <div className="flex gap-1.5 mt-3">
        {[1, 2, 3, 4, 5, 6, 7].map(day => (
          <div
            key={day}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              day < currentWeekDay && completedDaysThisWeek.includes(day)
                ? 'bg-purple-500'           // completed
                : day < currentWeekDay
                ? 'bg-red-400/60'           // missed
                : day === currentWeekDay
                ? 'bg-purple-400 animate-pulse w-2.5 h-2.5' // today
                : 'bg-gray-700'             // future
            )}
          />
        ))}
      </div>
    </div>
  );
}
Why week dots matter: Users get micro-feedback on their weekly consistency without any numbers. A row of purple dots is satisfying. A gap (red dot) creates gentle urgency. This is the "don't break the chain" principle in 7 pixels.

1.3 — Stats Strip (Reframed)
React

// src/components/today/StatsStrip.tsx
export function StatsStrip({ streak, energyPercent }: { streak: number; energyPercent: number }) {
  return (
    <div className="flex gap-3 px-5 py-2">
      <div className="flex items-center gap-1.5 bg-gray-900/60 rounded-xl px-3 py-2 flex-1">
        <Flame className={cn('w-4 h-4', streak > 0 ? 'text-orange-400' : 'text-gray-600')} />
        <span className="text-white text-sm font-semibold">{streak}</span>
        <span className="text-gray-500 text-xs">streak</span>
      </div>
      
      <div className="flex items-center gap-1.5 bg-gray-900/60 rounded-xl px-3 py-2 flex-1">
        <Zap className={cn(
          'w-4 h-4',
          energyPercent >= 80 ? 'text-green-400' :
          energyPercent >= 50 ? 'text-yellow-400' :
          'text-red-400'
        )} />
        <span className="text-white text-sm font-semibold">{energyPercent}%</span>
        <span className="text-gray-500 text-xs">energy</span>
        
        {/* Mini energy bar */}
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full ml-1 overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              energyPercent >= 80 ? 'bg-green-400' :
              energyPercent >= 50 ? 'bg-yellow-400' :
              'bg-red-400'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${energyPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
Key change: "Completion Rate" → "Energy". Same number, completely different psychology. An energy bar that's at 45% and red creates urgency. "45% completion rate" just feels like a grade.

1.4 — Smart Banner System (Priority-Based, Max 1)
React

// src/components/today/SmartBannerSlot.tsx
type BannerType = 'plan-adjustment' | 're-engagement' | 'streak-milestone' | 'week-recap';

const BANNER_PRIORITY: BannerType[] = [
  'plan-adjustment',    // Highest — AI changed your plan
  're-engagement',      // Missed days
  'streak-milestone',   // Hit a milestone
  'week-recap',         // Start of new week
];

export function SmartBannerSlot() {
  const activeBanners = useActiveBanners(); // hook that checks all conditions
  
  // Only show the highest priority banner
  const topBanner = BANNER_PRIORITY.find(type => activeBanners.includes(type));
  
  if (!topBanner) return null;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={topBanner}
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        className="px-5"
      >
        {topBanner === 'plan-adjustment' && <PlanAdjustmentBanner />}
        {topBanner === 're-engagement' && <ReEngagementBanner />}
        {topBanner === 'streak-milestone' && <StreakMilestoneBanner />}
        {topBanner === 'week-recap' && <WeekRecapBanner />}
      </motion.div>
    </AnimatePresence>
  );
}
NEW — Plan Adjustment Banner:

React

// src/components/today/banners/PlanAdjustmentBanner.tsx
// Shows when the 14-day recalibrator ran and modified the plan
export function PlanAdjustmentBanner() {
  return (
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">Your plan was adjusted</p>
          <p className="text-gray-400 text-xs mt-1">
            Based on your progress, I've shifted this week's focus to more practice 
            and less theory. You're learning faster by doing.
          </p>
        </div>
        <button onClick={dismiss} className="text-gray-600 hover:text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
This is crucial. Your 14-day recalibrator is a powerful feature that currently runs silently. The user should KNOW the AI adjusted their plan and WHY.

1.5 — Focus Card (The Hero)
React

// src/components/today/FocusCard.tsx
interface FocusCardProps {
  task: DailyTask;
  dayNumber: number;
  tasksRemaining: number;
}

export function FocusCard({ task, dayNumber, tasksRemaining }: FocusCardProps) {
  const typeConfig = {
    practice: { color: 'purple', icon: Target, label: 'Practice' },
    learning: { color: 'sky', icon: BookOpen, label: 'Learning' },
    reflection: { color: 'violet', icon: MessageCircle, label: 'Reflection' },
  };
  
  const config = typeConfig[task.type];
  
  return (
    <motion.div
      layout
      className="mx-5 bg-gradient-to-br from-purple-900/80 to-indigo-950/80 
                 border border-purple-500/15 rounded-3xl p-6 shadow-2xl shadow-purple-500/5"
    >
      {/* Type badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-full',
          `bg-${config.color}-500/15 text-${config.color}-300`
        )}>
          <config.icon className="w-3 h-3 inline mr-1" />
          {config.label}
        </span>
        <span className="text-gray-500 text-xs">
          {task.duration} min
        </span>
      </div>
      
      {/* Task title */}
      <h2 className="text-white text-xl font-bold leading-tight mb-2">
        {task.title}
      </h2>
      
      {/* Description */}
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        {task.description}
      </p>
      
      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => startFocusSession(task)}
          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white 
                     rounded-2xl py-3.5 font-semibold text-sm transition-colors
                     flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          Start Focus
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => markComplete(task)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 
                     rounded-2xl px-4 py-3.5 text-sm transition-colors"
        >
          <Check className="w-4 h-4" />
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => openSkipFlow(task)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-500 
                     rounded-2xl px-4 py-3.5 text-sm transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </motion.button>
      </div>
      
      {/* Remaining tasks */}
      {tasksRemaining > 0 && (
        <button
          onClick={expandTaskList}
          className="w-full mt-4 text-center text-gray-500 text-xs 
                     hover:text-gray-400 transition-colors"
        >
          +{tasksRemaining} more task{tasksRemaining > 1 ? 's' : ''} today
        </button>
      )}
    </motion.div>
  );
}
Key design decisions:

ONE task as the hero, not a list. This is the most important UX change.
Three action buttons: Start Focus (primary), Mark Done (secondary), Skip (tertiary)
No swipe gestures — explicit buttons are discoverable
The "+N more tasks" is a progressive disclosure tap target, not a visible list
1.6 — Daily Insight Card (NEW)
React

// src/components/today/DailyInsight.tsx
// This makes the AI VISIBLE. Right now, the AI works silently.

export function DailyInsight({ insight }: { insight: string }) {
  return (
    <div className="mx-5 mt-4 bg-gray-900/40 border border-gray-800/40 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1">
            Coach Insight
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </div>
  );
}
Where the insight comes from — new AI micro-agent:

TypeScript

// src/core/agents/insight-generator.ts — NEW
export async function generateDailyInsight(context: {
  completionHistory: TaskCompletion[];
  currentStreak: number;
  stones: BehavioralStone[];
  currentPhase: string;
  dayNumber: number;
}): Promise<string> {
  // Use the fast model — this runs on every app open
  const response = await groq('llama-3.1-8b-instant', {
    system: `You are a concise behavioral coach. Generate a single, 
             specific insight (max 25 words) based on the user's data. 
             Be warm but data-driven. Never generic.`,
    user: `
      Streak: ${context.currentStreak} days
      Tasks completed this week: ${weeklyCount}
      Primary challenge: ${context.stones[0]?.type}
      Phase: ${context.currentPhase}
      Patterns: ${derivePatterns(context.completionHistory)}
    `
  });
  
  return response;
}

// Example outputs:
// "You complete practice tasks 2x faster than learning tasks. Today's practice is right in your sweet spot."
// "Your streak survived a weekend — that's when 73% of users drop off. You didn't."
// "You've been skipping reflections. They're short — try today's 5-minute one."
1.7 — Onboarding Checklist (NEW — First Week Only)
React

// src/components/today/OnboardingChecklist.tsx
const CHECKLIST_ITEMS = [
  { id: 'first_task', label: 'Complete your first task', icon: Check },
  { id: 'first_focus', label: 'Try a Focus Session', icon: Play },
  { id: 'first_note', label: 'Write a note in Focus Mode', icon: Pencil },
  { id: 'three_streak', label: 'Hit a 3-day streak', icon: Flame },
  { id: 'explore_journey', label: 'Check your Journey map', icon: Map },
];

export function OnboardingChecklist() {
  const completed = useOnboardingProgress(); // reads from localStorage
  const allDone = completed.length === CHECKLIST_ITEMS.length;
  const [dismissed, setDismissed] = useState(false);
  
  if (allDone || dismissed) return null;
  
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-purple-400" />
          <span className="text-white text-sm font-semibold">Get Started</span>
        </div>
        <span className="text-gray-500 text-xs">
          {completed.length}/{CHECKLIST_ITEMS.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map(item => {
          const isDone = completed.includes(item.id);
          return (
            <div key={item.id} className={cn(
              'flex items-center gap-2.5 py-1',
              isDone && 'opacity-50'
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center border',
                isDone 
                  ? 'bg-purple-500 border-purple-500' 
                  : 'border-gray-700'
              )}>
                {isDone && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={cn(
                'text-sm',
                isDone ? 'text-gray-500 line-through' : 'text-gray-300'
              )}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
1.8 — Rest Day Card (NEW)
React

// src/components/today/RestDayCard.tsx
export function RestDayCard() {
  return (
    <div className="mx-5 mt-4 bg-gradient-to-br from-gray-900/80 to-gray-950/80 
                    border border-gray-800/30 rounded-3xl p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
        <Coffee className="w-6 h-6 text-purple-400" />
      </div>
      
      <h2 className="text-white text-xl font-bold mb-2">Rest Day</h2>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        Recovery is part of progress. Your streak is safe — 
        rest days are built into your plan.
      </p>
      
      <div className="flex gap-3 justify-center">
        <button
          onClick={navigateToJourney}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Preview Tomorrow →
        </button>
      </div>
    </div>
  );
}
Implementation in the AI pipeline:

TypeScript

// src/core/agents/task-generator.ts — MODIFY
// Every 7th day, OR when user's energy pattern suggests fatigue,
// generate a rest day instead of tasks

function shouldBeRestDay(dayNumber: number, energyPattern: string, recentCompletionRate: number): boolean {
  // Every 7th day
  if (dayNumber % 7 === 0) return true;
  
  // If completion rate dropped below 40% for 3 consecutive days
  if (recentCompletionRate < 0.4) return true;
  
  return false;
}
1.9 — Improved Skip Flow
React

// src/components/today/SkipFlow.tsx
const SKIP_REASONS = [
  { id: 'no_time', label: 'Not enough time', icon: Clock, followUp: 'shorter' },
  { id: 'too_hard', label: 'Too challenging', icon: Mountain, followUp: 'easier' },
  { id: 'not_relevant', label: 'Doesn\'t feel relevant', icon: HelpCircle, followUp: 'feedback' },
  { id: 'already_know', label: 'I already know this', icon: Brain, followUp: 'advance' },
  { id: 'low_energy', label: 'Low energy today', icon: Battery, followUp: 'defer' },
];

export function SkipFlow({ task, onSkip }: { task: DailyTask; onSkip: (reason: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
    >
      <div className="bg-gray-900 rounded-t-3xl w-full p-6 pb-safe">
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />
        
        <h3 className="text-white text-lg font-semibold mb-1">Skip this task?</h3>
        <p className="text-gray-500 text-sm mb-6">
          No judgment — help me understand so I can adjust your plan.
        </p>
        
        <div className="space-y-2">
          {SKIP_REASONS.map(reason => (
            <button
              key={reason.id}
              onClick={() => {
                haptics.light();
                onSkip(reason.id);
              }}
              className="w-full flex items-center gap-3 bg-gray-800/60 hover:bg-gray-800 
                         rounded-xl p-3.5 text-left transition-colors"
            >
              <reason.icon className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="text-gray-200 text-sm">{reason.label}</span>
            </button>
          ))}
        </div>
        
        <button
          onClick={dismiss}
          className="w-full mt-4 text-gray-600 text-sm py-3"
        >
          Never mind, I'll do it
        </button>
      </div>
    </motion.div>
  );
}
Key addition: Skip reasons now feed back to the AI. If a user skips 3 "too hard" tasks in a row, it triggers the Difficulty Feedback Loop (Phase 2).

1.10 — All-Done Card (Simplified)
React

// src/components/today/AllDoneCard.tsx
export function AllDoneCard({ tasksCompleted, streak, dayNumber }: AllDoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-5 mt-4 bg-gradient-to-br from-purple-900/60 to-indigo-950/60 
                 border border-purple-500/10 rounded-3xl p-8 text-center"
    >
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-4" />
      </motion.div>
      
      <h2 className="text-white text-xl font-bold mb-2">All done for today</h2>
      
      <div className="flex justify-center gap-6 mt-4 mb-6">
        <div className="text-center">
          <p className="text-purple-300 text-2xl font-bold">{tasksCompleted}</p>
          <p className="text-gray-500 text-xs">tasks</p>
        </div>
        <div className="text-center">
          <p className="text-orange-300 text-2xl font-bold">{streak}</p>
          <p className="text-gray-500 text-xs">streak</p>
        </div>
      </div>
      
      <p className="text-gray-500 text-sm italic">
        "Rest is part of the process."
      </p>
    </motion.div>
  );
}
Removed: The "Start Day X" button. Days advance automatically now.

Phase 2: Focus Session Rebuild (Week 3-4)
Transform Cinema Mode into a proper focus environment

2.1 — Focus Session Architecture
text

src/components/focus/
├── FocusSession.tsx             // Full-screen container
├── FocusHeader.tsx              // Timer + task info + close
├── FocusTimer.tsx               // Count-up timer with pause
├── ResourcePanel.tsx            // Video embed or instruction card
├── FocusTabBar.tsx              // Guide / Notes / Steps tabs
│   ├── GuideTab.tsx             // Task description + tips + "why this matters"
│   ├── NotesTab.tsx             // Text editor + voice-to-text + timestamps
│   └── StepsTab.tsx             // NEW — Sub-task checklist
├── FocusComplete.tsx            // Completion flow (mood → reflection → celebration)
├── FocusPauseOverlay.tsx        // NEW — Pause state
└── FocusResumePrompt.tsx        // NEW — "Resume where you left off?"
2.2 — Focus Timer (Count-Up, Not Count-Down)
React

// src/components/focus/FocusTimer.tsx
export function FocusTimer({ estimatedMinutes }: { estimatedMinutes: number }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = Math.min((seconds / 60) / estimatedMinutes, 1);
  
  return (
    <div className="flex items-center gap-3">
      {/* Circular progress ring */}
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1f2937" strokeWidth="2" />
        <circle
          cx="18" cy="18" r="15" fill="none"
          stroke={progress >= 1 ? '#a78bfa' : '#7c3aed'}
          strokeWidth="2"
          strokeDasharray={`${progress * 94.2} 94.2`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      
      <div>
        <span className="text-white text-lg font-mono font-semibold">
          {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <p className="text-gray-500 text-[10px]">
          ~{estimatedMinutes} min estimated
        </p>
      </div>
      
      <button
        onClick={() => setIsRunning(!isRunning)}
        className="ml-auto p-2 rounded-full bg-gray-800 hover:bg-gray-700"
      >
        {isRunning ? <Pause className="w-4 h-4 text-gray-300" /> : <Play className="w-4 h-4 text-gray-300" />}
      </button>
    </div>
  );
}
Why count-up: Countdown timers create anxiety ("I only have 3 minutes left!"). Count-up timers let users enter flow state. The circular progress ring shows estimated time without pressure.

2.3 — Steps Tab (NEW — Sub-task Breakdown)
React

// src/components/focus/StepsTab.tsx
// The AI already generates step-by-step guides. Parse them into checkable steps.

interface Step {
  id: string;
  text: string;
  completed: boolean;
}

export function StepsTab({ taskId, steps }: { taskId: string; steps: Step[] }) {
  const [localSteps, setLocalSteps] = useLocalStorage<Step[]>(`focus-steps-${taskId}`, steps);
  
  const completedCount = localSteps.filter(s => s.completed).length;
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">
          {completedCount}/{localSteps.length} steps
        </span>
        <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${(completedCount / localSteps.length) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        {localSteps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => toggleStep(step.id)}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
              step.completed ? 'bg-purple-500/5' : 'bg-gray-800/40'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              step.completed ? 'bg-purple-500 border-purple-500' : 'border-gray-600'
            )}>
              {step.completed && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={cn(
              'text-sm leading-relaxed',
              step.completed ? 'text-gray-500 line-through' : 'text-gray-200'
            )}>
              {step.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
2.4 — Notes Tab (Enhanced)
React

// src/components/focus/NotesTab.tsx
export function NotesTab({ taskId, videoTimestamp }: { taskId: string; videoTimestamp?: number }) {
  const [notes, setNotes] = useLocalStorage<NoteEntry[]>(`focus-notes-${taskId}`, []);
  const [currentText, setCurrentText] = useState('');
  
  const addNote = () => {
    if (!currentText.trim()) return;
    const entry: NoteEntry = {
      id: nanoid(),
      text: currentText,
      timestamp: videoTimestamp ? formatTime(videoTimestamp) : undefined,
      createdAt: new Date().toISOString(),
    };
    setNotes([...notes, entry]);
    setCurrentText('');
    haptics.light();
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Existing notes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.map(note => (
          <div key={note.id} className="bg-gray-800/40 rounded-xl p-3">
            {note.timestamp && (
              <span className="text-purple-400 text-xs font-mono mb-1 block">
                ⏱ {note.timestamp}
              </span>
            )}
            <p className="text-gray-200 text-sm">{note.text}</p>
          </div>
        ))}
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-800 p-3 flex gap-2">
        <input
          value={currentText}
          onChange={e => setCurrentText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()}
          placeholder="Add a note..."
          className="flex-1 bg-gray-800/60 rounded-xl px-4 py-2.5 text-sm text-white 
                     placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-purple-500/30"
        />
        
        {/* Voice-to-text button */}
        <button
          onClick={startVoiceInput}
          className="p-2.5 rounded-xl bg-gray-800/60 hover:bg-gray-700 transition-colors"
        >
          <Mic className="w-4 h-4 text-gray-400" />
        </button>
        
        <button
          onClick={addNote}
          disabled={!currentText.trim()}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition-colors 
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
Key additions:

Notes are now individual entries with timestamps, not a single blob of text
If video is playing, notes automatically tag the current timestamp
Voice-to-text button for hands-free note-taking
Notes are stored as structured data, making them searchable in Journey drill-down
2.5 — Focus Complete Flow (3-Step)
React

// src/components/focus/FocusComplete.tsx
type CompleteStep = 'mood' | 'reflection' | 'celebration';

export function FocusComplete({ task, timeSpent, onClose }: FocusCompleteProps) {
  const [step, setStep] = useState<CompleteStep>('mood');
  const [mood, setMood] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');
  
  const moods = [
    { value: 1, emoji: '😫', label: 'Hard' },
    { value: 2, emoji: '😕', label: 'Meh' },
    { value: 3, emoji: '😐', label: 'OK' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '🤩', label: 'Great' },
  ];
  
  return (
    <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === 'mood' && (
          <motion.div key="mood" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
            <h3 className="text-white text-xl font-bold mb-6">How did that feel?</h3>
            <div className="flex gap-4 justify-center mb-8">
              {moods.map(m => (
                <button
                  key={m.value}
                  onClick={() => {
                    setMood(m.value);
                    haptics.light();
                    setTimeout(() => setStep('reflection'), 300);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-2xl transition-all',
                    mood === m.value ? 'bg-purple-500/20 scale-110' : 'hover:bg-gray-800/40'
                  )}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-gray-500 text-xs">{m.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        
        {step === 'reflection' && (
          <motion.div key="reflection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm">
            <h3 className="text-white text-xl font-bold mb-2 text-center">Quick thought?</h3>
            <p className="text-gray-500 text-sm text-center mb-4">Optional — anything you want to remember</p>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="I noticed that..."
              rows={3}
              className="w-full bg-gray-800/60 rounded-2xl px-4 py-3 text-sm text-white 
                         placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('celebration')} className="flex-1 text-gray-500 text-sm py-3">
                Skip
              </button>
              <button
                onClick={() => {
                  saveReflection(reflection);
                  setStep('celebration');
                }}
                className="flex-1 bg-purple-600 rounded-2xl py-3 text-white text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
        
        {step === 'celebration' && (
          <motion.div key="celebration" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <ConfettiExplosion />
            {haptics.celebration()}
            
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-white text-2xl font-bold mb-4">Task Complete! 🎉</h3>
              
              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-purple-300 text-lg font-bold">
                    {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, '0')}
                  </p>
                  <p className="text-gray-500 text-xs">time spent</p>
                </div>
                <div className="text-center">
                  <p className="text-orange-300 text-lg font-bold">{newStreak}</p>
                  <p className="text-gray-500 text-xs">day streak</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="bg-purple-600 hover:bg-purple-500 rounded-2xl px-8 py-3 
                           text-white font-semibold transition-colors"
              >
                Back to Today
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
2.6 — Session Persistence (NEW)
TypeScript

// src/hooks/useFocusSession.ts — NEW
interface FocusSessionState {
  taskId: string;
  startedAt: string;
  elapsedSeconds: number;
  videoPosition?: number;
  notes: NoteEntry[];
  stepsCompleted: string[];
  isPaused: boolean;
}

export function useFocusSession() {
  const [session, setSession] = useLocalStorage<FocusSessionState | null>('coheren_active_session', null);
  
  const startSession = (task: DailyTask) => {
    setSession({
      taskId: task.id,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      notes: [],
      stepsCompleted: [],
      isPaused: false,
    });
  };
  
  const pauseSession = () => {
    if (session) {
      setSession({ ...session, isPaused: true });
    }
  };
  
  const resumeSession = () => {
    if (session) {
      setSession({ ...session, isPaused: false });
    }
  };
  
  const hasActiveSession = session !== null && !session.isPaused;
  
  return { session, startSession, pauseSession, resumeSession, hasActiveSession };
}
Resume prompt on app open:

React

// src/components/focus/FocusResumePrompt.tsx
export function FocusResumePrompt() {
  const { session, resumeSession, clearSession } = useFocusSession();
  
  if (!session) return null;
  
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-20 left-4 right-4 bg-gray-900 border border-purple-500/20 
                 rounded-2xl p-4 shadow-xl shadow-purple-500/10 z-40"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Play className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium">Resume session?</p>
          <p className="text-gray-500 text-xs">
            {formatElapsed(session.elapsedSeconds)} elapsed
          </p>
        </div>
        <button onClick={resumeSession} className="bg-purple-600 rounded-xl px-4 py-2 text-white text-sm font-medium">
          Resume
        </button>
        <button onClick={clearSession} className="text-gray-600 p-2">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
Phase 3: Progress View (Week 4-5)
Promoted from desktop-only to a primary mobile tab

3.1 — Component Architecture
text

src/components/progress/
├── ProgressView.tsx
├── ProgressHeader.tsx
├── StreakCalendar.tsx          // NEW — GitHub-style contribution graph
├── WeeklyPerformance.tsx      // Enhanced from existing
├── ActivityBreakdown.tsx      // Keep, improve
├── TrendSparkline.tsx         // NEW — mini line chart
├── PersonalRecords.tsx        // NEW
└── CoachSummary.tsx           // NEW — AI weekly analysis
3.2 — Streak Calendar (The Centerpiece)
React

// src/components/progress/StreakCalendar.tsx
interface CalendarDay {
  date: string;
  status: 'completed' | 'partial' | 'missed' | 'rest' | 'today' | 'future';
}

export function StreakCalendar({ days, currentMonth }: { days: CalendarDay[]; currentMonth: string }) {
  const statusColors = {
    completed: 'bg-purple-500',
    partial: 'bg-purple-500/40',
    missed: 'bg-red-500/30',
    rest: 'bg-gray-700 ring-1 ring-gray-600',
    today: 'bg-purple-400 ring-2 ring-purple-400/50 animate-pulse',
    future: 'bg-gray-800/30',
  };
  
  return (
    <div className="mx-5 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-sm font-semibold">{currentMonth}</h3>
        <div className="flex gap-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-purple-500" /> Done
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-500/30" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-gray-700 ring-1 ring-gray-600" /> Rest
          </span>
        </div>
      </div>
      
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <span key={i} className="text-gray-600 text-[10px] text-center">{day}</span>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <motion.div
            key={day.date}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              'aspect-square rounded-md transition-all cursor-pointer',
              statusColors[day.status]
            )}
            onClick={() => day.status !== 'future' && showDayDetail(day)}
          />
        ))}
      </div>
      
      {/* Current streak callout */}
      <div className="mt-4 pt-3 border-t border-gray-800/40 flex items-center justify-between">
        <span className="text-gray-400 text-xs">Current streak</span>
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-white text-sm font-bold">{currentStreak} days</span>
        </div>
      </div>
    </div>
  );
}
Why this matters: This is the single most addictive component in habit apps. Users open Progress just to see their grid. Every purple square is a small dopamine hit. Every gap is gentle motivation to not create another one.

3.3 — Personal Records (NEW)
React

// src/components/progress/PersonalRecords.tsx
export function PersonalRecords({ records }: { records: PersonalRecordsData }) {
  const items = [
    { label: 'Longest Streak', value: `${records.longestStreak} days`, icon: Flame, color: 'text-orange-400' },
    { label: 'Best Week', value: `Week ${records.bestWeek.number} (${records.bestWeek.percentage}%)`, icon: Trophy, color: 'text-yellow-400' },
    { label: 'Tasks Completed', value: records.totalTasksDone.toString(), icon: CheckCircle, color: 'text-green-400' },
    { label: 'Time Invested', value: formatHours(records.totalMinutes), icon: Clock, color: 'text-purple-400' },
  ];
  
  return (
    <div className="mx-5 mt-4">
      <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        Personal Records
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className="bg-gray-900/60 border border-gray-800/40 rounded-xl p-3">
            <item.icon className={cn('w-4 h-4 mb-2', item.color)} />
            <p className="text-white text-lg font-bold">{item.value}</p>
            <p className="text-gray-500 text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
"Time Invested" is psychologically powerful. When someone sees "I've invested 14.5 hours into learning guitar," quitting feels like throwing away those hours. This is sunk-cost motivation used ethically — the time IS real, and the progress IS real.

3.4 — AI Coach Summary (NEW)
React

// src/components/progress/CoachSummary.tsx
export function CoachSummary({ summary }: { summary: string }) {
  return (
    <div className="mx-5 mt-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
            Weekly Coach Notes
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            {summary}
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Updated every Monday
          </p>
        </div>
      </div>
    </div>
  );
}
Where the summary comes from:

TypeScript

// src/core/agents/coach-summary.ts — NEW
export async function generateWeeklySummary(context: {
  completionData: WeekData;
  skipReasons: SkipReason[];
  moodRatings: number[];
  stones: BehavioralStone[];
  phase: string;
}): Promise<string> {
  const response = await groq('llama-3.1-8b-instant', {
    system: `You're a supportive behavioral coach writing a weekly note 
             to your client. Max 3 sentences. Be specific about their data. 
             Include one observation and one forward-looking encouragement.
             Never be generic.`,
    user: `
      Week completion: ${context.completionData.percentage}%
      Tasks done: ${context.completionData.completed}/${context.completionData.total}
      Skip reasons: ${JSON.stringify(context.skipReasons)}
      Average mood: ${average(context.moodRatings)}/5
      Primary challenge: ${context.stones[0]?.type}
      Current phase: ${context.phase}
    `
  });
  
  return response;
}

// Example output:
// "You completed 5 out of 7 tasks this week — your strongest week yet. 
//  I noticed you skipped both weekend tasks citing 'no time.' Next week, 
//  I've made Saturday's task a 5-minute reflection instead of a practice session."
This is the killer feature. The AI doesn't just generate a plan and disappear — it actively observes, comments, and adapts. The user feels coached, not managed.

3.5 — Trend Sparkline
React

// src/components/progress/TrendSparkline.tsx
export function TrendSparkline({ data }: { data: { week: number; percentage: number }[] }) {
  const maxY = 100;
  const width = 300;
  const height = 60;
  const padding = 8;
  
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - 2 * padding),
    y: height - padding - (d.percentage / maxY) * (height - 2 * padding),
  }));
  
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    return `${acc} L ${p.x} ${p.y}`;
  }, '');
  
  const trend = data.length >= 2 
    ? data[data.length - 1].percentage - data[data.length - 2].percentage 
    : 0;
  
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-semibold">Weekly Trend</h3>
        <span className={cn(
          'text-xs font-medium flex items-center gap-1',
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs last week
        </span>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Gradient fill */}
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <path d={`${pathD} L ${points[points.length-1].x} ${height-padding} L ${points[0].x} ${height-padding} Z`} fill="url(#sparkGradient)" />
        
        {/* Line */}
        <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={i === points.length - 1 ? '#a78bfa' : '#7c3aed'} />
        ))}
      </svg>
      
      <div className="flex justify-between mt-2">
        {data.map(d => (
          <span key={d.week} className="text-gray-600 text-[10px]">W{d.week}</span>
        ))}
      </div>
    </div>
  );
}
Phase 4: Journey View Enhancement (Week 5-6)
Transform from a passive timeline into an interactive roadmap + library

4.1 — Component Architecture
text

src/components/journey/
├── JourneyView.tsx
├── PhaseMap.tsx                  // NEW — visual phase indicator
├── WeekCard.tsx                  // Enhanced with day dots
├── TaskDrillDown.tsx             // NEW — replaces Library view
├── UpcomingPreview.tsx           // NEW
├── MonthReview.tsx               // NEW — milestone summaries
└── CompletedNotesBadge.tsx       // Indicator for notes in drill-down
4.2 — Phase Map
React

// src/components/journey/PhaseMap.tsx
interface Phase {
  name: string;
  weeks: number[];
  status: 'completed' | 'active' | 'upcoming';
  percentage: number;
}

export function PhaseMap({ phases, currentPhaseIndex }: { phases: Phase[]; currentPhaseIndex: number }) {
  return (
    <div className="mx-5 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        {phases.map((phase, i) => (
          <React.Fragment key={phase.name}>
            {/* Phase node */}
            <div className="flex-1">
              <div className={cn(
                'h-2 rounded-full mb-2 overflow-hidden',
                phase.status === 'upcoming' ? 'bg-gray-800' : 'bg-gray-800'
              )}>
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    phase.status === 'completed' ? 'bg-purple-500' :
                    phase.status === 'active' ? 'bg-purple-500' :
                    'bg-transparent'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${phase.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <p className={cn(
                'text-[11px] font-medium',
                phase.status === 'active' ? 'text-purple-300' :
                phase.status === 'completed' ? 'text-gray-400' :
                'text-gray-600'
              )}>
                {phase.name}
              </p>
            </div>
            
            {/* Connector */}
            {i < phases.length - 1 && (
              <ChevronRight className={cn(
                'w-3 h-3 shrink-0 mt-[-12px]',
                i < currentPhaseIndex ? 'text-purple-500' : 'text-gray-700'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Current phase description */}
      <p className="text-gray-400 text-xs mt-3 leading-relaxed">
        {phases[currentPhaseIndex].description}
      </p>
    </div>
  );
}
4.3 — Enhanced Week Card with Day Dots
React

// src/components/journey/WeekCard.tsx
interface WeekCardProps {
  week: RoadmapWeek;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function WeekCard({ week, isActive, isExpanded, onToggle }: WeekCardProps) {
  return (
    <motion.div
      layout
      className={cn(
        'border rounded-2xl overflow-hidden transition-all',
        isActive 
          ? 'border-purple-500/30 bg-purple-500/5 shadow-lg shadow-purple-500/5' 
          : week.status === 'completed'
          ? 'border-gray-800/40 bg-gray-900/40'
          : 'border-gray-800/20 bg-gray-950/40'
      )}
    >
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">Week {week.number}</span>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
            {week.status === 'completed' && (
              <CheckCircle className="w-4 h-4 text-purple-400" />
            )}
          </div>
          <span className="text-gray-500 text-xs">{week.completedTasks}/{week.totalTasks}</span>
        </div>
        
        <p className="text-gray-400 text-xs mb-3">{week.focus}</p>
        
        {/* Day dots for this week */}
        <div className="flex gap-1">
          {week.days.map(day => (
            <div
              key={day.number}
              className={cn(
                'flex-1 h-1.5 rounded-full',
                day.completed ? 'bg-purple-500' :
                day.skipped ? 'bg-red-400/40' :
                day.isToday ? 'bg-purple-400 animate-pulse' :
                day.isRest ? 'bg-gray-700' :
                'bg-gray-800'
              )}
            />
          ))}
        </div>
      </button>
      
      {/* Expanded task list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-800/30 space-y-1">
              {week.tasks.map(task => (
                <TaskDrillDownRow key={task.id} task={task} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
4.4 — Task Drill-Down (Replaces Library)
React

// src/components/journey/TaskDrillDownRow.tsx
export function TaskDrillDownRow({ task }: { task: CompletedTask }) {
  const [showDetail, setShowDetail] = useState(false);
  
  const typeColors = {
    practice: 'bg-purple-500/15 text-purple-300',
    learning: 'bg-sky-500/15 text-sky-300',
    reflection: 'bg-violet-500/15 text-violet-300',
  };
  
  return (
    <>
      <button
        onClick={() => task.completed && setShowDetail(!showDetail)}
        className={cn(
          'w-full flex items-center gap-3 py-2.5 text-left',
          !task.completed && 'opacity-40'
        )}
      >
        {/* Status indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full shrink-0',
          task.completed ? 'bg-purple-500' :
          task.skipped ? 'bg-red-400/60' :
          task.isToday ? 'bg-purple-400 animate-pulse' :
          'bg-gray-700'
        )} />
        
        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm truncate',
            task.completed ? 'text-gray-200' : 'text-gray-500'
          )}>
            {task.title}
          </p>
        </div>
        
        {/* Metadata */}
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded', typeColors[task.type])}>
          {task.type}
        </span>
        <span className="text-gray-600 text-xs">{task.duration}m</span>
        
        {/* Notes indicator */}
        {task.hasNotes && (
          <MessageSquare className="w-3 h-3 text-purple-400 shrink-0" />
        )}
      </button>
      
      {/* Detail expansion */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-5 pb-3 space-y-2">
              <p className="text-gray-400 text-xs leading-relaxed">{task.description}</p>
              
              {task.feedback && (
                <div className="flex items-center gap-2 text-xs">
                  <span>Felt: {['😫','😕','😐','🙂','🤩'][task.feedback.mood - 1]}</span>
                  {task.feedback.reflection && (
                    <p className="text-gray-500 italic">"{task.feedback.reflection}"</p>
                  )}
                </div>
              )}
              
              {task.notes && task.notes.length > 0 && (
                <div className="bg-gray-800/40 rounded-xl p-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Notes</p>
                  {task.notes.map(note => (
                    <p key={note.id} className="text-gray-300 text-xs">{note.text}</p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
This replaces the entire Library tab. All completed tasks, with their notes, feedback, and metadata, are accessible through the Journey drill-down. Context-rich (you see the task in the week it happened) rather than context-free (a flat list).

4.5 — Upcoming Preview (NEW)
React

// src/components/journey/UpcomingPreview.tsx
export function UpcomingPreview({ nextWeek }: { nextWeek: RoadmapWeek }) {
  return (
    <div className="mx-5 mt-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-indigo-400" />
        <h3 className="text-indigo-300 text-sm font-semibold">Next Week Preview</h3>
      </div>
      
      <p className="text-white text-base font-medium mb-1">
        Week {nextWeek.number}: {nextWeek.focus}
      </p>
      <p className="text-gray-400 text-xs leading-relaxed mb-4">
        {nextWeek.description}
      </p>
      
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-purple-400" />
          <span className="text-gray-400 text-xs">
            {nextWeek.practiceCount} practice
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-sky-400" />
          <span className="text-gray-400 text-xs">
            {nextWeek.learningCount} learning
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3 h-3 text-violet-400" />
          <span className="text-gray-400 text-xs">
            {nextWeek.reflectionCount} reflection
          </span>
        </div>
      </div>
    </div>
  );
}
Phase 5: Profile/Me View + Goals Integration (Week 6-7)
5.1 — Component Architecture
text

src/components/me/
├── MeView.tsx
├── IdentityCard.tsx             // Enhanced — evolving title
├── GoalCard.tsx                 // Absorbed from Goals view
├── ChallengesCard.tsx           // Renamed from "Stones"
├── CommitmentCard.tsx           // NEW
├── PreferencesSection.tsx
├── NotificationSettings.tsx     // NEW — expanded
└── DataSection.tsx              // Export, reset, delete
5.2 — Identity Card with Evolving Title
React

// src/components/me/IdentityCard.tsx
function getEvolvingTitle(goal: string, dayNumber: number, totalDays: number): string {
  const progress = dayNumber / totalDays;
  const domain = extractDomain(goal); // "guitar", "coding", "fitness", etc.
  
  if (progress < 0.15) return `Aspiring ${domain} Student`;
  if (progress < 0.35) return `Developing ${domain} Practitioner`;
  if (progress < 0.60) return `Growing ${domain} Enthusiast`;
  if (progress < 0.85) return `Dedicated ${domain} Builder`;
  return `${domain} Achiever`;
}

export function IdentityCard({ user, goal, stats }: IdentityCardProps) {
  const title = getEvolvingTitle(goal.description, stats.currentDay, stats.totalDays);
  
  return (
    <div className="mx-5 bg-gradient-to-br from-purple-900/60 to-indigo-950/60 
                    border border-purple-500/10 rounded-3xl p-6 text-center">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
        <span className="text-purple-300 text-xl font-bold">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
      
      {/* Name */}
      <h2 className="text-white text-xl font-bold">{user.name}</h2>
      
      {/* Evolving title */}
      <p className="text-purple-300 text-sm mt-1">{title}</p>
      
      {/* Stats strip */}
      <div className="flex justify-center gap-8 mt-5">
        <div className="text-center">
          <p className="text-white text-lg font-bold">{stats.streak}</p>
          <p className="text-gray-500 text-xs">streak</p>
        </div>
        <div className="text-center">
          <p className="text-white text-lg font-bold">{stats.tasksDone}</p>
          <p className="text-gray-500 text-xs">done</p>
        </div>
        <div className="text-center">
          <p className="text-white text-lg font-bold">{formatHours(stats.totalMinutes)}</p>
          <p className="text-gray-500 text-xs">invested</p>
        </div>
      </div>
    </div>
  );
}
Why evolving titles matter: "Aspiring Guitar Student" → "Dedicated Guitar Builder" creates identity-based motivation. The user isn't just checking off tasks — they're becoming someone.

5.3 — Challenges Card (Renamed from Stones)
React

// src/components/me/ChallengesCard.tsx
export function ChallengesCard({ stones }: { stones: BehavioralStone[] }) {
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <h3 className="text-white text-sm font-semibold mb-1">Growth Challenges</h3>
      <p className="text-gray-500 text-xs mb-4">
        These are the patterns your AI coach identified and is actively working around.
      </p>
      
      <div className="space-y-2.5">
        {stones.map(stone => (
          <div key={stone.type} className="flex items-start gap-3">
            <div className={cn(
              'w-2 h-2 rounded-full mt-1.5 shrink-0',
              stone.severity === 'Critical' || stone.severity === 'High' 
                ? 'bg-orange-400' 
                : 'bg-gray-500'
            )} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-gray-200 text-sm font-medium">
                  {STONE_DISPLAY_NAMES[stone.type]}
                </span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  stone.severity === 'Critical' ? 'bg-red-500/15 text-red-300' :
                  stone.severity === 'High' ? 'bg-orange-500/15 text-orange-300' :
                  stone.severity === 'Moderate' ? 'bg-yellow-500/15 text-yellow-300' :
                  'bg-gray-500/15 text-gray-400'
                )}>
                  {SEVERITY_DISPLAY[stone.severity]}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{stone.trigger}</p>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-gray-600 text-[10px] mt-4 italic">
        Your plan is specifically designed to work around these patterns.
      </p>
    </div>
  );
}
5.4 — Commitment Card (NEW)
React

// src/components/me/CommitmentCard.tsx
export function CommitmentCard({ commitment }: { commitment: string }) {
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-purple-400" />
        <h3 className="text-white text-sm font-semibold">My Commitment</h3>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed italic">
        "{commitment}"
      </p>
      <p className="text-gray-600 text-xs mt-3">
        Written on {formatDate(commitmentDate)}
      </p>
    </div>
  );
}
Generated during onboarding:

TypeScript

// Add to chat onboarding flow — after plan generation
const commitment = await groq('llama-3.1-8b-instant', {
  system: `Generate a first-person commitment statement (2 sentences max) 
           based on the user's goal and preferences. Make it personal and specific.`,
  user: `Goal: ${goal.description}, Time: ${preferences.dailyTime} min/day, 
         Energy: ${preferences.energyPattern}, Wake: ${preferences.wakeTime}`
});

// Example: "I commit to spending 30 minutes every morning before work to practice guitar. 
//           Even on hard days, I'll show up for at least 5 minutes."
5.5 — Notification Settings (Expanded)
React

// src/components/me/NotificationSettings.tsx
const NOTIFICATION_OPTIONS = [
  { 
    id: 'morning_nudge', 
    label: 'Morning Nudge', 
    description: 'Reminder to start your daily task',
    defaultTime: '09:00',
    icon: Sun,
  },
  { 
    id: 'evening_reminder', 
    label: 'Evening Reminder', 
    description: 'Last call if tasks are incomplete',
    defaultTime: '20:00',
    icon: Moon,
  },
  { 
    id: 'streak_warning', 
    label: 'Streak Warning', 
    description: 'Alert when your streak is at risk',
    defaultTime: '21:00',
    icon: AlertTriangle,
  },
  { 
    id: 'weekly_summary', 
    label: 'Weekly Summary', 
    description: 'Your week in review, every Monday',
    defaultTime: '09:00',
    icon: BarChart,
  },
  { 
    id: 'milestone_alerts', 
    label: 'Milestone Alerts', 
    description: 'Celebrate streak and progress milestones',
    defaultTime: null, // event-triggered
    icon: Trophy,
  },
];

export function NotificationSettings() {
  const [settings, setSettings] = useLocalStorage('notification_settings', defaultSettings);
  
  return (
    <div className="space-y-1">
      {NOTIFICATION_OPTIONS.map(option => (
        <div key={option.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800/40 transition-colors">
          <div className="flex items-center gap-3">
            <option.icon className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-gray-200 text-sm">{option.label}</p>
              <p className="text-gray-600 text-xs">{option.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {option.defaultTime && settings[option.id].enabled && (
              <input
                type="time"
                value={settings[option.id].time}
                onChange={e => updateTime(option.id, e.target.value)}
                className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1 border border-gray-700"
              />
            )}
            <Switch
              checked={settings[option.id].enabled}
              onChange={enabled => updateEnabled(option.id, enabled)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
Service Worker integration:

TypeScript

// src/sw.ts — ENHANCE existing
// Add streak warning notification
async function checkStreakRisk() {
  const lastCompletion = await getLastCompletionDate();
  const now = new Date();
  const hoursSinceCompletion = (now.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCompletion > 20 && hoursSinceCompletion < 24) {
    self.registration.showNotification('🔥 Streak at risk!', {
      body: `Your ${currentStreak}-day streak ends at midnight. Just one task to keep it alive.`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'streak-warning',
      actions: [
        { action: 'open', title: 'Open Coheren' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }
}
Phase 6: Cross-Cutting Systems (Week 7-8)
6.1 — Difficulty Feedback Loop (Auto-triggered)
TypeScript

// src/hooks/useDifficultyMonitor.ts — NEW
export function useDifficultyMonitor() {
  const { recentSkips, recentMoods } = useTaskStore();
  
  useEffect(() => {
    // Check for difficulty pattern
    const last5Skips = recentSkips.slice(-5);
    const hardSkips = last5Skips.filter(s => s.reason === 'too_hard').length;
    const lowMoods = recentMoods.slice(-5).filter(m => m <= 2).length;
    
    if (hardSkips >= 3 || lowMoods >= 4) {
      triggerDifficultyPrompt();
    }
  }, [recentSkips, recentMoods]);
}
React

// src/components/shared/DifficultyPrompt.tsx
export function DifficultyPrompt({ onChoice }: { onChoice: (choice: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-gray-800">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Wrench className="w-6 h-6 text-amber-400" />
        </div>
        
        <h3 className="text-white text-lg font-bold text-center mb-2">
          Let's adjust your plan
        </h3>
        <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
          I noticed things have been challenging. That's normal — 
          let me adapt to where you are right now.
        </p>
        
        <div className="space-y-2">
          <button
            onClick={() => onChoice('simplify')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-2xl 
                       py-3.5 text-sm font-semibold transition-colors"
          >
            Simplify this week
          </button>
          <button
            onClick={() => onChoice('extend')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-2xl 
                       py-3.5 text-sm transition-colors"
          >
            Extend my timeline
          </button>
          <button
            onClick={() => onChoice('keep')}
            className="w-full text-gray-500 text-sm py-3 hover:text-gray-400 transition-colors"
          >
            I'm fine, keep going
          </button>
        </div>
      </div>
    </motion.div>
  );
}
Backend handling:

TypeScript

// When user chooses "simplify":
// - Agent 4 re-generates remaining week tasks with lower difficulty
// - Fewer tasks per day, shorter durations, more scaffolding

// When user chooses "extend":  
// - Curriculum Builder adds 1-2 weeks to the timeline
// - Spreads remaining content over more days
// - Show Plan Adjustment Banner on next Today view load
6.2 — Shareable Achievement Cards (NEW)
React

// src/components/shared/ShareableCard.tsx
export function ShareableCard({ milestone }: { milestone: MilestoneData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const generateImage = async () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    // Dark purple gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2e1065');
    gradient.addColorStop(1, '#0f0a1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Milestone text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 ${milestone.streak}-Day Streak`, canvas.width / 2, 120);
    
    // Stats
    ctx.fillStyle = '#a78bfa';
    ctx.font = '16px Inter';
    ctx.fillText(`${milestone.tasksCompleted} tasks · ${milestone.hoursInvested} hours`, canvas.width / 2, 160);
    
    // Goal
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Inter';
    ctx.fillText(`Learning ${milestone.goalDomain}`, canvas.width / 2, 200);
    
    // Branding
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter';
    ctx.fillText('coheren.ai', canvas.width / 2, 260);
    
    return canvas.toDataURL('image/png');
  };
  
  const share = async () => {
    const imageUrl = await generateImage();
    
    if (navigator.share) {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], 'coheren-milestone.png', { type: 'image/png' });
      await navigator.share({
        title: `${milestone.streak}-Day Streak on Coheren`,
        text: `I just hit a ${milestone.streak}-day streak learning ${milestone.goalDomain}!`,
        files: [file],
      });
    } else {
      // Fallback: download image
      downloadImage(imageUrl);
    }
    
    analytics.track('milestone_shared', { streak: milestone.streak });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
    >
      <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full">
        {/* Preview */}
        <div className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-2xl p-6 mb-6 text-center">
          <p className="text-3xl mb-2">🔥</p>
          <h3 className="text-white text-xl font-bold">{milestone.streak}-Day Streak</h3>
          <p className="text-purple-300 text-sm mt-1">
            {milestone.tasksCompleted} tasks · {milestone.hoursInvested}h invested
          </p>
          <p className="text-gray-400 text-xs mt-3">coheren.ai</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={share} className="flex-1 bg-purple-600 rounded-2xl py-3 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button onClick={saveImage} className="bg-gray-800 rounded-2xl px-4 py-3">
            <Download className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={dismiss} className="bg-gray-800 rounded-2xl px-4 py-3">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      
      <canvas ref={canvasRef} width={600} height={300} className="hidden" />
    </motion.div>
  );
}
6.3 — In-App Notification Center (NEW)
React

// src/components/shared/NotificationCenter.tsx
interface AppNotification {
  id: string;
  type: 'plan_adjustment' | 'milestone' | 'weekly_summary' | 'coach_insight' | 'system';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const notifications = useNotifications();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-gray-900 border-b border-gray-800 rounded-b-3xl max-h-[60vh] overflow-y-auto"
          >
            <div className="p-5 border-b border-gray-800/50 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
              <h3 className="text-white text-lg font-semibold">Updates</h3>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No updates yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/30">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 transition-colors',
                      !notif.read && 'bg-purple-500/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-gray-200 text-sm font-medium">{notif.title}</p>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{notif.body}</p>
                        <p className="text-gray-700 text-[10px] mt-2">{formatRelative(notif.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
6.4 — Offline Support
TypeScript

// src/hooks/useOfflineSync.ts — NEW
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useLocalStorage<PendingAction[]>('offline_queue', []);
  
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Flush pending actions
      for (const action of pendingActions) {
        await syncAction(action);
      }
      setPendingActions([]);
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions]);
  
  const queueAction = (action: PendingAction) => {
    if (isOnline) {
      syncAction(action);
    } else {
      setPendingActions([...pendingActions, action]);
    }
  };
  
  return { isOnline, queueAction, pendingCount: pendingActions.length };
}
React

// src/components/shared/OfflineBanner.tsx
export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineSync();
  
  if (isOnline) return null;
  
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-amber-200 text-xs">
        You're offline. {pendingCount > 0 ? `${pendingCount} actions will sync when connected.` : 'Tasks are cached locally.'}
      </span>
    </div>
  );
}
Phase 7: Polish, Performance & Analytics (Week 8-9)
7.1 — Animation System Overhaul
TypeScript

// src/utils/animations.ts — NEW unified animation config
export const transitions = {
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  springBouncy: { type: 'spring', stiffness: 400, damping: 25 },
  ease: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  slow: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
} as const;

export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  slideUp: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
  stagger: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
} as const;
7.2 — Performance Optimizations
TypeScript

// src/utils/performance.ts — NEW

// 1. Lazy load heavy components
export const FocusSession = lazy(() => import('../components/focus/FocusSession'));
export const ShareableCard = lazy(() => import('../components/shared/ShareableCard'));
export const StreakCalendar = lazy(() => import('../components/progress/StreakCalendar'));

// 2. Debounce note saving
export const debouncedSaveNote = debounce((taskId: string, content: string) => {
  localStorage.setItem(`focus-notes-${taskId}`, JSON.stringify(content));
}, 500);

// 3. Memoize expensive computations
export const useComputedStats = () => {
  const tasks = useTaskStore(state => state.allTasks);
  
  return useMemo(() => ({
    totalCompleted: tasks.filter(t => t.completed).length,
    completionRate: tasks.length > 0 ? tasks.filter(t => t.completed).length / tasks.length : 0,
    streakDays: calculateStreak(tasks),
    totalMinutes: tasks.filter(t => t.completed).reduce((sum, t) => sum + t.duration, 0),
    byType: {
      practice: tasks.filter(t => t.type === 'practice' && t.completed).length,
      learning: tasks.filter(t => t.type === 'learning' && t.completed).length,
      reflection: tasks.filter(t => t.type === 'reflection' && t.completed).length,
    },
  }), [tasks]);
};

// 4. Virtual list for long task lists in Journey
export const VirtualTaskList = ({ tasks }: { tasks: Task[] }) => {
  // Use @tanstack/react-virtual for lists > 50 items
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
  });
  
  // ... render virtual rows
};
7.3 — Analytics Enhancement
TypeScript

// src/lib/analytics.ts — ENHANCE existing
export const analyticsEvents = {
  // Existing events...
  
  // NEW behavioral events
  'focus_session_started': { taskId: string; taskType: string; dayNumber: number },
  'focus_session_completed': { taskId: string; duration: number; mood: number; hasReflection: boolean },
  'focus_session_abandoned': { taskId: string; duration: number; reason?: string },
  'difficulty_prompt_shown': { triggerType: 'hard_skips' | 'low_moods'; count: number },
  'difficulty_choice_made': { choice: 'simplify' | 'extend' | 'keep' },
  'milestone_shared': { milestone: string; platform?: string },
  'notification_permission': { granted: boolean },
  'streak_warning_shown': { currentStreak: number },
  'plan_adjustment_shown': { adjustmentType: string },
  'onboarding_step_completed': { step: string; totalComplete: number },
  'weekly_summary_viewed': { weekNumber: number },
  'coach_insight_shown': { insightType: string },
  'offline_action_queued': { actionType: string },
  'tab_time_spent': { tab: string; seconds: number },
} as const;
7.4 — Error Boundaries & Loading States
React

// src/components/shared/ViewErrorBoundary.tsx
export function ViewErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <h3 className="text-white text-lg font-semibold mb-1">Something went wrong</h3>
          <p className="text-gray-500 text-sm mb-4">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="bg-purple-600 rounded-xl px-6 py-2.5 text-white text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// src/components/shared/ViewSkeleton.tsx
export function ViewSkeleton({ type }: { type: 'today' | 'progress' | 'journey' | 'me' }) {
  return (
    <div className="animate-pulse p-5 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-3 w-20 bg-gray-800 rounded" />
          <div className="h-6 w-32 bg-gray-800 rounded mt-2" />
        </div>
        <div className="h-6 w-14 bg-gray-800 rounded-full" />
      </div>
      
      {/* Content skeletons vary by type */}
      {type === 'today' && (
        <>
          <div className="h-2 w-full bg-gray-800 rounded mt-4 flex gap-1.5">
            {[...Array(7)].map((_, i) => <div key={i} className="flex-1 h-2 bg-gray-800 rounded-full" />)}
          </div>
          <div className="h-48 bg-gray-800/60 rounded-3xl mt-4" />
        </>
      )}
      {/* ... other type skeletons */}
    </div>
  );
}
Phase 8: Pre-Launch (Week 9-10)
8.1 — PWA Enhancement
TypeScript

// src/pwa/manifest.ts — ENHANCE
export const manifest = {
  name: 'Coheren — AI Habit Coach',
  short_name: 'Coheren',
  description: 'Think less. Do more. AI-powered behavioral habit coaching.',
  start_url: '/',
  display: 'standalone',
  background_color: '#0a0a0f',
  theme_color: '#7c3aed',
  orientation: 'portrait',
  categories: ['productivity', 'health', 'education'],
  
  icons: [
    { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
    { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
    { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
    { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
    { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  
  // App shortcuts
  shortcuts: [
    {
      name: 'Start Today\'s Task',
      short_name: 'Do',
      url: '/today?action=focus',
      icons: [{ src: '/icons/shortcut-do.png', sizes: '96x96' }],
    },
    {
      name: 'View Progress',
      short_name: 'Progress',
      url: '/progress',
      icons: [{ src: '/icons/shortcut-progress.png', sizes: '96x96' }],
    },
  ],
};
8.2 — SEO & Meta Tags
React

// src/components/seo/MetaTags.tsx — NEW
export function MetaTags() {
  return (
    <Helmet>
      <title>Coheren — AI-Powered Habit Coach</title>
      <meta name="description" content="Tell Coheren your goal. Get a personalized daily roadmap adapted to your behavioral patterns. Think less. Do more." />
      
      {/* Open Graph */}
      <meta property="og:title" content="Coheren — Think Less. Do More." />
      <meta property="og:description" content="AI-powered behavioral habit coaching. One goal. One daily task. Adapted to you." />
      <meta property="og:image" content="https://coheren.ai/og-image.png" />
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Coheren — AI Habit Coach" />
      <meta name="twitter:description" content="Tell it your goal. Get a daily roadmap. Adapted to your behavioral patterns." />
      <meta name="twitter:image" content="https://coheren.ai/twitter-card.png" />
      
      {/* PWA */}
      <meta name="theme-color" content="#7c3aed" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Coheren",
          "applicationCategory": "ProductivityApplication",
          "operatingSystem": "Web",
          "description": "AI-powered behavioral habit coaching",
          "offers": { "@type": "Offer", "price": "0" },
        })}
      </script>
    </Helmet>
  );
}
8.3 — Landing Page Improvement
React

// src/pages/LandingPage.tsx — Key sections

// Hero Section
<section className="min-h-screen flex items-center justify-center px-6 text-center">
  <div>
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-5xl md:text-7xl font-bold text-white leading-tight"
    >
      Think less.<br />
      <span className="text-purple-400">Do more.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-gray-400 text-lg md:text-xl mt-6 max-w-xl mx-auto leading-relaxed"
    >
      Tell Coheren your goal. Our AI analyzes your behavioral patterns, 
      builds a personalized roadmap, and gives you exactly one thing to 
      do each day.
    </motion.p>
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-8 flex gap-4 justify-center"
    >
      <button className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl px-8 py-4 text-lg font-semibold transition-colors">
        Start Free
      </button>
      <button className="bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-2xl px-8 py-4 text-lg transition-colors">
        See How It Works
      </button>
    </motion.div>
  </div>
</section>

// How It Works Section
<section className="py-24 px-6">
  <h2 className="text-3xl font-bold text-white text-center mb-16">
    3 Steps. Zero Overwhelm.
  </h2>
  
  <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
    {[
      {
        step: '01',
        title: 'Describe your goal',
        description: 'Tell us what you want to achieve. "Learn guitar" or "Build a side business" — plain language.',
        icon: MessageCircle,
      },
      {
        step: '02',
        title: 'AI builds your roadmap',
        description: '5 AI agents analyze your behavioral patterns and create a personalized daily plan.',
        icon: Brain,
      },
      {
        step: '03',
        title: 'One task a day',
        description: 'Every day, you get exactly one task. Complete it. The system adapts. You grow.',
        icon: Target,
      },
    ].map(item => (
      <div key={item.step} className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
          <item.icon className="w-8 h-8 text-purple-400" />
        </div>
        <span className="text-purple-500 text-sm font-mono">{item.step}</span>
        <h3 className="text-white text-xl font-semibold mt-2 mb-2">{item.title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
      </div>
    ))}
  </div>
</section>

// Differentiator Section
<section className="py-24 px-6 bg-gray-950/50">
  <h2 className="text-3xl font-bold text-white text-center mb-4">
    Not another todo app.
  </h2>
  <p className="text-gray-400 text-center mb-16 max-w-lg mx-auto">
    Coheren doesn't just track habits. It understands why you struggle 
    and designs around your specific patterns.
  </p>
  
  <div className="max-w-3xl mx-auto space-y-4">
    {[
      { 
        pattern: 'Procrastination', 
        solution: 'Tasks start with action, not reading. No standalone study sessions until momentum builds.' 
      },
      { 
        pattern: 'Fear of Failure', 
        solution: 'Private practice only in Phase 1. Public-facing tasks introduced gradually in Phase 3.' 
      },
      { 
        pattern: 'Perfectionism', 
        solution: 'Timed tasks with "good enough" criteria. Reflection prompts reframe progress over perfection.' 
      },
      { 
        pattern: 'Time Constraints', 
        solution: '5-minute micro-tasks on busy days. Full sessions when you have bandwidth.' 
      },
    ].map(item => (
      <div key={item.pattern} className="flex items-start gap-4 bg-gray-900/60 border border-gray-800/30 rounded-2xl p-5">
        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
        <div>
          <span className="text-purple-300 text-sm font-semibold">{item.pattern}?</span>
          <p className="text-gray-400 text-sm mt-1">{item.solution}</p>
        </div>
      </div>
    ))}
  </div>
</section>
8.4 — Testing Checklist
TypeScript

// Pre-launch testing matrix

const LAUNCH_TESTS = {
  functional: [
    'New user signup → chat onboarding → plan generation → dashboard',
    'Complete all tasks in a day → All Done state',
    'Skip task → reason picker → feedback saved',
    'Focus Session → video plays → notes save → timer works → completion flow',
    'Miss 3 days → re-engagement banner shows',
    'Hit 7-day streak → milestone banner shows',
    'Week boundary → week recap shows',
    'Difficulty pattern → adjustment prompt triggers',
    'Offline → actions queue → sync on reconnect',
    'Auto day advance at midnight',
    'Notification permissions → push notifications fire',
    'Share milestone → generates image → share sheet opens',
  ],
  
  responsive: [
    'iPhone SE (375px) — all views fit, no horizontal scroll',
    'iPhone 14 Pro (393px) — safe area insets correct',
    'iPhone 14 Pro Max (430px) — layout scales properly',
    'iPad (768px) — switches to tablet layout',
    'Desktop (1440px) — sidebar navigation, full layouts',
    'Ultra-wide (2560px) — content doesn't stretch',
  ],
  
  performance: [
    'LCP < 2.5s on 3G connection',
    'FID < 100ms',
    'CLS < 0.1',
    'Bundle size < 300KB gzipped',
    'Service worker caches critical assets',
    'Images lazy-loaded',
    'Framer Motion animations at 60fps on mid-range Android',
  ],
  
  accessibility: [
    'All interactive elements have focus rings',
    'Color contrast ratio ≥ 4.5:1 for text',
    'Screen reader announces page changes',
    'Keyboard navigation works for all flows',
    'Reduced motion preference respected',
    'Touch targets ≥ 44px',
  ],
  
  edge_cases: [
    'User with 0 tasks (no plan yet)',
    'User with 300+ completed tasks (performance)',
    'User who skips every task for a week',
    'User who completes everything instantly',
    'Long goal text (200+ characters)',
    'No internet on first load',
    'Auth token expired mid-session',
    'Supabase rate limit hit',
    'Groq API timeout',
    'Multiple rapid task completions',
  ],
};
Phase 9: Launch (Week 10)
9.1 — Launch Checklist
Markdown

## Infrastructure
- [ ] Supabase project moved from local Docker to Supabase Cloud
- [ ] Custom domain configured (coheren.ai)
- [ ] SSL certificate active
- [ ] Environment variables set in production
- [ ] Groq API key with production rate limits
- [ ] Jina API key with production limits
- [ ] PostHog production project created
- [ ] Error monitoring (Sentry) configured
- [ ] Database backups automated (daily)
- [ ] RLS policies verified in production

## Performance
- [ ] Lighthouse score ≥ 90 on all categories
- [ ] Bundle analyzed — no unused dependencies
- [ ] Images optimized (WebP with PNG fallback)
- [ ] Critical CSS inlined
- [ ] Service worker verified in production
- [ ] CDN configured for static assets

## Content
- [ ] Landing page copy finalized
- [ ] OG image designed and uploaded
- [ ] App icons in all required sizes
- [ ] Favicon set (multiple formats)
- [ ] 404 page designed
- [ ] Privacy policy page
- [ ] Terms of service page

## Monitoring
- [ ] Uptime monitoring (Uptime Robot / Better Uptime)
- [ ] Error alerting (Sentry → Slack/Discord)
- [ ] Analytics dashboard (PostHog) with key funnels:
  - Landing → Signup conversion
  - Signup → Onboarding completion
  - Onboarding → First task completion
  - Day 1 → Day 7 retention
  - Day 7 → Day 30 retention

## Marketing
- [ ] Product Hunt launch page prepared
- [ ] Twitter/X launch thread drafted
- [ ] r/SideProject post drafted
- [ ] Hacker News Show HN post drafted
- [ ] Demo video recorded (60 seconds)
- [ ] 5 beta users have tested and given feedback
9.2 — Post-Launch Monitoring Dashboard
TypeScript

// Key metrics to track in PostHog

const LAUNCH_METRICS = {
  acquisition: {
    'daily_signups': 'Count of new users per day',
    'signup_source': 'Where users come from (referrer)',
    'landing_to_signup_rate': 'Conversion from landing page to account creation',
  },
  
  activation: {
    'onboarding_completion_rate': '% of signups that complete AI chat + get a plan',
    'time_to_first_task': 'Minutes between signup and first task completion',
    'first_day_completion': '% of new users who complete Day 1',
  },
  
  retention: {
    'day_1_retention': '% of users active on day 2',
    'day_7_retention': '% of users active on day 7',
    'day_30_retention': '% of users active on day 30',
    'streak_distribution': 'Histogram of streak lengths',
  },
  
  engagement: {
    'daily_active_users': 'Unique users per day',
    'tasks_completed_per_day': 'Total across all users',
    'focus_session_duration': 'Average time in Focus Sessions',
    'skip_rate': '% of tasks skipped vs completed',
    'skip_reason_distribution': 'Which reasons dominate',
    'mood_distribution': 'Average mood ratings over time',
    'notes_written': 'How many users write notes',
  },
  
  ai_system: {
    'plan_generation_time': 'Seconds for full onboarding pipeline',
    'recalibration_triggers': 'How often 14-day 
Complete Phase Timeline
text

PHASE 0 — Foundation Fixes          Week 1-2     
kimi-k2-thinking-turbo




Thought for 9 seconds

Coheren.ai Enhancement & Launch Roadmap
You've built a technically impressive MVP. Now let's make it psychologically addictive and visually breathtaking. Here's how to transform each feature into something people can't stop using.

Feature-by-Feature Improvements
1. Today Tab: From Functional to Emotionally Intelligent
Current Gap: Feels like a task list, not a personal coach. Missing temporal context and behavioral nudges.

Upgrades:

Dynamic Header: Add "Energy Peak in 2h" badge if user is a morning person. Show weather-based task suggestions ("Rainy day → swap outdoor run for indoor yoga").
Task Cards:
Swipe right: "Quick Start" → 5-min micro-version of task (AI generates condensed steps)
Swipe left: "Reschedule" → AI suggests 3 optimal slots based on calendar patterns
Hidden edge gestures: Subtle thumbs up/down on card edges. Downvote = tomorrow's similar tasks get 20% easier. Upvote = 10% harder. No UI clutter, just swipe further.
Cinema Mode:
Attention API: Auto-pause when you look away (using device orientation + screen attention)
Voice Notes: Hold mic button → transcribes + auto-tags timestamp ("[3:12] Key insight")
Smart Skip: If you skip 3+ times, auto-suggest "Too easy?" or "Too hard?" with one-tap recalibration
Streak Visualization: Replace flame with growing bonsai tree that evolves (seed → sapling → tree). Miss a day? It wilts but doesn't die. Tap to "water" with a recovery task.
Ease-Back-In: Add "Why I'm back" micro-journal (3 words) to re-anchor motivation.
2. Journey Tab: Make Progress Tangible
Current Gap: List view is passive. Users don't feel their growth.

Upgrades:

Skill Tree Map: Transform weeks into interconnected nodes. Completed tasks light up pathways. Tap a node → see "This unlocked: [future skill]".
Active Week Pulse: Add breathing glow animation that syncs to your actual heart rate (if HealthKit/Google Fit integrated) during focus sessions.
Risk Prediction: AI analyzes your pattern and flags weeks with "Low Success Probability". Show proactive micro-intervention: "Week 3 is tough—preload a reward?" with reward picker (coffee, episode, nap).
Milestone Moments: At Day 7/30/90, generate personalized "Identity Statement": "You are now someone who writes 500 words daily. Here's your evidence:" (pulls from completed tasks & notes).
Flex Handles: Let users drag timeline edges to compress/extend roadmap. "I have a busy month" → AI instantly recalculates a 6-week version.
3. Library Tab: From Archive to Knowledge Engine
Current Gap: Static list. Misses opportunity for spaced repetition and insight extraction.

Upgrades:

Spaced Repetition Queue: Mastered tasks resurface as "Review Flashcards" (AI-generated 1-sentence summary + "Do you remember?" quiz). Tap "Yes" → interval doubles. "No" → restarts.
Skill Mastery Radar: Auto-tag tasks by skill ("Negotiation," "CSS Grid"). Show mastery curve for each skill—visualize competence growth, not just completion.
Note Intelligence: AI scans notes for frustration patterns ("stuck," "confused") and suggests "Debug Session" with 3 targeted resources.
Export Momentum: "Generate Weekly Report" → creates a beautiful, shareable image of progress (stats + streak + identity statement). Free marketing.
4. Profile Tab: The Identity Command Center
Current Gap: Shows data, doesn't reinforce identity.

Upgrades:

Identity Hero Card: Replace stats with "Evidence of Identity": "You said you wanted to be a writer. You've written 12,000 words across 24 tasks. You are a writer."
Habit Fingerprint: Visual radar chart of optimal task types, energy windows, completion velocity. Shareable as "My Productivity DNA."
Streak Recovery Tokens: Earn 1 token/month to "freeze" a streak break. Gamified but forgiving. Show token count prominently.
Life Events Mode: Toggle for "Traveling" / "Sick" → AI generates "Maintenance Mode" (1 tiny task/day to preserve identity, e.g., "Write one sentence").
5. AI System: Make It Reactive, Not Just Generative
Current Gap: 4 agents run once. No real-time adaptation.

Upgrades:

Agent 5: The Arbiter: Watches live performance. Triggers interventions: "3 skips in a row → activate Ease-Back-In" or "100% completion → increase difficulty 15%."
Agent 6: The Whisperer: Generates contextual micro-copy for banners/buttons based on emotional state. If user is struggling, CTA changes from "Complete" to "Just 5 min."
14-Day Recalibrator: Make it user-initiated. Show a "Recalibrate" button after Day 14. User can drag sliders: "Harder/Easier," "More/Less time." AI rewrites next 14 days.
6. Navigation & IA: Simplify, Don't Scatter
Current Gap: Mobile hides Progress/Goals—core features feel buried.

Upgrades:

Mobile Bottom Nav: 5 tabs (not 4). Add "Coach" as central FAB. Bottom nav: Goals · Progress · ◉ Coach (floating) · Journey · Profile.
Coach Tab: Floating bottom-sheet chat. Always one message: "Your next best move is [task]. Need help?" One-tap to jump to task.
Desktop Sidebar: Keep 6 tabs but add "Level Badge" with XP progress bar (XP = tasks completed + notes taken + streak days).
Universal Search: Cmd+K to search tasks, notes, goals, or ask the coach anything.
UI/UX Transformation: The "Delight Layer"
Visual System
Color: Keep purple primary, but add gradient accents that shift based on streak (cool blue → warm purple → golden glow at Day 90).
Typography: Use variable font (e.g., Inter VF) to subtly increase weight/intensity as user approaches daily goal.
Motion: Every state change has micro-confetti: swiping card, completing task, dismissing banner. Use Framer Motion's layoutId for seamless transitions.
Interaction Polish
Skeleton Loading: Every screen loads with skeleton that matches final layout exactly—no jarring shifts.
Optimistic UI: Tap "Complete" → instant confetti + UI update. Sync happens in background. If fails, gently revert with "Oops, try again."
Haptic Feedback: On mobile, each swipe/completion gives distinct haptic pattern (light success tap, gentle error nudge).
Accessibility
Focus Traps: Cinema Mode traps focus; ESC key exits.
Color Contrast: All text ≥ 4.5:1. Streak tree uses shape + color, not just color.
Screen Reader: Announce "Task completed. 3 done, 2 to go. Streak: 7 days."
Phased Launch Roadmap
Phase 1: Core Experience Polish (Weeks 1-2)
Goal: Fix friction, add delight, make it feel alive.

Week 1:

 Implement 3D post-task feedback (Energy/Confidence/Relevance axes)
 Add growing streak tree visualization (replace flame)
 Build Life Events Mode toggle in Profile
 Add micro-confetti on all interactions (Framer Motion)
 Deploy skeleton loaders on every view
Week 2:

 Add difficulty calibration (hidden thumbs up/down on cards)
 Build Cinema Mode voice notes + timestamp tagging
 Implement Ease-Back-In micro-journal (3-word prompt)
 Add haptic feedback patterns for mobile
 Polish accessibility (focus, contrast, screen reader)
Phase 2: Behavioral Intelligence (Weeks 3-4)
Goal: Make AI feel personal and proactive.

Week 3:

 Build Agent 5: Arbiter for real-time intervention triggers
 Add dynamic header with energy peak + weather context
 Implement Risk Prediction flags on Journey weeks
 Create Identity Statement generator for milestones
 Add Spaced Repetition Queue to Library
Week 4:

 Build Coach Tab as floating bottom-sheet chat (mobile)
 Implement Smart Reschedule on task swipe-left
 Add Streak Recovery Tokens system (1/month)
 Create Habit Fingerprint radar chart in Profile
 Deploy Agent 6: Whisperer for contextual micro-copy
Phase 3: Retention & Community (Weeks 5-6)
Goal: Build network effects and long-term stickiness.

Week 5:

 Launch Accountability Pods (beta, 3-5 users matched by goal)
 Add Weekly Reflection 3-question micro-journal (Sunday banner)
 Implement Export Momentum shareable progress images
 Build Skill Tree Map view for Journey (toggle between list/tree)
 Add peer shadows (anonymized heatmaps) to Journey
Week 6:

 Create Challenge Mode (7-Day Focus Sprints, anonymized leaderboard)
 Add Celebrate Others notifications for pod milestones
 Implement Note Intelligence frustration pattern detection
 Build Flex Handles for timeline compression/extension
 Polish offline-first sync with Zustand queue + conflict resolution
Phase 4: Launch Readiness (Weeks 7-8)
Goal: Performance, monetization prep, and marketing.

Week 7:

 Performance audit: Lighthouse ≥95, bundle size <200kb gzipped
 E2E test coverage: Add tests for swipe gestures, Coach chat, pods
 Analytics instrumentation: Track "aha moments" (Day 3, 7, 14 retention)
 Smart Notification tuning: 7-day learning for optimal times
 Monetization hooks: Add "Pro" badge areas (unlimited pods, custom AI coach persona)
Week 8:

 Beta launch: 100 power users, collect feedback via in-app Coach chat
 Onboarding polish: Add interactive demo (pre-seeded fake goal) before signup
 Landing page: Add Loom video + testimonials from beta users
 Security hardening: Rate limiting, RLS final audit, env var validation
 Launch checklist:
 App Store / Play Store assets (screenshots with streak tree)
 Press kit (identity fingerprint visuals)
 Discord community setup
 Waitlist email sequence (3-part behavioral psychology series)
Launch Day Checklist
Technical:

 Feature flags for gradual rollout (LaunchDarkly or PostHog)
 Error boundaries on every route + Sentry integration
 Backup/restore user data flow (Settings > Export My Data)
 DDoS protection (Cloudflare) + rate limits on AI endpoints
Product:

 "Day 0" experience: If user hasn't set a goal, show inspiring autoplaying video of sample roadmap
 Referral system: Give streak recovery token for each successful referral
 Onboarding email: 5-day sequence, each day unlocks a new tip from the Coach
Marketing:

 Product Hunt launch kit (GIF of streak tree growing, identity fingerprint)
 Twitter thread: "We analyzed 10,000 habit attempts. Here's what actually works..."
 Indie Hackers post: Deep dive on the Arbiter Agent
 Beta user video testimonials (30 sec each)
Final Thought
Don't launch a habit tracker. Launch an identity transformation engine. Every pixel should whisper: "You are becoming the person you said you'd be."

Start with Phase 1, Week 1: The 3D feedback + streak tree. That data will fuel everything else, and users will feel the difference immediately.


this is what is build so far, (Coheren — Project Summary
Tagline: Think less. Do more.
Stack: React + Vite + TypeScript · Supabase (local Docker) · Groq AI · Zustand · Tailwind + custom token design system

What It Does
Coheren is a behaviorally-intelligent habit/goal coach. A user tells it their goal in plain text, gets psychologically profiled via an AI chat session, and receives a fully personalized multi-month roadmap with daily tasks — adapted to their specific behavioral friction points (procrastination, fear of failure, perfectionism, etc.).

User Flow

LandingPage (step 0)
→ Auth (sign up / sign in)
→ Chat Onboarding (step 1) — 4 AI agents run sequentially
→ Dashboard (step 2) — 6 views
→ Settings (step 10)
AI System — 4 Agents
All powered by Groq (llama-3.3-70b-versatile for quality, llama-3.1-8b-instant for bulk/speed):

Agent File Role
1 — Goal Analyzer goal-analyzer.ts Extracts goal category, domain, specifics, timeline from the user's free-text input
2 — Shadow Extractor shadow-extractor.ts Identifies behavioral "stones" (up to 4 friction types), primary obstacle, user archetype, severity levels, and triggers
3 — Curriculum Builder curriculum-builder.ts Builds a full roadmap: phases, week templates, strategic plan. Has STONE_DOMAIN_TIEBREAKERS map — e.g. Career+FearOfFailure → private drafts only in Phase 1, no public networking until Phase 3
4 — Task Generator task-generator.ts Generates daily tasks with resources (YouTube links with watchFrom/watchTo), step-by-step guides, tips. Domain-aware RAG query, financial tiebreakers (FearOfFailure → simulation-only, ProcrastinationPattern → no standalone reads)
14-day Recalibrator: On checkpoint days, Agent re-evaluates the user's progress and re-weights upcoming tasks.

RAG Knowledge Base
21 static chunks in src/core/rag/knowledge-base.ts
8 framework markdown files in src/knowledge/frameworks/
Embeddings: Jina v3 via src/core/rag/semantic-retriever.ts
Storage: pgvector in Supabase knowledge_chunks table
Ingest: npm run rag:ingest / verify: npm run rag:verify
Each Agent 4 call fires a domain-specialized semantic query to surface relevant frameworks
Dashboard — 6 Views
All views share a consistent inline header row (h1 flex:1 + metadata + pill badge). Dark gradient hero cards across Today/Goals/Journey/Profile.

View Key Features
Today Greeting + Day pill header · Hero Focus Card (dark gradient, first incomplete task, type badge, Focus/Done/Skip buttons) · Cinema Mode (fullscreen YouTube player + step guide + notes panel + resume position) · Quick Mode · Streak milestone banners · Ease-back-in banner (after missed days) · Weekly recap card · All-done celebration card
Goals Inline header (Goals + Xmo + X% pill) · Goal hero card (dark gradient, progress bar, target date) · Behavioral Profile section (archetype + up to 4 stone friction cards with severity badges) · Phases list (active/completed/upcoming states)
Journey Inline header · Journey hero card (roadmap title, overall progress bar, Day/Week/Remaining stats) · Month-by-month breakdown with expandable weeks → task drill-down (completion dot, type badge, duration, user comment)
Progress Inline header (Progress + roadmap title + Week X pill) · 4-column stats strip (Streak, Overall%, This Week%, Day) · Activity Breakdown bars (Practice/Learning/Reflection) · 2-column "Why these tasks?" card (Current Focus + Next AI Review/Checkpoint) · Week-by-week progress bars · 14-day activity bar chart
Library Inline header (Library + X done pill) · Search · Completed/Notes tabs · Completed tasks list with type badges · Notes list (keyed to task, written during Cinema Mode)
Profile Identity Hero Card (dark gradient, initials circle, name, goal, streak/done/goal stats strip) · Profile tab (energy, wake time, daily commitment, goal details) · Settings tab
Navigation
Desktop: Dark sidebar (260px) — Today · Journey · Progress · Goals · Library · Profile · Footer: user identity row (initials + name + goal) + level badge with XP progress bar

Mobile: Bottom nav — Goals · Progress · ◉ Today (FAB, home icon) · Journey · Profile

Behavioral Stone Types (13)
TimeConstraint · ResourceGap · EnvironmentFriction · Inconsistency · FearOfFailure · Perfectionism · LowConfidence · UnrealisticExpectations · FocusFragility · CognitiveFatigue · SkillGap · ProcrastinationPattern · Overcommitment

Each stone has: type, severity (Low/Moderate/High/Critical), trigger text. The primary stone drives Agent 3 + 4 tiebreaker logic.

Infrastructure
Area Detail
Auth Supabase email auth, JWT stored as sb-127-auth-token
DB 7 tables: profiles, user_goals, goal_stones, roadmaps, daily_tasks, task_feedback, checkpoints
RLS Hardened: knowledge_chunks policy, task_feedback ownership checks, profiles DELETE
Analytics PostHog wrapper (src/lib/analytics.ts) — typed events fired from App, task actions, checkpoints, nav
Push notifications Workbox service worker (src/sw.ts) — 9 AM + 8 PM daily via setTimeout + SW postMessage
E2E tests 18 Playwright tests (smoke, auth, dashboard) — seed via addInitScript + JWT injection
Env src/config/env.ts — required/optional helpers + validateEnv() on boot
State Zustand with consist-storage localStorage persistence
Dev Commands

npm run dev # Start local server
npx supabase db reset # Reset DB + apply seed.sql
./scripts/test-full-flow.sh # 30-check automated test
npm run test:e2e # Playwright E2E suite
npm run rag:ingest # Embed all knowledge chunks
npm run rag:verify # Check embeddings + test query
Seed user: seed@coheren.dev / SeedPass123!)

how to impreve each feature, also amke a amzng ui/ux, what to do break it down into pahse where last pahse would be launch

claude-opus-4-6


Coheren.ai — Mobile Experience Redesign: A Comprehensive Analysis
I've studied your current architecture deeply. Here's my honest assessment: you've built an impressive system, but the mobile experience is currently structured like a desktop app squeezed into a phone, not a mobile-first habit coach. Let me break down everything.

Part 1: Core Problems with the Current Mobile Experience
Problem 1: Too Much on "Today"
Your Today tab is doing the work of 3-4 screens. It has greeting, stats, smart banners, re-engagement mode, task cards with swipe gestures, quick mode, cinema mode, feedback modal, all-done card, AND an empty state. A user opening this on their phone at 7 AM while brushing their teeth gets cognitive overload — the opposite of what a habit coach should feel like.

Problem 2: Journey is Passive
The Journey tab is a read-only timeline. Users scroll, look at it, and leave. There's no action they can take there. It's a "nice to see" feature, not a "need to use" feature. On mobile, every tab needs to earn its place.

Problem 3: Library is Premature
A library matters in week 4+. For the first 3 weeks, it's an empty or near-empty tab. New users (your most critical segment) tap it and see nothing useful. That's a dead zone in your navigation.

Problem 4: Progress & Goals are Hidden
You explicitly said these are desktop-only. But progress visualization is THE motivational driver for habit apps. Hiding it on mobile — the device people use 90% of the time — is a critical gap.

Problem 5: No Social/Accountability Layer
Every successful habit app (Duolingo, Streaks, Habitica, Strava) has some form of social proof, accountability, or identity reinforcement. Coheren has none.

Problem 6: No Notification/Reminder Surface in the App
You mention a service worker for push notifications, but there's no in-app notification center, no "here's what you missed" flow, and no proactive nudges within the app itself.

Part 2: Redesigned Mobile Architecture
New Bottom Navigation (5 tabs)
text

┌─────────────────────────────────────────────────┐
│  Today    Progress    +Do    Journey    Profile  │
│   🏠        📊       (●)      🗺️        👤     │
└─────────────────────────────────────────────────┘
The +Do button is a centered, elevated FAB-style action button — the single most important action in the app: start your task.

Part 3: Every Component, Screen by Screen
Tab 1: TODAY (Simplified, Focused)
Design Philosophy: When I open this, in 2 seconds I should know: what's my task, how am I doing, and feel motivated. Nothing else.

Components:
1. Contextual Header

text

┌─────────────────────────────────┐
│ Good morning, Alex        Day 12│
│ ○○○○○●○ (week dot indicator)   │
└─────────────────────────────────┘
Time-aware greeting + first name (keep this, it's good)
"Day X" as a simple badge, NOT "Day X of Y" (the total creates anxiety — "I have 84 more days?!" Remove the ceiling)
Week dot indicator: 7 dots for the current week, filled = completed, hollow = upcoming, current = pulsing. This gives micro-progress without numbers.
2. Streak + Energy Bar (Horizontal Strip)

text

┌─────────────────────────────────┐
│ 🔥 12 day streak    ⚡ 87%     │
└─────────────────────────────────┘
Streak with flame (keep)
Replace "Completion Rate" with "Energy" — same calculation (% completed) but reframed. "87% completion rate" is clinical. "87% energy" feels like a game resource you don't want to lose.
The energy bar should visually deplete if you skip tasks — loss aversion is a stronger motivator than achievement.
3. Today's Focus Card (THE hero component)

text

┌─────────────────────────────────────┐
│  TODAY'S FOCUS                      │
│                                     │
│  🎸 Practice Basic Chord Changes    │
│  "Transition between G, C, and D"  │
│                                     │
│  ⏱ 20 min    🟣 Practice           │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │  Start   │  │  Skip   │          │
│  └─────────┘  └─────────┘          │
│                                     │
│  + 2 more tasks today               │
└─────────────────────────────────────┘
Show ONLY the current/next incomplete task as the hero card
Large, tappable, impossible to miss
"+2 more tasks today" is a subtle expandable — tap to see the full list
Remove swipe gestures for core actions. Swipe is discoverable by power users but invisible to new users. Use explicit buttons.
The "Start" button should open a Focus Session (replacing Cinema Mode — more on this below)
4. Quick Task List (Expandable)
When "+2 more tasks" is tapped:

text

┌─────────────────────────────────────┐
│ ☑️ Warm-up stretches     ⏱ 5m  ✓  │
│ ○  Chord transitions     ⏱ 20m →  │
│ ○  Reflect on progress   ⏱ 10m    │
└─────────────────────────────────────┘
Simple checklist view, not cards. Cards take too much space.
Completed tasks get a checkmark and muted styling
Current task has an arrow indicator
Tapping any task opens its detail/focus session
5. Smart Banner Slot (Max 1 at a time)

Priority stack: Re-engagement > Streak Milestone > Week Recap
Only ONE banner at a time, ever. Multiple banners = banner blindness.
Banners slide in from the top, not inline. They feel like notifications, not content.
6. Daily Insight Card (NEW)

text

┌─────────────────────────────────────┐
│ 💡 INSIGHT                          │
│ "You complete tasks 40% faster in   │
│  the morning. Today's task is        │
│  scheduled for your peak window."    │
└─────────────────────────────────────┘
AI-generated micro-insight based on their behavior data
Examples: "You've never missed a Practice task", "Your reflection quality peaks on Wednesdays", "You're 3 days from your longest streak"
This makes the AI visible and personal. Right now, the AI generates the plan and disappears. It should feel like a living coach.
7. All-Done State (Simplified)

text

┌─────────────────────────────────────┐
│        ✨                           │
│   All done for today!               │
│   3/3 tasks • 12-day streak         │
│                                     │
│   [Review in Library]               │
│                                     │
│   "Rest is part of the process."    │
└─────────────────────────────────────┘
Remove the "Start Day X" button. Days should advance automatically at midnight or the user's configured wake time. Forcing a manual advance creates unnecessary friction and confusion.
Tab 2: PROGRESS (Promoted from Desktop-Only)
Why this replaces Library in the nav: Progress data is motivational fuel. Users check it daily. Library is archival — users check it occasionally.

Components:
1. Progress Header

text

┌─────────────────────────────────────┐
│ YOUR PROGRESS                       │
│ ████████████░░░░ 68% complete       │
│ Week 4 of 12 • Foundation Phase     │
└─────────────────────────────────────┘
2. Streak Calendar (NEW — Critical Component)

text

┌─────────────────────────────────────┐
│       March 2025                    │
│ M  T  W  T  F  S  S                │
│ 🟣 🟣 🟣 ⚫ 🟣 🟣 ⚪               │
│ 🟣 🟣 🟣 🟣 🟣 ⚪ ⚪               │
│ 🟣 🟣 🟣 🔵 ⚪ ⚪ ⚪               │
└─────────────────────────────────────┘
GitHub-contribution-style calendar
Purple = completed all tasks, Light purple = partial, Black = missed, Blue = today, Hollow = future
This is the single most requested feature in every habit app. Users LOVE seeing their consistency visually. It creates "don't break the chain" motivation.
3. Weekly Performance Cards

text

┌─────────────────────────────────────┐
│ THIS WEEK          5/7 days ✓       │
│ ████████████░░░ 71%                 │
│                                     │
│ By Type:                            │
│ Practice ████████ 80%               │
│ Learning ██████░░ 60%               │
│ Reflect  ██████████ 100%            │
└─────────────────────────────────────┘
Shows which task TYPES they're excelling at or skipping
This data feeds back to the AI for recalibration
4. Trends Graph (NEW)

A simple line chart showing daily completion rate over the last 4 weeks
Helps users see if they're improving, plateauing, or declining
Use a sparkline style — minimal, beautiful, glanceable
5. Personal Records (NEW)

text

┌─────────────────────────────────────┐
│ 🏆 PERSONAL RECORDS                │
│ Longest Streak: 12 days            │
│ Best Week: Week 3 (100%)           │
│ Total Tasks Done: 47               │
│ Total Time Invested: 14.5 hours    │
└─────────────────────────────────────┘
Gamification without gamification. No points, no levels — just personal bests.
"Total Time Invested" is powerful. When someone sees "I've put 14 hours into learning guitar," it creates sunk-cost motivation to continue.
6. AI Coach Summary (NEW)

text

┌─────────────────────────────────────┐
│ 🤖 COACH NOTES                     │
│ "You're strongest with practice     │
│  tasks but tend to skip reflections │
│  on weekends. I've adjusted next    │
│  week to move reflections to        │
│  weekdays."                         │
└─────────────────────────────────────┘
A weekly AI-generated paragraph explaining what the system observed and how it's adapting
This is the key differentiator of Coheren vs a static todo list. SHOW the intelligence.
Tab 3: +DO (Center FAB — Focus Session)
This isn't a screen — it's an action launcher. Tapping it immediately starts a Focus Session for the current task.

Focus Session (Replaces "Cinema Mode" — Renamed for Clarity)
"Cinema Mode" sounds like passive watching. "Focus Session" sounds like active doing.

Components:
1. Session Header

text

┌─────────────────────────────────────┐
│ ← Back              ⏱ 12:34       │
│                                     │
│ FOCUS SESSION                       │
│ Practice Chord Changes              │
│ 🟣 Practice • 20 min               │
└─────────────────────────────────────┘
Live timer counting UP (not down — countdowns create anxiety for habit building)
Task title and metadata
2. Resource Panel

If YouTube link exists: embedded video with controls
If no video: a clean instruction card with the task description
Keep the "seek back 10s" button — good UX
3. Session Tabs (Bottom sheet style, swipeable)

Guide Tab:

Step-by-step breakdown of the task
Tips from the AI (generated during plan creation)
"Why this matters" section connecting this task to the overall goal
Notes Tab:

Full-text editor
Auto-saves every 5 seconds
Timestamp markers: "Note at 3:24" if video is playing
Voice-to-text button (NEW) — many users want to note things while their hands are busy (e.g., playing guitar)
Checklist Tab (NEW):

For complex tasks, the AI can break them into sub-steps
E.g., "Practice Chord Changes" → ☐ G to C transition x10, ☐ C to D transition x10, ☐ Full sequence x5
Users check off sub-steps for micro-progress
4. Session Complete Flow
When "Done" is tapped:

text

Step 1: How did it go?
┌─────────────────────────────────────┐
│ 😫  😕  😐  🙂  🤩                 │
│ Hard  Meh  OK  Good  Great         │
└─────────────────────────────────────┘

Step 2: Quick reflection (optional)
┌─────────────────────────────────────┐
│ Anything you want to remember?      │
│ ┌─────────────────────────────┐     │
│ │                             │     │
│ └─────────────────────────────┘     │
│ [Skip]              [Save]          │
└─────────────────────────────────────┘

Step 3: Celebration
┌─────────────────────────────────────┐
│        🎉 Confetti animation        │
│                                     │
│   Task Complete!                    │
│   Time: 18 minutes                  │
│   Streak: 12 days                   │
│                                     │
│   [Back to Today]                   │
└─────────────────────────────────────┘
5. Pause & Resume (NEW)

If user leaves mid-session (phone call, etc.), save the state
When they return to the app, show a "Resume Session?" prompt
This respects real life. Current Cinema Mode just... closes.
Tab 4: JOURNEY (Enhanced)
Components:
1. Journey Header with Phase Indicator (NEW)

text

┌─────────────────────────────────────┐
│ YOUR JOURNEY                        │
│                                     │
│ Phase 1        Phase 2      Phase 3 │
│ Foundation → Building → Mastery     │
│ ████████████  ███░░░░░  ░░░░░░░░   │
│              ↑ You are here         │
└─────────────────────────────────────┘
Visual phase map showing the 3-phase structure (or however many phases the AI generated)
Users can see WHERE they are in the bigger picture
2. Week Cards (Redesigned)

text

┌─────────────────────────────────────┐
│ WEEK 4 — Active                     │
│ "Building Finger Independence"      │
│                                     │
│ M ✓  T ✓  W ✓  T ●  F ○  S ○  S ○│
│ 3/7 tasks complete                  │
│                                     │
│ [View Tasks]                        │
└─────────────────────────────────────┘
Day-by-day dots give granular progress
"View Tasks" expands to show all tasks for that week
Active week is at the top, always visible without scrolling
3. Task Drill-Down (NEW)
Tapping "View Tasks" on any week:

text

┌─────────────────────────────────────┐
│ Week 4 Tasks                        │
│                                     │
│ Day 22 ✓ Finger exercises    🟣 15m│
│ Day 23 ✓ Scale practice      🟣 20m│
│ Day 24 ✓ Chord transitions   🟣 20m│
│ Day 25 ● Music theory basics 🔵 15m│
│ Day 26 ○ Reflection          🟣 10m│
│ Day 27 ○ Practice session    🟣 25m│
│ Day 28 ○ Weekly review       🟣 10m│
└─────────────────────────────────────┘
Tapping a completed task shows the notes + feedback from that day
This IS your library, but contextual. No separate Library tab needed.
4. Upcoming Week Preview (NEW)

text

┌─────────────────────────────────────┐
│ 🔮 NEXT WEEK PREVIEW                │
│ Week 5: "Introduction to Barre      │
│ Chords"                             │
│                                     │
│ What to expect:                     │
│ • 3 practice sessions               │
│ • 2 learning modules                │
│ • 1 reflection                      │
│ • 1 rest day                        │
│                                     │
│ Difficulty: ████░░ Moderate         │
└─────────────────────────────────────┘
Creates anticipation, not anxiety
Shows that rest days are BUILT IN (important for preventing burnout)
5. Milestone Markers on Timeline (NEW)

text

Week 1 ─── Week 2 ─── Week 3 ─── 🏆 First Month! ─── Week 5
Visual celebration points on the timeline
When reached, these unlock a brief AI-generated "Month in Review" summary
Tab 5: PROFILE (Streamlined)
Components:
1. Identity Card (NEW — Replaces Basic Profile)

text

┌─────────────────────────────────────┐
│         🟣                          │
│       Alex M.                       │
│   "Aspiring Guitarist"              │
│                                     │
│   🔥 12-day streak                  │
│   📅 Member since Mar 1             │
│   ⏱  14.5 hours invested           │
└─────────────────────────────────────┘
The subtitle "Aspiring Guitarist" is auto-generated from their goal. It creates IDENTITY. "I'm not someone trying to learn guitar. I'm an Aspiring Guitarist." Identity-based habits (per James Clear) are the most durable.
As they progress, this could evolve: "Aspiring Guitarist" → "Developing Guitarist" → "Intermediate Guitarist"
2. My Goal Card

text

┌─────────────────────────────────────┐
│ 🎯 MY GOAL                         │
│ "Learn to play guitar well enough   │
│  to play songs at gatherings"       │
│                                     │
│ Category: Creative Skills           │
│ Timeline: 3 months                  │
│ Phase: Building (2 of 3)            │
│ Risk Factors: Consistency on        │
│ weekends, finger soreness           │
│                                     │
│ [Edit Goal] [Start Over]            │
└─────────────────────────────────────┘
Brings Goals content (currently desktop-only) to mobile
"Risk Factors" from your Building Stones analysis — shows AI intelligence
3. Preferences

text

┌─────────────────────────────────────┐
│ ⚙️ PREFERENCES                     │
│                                     │
│ Daily Reminder     ⏰ 9:00 AM   >  │
│ Energy Pattern     🌅 Morning    >  │
│ Daily Time         ⏱  30 min    >  │
│ Wake Time          🛏  7:00 AM   >  │
│ Quick Mode Default  🔘 Off      >  │
│ Theme              🌙 Dark       >  │
└─────────────────────────────────────┘
Each row taps to open an inline editor or picker
Quick Mode Default (NEW): if toggled on, Today tab always starts in Quick Mode (1 task only). Power users can set this.
4. Notification Settings (NEW — Expanded)

text

┌─────────────────────────────────────┐
│ 🔔 NOTIFICATIONS                   │
│                                     │
│ Morning Nudge      🔘 On    9 AM   │
│ Evening Reminder   🔘 On    8 PM   │
│ Streak Warning     🔘 On           │
│ Weekly Summary     🔘 On    Mon AM │
│ Milestone Alerts   🔘 On           │
└─────────────────────────────────────┘
Streak Warning (NEW): sends a push at 9 PM if you haven't done your task — "Your 12-day streak is at risk!"
Weekly Summary (NEW): sends a summary of last week's performance
5. Data & Privacy

text

┌─────────────────────────────────────┐
│ 📦 YOUR DATA                       │
│                                     │
│ [Export My Data]     JSON/CSV       │
│ [Clear Notes]                       │
│ [Reset Progress]     ⚠️            │
│ [Delete Account]     🔴            │
└─────────────────────────────────────┘
Export is increasingly important for trust
Separate "Reset Progress" (restart the roadmap) from "Delete Account" (nuke everything)
Part 4: New Cross-Cutting Components
These don't live in a specific tab — they appear across the app.

1. Onboarding Checklist (First-time User — NEW)
text

┌─────────────────────────────────────┐
│ 🚀 GET STARTED                      │
│                                     │
│ ✓ Set your goal                     │
│ ✓ Generate your roadmap             │
│ ○ Complete your first task           │
│ ○ Write your first note             │
│ ○ Hit a 3-day streak                │
│                                     │
│ 2/5 complete                        │
└─────────────────────────────────────┘
Appears at the top of Today for the first week
Teaches users the app's features through doing
Disappears after all 5 are done (or can be dismissed)
2. In-App Notification Center (NEW)
Accessible via a bell icon in the header of Today.

text

┌─────────────────────────────────────┐
│ 🔔 UPDATES                         │
│                                     │
│ Today • Your plan was adjusted      │
│ based on last week's pace.          │
│                                     │
│ Yesterday • 🏆 You hit a 7-day     │
│ streak! Keep going.                 │
│                                     │
│ Mon • Weekly Summary: 5/7 days      │
│ completed. 85% completion rate.     │
└─────────────────────────────────────┘
Stores AI recalibration notices, milestone alerts, weekly summaries
Badge count on the bell icon for unread items
3. Commitment Contract (NEW — Onboarding Addition)
During onboarding, after the AI generates the plan:

text

┌─────────────────────────────────────┐
│ 📝 YOUR COMMITMENT                  │
│                                     │
│ "I, Alex, commit to spending 30     │
│  minutes daily to become a          │
│  guitarist. I'll practice in the    │
│  mornings before work."             │
│                                     │
│ [Sign & Begin]                      │
└─────────────────────────────────────┘
Pre-populated from their onboarding answers
The act of "signing" a commitment increases follow-through (behavioral science)
This contract is visible in the Profile tab
4. Rest Day Component (NEW)
text

┌─────────────────────────────────────┐
│ 🧘 REST DAY                        │
│                                     │
│ Today is a scheduled rest day.      │
│ Recovery is part of progress.       │
│                                     │
│ Optional: [Review Notes]            │
│            [Preview Tomorrow]       │
└─────────────────────────────────────┘
The AI should schedule rest days (every 7th day or based on energy patterns)
Currently, your system seems to have tasks every day. That leads to burnout.
Rest days maintain the streak (they're planned), which prevents the "I missed a day, I failed" spiral
5. Difficulty Feedback Loop (NEW)
After 3 consecutive "Too hard" skips or low mood ratings:

text

┌─────────────────────────────────────┐
│ 🔧 PLAN ADJUSTMENT                 │
│                                     │
│ It seems like things have been      │
│ tough lately. Would you like me to: │
│                                     │
│ [Simplify this week's tasks]        │
│ [Extend the timeline]              │
│ [Keep going as-is]                  │
└─────────────────────────────────────┘
Proactive AI intervention, not just reactive skipping
User feels heard, not judged
6. Shareable Achievement Cards (NEW)
When hitting milestones:

text

┌─────────────────────────────────────┐
│ ┌───────────────────────────────┐   │
│ │    🔥 7-DAY STREAK 🔥        │   │
│ │                               │   │
│ │    Alex is learning guitar    │   │
│ │    with Coheren.ai            │   │
│ │                               │   │
│ │    Week 1 ✓ Complete          │   │
│ │    7 tasks • 3.5 hours        │   │
│ │                               │   │
│ │    coheren.ai                 │   │
│ └───────────────────────────────┘   │
│                                     │
│ [Share] [Save Image] [Dismiss]      │
└─────────────────────────────────────┘
Generates a beautiful card image
Share to Instagram Stories, Twitter, WhatsApp
This is your viral growth mechanism. Every share is free marketing.
7. Micro-Animations & Haptics (NEW)
Task complete: confetti (keep) + phone vibration (haptic feedback)
Streak increment: the flame icon does a brief scale-up pulse
Progress bar fill: animated fill with a slight overshoot bounce
Tab switch: subtle crossfade, not hard cut
Pull to refresh on Today: custom animation (e.g., the Coheren logo spins)
8. Offline Mode Indicator (NEW)
text

┌─────────────────────────────────────┐
│ ⚠️ You're offline. Tasks are saved  │
│ locally and will sync when online.  │
└─────────────────────────────────────┘
Since you're using a service worker, lean into offline capability
Cache today's tasks + resources for offline use
Sync when back online
9. Widget / Lock Screen Support (NEW — Future Feature)
iOS Widget: shows today's task title + streak count
Android: same
This is the ultimate "reduce friction to zero" — users see their task without even opening the app
Part 5: What to REMOVE or DEMOTE
Current Feature	Recommendation	Reason
Library as a tab	Move into Journey (drill-down)	Doesn't earn a nav spot; empty for weeks
Swipe gestures on task cards	Replace with explicit buttons	Discoverability is near zero for new users
Cinema Mode naming	Rename to Focus Session	"Cinema" implies passive watching
Manual day advancement	Auto-advance at wake time	Unnecessary friction
"Day X of Y" format	Just "Day X"	The total creates anxiety about the journey length
Multiple smart banners	Max 1 at a time	Banner fatigue is real
Completion Rate stat	Reframe as "Energy"	Clinical vs. motivational framing
Quick Mode as a toggle	Make it a preference in Profile	Toggle on Today adds clutter; set-and-forget is better
Part 6: Revised Component Hierarchy
text

Mobile App
├── Bottom Nav (5 items)
│   ├── Today
│   │   ├── Contextual Header (greeting + day + week dots)
│   │   ├── Streak + Energy Strip
│   │   ├── Smart Banner Slot (max 1)
│   │   ├── Onboarding Checklist (first week only)
│   │   ├── Today's Focus Card (hero, single task)
│   │   ├── Quick Task List (expandable)
│   │   ├── Daily Insight Card
│   │   ├── All-Done State
│   │   ├── Rest Day Card (when applicable)
│   │   └── Empty State (no plan yet)
│   │
│   ├── Progress
│   │   ├── Progress Header (overall %)
│   │   ├── Streak Calendar (contribution graph)
│   │   ├── Weekly Performance Card
│   │   ├── Trends Sparkline
│   │   ├── Personal Records
│   │   └── AI Coach Summary
│   │
│   ├── +Do (FAB → Focus Session)
│   │   ├── Session Header (timer + task info)
│   │   ├── Resource Panel (video or instructions)
│   │   ├── Guide Tab
│   │   ├── Notes Tab (with voice-to-text)
│   │   ├── Checklist Tab (sub-steps)
│   │   ├── Session Complete Flow
│   │   │   ├── Mood Rating
│   │   │   ├── Quick Reflection
│   │   │   └── Celebration
│   │   └── Pause & Resume
│   │
│   ├── Journey
│   │   ├── Phase Indicator
│   │   ├── Week Cards (with day dots)
│   │   ├── Task Drill-Down (replaces Library)
│   │   ├── Upcoming Week Preview
│   │   └── Milestone Markers
│   │
│   └── Profile
│       ├── Identity Card
│       ├── My Goal Card
│       ├── Commitment Contract (viewable)
│       ├── Preferences
│       ├── Notification Settings
│       └── Data & Privacy
│
├── Cross-Cutting Components
│   ├── In-App Notification Center (bell icon)
│   ├── Difficulty Feedback Loop (auto-triggered)
│   ├── Shareable Achievement Cards
│   ├── Micro-Animations & Haptics
│   ├── Offline Mode Indicator
│   ├── Re-engagement Flow (returning after absence)
│   └── Plan Adjustment Prompt
│
└── Future
    ├── Lock Screen Widget
    ├── Apple Watch / WearOS companion
    └── Social accountability features
Part 7: Key Behavioral Design Principles Applied
One Thing At A Time: Today shows ONE task as the hero. Not a list. One thing.
Loss Aversion > Achievement: "Energy" depleting is scarier than "Completion Rate" going up.
Identity Reinforcement: "Aspiring Guitarist" in the profile makes the habit part of who they are.
Visible AI: Coach notes, daily insights, and adjustment prompts make the AI feel alive.
Rest is Progress: Scheduled rest days prevent burnout and keep streaks alive.
Reduce to Zero: The +Do FAB means going from "phone in hand" to "doing the task" is ONE tap.
Sunk Cost Motivation: "14.5 hours invested" makes quitting feel costly.
Social Proof via Sharing: Achievement cards create both accountability and organic growth.
Progressive Disclosure: Simple by default, detailed on demand. Lists expand. Weeks drill down.
Forgiveness Built In: Re-engagement mode, difficulty adjustments, and "ease back" flows mean failure isn't permanent.
This redesign doesn't add complexity — it redistributes it. The Today tab gets simpler. Progress gets promoted. Library gets absorbed. The AI becomes visible. And every component earns its screen real estate by driving either action or motivation.


kimi-k2-thinking-turbo



Thought for 13 seconds

Coheren.ai Mobile Enhancement Blueprint
You've built a solid foundation—smart architecture, clear navigation, and good AI integration. But you're right to feel it's not quite there yet. The gap isn't more features; it's behavioral depth and contextual intelligence. Here's how to transform it from a task list into a truly addictive habit engine.

1. Core Philosophy Shift: From "Tasks" to "Identity Reinforcement"
Current approach: "Do this task → build streak → feel good."
Better approach: Every interaction should make the user feel like the type of person who achieves their goal.

This means redesigning components to reinforce identity, not just completion.

2. Today Tab: Make It Feel Alive
Header & Greeting
Add temporal context: "Good morning, Alex. Your energy peaks in 2 hours—perfect for 'Deep Work Practice'."
Dynamic difficulty indicator: A subtle pill showing today's "Load Score" (1-5) based on task complexity + your recent completion patterns. If you're struggling, it auto-adjusts and shows "Light day—recovery mode active."
Streak visualization: Replace the flame icon with a growing plant/tree that visually evolves with your streak. Break it? It wilts but doesn't die—tap to "nurture it back" with a recovery task.
Smart Banners
Weather/Context Awareness: "Rainy morning detected. Swap 'Outdoor Run' for 'Indoor HIIT'?" (one-tap adapt)
Calendar Integration: "You have a 3pm meeting. 'Reflection' task moved to 7pm slot."
Habit Anchoring: "After 'Morning Coffee' (detected via time pattern), you usually do this task. Ready?"
Task Cards (Critical Redesign)
Swipe gestures:

Right swipe: "Quick Start" (starts a 5-min micro-version of the task)
Left swipe: "Snooze" (reschedules to next optimal slot, not just skip)
Long press: "Break it down"—AI splits the task into 3 micro-steps if it feels overwhelming
Visual feedback: Cards should have progress micro-animations—a subtle shimmer when you haven't interacted, a gentle pulse when it's the optimal time to do them.

Difficulty calibration: Add a hidden "thumbs up/down" on card edges. A subtle downvote triggers the AI to ease tomorrow's similar task; upvote makes it slightly harder. This data is gold for personalization.

Cinema Mode
Auto-pause on glance-away: Use device orientation/attention API (if available) to pause when you look away, resuming when you return.
Note intelligence: Extract timestamps automatically. Type "Important concept at 3:12" → creates a clickable timestamp bookmark.
Voice notes: Hold mic button to dictate notes—auto-transcribed and tagged with the video timestamp.
Post-Task Feedback
Replace "How did this feel?" with 3D emotion + energy mapping:

Energy axis: Drained → Energized
Confidence axis: Confused → Mastered
Relevance axis: Not useful → Crucial
This gives the AI 3D data to recalibrate, not just 1D sentiment.

3. Journey Tab: Make Progress Feel Tangible
Timeline Visualization
Skill Tree, not List: Show interconnected nodes. Completed tasks light up pathways. Hovering shows "This unlocked: [future skill]."
Milestone Moments: At Day 7, 30, etc., embed personalized "Identity Statements": "You are now someone who writes 500 words daily. Here's what changed." Pull from their notes/feedback.
Flex Handles: Let users drag to compress/extend timeline. "I have a busy month" → AI suggests a 6-week version instead of 4.
Week Cards
Risk Prediction: AI analyzes your patterns and flags weeks with "Low Success Probability" (e.g., you always drop off Week 3). Proactive intervention: "Week 3 is tough—preload a reward?"
Peer Shadows: Show anonymized completion heatmaps of similar users. "People like you crushed this week by doing tasks before 9am."
4. Library Tab: Turn It Into a Personal Knowledge Graph
Tasks Tab
Spaced Repetition Queue: Tasks you've mastered resurface as "Review Flashcards" (AI-generated 1-sentence summaries to reinforce).
Skill Tags: Auto-tag tasks by skill (e.g., "Negotiation," "CSS Grid"). Tap a tag to see your mastery curve for that skill.
Export Momentum: "Generate Weekly Report" → creates a beautiful image of your progress, ready to share on social (free marketing).
Notes Tab
AI Insights: "You've mentioned 'stuck' 3 times in CSS tasks. Here's a 5-min debug video recommendation."
Note clustering: Auto-group notes by theme and suggest "Study Session" playlists.
5. Profile Tab: The Command Center
Profile Tab
Identity Board: Not just stats—show "Evidence of Identity": "You said you wanted to be a writer. You've written 12,000 words across 24 tasks."
Habit Fingerprint: A visual radar chart showing your optimal task types, energy windows, and completion patterns. Shareable as a personal "productivity DNA."
Settings Tab
Life Events Mode: "I'm traveling" / "I'm sick" → AI pauses the roadmap and generates a "Maintenance Mode" (1-2 tiny tasks to keep the identity alive).
Streak Recovery Tokens: Earn 1 token per month to "freeze" a streak break. Gamified but forgiving.
AI Coaching Style: Choose your coach persona: "Drill Sergeant," "Gentle Nurturer," "Data-Driven Analyst." Changes banner copy and feedback tone.
6. New Components to Add
Coach Tab (5th tab, replace Profile icon with "Coach" on mobile)
Always-on AI chat floating widget, not a separate screen. Tap the coach icon in nav to expand a bottom-sheet chat.
Proactive nudges: "Day 5 is when most people skip. Want me to remind you why you started?" with a one-tap "Show my goal" button.
Voice check-ins: "How's it going?" → user voice replies → AI transcribes and adjusts tomorrow's tasks.
Community Tab (hidden on mobile, but accessible via Profile)
Accountability Pods: Match 3-5 users with similar goals. Streak sync: if everyone completes today, everyone gets +1 bonus.
Challenge Mode: "7-Day Focus Sprint"—leaderboard, but anonymized and supportive, not competitive.
Celebrate Others: When you hit a milestone, your pod gets a notification to cheer you. One-tap "🔥" to send encouragement.
Reflection Tab (desktop sidebar, mobile as weekly banner)
Weekly Reflection: Every Sunday, a 3-question micro-journal appears: "What worked? What didn't? What's one tweak?" AI generates next week's adjustment.
Identity Statements: AI drafts a 1-sentence identity reinforcement based on your week: "This week, you proved you're a morning coder."
7. System-Wide Improvements
AI Pipeline Enhancement
Your 5-agent pipeline should be reactive, not just generative:

Agent 6: The Arbiter: Watches real-time performance and triggers interceptions. "User failed 3 tasks in a row → activate Ease Back mode."
Agent 7: The Whisperer: Generates contextual micro-copy for banners, buttons, and feedback based on user's emotional state (inferred from feedback patterns).
State & Sync
Offline-First with Zustand: Queue actions locally. When online, sync and resolve conflicts with user intent priority (if they marked complete offline, it stays complete).
Background Sync: Service Worker pre-loads tomorrow's tasks at 6 AM so the app feels instant.
Notification Intelligence
Smart Windows: Don't just notify at 9 AM. Use 7-day learning to find the user's actual optimal time. Notify then.
Progress Bursts: If you complete 2 tasks by noon, send a dopamine hit: "Morning momentum unlocked! Next task is 15 min—crush it?"
Performance & Delight
Skeleton loading: Every screen should have Framer Motion skeletons that match the final layout—no jarring layout shifts.
Micro-confetti: Not just on completion—tiny sparkles when you open the app on a streak day, when you swipe a card, when you see a milestone.
8. Implementation Priority (MVP to MLP)
Week 1-2: Foundation

Add difficulty calibration (thumbs up/down on cards)
Implement Life Events Mode in settings
Upgrade post-task feedback to 3D mapping
Week 3-4: Intelligence
4. Build Coach Tab as a floating bottom-sheet chat
5. Add Spaced Repetition Queue to Library
6. Deploy Arbiter Agent for real-time adaptation

Week 5-6: Engagement
7. Launch Streak Recovery Tokens and growing plant visualization
8. Add Community Pods (beta)
9. Ship Weekly Reflection flow

Week 7-8: Polish
10. Offline-first sync with Zustand queue
11. Smart Notifications with optimal time learning
12. Micro-confetti and Framer Motion polish everywhere

Final Thought
The magic isn't in adding more—it's in making every pixel respond to the user's psychological state. Your app should feel like a living coach that breathes with them: celebrating their highs, cushioning their lows, and always making the next step feel not just doable, but inevitable.

Start with the 3D feedback and difficulty calibration. That data will fuel everything else.



i ahve build coheren.ai (Coheren — Project Overview
What it is: An AI-powered behavioural habit coach. You describe your goal in plain language, a 5-agent AI pipeline breaks it into a personalised daily roadmap, and every day you get exactly one task. The system adapts dynamically if you miss days.

Stack: React + Vite + TypeScript, Supabase (auth + DB), Groq/LLaMA for AI, Zustand for state, Framer Motion for animations.

Flow: Landing page → AI chat onboarding → 5-agent plan generation → Dashboard

Mobile Bottom Nav — 4 Tabs
Fixed to the bottom of the screen, 60px tall, safe-area-inset-bottom for iPhone notch. Purple active indicator dot + icon + label when active; grey icon only when inactive.

Today Home icon
The primary screen. Everything about today.
Header

Time-aware greeting (Good morning / Good afternoon / Good evening) + user's first name
"Day X of Y" badge in purple
Horizontal stat row: Streak (flame icon, running day count) and Completion Rate (% of all tasks ever completed)
Smart Banners (contextual, dismissible)

Week Recap — appears on the first day of each new week. Shows last week's completed task count, completion %, and a donut ring chart. Dismisses per session.
Streak Milestones — auto-shows at Day 3 / 7 / 14 / 30 / 60 / 90 with a motivational message. Auto-dismisses after 8 seconds. Stored in localStorage so it never re-fires.
Re-engagement Mode

Triggered when streak = 0 and user has missed days. Shows an "Ease Back" card — automatically limits the task list to just 1 task to lower the barrier to return. User can tap "Show all tasks" to dismiss it.
Task Cards (swipeable on mobile)

One card per task for the current day
Each card shows: task title, description, duration (e.g. "20 min"), type badge (Practice in purple / Learning in sky blue / Reflection in purple), and resource link if applicable
Swipe right → opens Cinema Mode for that task
Swipe left → opens the Skip flow
Tap Complete → triggers confetti particles + feedback modal
Tap Skip → shows a reason picker (Too hard / No time / Already know this / Other)
Quick Mode toggle

Reduces visible tasks to just the single most important incomplete task of the day (for days when you want minimum friction)
Cinema Mode (full-screen overlay)

Opens when task has a YouTube resource link
Embeds the YouTube video with enablejsapi=1 for programmatic control
Two side tabs:
Guide — task description and study tips
Notes — freeform text editor (saved to localStorage keyed by task ID, accessible later in Library)
"Seek back 10s" button, resume position saved so you can close and return
Closes with an X, pauses video on close
Post-task Feedback Modal

After marking complete: asks "how did this feel?" with quick options
Stored as task feedback in DB, feeds future recalibration
All-Done Celebration Card

Dark purple gradient card with sparkles icon, stats summary (tasks done, day number, streak count), glowing "Start Day X" button to advance the roadmap
Motivational Empty State

If no tasks exist for today: dark purple gradient card with "Your slate is clear" heading, motivational copy, and two CTA buttons — "Review Goals" (navigates to Goals on desktop sidebar) and "Explore Library" (navigates to Library)
2. Journey Map icon
The full roadmap view — all weeks, past and future.

Header

"Your Journey" title + purple pill badge showing overall progress %
Overall progress bar
Week-by-week timeline (auto-scrolls to current week on load)

Grouped by Month (Month 1, Month 2, etc.) with collapsible month sections
Completed months get a purple left border + purple icon
Each Week card shows:
Week number + focus name (e.g. "Foundation Phase")
Brief description of what to expect that week
Progress bar + percentage (tasks completed ÷ tasks total for that week)
Status badge: Upcoming (locked icon) / Active (pulsing purple dot) / Completed (purple checkmark)
Active week card has a pulsing glow animation to draw the eye
3. Library BookOpen icon
Your personal archive of everything you've done.

Two sub-tabs:

Tasks tab

Every completed task ever, sorted by most recent day first
Each entry: task title, day number, type badge (Practice / Learning / Reflect), duration
Live search bar filters by title, description, or day number
Empty state if nothing completed yet
Notes tab

Surfaces all tasks where you wrote cinema notes
Shows: task title, day number, a preview of the note content
Also searchable by task title or note text
Tapping would show the full note (notes written in Cinema Mode from the Today view)
4. Profile User icon
Account info and settings.

Two sub-tabs:

Profile tab

Purple gradient avatar circle with user icon
Display name + current goal text
Three info cards: Energy Pattern (morning / evening person), Wake Time, Daily Time Commitment
Current Goal card — goal description, category (Career / Finance / Fitness / etc.), roadmap duration in months
Settings tab

Name — editable inline with save/cancel
Check-in Time — time picker for daily notification (9 AM default for morning nudge, 8 PM for evening reminder) — controls the push notification via the Service Worker
Reset / Start Over — red destructive action with a confirmation dialog. Clears all state and returns to the landing page (wipes Zustand store + localStorage)
Desktop-only views (sidebar, not in bottom nav)
The desktop sidebar has 6 tabs. The bottom nav has 4. The two hidden on mobile are:

Progress — weekly/daily completion charts, task type breakdown, reflection streaks, and a weekly summary card with a donut chart
Goals — detailed goal analysis card showing domain, timeline, risk factors ("Building Stones"), and phase breakdown
)

i am not satisfied witht the fetaure the mbile app is having,
i wnat you think about this and give me what all compients needs to be there, how to make it better in terms of usage etc

Ask followup…




Inputs are processed by third-party AI and responses may be inaccurate.

Coheren.ai — Complete Product Improvement & Launch Blueprint
Honest Assessment of Where You Are
I've mapped your entire codebase against what a user actually experiences. Here's the truth:

What's genuinely impressive:

The 4-agent AI pipeline is sophisticated — most habit apps use static templates
Stone-based behavioral profiling is a real differentiator
Cinema Mode with resume position is thoughtful
The 14-day recalibrator means the system actually adapts
What's holding it back:

The UI is developer-designed, not user-designed. Dark gradient hero cards everywhere create visual monotony
Feature density is high but emotional impact is low
The AI does incredible work behind the scenes but the user never feels it
Mobile nav has 5 items but the hierarchy is wrong — Goals and Progress before Today?
No onboarding guidance after the AI chat — users land on a complex dashboard cold
Zero social/sharing/accountability mechanisms
The "Behavioral Stones" naming is internal jargon leaked to the UI
Phase 0: Foundation Fixes (Week 1-2)
Fix what's broken before building what's new

0.1 — Navigation Hierarchy Fix
Current mobile nav order: Goals · Progress · ◉ Today · Journey · Profile

Problem: A user opens the app to do their daily task. Today should be the default landing, but Goals is the first tab. Progress is second. The two most "check occasionally" views are in the two most prominent positions.

Fixed order:

text

┌──────────────────────────────────────────────┐
│  Today     Journey     ◉ DO     Progress    Me│
│   🏠        🗺️        (●)       📊        👤 │
└──────────────────────────────────────────────┘
Changes:

Today moves to position 1 (leftmost = default in LTR languages)
Goals gets absorbed into the Profile/Me tab (it's one card of information, not a full view)
Library gets absorbed into Journey (completed tasks are accessible via week drill-down)
The center FAB becomes "DO" — instant task launcher
"Profile" renames to "Me" (shorter label, fits mobile)
Component changes needed:

text

src/components/navigation/
├── BottomNav.tsx          // Reorder tabs, update icons
├── BottomNavItem.tsx       // No changes
├── DesktopSidebar.tsx     // Keep all 6 views on desktop
└── MobileTabRouter.tsx    // New — handles tab state + deep links
0.2 — Visual Hierarchy Reset
Problem: Every view has a dark gradient hero card. When everything is emphasized, nothing is emphasized.

New visual hierarchy system:

text

Level 1 — Hero:       Only on TODAY view (the Focus Card)
Level 2 — Section:    Subtle card with border, no gradient
Level 3 — List item:  Flat row with divider
Level 4 — Metadata:   Inline text, no container
Design token updates:

TypeScript

// src/design/tokens.ts — ADD these
export const elevation = {
  hero: 'bg-gradient-to-br from-purple-900/90 to-indigo-950/90 border border-purple-500/20 shadow-2xl shadow-purple-500/10',
  section: 'bg-gray-900/60 border border-gray-800/50 rounded-2xl',
  listItem: 'bg-transparent border-b border-gray-800/30',
  metadata: 'text-gray-500 text-sm',
} as const;

// REMOVE: reuse of hero gradient on Goals, Journey, Profile, Progress
// Those views should use section-level cards
Before → After examples:

Goals hero card → Simple section card with goal text + progress bar
Journey hero card → Section card with roadmap title + stats
Profile hero card → Identity card with avatar + name (no full gradient)
Progress hero card → Remove entirely, stats strip is enough

0.3 — Rename User-Facing Jargon
Internal Term	User-Facing Term	Where It Appears
Behavioral Stones	Growth Challenges	Goals view, Profile
Shadow Extractor	(never shown)	—
Curriculum Builder	(never shown)	—
Stone severity: Critical	High Priority	Stone cards
Recalibrator	Plan Adjustment	Checkpoint notification
Cinema Mode	Focus Session	Today view
RAG Knowledge Base	(never shown)	—
FocusFragility	Attention Management	Stone cards
CognitiveFatigue	Mental Energy Management	Stone cards
ProcrastinationPattern	Starting Difficulty	Stone cards
Implementation:

TypeScript

// src/utils/stone-labels.ts — NEW
export const STONE_DISPLAY_NAMES: Record<StoneType, string> = {
  TimeConstraint: 'Time Management',
  ResourceGap: 'Resource Access',
  EnvironmentFriction: 'Environment Setup',
  Inconsistency: 'Consistency Building',
  FearOfFailure: 'Fear of Failure',
  Perfectionism: 'Perfectionism',
  LowConfidence: 'Confidence Building',
  UnrealisticExpectations: 'Expectation Calibration',
  FocusFragility: 'Attention Management',
  CognitiveFatigue: 'Mental Energy',
  SkillGap: 'Skill Foundation',
  ProcrastinationPattern: 'Starting Difficulty',
  Overcommitment: 'Load Management',
};

export const SEVERITY_DISPLAY: Record<string, string> = {
  Critical: 'High Priority',
  High: 'Important',
  Moderate: 'Moderate',
  Low: 'Minor',
};
0.4 — Auto Day Advancement
Current: User manually clicks "Start Day X" to advance.

Problem: If they forget to click, the app looks broken the next morning. "Why am I still on yesterday?"

Fix:

TypeScript

// src/hooks/useAutoAdvance.ts — NEW
export function useAutoAdvance() {
  const { wakeTime, currentDay } = useUserStore();
  
  useEffect(() => {
    const checkAdvance = () => {
      const now = new Date();
      const lastActiveDate = localStorage.getItem('coheren_last_active_date');
      const today = now.toISOString().split('T')[0];
      
      if (lastActiveDate && lastActiveDate !== today) {
        const daysMissed = daysBetween(lastActiveDate, today);
        
        if (daysMissed === 1) {
          // Normal advance
          advanceDay();
        } else if (daysMissed > 1) {
          // Missed days — trigger re-engagement
          advanceDay(daysMissed);
          triggerReEngagement(daysMissed);
        }
      }
      
      localStorage.setItem('coheren_last_active_date', today);
    };

    checkAdvance();
    
    // Also check when tab becomes visible (user returns to app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAdvance();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
}
0.5 — Haptic Feedback System
TypeScript

// src/utils/haptics.ts — NEW
export const haptics = {
  light: () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
  },
  medium: () => {
    if ('vibrate' in navigator) navigator.vibrate(25);
  },
  success: () => {
    if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
  },
  error: () => {
    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
  },
  celebration: () => {
    if ('vibrate' in navigator) navigator.vibrate([10, 30, 10, 30, 50]);
  },
};

// Usage: haptics.success() after task completion
// Usage: haptics.light() on tab switch
// Usage: haptics.celebration() on streak milestone
Phase 1: Today View Rebuild (Week 2-3)
Make the daily experience feel like a personal coach, not a task manager

1.1 — Today View Component Architecture
text

src/components/today/
├── TodayView.tsx                    // Main container
├── TodayHeader.tsx                  // Greeting + day + week dots
├── StatsStrip.tsx                   // Streak + Energy bar
├── SmartBannerSlot.tsx              // Max 1 banner, priority stack
│   ├── WeekRecapBanner.tsx
│   ├── StreakMilestoneBanner.tsx
│   ├── ReEngagementBanner.tsx
│   └── PlanAdjustmentBanner.tsx     // NEW
├── OnboardingChecklist.tsx          // NEW — first week only
├── FocusCard.tsx                    // Hero card — single task
├── TaskList.tsx                     // Expandable remaining tasks
├── DailyInsight.tsx                 // NEW — AI micro-insight
├── RestDayCard.tsx                  // NEW
├── AllDoneCard.tsx                  // Simplified celebration
└── EmptyState.tsx                   // No plan yet
1.2 — TodayHeader Component
React

// src/components/today/TodayHeader.tsx
interface TodayHeaderProps {
  userName: string;
  currentDay: number;
  currentWeekDay: number; // 1-7
  completedDaysThisWeek: number[];
}

export function TodayHeader({ userName, currentDay, currentWeekDay, completedDaysThisWeek }: TodayHeaderProps) {
  const greeting = getTimeGreeting(); // Good morning / afternoon / evening
  
  return (
    <div className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{greeting}</p>
          <h1 className="text-white text-2xl font-bold">{userName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-300 bg-purple-500/15 px-2.5 py-1 rounded-full font-medium">
            Day {currentDay}
          </span>
          <button onClick={openNotifications} className="relative p-2">
            <Bell className="w-5 h-5 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Week dots — 7 dots showing this week's progress */}
      <div className="flex gap-1.5 mt-3">
        {[1, 2, 3, 4, 5, 6, 7].map(day => (
          <div
            key={day}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              day < currentWeekDay && completedDaysThisWeek.includes(day)
                ? 'bg-purple-500'           // completed
                : day < currentWeekDay
                ? 'bg-red-400/60'           // missed
                : day === currentWeekDay
                ? 'bg-purple-400 animate-pulse w-2.5 h-2.5' // today
                : 'bg-gray-700'             // future
            )}
          />
        ))}
      </div>
    </div>
  );
}
Why week dots matter: Users get micro-feedback on their weekly consistency without any numbers. A row of purple dots is satisfying. A gap (red dot) creates gentle urgency. This is the "don't break the chain" principle in 7 pixels.

1.3 — Stats Strip (Reframed)
React

// src/components/today/StatsStrip.tsx
export function StatsStrip({ streak, energyPercent }: { streak: number; energyPercent: number }) {
  return (
    <div className="flex gap-3 px-5 py-2">
      <div className="flex items-center gap-1.5 bg-gray-900/60 rounded-xl px-3 py-2 flex-1">
        <Flame className={cn('w-4 h-4', streak > 0 ? 'text-orange-400' : 'text-gray-600')} />
        <span className="text-white text-sm font-semibold">{streak}</span>
        <span className="text-gray-500 text-xs">streak</span>
      </div>
      
      <div className="flex items-center gap-1.5 bg-gray-900/60 rounded-xl px-3 py-2 flex-1">
        <Zap className={cn(
          'w-4 h-4',
          energyPercent >= 80 ? 'text-green-400' :
          energyPercent >= 50 ? 'text-yellow-400' :
          'text-red-400'
        )} />
        <span className="text-white text-sm font-semibold">{energyPercent}%</span>
        <span className="text-gray-500 text-xs">energy</span>
        
        {/* Mini energy bar */}
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full ml-1 overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              energyPercent >= 80 ? 'bg-green-400' :
              energyPercent >= 50 ? 'bg-yellow-400' :
              'bg-red-400'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${energyPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
Key change: "Completion Rate" → "Energy". Same number, completely different psychology. An energy bar that's at 45% and red creates urgency. "45% completion rate" just feels like a grade.

1.4 — Smart Banner System (Priority-Based, Max 1)
React

// src/components/today/SmartBannerSlot.tsx
type BannerType = 'plan-adjustment' | 're-engagement' | 'streak-milestone' | 'week-recap';

const BANNER_PRIORITY: BannerType[] = [
  'plan-adjustment',    // Highest — AI changed your plan
  're-engagement',      // Missed days
  'streak-milestone',   // Hit a milestone
  'week-recap',         // Start of new week
];

export function SmartBannerSlot() {
  const activeBanners = useActiveBanners(); // hook that checks all conditions
  
  // Only show the highest priority banner
  const topBanner = BANNER_PRIORITY.find(type => activeBanners.includes(type));
  
  if (!topBanner) return null;
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={topBanner}
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        className="px-5"
      >
        {topBanner === 'plan-adjustment' && <PlanAdjustmentBanner />}
        {topBanner === 're-engagement' && <ReEngagementBanner />}
        {topBanner === 'streak-milestone' && <StreakMilestoneBanner />}
        {topBanner === 'week-recap' && <WeekRecapBanner />}
      </motion.div>
    </AnimatePresence>
  );
}
NEW — Plan Adjustment Banner:

React

// src/components/today/banners/PlanAdjustmentBanner.tsx
// Shows when the 14-day recalibrator ran and modified the plan
export function PlanAdjustmentBanner() {
  return (
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">Your plan was adjusted</p>
          <p className="text-gray-400 text-xs mt-1">
            Based on your progress, I've shifted this week's focus to more practice 
            and less theory. You're learning faster by doing.
          </p>
        </div>
        <button onClick={dismiss} className="text-gray-600 hover:text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
This is crucial. Your 14-day recalibrator is a powerful feature that currently runs silently. The user should KNOW the AI adjusted their plan and WHY.

1.5 — Focus Card (The Hero)
React

// src/components/today/FocusCard.tsx
interface FocusCardProps {
  task: DailyTask;
  dayNumber: number;
  tasksRemaining: number;
}

export function FocusCard({ task, dayNumber, tasksRemaining }: FocusCardProps) {
  const typeConfig = {
    practice: { color: 'purple', icon: Target, label: 'Practice' },
    learning: { color: 'sky', icon: BookOpen, label: 'Learning' },
    reflection: { color: 'violet', icon: MessageCircle, label: 'Reflection' },
  };
  
  const config = typeConfig[task.type];
  
  return (
    <motion.div
      layout
      className="mx-5 bg-gradient-to-br from-purple-900/80 to-indigo-950/80 
                 border border-purple-500/15 rounded-3xl p-6 shadow-2xl shadow-purple-500/5"
    >
      {/* Type badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-full',
          `bg-${config.color}-500/15 text-${config.color}-300`
        )}>
          <config.icon className="w-3 h-3 inline mr-1" />
          {config.label}
        </span>
        <span className="text-gray-500 text-xs">
          {task.duration} min
        </span>
      </div>
      
      {/* Task title */}
      <h2 className="text-white text-xl font-bold leading-tight mb-2">
        {task.title}
      </h2>
      
      {/* Description */}
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        {task.description}
      </p>
      
      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => startFocusSession(task)}
          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white 
                     rounded-2xl py-3.5 font-semibold text-sm transition-colors
                     flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          Start Focus
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => markComplete(task)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 
                     rounded-2xl px-4 py-3.5 text-sm transition-colors"
        >
          <Check className="w-4 h-4" />
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => openSkipFlow(task)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-500 
                     rounded-2xl px-4 py-3.5 text-sm transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </motion.button>
      </div>
      
      {/* Remaining tasks */}
      {tasksRemaining > 0 && (
        <button
          onClick={expandTaskList}
          className="w-full mt-4 text-center text-gray-500 text-xs 
                     hover:text-gray-400 transition-colors"
        >
          +{tasksRemaining} more task{tasksRemaining > 1 ? 's' : ''} today
        </button>
      )}
    </motion.div>
  );
}
Key design decisions:

ONE task as the hero, not a list. This is the most important UX change.
Three action buttons: Start Focus (primary), Mark Done (secondary), Skip (tertiary)
No swipe gestures — explicit buttons are discoverable
The "+N more tasks" is a progressive disclosure tap target, not a visible list
1.6 — Daily Insight Card (NEW)
React

// src/components/today/DailyInsight.tsx
// This makes the AI VISIBLE. Right now, the AI works silently.

export function DailyInsight({ insight }: { insight: string }) {
  return (
    <div className="mx-5 mt-4 bg-gray-900/40 border border-gray-800/40 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1">
            Coach Insight
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </div>
  );
}
Where the insight comes from — new AI micro-agent:

TypeScript

// src/core/agents/insight-generator.ts — NEW
export async function generateDailyInsight(context: {
  completionHistory: TaskCompletion[];
  currentStreak: number;
  stones: BehavioralStone[];
  currentPhase: string;
  dayNumber: number;
}): Promise<string> {
  // Use the fast model — this runs on every app open
  const response = await groq('llama-3.1-8b-instant', {
    system: `You are a concise behavioral coach. Generate a single, 
             specific insight (max 25 words) based on the user's data. 
             Be warm but data-driven. Never generic.`,
    user: `
      Streak: ${context.currentStreak} days
      Tasks completed this week: ${weeklyCount}
      Primary challenge: ${context.stones[0]?.type}
      Phase: ${context.currentPhase}
      Patterns: ${derivePatterns(context.completionHistory)}
    `
  });
  
  return response;
}

// Example outputs:
// "You complete practice tasks 2x faster than learning tasks. Today's practice is right in your sweet spot."
// "Your streak survived a weekend — that's when 73% of users drop off. You didn't."
// "You've been skipping reflections. They're short — try today's 5-minute one."
1.7 — Onboarding Checklist (NEW — First Week Only)
React

// src/components/today/OnboardingChecklist.tsx
const CHECKLIST_ITEMS = [
  { id: 'first_task', label: 'Complete your first task', icon: Check },
  { id: 'first_focus', label: 'Try a Focus Session', icon: Play },
  { id: 'first_note', label: 'Write a note in Focus Mode', icon: Pencil },
  { id: 'three_streak', label: 'Hit a 3-day streak', icon: Flame },
  { id: 'explore_journey', label: 'Check your Journey map', icon: Map },
];

export function OnboardingChecklist() {
  const completed = useOnboardingProgress(); // reads from localStorage
  const allDone = completed.length === CHECKLIST_ITEMS.length;
  const [dismissed, setDismissed] = useState(false);
  
  if (allDone || dismissed) return null;
  
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-purple-400" />
          <span className="text-white text-sm font-semibold">Get Started</span>
        </div>
        <span className="text-gray-500 text-xs">
          {completed.length}/{CHECKLIST_ITEMS.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map(item => {
          const isDone = completed.includes(item.id);
          return (
            <div key={item.id} className={cn(
              'flex items-center gap-2.5 py-1',
              isDone && 'opacity-50'
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center border',
                isDone 
                  ? 'bg-purple-500 border-purple-500' 
                  : 'border-gray-700'
              )}>
                {isDone && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={cn(
                'text-sm',
                isDone ? 'text-gray-500 line-through' : 'text-gray-300'
              )}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
1.8 — Rest Day Card (NEW)
React

// src/components/today/RestDayCard.tsx
export function RestDayCard() {
  return (
    <div className="mx-5 mt-4 bg-gradient-to-br from-gray-900/80 to-gray-950/80 
                    border border-gray-800/30 rounded-3xl p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
        <Coffee className="w-6 h-6 text-purple-400" />
      </div>
      
      <h2 className="text-white text-xl font-bold mb-2">Rest Day</h2>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">
        Recovery is part of progress. Your streak is safe — 
        rest days are built into your plan.
      </p>
      
      <div className="flex gap-3 justify-center">
        <button
          onClick={navigateToJourney}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Preview Tomorrow →
        </button>
      </div>
    </div>
  );
}
Implementation in the AI pipeline:

TypeScript

// src/core/agents/task-generator.ts — MODIFY
// Every 7th day, OR when user's energy pattern suggests fatigue,
// generate a rest day instead of tasks

function shouldBeRestDay(dayNumber: number, energyPattern: string, recentCompletionRate: number): boolean {
  // Every 7th day
  if (dayNumber % 7 === 0) return true;
  
  // If completion rate dropped below 40% for 3 consecutive days
  if (recentCompletionRate < 0.4) return true;
  
  return false;
}
1.9 — Improved Skip Flow
React

// src/components/today/SkipFlow.tsx
const SKIP_REASONS = [
  { id: 'no_time', label: 'Not enough time', icon: Clock, followUp: 'shorter' },
  { id: 'too_hard', label: 'Too challenging', icon: Mountain, followUp: 'easier' },
  { id: 'not_relevant', label: 'Doesn\'t feel relevant', icon: HelpCircle, followUp: 'feedback' },
  { id: 'already_know', label: 'I already know this', icon: Brain, followUp: 'advance' },
  { id: 'low_energy', label: 'Low energy today', icon: Battery, followUp: 'defer' },
];

export function SkipFlow({ task, onSkip }: { task: DailyTask; onSkip: (reason: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
    >
      <div className="bg-gray-900 rounded-t-3xl w-full p-6 pb-safe">
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />
        
        <h3 className="text-white text-lg font-semibold mb-1">Skip this task?</h3>
        <p className="text-gray-500 text-sm mb-6">
          No judgment — help me understand so I can adjust your plan.
        </p>
        
        <div className="space-y-2">
          {SKIP_REASONS.map(reason => (
            <button
              key={reason.id}
              onClick={() => {
                haptics.light();
                onSkip(reason.id);
              }}
              className="w-full flex items-center gap-3 bg-gray-800/60 hover:bg-gray-800 
                         rounded-xl p-3.5 text-left transition-colors"
            >
              <reason.icon className="w-5 h-5 text-gray-400 shrink-0" />
              <span className="text-gray-200 text-sm">{reason.label}</span>
            </button>
          ))}
        </div>
        
        <button
          onClick={dismiss}
          className="w-full mt-4 text-gray-600 text-sm py-3"
        >
          Never mind, I'll do it
        </button>
      </div>
    </motion.div>
  );
}
Key addition: Skip reasons now feed back to the AI. If a user skips 3 "too hard" tasks in a row, it triggers the Difficulty Feedback Loop (Phase 2).

1.10 — All-Done Card (Simplified)
React

// src/components/today/AllDoneCard.tsx
export function AllDoneCard({ tasksCompleted, streak, dayNumber }: AllDoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-5 mt-4 bg-gradient-to-br from-purple-900/60 to-indigo-950/60 
                 border border-purple-500/10 rounded-3xl p-8 text-center"
    >
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-4" />
      </motion.div>
      
      <h2 className="text-white text-xl font-bold mb-2">All done for today</h2>
      
      <div className="flex justify-center gap-6 mt-4 mb-6">
        <div className="text-center">
          <p className="text-purple-300 text-2xl font-bold">{tasksCompleted}</p>
          <p className="text-gray-500 text-xs">tasks</p>
        </div>
        <div className="text-center">
          <p className="text-orange-300 text-2xl font-bold">{streak}</p>
          <p className="text-gray-500 text-xs">streak</p>
        </div>
      </div>
      
      <p className="text-gray-500 text-sm italic">
        "Rest is part of the process."
      </p>
    </motion.div>
  );
}
Removed: The "Start Day X" button. Days advance automatically now.

Phase 2: Focus Session Rebuild (Week 3-4)
Transform Cinema Mode into a proper focus environment

2.1 — Focus Session Architecture
text

src/components/focus/
├── FocusSession.tsx             // Full-screen container
├── FocusHeader.tsx              // Timer + task info + close
├── FocusTimer.tsx               // Count-up timer with pause
├── ResourcePanel.tsx            // Video embed or instruction card
├── FocusTabBar.tsx              // Guide / Notes / Steps tabs
│   ├── GuideTab.tsx             // Task description + tips + "why this matters"
│   ├── NotesTab.tsx             // Text editor + voice-to-text + timestamps
│   └── StepsTab.tsx             // NEW — Sub-task checklist
├── FocusComplete.tsx            // Completion flow (mood → reflection → celebration)
├── FocusPauseOverlay.tsx        // NEW — Pause state
└── FocusResumePrompt.tsx        // NEW — "Resume where you left off?"
2.2 — Focus Timer (Count-Up, Not Count-Down)
React

// src/components/focus/FocusTimer.tsx
export function FocusTimer({ estimatedMinutes }: { estimatedMinutes: number }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = Math.min((seconds / 60) / estimatedMinutes, 1);
  
  return (
    <div className="flex items-center gap-3">
      {/* Circular progress ring */}
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1f2937" strokeWidth="2" />
        <circle
          cx="18" cy="18" r="15" fill="none"
          stroke={progress >= 1 ? '#a78bfa' : '#7c3aed'}
          strokeWidth="2"
          strokeDasharray={`${progress * 94.2} 94.2`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      
      <div>
        <span className="text-white text-lg font-mono font-semibold">
          {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <p className="text-gray-500 text-[10px]">
          ~{estimatedMinutes} min estimated
        </p>
      </div>
      
      <button
        onClick={() => setIsRunning(!isRunning)}
        className="ml-auto p-2 rounded-full bg-gray-800 hover:bg-gray-700"
      >
        {isRunning ? <Pause className="w-4 h-4 text-gray-300" /> : <Play className="w-4 h-4 text-gray-300" />}
      </button>
    </div>
  );
}
Why count-up: Countdown timers create anxiety ("I only have 3 minutes left!"). Count-up timers let users enter flow state. The circular progress ring shows estimated time without pressure.

2.3 — Steps Tab (NEW — Sub-task Breakdown)
React

// src/components/focus/StepsTab.tsx
// The AI already generates step-by-step guides. Parse them into checkable steps.

interface Step {
  id: string;
  text: string;
  completed: boolean;
}

export function StepsTab({ taskId, steps }: { taskId: string; steps: Step[] }) {
  const [localSteps, setLocalSteps] = useLocalStorage<Step[]>(`focus-steps-${taskId}`, steps);
  
  const completedCount = localSteps.filter(s => s.completed).length;
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">
          {completedCount}/{localSteps.length} steps
        </span>
        <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${(completedCount / localSteps.length) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        {localSteps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => toggleStep(step.id)}
            className={cn(
              'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
              step.completed ? 'bg-purple-500/5' : 'bg-gray-800/40'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              step.completed ? 'bg-purple-500 border-purple-500' : 'border-gray-600'
            )}>
              {step.completed && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className={cn(
              'text-sm leading-relaxed',
              step.completed ? 'text-gray-500 line-through' : 'text-gray-200'
            )}>
              {step.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
2.4 — Notes Tab (Enhanced)
React

// src/components/focus/NotesTab.tsx
export function NotesTab({ taskId, videoTimestamp }: { taskId: string; videoTimestamp?: number }) {
  const [notes, setNotes] = useLocalStorage<NoteEntry[]>(`focus-notes-${taskId}`, []);
  const [currentText, setCurrentText] = useState('');
  
  const addNote = () => {
    if (!currentText.trim()) return;
    const entry: NoteEntry = {
      id: nanoid(),
      text: currentText,
      timestamp: videoTimestamp ? formatTime(videoTimestamp) : undefined,
      createdAt: new Date().toISOString(),
    };
    setNotes([...notes, entry]);
    setCurrentText('');
    haptics.light();
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Existing notes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.map(note => (
          <div key={note.id} className="bg-gray-800/40 rounded-xl p-3">
            {note.timestamp && (
              <span className="text-purple-400 text-xs font-mono mb-1 block">
                ⏱ {note.timestamp}
              </span>
            )}
            <p className="text-gray-200 text-sm">{note.text}</p>
          </div>
        ))}
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-800 p-3 flex gap-2">
        <input
          value={currentText}
          onChange={e => setCurrentText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()}
          placeholder="Add a note..."
          className="flex-1 bg-gray-800/60 rounded-xl px-4 py-2.5 text-sm text-white 
                     placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-purple-500/30"
        />
        
        {/* Voice-to-text button */}
        <button
          onClick={startVoiceInput}
          className="p-2.5 rounded-xl bg-gray-800/60 hover:bg-gray-700 transition-colors"
        >
          <Mic className="w-4 h-4 text-gray-400" />
        </button>
        
        <button
          onClick={addNote}
          disabled={!currentText.trim()}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition-colors 
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
Key additions:

Notes are now individual entries with timestamps, not a single blob of text
If video is playing, notes automatically tag the current timestamp
Voice-to-text button for hands-free note-taking
Notes are stored as structured data, making them searchable in Journey drill-down
2.5 — Focus Complete Flow (3-Step)
React

// src/components/focus/FocusComplete.tsx
type CompleteStep = 'mood' | 'reflection' | 'celebration';

export function FocusComplete({ task, timeSpent, onClose }: FocusCompleteProps) {
  const [step, setStep] = useState<CompleteStep>('mood');
  const [mood, setMood] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');
  
  const moods = [
    { value: 1, emoji: '😫', label: 'Hard' },
    { value: 2, emoji: '😕', label: 'Meh' },
    { value: 3, emoji: '😐', label: 'OK' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '🤩', label: 'Great' },
  ];
  
  return (
    <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === 'mood' && (
          <motion.div key="mood" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
            <h3 className="text-white text-xl font-bold mb-6">How did that feel?</h3>
            <div className="flex gap-4 justify-center mb-8">
              {moods.map(m => (
                <button
                  key={m.value}
                  onClick={() => {
                    setMood(m.value);
                    haptics.light();
                    setTimeout(() => setStep('reflection'), 300);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-2xl transition-all',
                    mood === m.value ? 'bg-purple-500/20 scale-110' : 'hover:bg-gray-800/40'
                  )}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-gray-500 text-xs">{m.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        
        {step === 'reflection' && (
          <motion.div key="reflection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm">
            <h3 className="text-white text-xl font-bold mb-2 text-center">Quick thought?</h3>
            <p className="text-gray-500 text-sm text-center mb-4">Optional — anything you want to remember</p>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="I noticed that..."
              rows={3}
              className="w-full bg-gray-800/60 rounded-2xl px-4 py-3 text-sm text-white 
                         placeholder:text-gray-600 outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('celebration')} className="flex-1 text-gray-500 text-sm py-3">
                Skip
              </button>
              <button
                onClick={() => {
                  saveReflection(reflection);
                  setStep('celebration');
                }}
                className="flex-1 bg-purple-600 rounded-2xl py-3 text-white text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
        
        {step === 'celebration' && (
          <motion.div key="celebration" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <ConfettiExplosion />
            {haptics.celebration()}
            
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-white text-2xl font-bold mb-4">Task Complete! 🎉</h3>
              
              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-purple-300 text-lg font-bold">
                    {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, '0')}
                  </p>
                  <p className="text-gray-500 text-xs">time spent</p>
                </div>
                <div className="text-center">
                  <p className="text-orange-300 text-lg font-bold">{newStreak}</p>
                  <p className="text-gray-500 text-xs">day streak</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="bg-purple-600 hover:bg-purple-500 rounded-2xl px-8 py-3 
                           text-white font-semibold transition-colors"
              >
                Back to Today
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
2.6 — Session Persistence (NEW)
TypeScript

// src/hooks/useFocusSession.ts — NEW
interface FocusSessionState {
  taskId: string;
  startedAt: string;
  elapsedSeconds: number;
  videoPosition?: number;
  notes: NoteEntry[];
  stepsCompleted: string[];
  isPaused: boolean;
}

export function useFocusSession() {
  const [session, setSession] = useLocalStorage<FocusSessionState | null>('coheren_active_session', null);
  
  const startSession = (task: DailyTask) => {
    setSession({
      taskId: task.id,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      notes: [],
      stepsCompleted: [],
      isPaused: false,
    });
  };
  
  const pauseSession = () => {
    if (session) {
      setSession({ ...session, isPaused: true });
    }
  };
  
  const resumeSession = () => {
    if (session) {
      setSession({ ...session, isPaused: false });
    }
  };
  
  const hasActiveSession = session !== null && !session.isPaused;
  
  return { session, startSession, pauseSession, resumeSession, hasActiveSession };
}
Resume prompt on app open:

React

// src/components/focus/FocusResumePrompt.tsx
export function FocusResumePrompt() {
  const { session, resumeSession, clearSession } = useFocusSession();
  
  if (!session) return null;
  
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-20 left-4 right-4 bg-gray-900 border border-purple-500/20 
                 rounded-2xl p-4 shadow-xl shadow-purple-500/10 z-40"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Play className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium">Resume session?</p>
          <p className="text-gray-500 text-xs">
            {formatElapsed(session.elapsedSeconds)} elapsed
          </p>
        </div>
        <button onClick={resumeSession} className="bg-purple-600 rounded-xl px-4 py-2 text-white text-sm font-medium">
          Resume
        </button>
        <button onClick={clearSession} className="text-gray-600 p-2">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
Phase 3: Progress View (Week 4-5)
Promoted from desktop-only to a primary mobile tab

3.1 — Component Architecture
text

src/components/progress/
├── ProgressView.tsx
├── ProgressHeader.tsx
├── StreakCalendar.tsx          // NEW — GitHub-style contribution graph
├── WeeklyPerformance.tsx      // Enhanced from existing
├── ActivityBreakdown.tsx      // Keep, improve
├── TrendSparkline.tsx         // NEW — mini line chart
├── PersonalRecords.tsx        // NEW
└── CoachSummary.tsx           // NEW — AI weekly analysis
3.2 — Streak Calendar (The Centerpiece)
React

// src/components/progress/StreakCalendar.tsx
interface CalendarDay {
  date: string;
  status: 'completed' | 'partial' | 'missed' | 'rest' | 'today' | 'future';
}

export function StreakCalendar({ days, currentMonth }: { days: CalendarDay[]; currentMonth: string }) {
  const statusColors = {
    completed: 'bg-purple-500',
    partial: 'bg-purple-500/40',
    missed: 'bg-red-500/30',
    rest: 'bg-gray-700 ring-1 ring-gray-600',
    today: 'bg-purple-400 ring-2 ring-purple-400/50 animate-pulse',
    future: 'bg-gray-800/30',
  };
  
  return (
    <div className="mx-5 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-sm font-semibold">{currentMonth}</h3>
        <div className="flex gap-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-purple-500" /> Done
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-500/30" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-gray-700 ring-1 ring-gray-600" /> Rest
          </span>
        </div>
      </div>
      
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <span key={i} className="text-gray-600 text-[10px] text-center">{day}</span>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <motion.div
            key={day.date}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              'aspect-square rounded-md transition-all cursor-pointer',
              statusColors[day.status]
            )}
            onClick={() => day.status !== 'future' && showDayDetail(day)}
          />
        ))}
      </div>
      
      {/* Current streak callout */}
      <div className="mt-4 pt-3 border-t border-gray-800/40 flex items-center justify-between">
        <span className="text-gray-400 text-xs">Current streak</span>
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-white text-sm font-bold">{currentStreak} days</span>
        </div>
      </div>
    </div>
  );
}
Why this matters: This is the single most addictive component in habit apps. Users open Progress just to see their grid. Every purple square is a small dopamine hit. Every gap is gentle motivation to not create another one.

3.3 — Personal Records (NEW)
React

// src/components/progress/PersonalRecords.tsx
export function PersonalRecords({ records }: { records: PersonalRecordsData }) {
  const items = [
    { label: 'Longest Streak', value: `${records.longestStreak} days`, icon: Flame, color: 'text-orange-400' },
    { label: 'Best Week', value: `Week ${records.bestWeek.number} (${records.bestWeek.percentage}%)`, icon: Trophy, color: 'text-yellow-400' },
    { label: 'Tasks Completed', value: records.totalTasksDone.toString(), icon: CheckCircle, color: 'text-green-400' },
    { label: 'Time Invested', value: formatHours(records.totalMinutes), icon: Clock, color: 'text-purple-400' },
  ];
  
  return (
    <div className="mx-5 mt-4">
      <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        Personal Records
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className="bg-gray-900/60 border border-gray-800/40 rounded-xl p-3">
            <item.icon className={cn('w-4 h-4 mb-2', item.color)} />
            <p className="text-white text-lg font-bold">{item.value}</p>
            <p className="text-gray-500 text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
"Time Invested" is psychologically powerful. When someone sees "I've invested 14.5 hours into learning guitar," quitting feels like throwing away those hours. This is sunk-cost motivation used ethically — the time IS real, and the progress IS real.

3.4 — AI Coach Summary (NEW)
React

// src/components/progress/CoachSummary.tsx
export function CoachSummary({ summary }: { summary: string }) {
  return (
    <div className="mx-5 mt-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
            Weekly Coach Notes
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            {summary}
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Updated every Monday
          </p>
        </div>
      </div>
    </div>
  );
}
Where the summary comes from:

TypeScript

// src/core/agents/coach-summary.ts — NEW
export async function generateWeeklySummary(context: {
  completionData: WeekData;
  skipReasons: SkipReason[];
  moodRatings: number[];
  stones: BehavioralStone[];
  phase: string;
}): Promise<string> {
  const response = await groq('llama-3.1-8b-instant', {
    system: `You're a supportive behavioral coach writing a weekly note 
             to your client. Max 3 sentences. Be specific about their data. 
             Include one observation and one forward-looking encouragement.
             Never be generic.`,
    user: `
      Week completion: ${context.completionData.percentage}%
      Tasks done: ${context.completionData.completed}/${context.completionData.total}
      Skip reasons: ${JSON.stringify(context.skipReasons)}
      Average mood: ${average(context.moodRatings)}/5
      Primary challenge: ${context.stones[0]?.type}
      Current phase: ${context.phase}
    `
  });
  
  return response;
}

// Example output:
// "You completed 5 out of 7 tasks this week — your strongest week yet. 
//  I noticed you skipped both weekend tasks citing 'no time.' Next week, 
//  I've made Saturday's task a 5-minute reflection instead of a practice session."
This is the killer feature. The AI doesn't just generate a plan and disappear — it actively observes, comments, and adapts. The user feels coached, not managed.

3.5 — Trend Sparkline
React

// src/components/progress/TrendSparkline.tsx
export function TrendSparkline({ data }: { data: { week: number; percentage: number }[] }) {
  const maxY = 100;
  const width = 300;
  const height = 60;
  const padding = 8;
  
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - 2 * padding),
    y: height - padding - (d.percentage / maxY) * (height - 2 * padding),
  }));
  
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    return `${acc} L ${p.x} ${p.y}`;
  }, '');
  
  const trend = data.length >= 2 
    ? data[data.length - 1].percentage - data[data.length - 2].percentage 
    : 0;
  
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-semibold">Weekly Trend</h3>
        <span className={cn(
          'text-xs font-medium flex items-center gap-1',
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs last week
        </span>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Gradient fill */}
        <defs>
          <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <path d={`${pathD} L ${points[points.length-1].x} ${height-padding} L ${points[0].x} ${height-padding} Z`} fill="url(#sparkGradient)" />
        
        {/* Line */}
        <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={i === points.length - 1 ? '#a78bfa' : '#7c3aed'} />
        ))}
      </svg>
      
      <div className="flex justify-between mt-2">
        {data.map(d => (
          <span key={d.week} className="text-gray-600 text-[10px]">W{d.week}</span>
        ))}
      </div>
    </div>
  );
}
Phase 4: Journey View Enhancement (Week 5-6)
Transform from a passive timeline into an interactive roadmap + library

4.1 — Component Architecture
text

src/components/journey/
├── JourneyView.tsx
├── PhaseMap.tsx                  // NEW — visual phase indicator
├── WeekCard.tsx                  // Enhanced with day dots
├── TaskDrillDown.tsx             // NEW — replaces Library view
├── UpcomingPreview.tsx           // NEW
├── MonthReview.tsx               // NEW — milestone summaries
└── CompletedNotesBadge.tsx       // Indicator for notes in drill-down
4.2 — Phase Map
React

// src/components/journey/PhaseMap.tsx
interface Phase {
  name: string;
  weeks: number[];
  status: 'completed' | 'active' | 'upcoming';
  percentage: number;
}

export function PhaseMap({ phases, currentPhaseIndex }: { phases: Phase[]; currentPhaseIndex: number }) {
  return (
    <div className="mx-5 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        {phases.map((phase, i) => (
          <React.Fragment key={phase.name}>
            {/* Phase node */}
            <div className="flex-1">
              <div className={cn(
                'h-2 rounded-full mb-2 overflow-hidden',
                phase.status === 'upcoming' ? 'bg-gray-800' : 'bg-gray-800'
              )}>
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    phase.status === 'completed' ? 'bg-purple-500' :
                    phase.status === 'active' ? 'bg-purple-500' :
                    'bg-transparent'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${phase.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <p className={cn(
                'text-[11px] font-medium',
                phase.status === 'active' ? 'text-purple-300' :
                phase.status === 'completed' ? 'text-gray-400' :
                'text-gray-600'
              )}>
                {phase.name}
              </p>
            </div>
            
            {/* Connector */}
            {i < phases.length - 1 && (
              <ChevronRight className={cn(
                'w-3 h-3 shrink-0 mt-[-12px]',
                i < currentPhaseIndex ? 'text-purple-500' : 'text-gray-700'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Current phase description */}
      <p className="text-gray-400 text-xs mt-3 leading-relaxed">
        {phases[currentPhaseIndex].description}
      </p>
    </div>
  );
}
4.3 — Enhanced Week Card with Day Dots
React

// src/components/journey/WeekCard.tsx
interface WeekCardProps {
  week: RoadmapWeek;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function WeekCard({ week, isActive, isExpanded, onToggle }: WeekCardProps) {
  return (
    <motion.div
      layout
      className={cn(
        'border rounded-2xl overflow-hidden transition-all',
        isActive 
          ? 'border-purple-500/30 bg-purple-500/5 shadow-lg shadow-purple-500/5' 
          : week.status === 'completed'
          ? 'border-gray-800/40 bg-gray-900/40'
          : 'border-gray-800/20 bg-gray-950/40'
      )}
    >
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">Week {week.number}</span>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
            {week.status === 'completed' && (
              <CheckCircle className="w-4 h-4 text-purple-400" />
            )}
          </div>
          <span className="text-gray-500 text-xs">{week.completedTasks}/{week.totalTasks}</span>
        </div>
        
        <p className="text-gray-400 text-xs mb-3">{week.focus}</p>
        
        {/* Day dots for this week */}
        <div className="flex gap-1">
          {week.days.map(day => (
            <div
              key={day.number}
              className={cn(
                'flex-1 h-1.5 rounded-full',
                day.completed ? 'bg-purple-500' :
                day.skipped ? 'bg-red-400/40' :
                day.isToday ? 'bg-purple-400 animate-pulse' :
                day.isRest ? 'bg-gray-700' :
                'bg-gray-800'
              )}
            />
          ))}
        </div>
      </button>
      
      {/* Expanded task list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-800/30 space-y-1">
              {week.tasks.map(task => (
                <TaskDrillDownRow key={task.id} task={task} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
4.4 — Task Drill-Down (Replaces Library)
React

// src/components/journey/TaskDrillDownRow.tsx
export function TaskDrillDownRow({ task }: { task: CompletedTask }) {
  const [showDetail, setShowDetail] = useState(false);
  
  const typeColors = {
    practice: 'bg-purple-500/15 text-purple-300',
    learning: 'bg-sky-500/15 text-sky-300',
    reflection: 'bg-violet-500/15 text-violet-300',
  };
  
  return (
    <>
      <button
        onClick={() => task.completed && setShowDetail(!showDetail)}
        className={cn(
          'w-full flex items-center gap-3 py-2.5 text-left',
          !task.completed && 'opacity-40'
        )}
      >
        {/* Status indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full shrink-0',
          task.completed ? 'bg-purple-500' :
          task.skipped ? 'bg-red-400/60' :
          task.isToday ? 'bg-purple-400 animate-pulse' :
          'bg-gray-700'
        )} />
        
        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm truncate',
            task.completed ? 'text-gray-200' : 'text-gray-500'
          )}>
            {task.title}
          </p>
        </div>
        
        {/* Metadata */}
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded', typeColors[task.type])}>
          {task.type}
        </span>
        <span className="text-gray-600 text-xs">{task.duration}m</span>
        
        {/* Notes indicator */}
        {task.hasNotes && (
          <MessageSquare className="w-3 h-3 text-purple-400 shrink-0" />
        )}
      </button>
      
      {/* Detail expansion */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-5 pb-3 space-y-2">
              <p className="text-gray-400 text-xs leading-relaxed">{task.description}</p>
              
              {task.feedback && (
                <div className="flex items-center gap-2 text-xs">
                  <span>Felt: {['😫','😕','😐','🙂','🤩'][task.feedback.mood - 1]}</span>
                  {task.feedback.reflection && (
                    <p className="text-gray-500 italic">"{task.feedback.reflection}"</p>
                  )}
                </div>
              )}
              
              {task.notes && task.notes.length > 0 && (
                <div className="bg-gray-800/40 rounded-xl p-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Notes</p>
                  {task.notes.map(note => (
                    <p key={note.id} className="text-gray-300 text-xs">{note.text}</p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
This replaces the entire Library tab. All completed tasks, with their notes, feedback, and metadata, are accessible through the Journey drill-down. Context-rich (you see the task in the week it happened) rather than context-free (a flat list).

4.5 — Upcoming Preview (NEW)
React

// src/components/journey/UpcomingPreview.tsx
export function UpcomingPreview({ nextWeek }: { nextWeek: RoadmapWeek }) {
  return (
    <div className="mx-5 mt-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-indigo-400" />
        <h3 className="text-indigo-300 text-sm font-semibold">Next Week Preview</h3>
      </div>
      
      <p className="text-white text-base font-medium mb-1">
        Week {nextWeek.number}: {nextWeek.focus}
      </p>
      <p className="text-gray-400 text-xs leading-relaxed mb-4">
        {nextWeek.description}
      </p>
      
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-purple-400" />
          <span className="text-gray-400 text-xs">
            {nextWeek.practiceCount} practice
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-sky-400" />
          <span className="text-gray-400 text-xs">
            {nextWeek.learningCount} learning
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3 h-3 text-violet-400" />
          <span className="text-gray-400 text-xs">
            {nextWeek.reflectionCount} reflection
          </span>
        </div>
      </div>
    </div>
  );
}
Phase 5: Profile/Me View + Goals Integration (Week 6-7)
5.1 — Component Architecture
text

src/components/me/
├── MeView.tsx
├── IdentityCard.tsx             // Enhanced — evolving title
├── GoalCard.tsx                 // Absorbed from Goals view
├── ChallengesCard.tsx           // Renamed from "Stones"
├── CommitmentCard.tsx           // NEW
├── PreferencesSection.tsx
├── NotificationSettings.tsx     // NEW — expanded
└── DataSection.tsx              // Export, reset, delete
5.2 — Identity Card with Evolving Title
React

// src/components/me/IdentityCard.tsx
function getEvolvingTitle(goal: string, dayNumber: number, totalDays: number): string {
  const progress = dayNumber / totalDays;
  const domain = extractDomain(goal); // "guitar", "coding", "fitness", etc.
  
  if (progress < 0.15) return `Aspiring ${domain} Student`;
  if (progress < 0.35) return `Developing ${domain} Practitioner`;
  if (progress < 0.60) return `Growing ${domain} Enthusiast`;
  if (progress < 0.85) return `Dedicated ${domain} Builder`;
  return `${domain} Achiever`;
}

export function IdentityCard({ user, goal, stats }: IdentityCardProps) {
  const title = getEvolvingTitle(goal.description, stats.currentDay, stats.totalDays);
  
  return (
    <div className="mx-5 bg-gradient-to-br from-purple-900/60 to-indigo-950/60 
                    border border-purple-500/10 rounded-3xl p-6 text-center">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
        <span className="text-purple-300 text-xl font-bold">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
      
      {/* Name */}
      <h2 className="text-white text-xl font-bold">{user.name}</h2>
      
      {/* Evolving title */}
      <p className="text-purple-300 text-sm mt-1">{title}</p>
      
      {/* Stats strip */}
      <div className="flex justify-center gap-8 mt-5">
        <div className="text-center">
          <p className="text-white text-lg font-bold">{stats.streak}</p>
          <p className="text-gray-500 text-xs">streak</p>
        </div>
        <div className="text-center">
          <p className="text-white text-lg font-bold">{stats.tasksDone}</p>
          <p className="text-gray-500 text-xs">done</p>
        </div>
        <div className="text-center">
          <p className="text-white text-lg font-bold">{formatHours(stats.totalMinutes)}</p>
          <p className="text-gray-500 text-xs">invested</p>
        </div>
      </div>
    </div>
  );
}
Why evolving titles matter: "Aspiring Guitar Student" → "Dedicated Guitar Builder" creates identity-based motivation. The user isn't just checking off tasks — they're becoming someone.

5.3 — Challenges Card (Renamed from Stones)
React

// src/components/me/ChallengesCard.tsx
export function ChallengesCard({ stones }: { stones: BehavioralStone[] }) {
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <h3 className="text-white text-sm font-semibold mb-1">Growth Challenges</h3>
      <p className="text-gray-500 text-xs mb-4">
        These are the patterns your AI coach identified and is actively working around.
      </p>
      
      <div className="space-y-2.5">
        {stones.map(stone => (
          <div key={stone.type} className="flex items-start gap-3">
            <div className={cn(
              'w-2 h-2 rounded-full mt-1.5 shrink-0',
              stone.severity === 'Critical' || stone.severity === 'High' 
                ? 'bg-orange-400' 
                : 'bg-gray-500'
            )} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-gray-200 text-sm font-medium">
                  {STONE_DISPLAY_NAMES[stone.type]}
                </span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  stone.severity === 'Critical' ? 'bg-red-500/15 text-red-300' :
                  stone.severity === 'High' ? 'bg-orange-500/15 text-orange-300' :
                  stone.severity === 'Moderate' ? 'bg-yellow-500/15 text-yellow-300' :
                  'bg-gray-500/15 text-gray-400'
                )}>
                  {SEVERITY_DISPLAY[stone.severity]}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{stone.trigger}</p>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-gray-600 text-[10px] mt-4 italic">
        Your plan is specifically designed to work around these patterns.
      </p>
    </div>
  );
}
5.4 — Commitment Card (NEW)
React

// src/components/me/CommitmentCard.tsx
export function CommitmentCard({ commitment }: { commitment: string }) {
  return (
    <div className="mx-5 mt-4 bg-gray-900/60 border border-gray-800/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-purple-400" />
        <h3 className="text-white text-sm font-semibold">My Commitment</h3>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed italic">
        "{commitment}"
      </p>
      <p className="text-gray-600 text-xs mt-3">
        Written on {formatDate(commitmentDate)}
      </p>
    </div>
  );
}
Generated during onboarding:

TypeScript

// Add to chat onboarding flow — after plan generation
const commitment = await groq('llama-3.1-8b-instant', {
  system: `Generate a first-person commitment statement (2 sentences max) 
           based on the user's goal and preferences. Make it personal and specific.`,
  user: `Goal: ${goal.description}, Time: ${preferences.dailyTime} min/day, 
         Energy: ${preferences.energyPattern}, Wake: ${preferences.wakeTime}`
});

// Example: "I commit to spending 30 minutes every morning before work to practice guitar. 
//           Even on hard days, I'll show up for at least 5 minutes."
5.5 — Notification Settings (Expanded)
React

// src/components/me/NotificationSettings.tsx
const NOTIFICATION_OPTIONS = [
  { 
    id: 'morning_nudge', 
    label: 'Morning Nudge', 
    description: 'Reminder to start your daily task',
    defaultTime: '09:00',
    icon: Sun,
  },
  { 
    id: 'evening_reminder', 
    label: 'Evening Reminder', 
    description: 'Last call if tasks are incomplete',
    defaultTime: '20:00',
    icon: Moon,
  },
  { 
    id: 'streak_warning', 
    label: 'Streak Warning', 
    description: 'Alert when your streak is at risk',
    defaultTime: '21:00',
    icon: AlertTriangle,
  },
  { 
    id: 'weekly_summary', 
    label: 'Weekly Summary', 
    description: 'Your week in review, every Monday',
    defaultTime: '09:00',
    icon: BarChart,
  },
  { 
    id: 'milestone_alerts', 
    label: 'Milestone Alerts', 
    description: 'Celebrate streak and progress milestones',
    defaultTime: null, // event-triggered
    icon: Trophy,
  },
];

export function NotificationSettings() {
  const [settings, setSettings] = useLocalStorage('notification_settings', defaultSettings);
  
  return (
    <div className="space-y-1">
      {NOTIFICATION_OPTIONS.map(option => (
        <div key={option.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800/40 transition-colors">
          <div className="flex items-center gap-3">
            <option.icon className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-gray-200 text-sm">{option.label}</p>
              <p className="text-gray-600 text-xs">{option.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {option.defaultTime && settings[option.id].enabled && (
              <input
                type="time"
                value={settings[option.id].time}
                onChange={e => updateTime(option.id, e.target.value)}
                className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1 border border-gray-700"
              />
            )}
            <Switch
              checked={settings[option.id].enabled}
              onChange={enabled => updateEnabled(option.id, enabled)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
Service Worker integration:

TypeScript

// src/sw.ts — ENHANCE existing
// Add streak warning notification
async function checkStreakRisk() {
  const lastCompletion = await getLastCompletionDate();
  const now = new Date();
  const hoursSinceCompletion = (now.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCompletion > 20 && hoursSinceCompletion < 24) {
    self.registration.showNotification('🔥 Streak at risk!', {
      body: `Your ${currentStreak}-day streak ends at midnight. Just one task to keep it alive.`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'streak-warning',
      actions: [
        { action: 'open', title: 'Open Coheren' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }
}
Phase 6: Cross-Cutting Systems (Week 7-8)
6.1 — Difficulty Feedback Loop (Auto-triggered)
TypeScript

// src/hooks/useDifficultyMonitor.ts — NEW
export function useDifficultyMonitor() {
  const { recentSkips, recentMoods } = useTaskStore();
  
  useEffect(() => {
    // Check for difficulty pattern
    const last5Skips = recentSkips.slice(-5);
    const hardSkips = last5Skips.filter(s => s.reason === 'too_hard').length;
    const lowMoods = recentMoods.slice(-5).filter(m => m <= 2).length;
    
    if (hardSkips >= 3 || lowMoods >= 4) {
      triggerDifficultyPrompt();
    }
  }, [recentSkips, recentMoods]);
}
React

// src/components/shared/DifficultyPrompt.tsx
export function DifficultyPrompt({ onChoice }: { onChoice: (choice: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-gray-800">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Wrench className="w-6 h-6 text-amber-400" />
        </div>
        
        <h3 className="text-white text-lg font-bold text-center mb-2">
          Let's adjust your plan
        </h3>
        <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
          I noticed things have been challenging. That's normal — 
          let me adapt to where you are right now.
        </p>
        
        <div className="space-y-2">
          <button
            onClick={() => onChoice('simplify')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-2xl 
                       py-3.5 text-sm font-semibold transition-colors"
          >
            Simplify this week
          </button>
          <button
            onClick={() => onChoice('extend')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-2xl 
                       py-3.5 text-sm transition-colors"
          >
            Extend my timeline
          </button>
          <button
            onClick={() => onChoice('keep')}
            className="w-full text-gray-500 text-sm py-3 hover:text-gray-400 transition-colors"
          >
            I'm fine, keep going
          </button>
        </div>
      </div>
    </motion.div>
  );
}
Backend handling:

TypeScript

// When user chooses "simplify":
// - Agent 4 re-generates remaining week tasks with lower difficulty
// - Fewer tasks per day, shorter durations, more scaffolding

// When user chooses "extend":  
// - Curriculum Builder adds 1-2 weeks to the timeline
// - Spreads remaining content over more days
// - Show Plan Adjustment Banner on next Today view load
6.2 — Shareable Achievement Cards (NEW)
React

// src/components/shared/ShareableCard.tsx
export function ShareableCard({ milestone }: { milestone: MilestoneData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const generateImage = async () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    // Dark purple gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2e1065');
    gradient.addColorStop(1, '#0f0a1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Milestone text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 ${milestone.streak}-Day Streak`, canvas.width / 2, 120);
    
    // Stats
    ctx.fillStyle = '#a78bfa';
    ctx.font = '16px Inter';
    ctx.fillText(`${milestone.tasksCompleted} tasks · ${milestone.hoursInvested} hours`, canvas.width / 2, 160);
    
    // Goal
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Inter';
    ctx.fillText(`Learning ${milestone.goalDomain}`, canvas.width / 2, 200);
    
    // Branding
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Inter';
    ctx.fillText('coheren.ai', canvas.width / 2, 260);
    
    return canvas.toDataURL('image/png');
  };
  
  const share = async () => {
    const imageUrl = await generateImage();
    
    if (navigator.share) {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], 'coheren-milestone.png', { type: 'image/png' });
      await navigator.share({
        title: `${milestone.streak}-Day Streak on Coheren`,
        text: `I just hit a ${milestone.streak}-day streak learning ${milestone.goalDomain}!`,
        files: [file],
      });
    } else {
      // Fallback: download image
      downloadImage(imageUrl);
    }
    
    analytics.track('milestone_shared', { streak: milestone.streak });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
    >
      <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full">
        {/* Preview */}
        <div className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-2xl p-6 mb-6 text-center">
          <p className="text-3xl mb-2">🔥</p>
          <h3 className="text-white text-xl font-bold">{milestone.streak}-Day Streak</h3>
          <p className="text-purple-300 text-sm mt-1">
            {milestone.tasksCompleted} tasks · {milestone.hoursInvested}h invested
          </p>
          <p className="text-gray-400 text-xs mt-3">coheren.ai</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={share} className="flex-1 bg-purple-600 rounded-2xl py-3 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button onClick={saveImage} className="bg-gray-800 rounded-2xl px-4 py-3">
            <Download className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={dismiss} className="bg-gray-800 rounded-2xl px-4 py-3">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      
      <canvas ref={canvasRef} width={600} height={300} className="hidden" />
    </motion.div>
  );
}
6.3 — In-App Notification Center (NEW)
React

// src/components/shared/NotificationCenter.tsx
interface AppNotification {
  id: string;
  type: 'plan_adjustment' | 'milestone' | 'weekly_summary' | 'coach_insight' | 'system';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const notifications = useNotifications();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-gray-900 border-b border-gray-800 rounded-b-3xl max-h-[60vh] overflow-y-auto"
          >
            <div className="p-5 border-b border-gray-800/50 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
              <h3 className="text-white text-lg font-semibold">Updates</h3>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No updates yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/30">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-4 transition-colors',
                      !notif.read && 'bg-purple-500/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-gray-200 text-sm font-medium">{notif.title}</p>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{notif.body}</p>
                        <p className="text-gray-700 text-[10px] mt-2">{formatRelative(notif.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
6.4 — Offline Support
TypeScript

// src/hooks/useOfflineSync.ts — NEW
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useLocalStorage<PendingAction[]>('offline_queue', []);
  
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Flush pending actions
      for (const action of pendingActions) {
        await syncAction(action);
      }
      setPendingActions([]);
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions]);
  
  const queueAction = (action: PendingAction) => {
    if (isOnline) {
      syncAction(action);
    } else {
      setPendingActions([...pendingActions, action]);
    }
  };
  
  return { isOnline, queueAction, pendingCount: pendingActions.length };
}
React

// src/components/shared/OfflineBanner.tsx
export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineSync();
  
  if (isOnline) return null;
  
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-amber-200 text-xs">
        You're offline. {pendingCount > 0 ? `${pendingCount} actions will sync when connected.` : 'Tasks are cached locally.'}
      </span>
    </div>
  );
}
Phase 7: Polish, Performance & Analytics (Week 8-9)
7.1 — Animation System Overhaul
TypeScript

// src/utils/animations.ts — NEW unified animation config
export const transitions = {
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  springBouncy: { type: 'spring', stiffness: 400, damping: 25 },
  ease: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  slow: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
} as const;

export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  slideUp: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
  stagger: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
} as const;
7.2 — Performance Optimizations
TypeScript

// src/utils/performance.ts — NEW

// 1. Lazy load heavy components
export const FocusSession = lazy(() => import('../components/focus/FocusSession'));
export const ShareableCard = lazy(() => import('../components/shared/ShareableCard'));
export const StreakCalendar = lazy(() => import('../components/progress/StreakCalendar'));

// 2. Debounce note saving
export const debouncedSaveNote = debounce((taskId: string, content: string) => {
  localStorage.setItem(`focus-notes-${taskId}`, JSON.stringify(content));
}, 500);

// 3. Memoize expensive computations
export const useComputedStats = () => {
  const tasks = useTaskStore(state => state.allTasks);
  
  return useMemo(() => ({
    totalCompleted: tasks.filter(t => t.completed).length,
    completionRate: tasks.length > 0 ? tasks.filter(t => t.completed).length / tasks.length : 0,
    streakDays: calculateStreak(tasks),
    totalMinutes: tasks.filter(t => t.completed).reduce((sum, t) => sum + t.duration, 0),
    byType: {
      practice: tasks.filter(t => t.type === 'practice' && t.completed).length,
      learning: tasks.filter(t => t.type === 'learning' && t.completed).length,
      reflection: tasks.filter(t => t.type === 'reflection' && t.completed).length,
    },
  }), [tasks]);
};

// 4. Virtual list for long task lists in Journey
export const VirtualTaskList = ({ tasks }: { tasks: Task[] }) => {
  // Use @tanstack/react-virtual for lists > 50 items
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
  });
  
  // ... render virtual rows
};
7.3 — Analytics Enhancement
TypeScript

// src/lib/analytics.ts — ENHANCE existing
export const analyticsEvents = {
  // Existing events...
  
  // NEW behavioral events
  'focus_session_started': { taskId: string; taskType: string; dayNumber: number },
  'focus_session_completed': { taskId: string; duration: number; mood: number; hasReflection: boolean },
  'focus_session_abandoned': { taskId: string; duration: number; reason?: string },
  'difficulty_prompt_shown': { triggerType: 'hard_skips' | 'low_moods'; count: number },
  'difficulty_choice_made': { choice: 'simplify' | 'extend' | 'keep' },
  'milestone_shared': { milestone: string; platform?: string },
  'notification_permission': { granted: boolean },
  'streak_warning_shown': { currentStreak: number },
  'plan_adjustment_shown': { adjustmentType: string },
  'onboarding_step_completed': { step: string; totalComplete: number },
  'weekly_summary_viewed': { weekNumber: number },
  'coach_insight_shown': { insightType: string },
  'offline_action_queued': { actionType: string },
  'tab_time_spent': { tab: string; seconds: number },
} as const;
7.4 — Error Boundaries & Loading States
React

// src/components/shared/ViewErrorBoundary.tsx
export function ViewErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <h3 className="text-white text-lg font-semibold mb-1">Something went wrong</h3>
          <p className="text-gray-500 text-sm mb-4">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="bg-purple-600 rounded-xl px-6 py-2.5 text-white text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// src/components/shared/ViewSkeleton.tsx
export function ViewSkeleton({ type }: { type: 'today' | 'progress' | 'journey' | 'me' }) {
  return (
    <div className="animate-pulse p-5 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-3 w-20 bg-gray-800 rounded" />
          <div className="h-6 w-32 bg-gray-800 rounded mt-2" />
        </div>
        <div className="h-6 w-14 bg-gray-800 rounded-full" />
      </div>
      
      {/* Content skeletons vary by type */}
      {type === 'today' && (
        <>
          <div className="h-2 w-full bg-gray-800 rounded mt-4 flex gap-1.5">
            {[...Array(7)].map((_, i) => <div key={i} className="flex-1 h-2 bg-gray-800 rounded-full" />)}
          </div>
          <div className="h-48 bg-gray-800/60 rounded-3xl mt-4" />
        </>
      )}
      {/* ... other type skeletons */}
    </div>
  );
}
Phase 8: Pre-Launch (Week 9-10)
8.1 — PWA Enhancement
TypeScript

// src/pwa/manifest.ts — ENHANCE
export const manifest = {
  name: 'Coheren — AI Habit Coach',
  short_name: 'Coheren',
  description: 'Think less. Do more. AI-powered behavioral habit coaching.',
  start_url: '/',
  display: 'standalone',
  background_color: '#0a0a0f',
  theme_color: '#7c3aed',
  orientation: 'portrait',
  categories: ['productivity', 'health', 'education'],
  
  icons: [
    { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
    { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
    { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
    { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
    { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  
  // App shortcuts
  shortcuts: [
    {
      name: 'Start Today\'s Task',
      short_name: 'Do',
      url: '/today?action=focus',
      icons: [{ src: '/icons/shortcut-do.png', sizes: '96x96' }],
    },
    {
      name: 'View Progress',
      short_name: 'Progress',
      url: '/progress',
      icons: [{ src: '/icons/shortcut-progress.png', sizes: '96x96' }],
    },
  ],
};
8.2 — SEO & Meta Tags
React

// src/components/seo/MetaTags.tsx — NEW
export function MetaTags() {
  return (
    <Helmet>
      <title>Coheren — AI-Powered Habit Coach</title>
      <meta name="description" content="Tell Coheren your goal. Get a personalized daily roadmap adapted to your behavioral patterns. Think less. Do more." />
      
      {/* Open Graph */}
      <meta property="og:title" content="Coheren — Think Less. Do More." />
      <meta property="og:description" content="AI-powered behavioral habit coaching. One goal. One daily task. Adapted to you." />
      <meta property="og:image" content="https://coheren.ai/og-image.png" />
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Coheren — AI Habit Coach" />
      <meta name="twitter:description" content="Tell it your goal. Get a daily roadmap. Adapted to your behavioral patterns." />
      <meta name="twitter:image" content="https://coheren.ai/twitter-card.png" />
      
      {/* PWA */}
      <meta name="theme-color" content="#7c3aed" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Coheren",
          "applicationCategory": "ProductivityApplication",
          "operatingSystem": "Web",
          "description": "AI-powered behavioral habit coaching",
          "offers": { "@type": "Offer", "price": "0" },
        })}
      </script>
    </Helmet>
  );
}
8.3 — Landing Page Improvement
React

// src/pages/LandingPage.tsx — Key sections

// Hero Section
<section className="min-h-screen flex items-center justify-center px-6 text-center">
  <div>
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-5xl md:text-7xl font-bold text-white leading-tight"
    >
      Think less.<br />
      <span className="text-purple-400">Do more.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-gray-400 text-lg md:text-xl mt-6 max-w-xl mx-auto leading-relaxed"
    >
      Tell Coheren your goal. Our AI analyzes your behavioral patterns, 
      builds a personalized roadmap, and gives you exactly one thing to 
      do each day.
    </motion.p>
    
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-8 flex gap-4 justify-center"
    >
      <button className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl px-8 py-4 text-lg font-semibold transition-colors">
        Start Free
      </button>
      <button className="bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-2xl px-8 py-4 text-lg transition-colors">
        See How It Works
      </button>
    </motion.div>
  </div>
</section>

// How It Works Section
<section className="py-24 px-6">
  <h2 className="text-3xl font-bold text-white text-center mb-16">
    3 Steps. Zero Overwhelm.
  </h2>
  
  <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
    {[
      {
        step: '01',
        title: 'Describe your goal',
        description: 'Tell us what you want to achieve. "Learn guitar" or "Build a side business" — plain language.',
        icon: MessageCircle,
      },
      {
        step: '02',
        title: 'AI builds your roadmap',
        description: '5 AI agents analyze your behavioral patterns and create a personalized daily plan.',
        icon: Brain,
      },
      {
        step: '03',
        title: 'One task a day',
        description: 'Every day, you get exactly one task. Complete it. The system adapts. You grow.',
        icon: Target,
      },
    ].map(item => (
      <div key={item.step} className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
          <item.icon className="w-8 h-8 text-purple-400" />
        </div>
        <span className="text-purple-500 text-sm font-mono">{item.step}</span>
        <h3 className="text-white text-xl font-semibold mt-2 mb-2">{item.title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
      </div>
    ))}
  </div>
</section>

// Differentiator Section
<section className="py-24 px-6 bg-gray-950/50">
  <h2 className="text-3xl font-bold text-white text-center mb-4">
    Not another todo app.
  </h2>
  <p className="text-gray-400 text-center mb-16 max-w-lg mx-auto">
    Coheren doesn't just track habits. It understands why you struggle 
    and designs around your specific patterns.
  </p>
  
  <div className="max-w-3xl mx-auto space-y-4">
    {[
      { 
        pattern: 'Procrastination', 
        solution: 'Tasks start with action, not reading. No standalone study sessions until momentum builds.' 
      },
      { 
        pattern: 'Fear of Failure', 
        solution: 'Private practice only in Phase 1. Public-facing tasks introduced gradually in Phase 3.' 
      },
      { 
        pattern: 'Perfectionism', 
        solution: 'Timed tasks with "good enough" criteria. Reflection prompts reframe progress over perfection.' 
      },
      { 
        pattern: 'Time Constraints', 
        solution: '5-minute micro-tasks on busy days. Full sessions when you have bandwidth.' 
      },
    ].map(item => (
      <div key={item.pattern} className="flex items-start gap-4 bg-gray-900/60 border border-gray-800/30 rounded-2xl p-5">
        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
        <div>
          <span className="text-purple-300 text-sm font-semibold">{item.pattern}?</span>
          <p className="text-gray-400 text-sm mt-1">{item.solution}</p>
        </div>
      </div>
    ))}
  </div>
</section>
8.4 — Testing Checklist
TypeScript

// Pre-launch testing matrix

const LAUNCH_TESTS = {
  functional: [
    'New user signup → chat onboarding → plan generation → dashboard',
    'Complete all tasks in a day → All Done state',
    'Skip task → reason picker → feedback saved',
    'Focus Session → video plays → notes save → timer works → completion flow',
    'Miss 3 days → re-engagement banner shows',
    'Hit 7-day streak → milestone banner shows',
    'Week boundary → week recap shows',
    'Difficulty pattern → adjustment prompt triggers',
    'Offline → actions queue → sync on reconnect',
    'Auto day advance at midnight',
    'Notification permissions → push notifications fire',
    'Share milestone → generates image → share sheet opens',
  ],
  
  responsive: [
    'iPhone SE (375px) — all views fit, no horizontal scroll',
    'iPhone 14 Pro (393px) — safe area insets correct',
    'iPhone 14 Pro Max (430px) — layout scales properly',
    'iPad (768px) — switches to tablet layout',
    'Desktop (1440px) — sidebar navigation, full layouts',
    'Ultra-wide (2560px) — content doesn't stretch',
  ],
  
  performance: [
    'LCP < 2.5s on 3G connection',
    'FID < 100ms',
    'CLS < 0.1',
    'Bundle size < 300KB gzipped',
    'Service worker caches critical assets',
    'Images lazy-loaded',
    'Framer Motion animations at 60fps on mid-range Android',
  ],
  
  accessibility: [
    'All interactive elements have focus rings',
    'Color contrast ratio ≥ 4.5:1 for text',
    'Screen reader announces page changes',
    'Keyboard navigation works for all flows',
    'Reduced motion preference respected',
    'Touch targets ≥ 44px',
  ],
  
  edge_cases: [
    'User with 0 tasks (no plan yet)',
    'User with 300+ completed tasks (performance)',
    'User who skips every task for a week',
    'User who completes everything instantly',
    'Long goal text (200+ characters)',
    'No internet on first load',
    'Auth token expired mid-session',
    'Supabase rate limit hit',
    'Groq API timeout',
    'Multiple rapid task completions',
  ],
};
Phase 9: Launch (Week 10)
9.1 — Launch Checklist
Markdown

## Infrastructure
- [ ] Supabase project moved from local Docker to Supabase Cloud
- [ ] Custom domain configured (coheren.ai)
- [ ] SSL certificate active
- [ ] Environment variables set in production
- [ ] Groq API key with production rate limits
- [ ] Jina API key with production limits
- [ ] PostHog production project created
- [ ] Error monitoring (Sentry) configured
- [ ] Database backups automated (daily)
- [ ] RLS policies verified in production

## Performance
- [ ] Lighthouse score ≥ 90 on all categories
- [ ] Bundle analyzed — no unused dependencies
- [ ] Images optimized (WebP with PNG fallback)
- [ ] Critical CSS inlined
- [ ] Service worker verified in production
- [ ] CDN configured for static assets

## Content
- [ ] Landing page copy finalized
- [ ] OG image designed and uploaded
- [ ] App icons in all required sizes
- [ ] Favicon set (multiple formats)
- [ ] 404 page designed
- [ ] Privacy policy page
- [ ] Terms of service page

## Monitoring
- [ ] Uptime monitoring (Uptime Robot / Better Uptime)
- [ ] Error alerting (Sentry → Slack/Discord)
- [ ] Analytics dashboard (PostHog) with key funnels:
  - Landing → Signup conversion
  - Signup → Onboarding completion
  - Onboarding → First task completion
  - Day 1 → Day 7 retention
  - Day 7 → Day 30 retention

## Marketing
- [ ] Product Hunt launch page prepared
- [ ] Twitter/X launch thread drafted
- [ ] r/SideProject post drafted
- [ ] Hacker News Show HN post drafted
- [ ] Demo video recorded (60 seconds)
- [ ] 5 beta users have tested and given feedback
9.2 — Post-Launch Monitoring Dashboard
TypeScript

// Key metrics to track in PostHog

const LAUNCH_METRICS = {
  acquisition: {
    'daily_signups': 'Count of new users per day',
    'signup_source': 'Where users come from (referrer)',
    'landing_to_signup_rate': 'Conversion from landing page to account creation',
  },
  
  activation: {
    'onboarding_completion_rate': '% of signups that complete AI chat + get a plan',
    'time_to_first_task': 'Minutes between signup and first task completion',
    'first_day_completion': '% of new users who complete Day 1',
  },
  
  retention: {
    'day_1_retention': '% of users active on day 2',
    'day_7_retention': '% of users active on day 7',
    'day_30_retention': '% of users active on day 30',
    'streak_distribution': 'Histogram of streak lengths',
  },
  
  engagement: {
    'daily_active_users': 'Unique users per day',
    'tasks_completed_per_day': 'Total across all users',
    'focus_session_duration': 'Average time in Focus Sessions',
    'skip_rate': '% of tasks skipped vs completed',
    'skip_reason_distribution': 'Which reasons dominate',
    'mood_distribution': 'Average mood ratings over time',
    'notes_written': 'How many users write notes',
  },
  
  ai_system: {
    'plan_generation_time': 'Seconds for full onboarding pipeline',
    'recalibration_triggers': 'How often 14-day 
Complete Phase Timeline
text

PHASE 0 — Foundation Fixes          Week 1-2     
Arena | Benchmark & Compare the Best AI Models