# Coheren.ai - Project Summary

## What is Coheren?

**Coheren** is an AI-powered goal achievement platform that creates personalized 90-day roadmaps for any goal. Unlike traditional todo apps, Coheren uses a multi-agent AI system to understand your goal, context, and constraints—then generates a science-backed, day-by-day action plan tailored specifically to you.

**Core Value Proposition:** Transform vague goals into structured, achievable daily tasks with AI coaching.

---

## What We've Built

### ✅ Landing Page
- Hero section with animated gradient
- Feature showcase
- **Horizontal sticky scroll roadmap preview** (Daily Check-in → Track Progress → Celebrate Wins)
- Social proof and testimonials section
- Responsive design

### ✅ Multi-Agent Curriculum Generation System
A sophisticated 4-agent architecture for universal goal planning:

**Agent 1: Goal Analyzer**
- Analyzes any goal (boxing, guitar, UPSC, meditation, etc.)
- Extracts goal type, domain, complexity, milestones
- Identifies prerequisites and common obstacles

**Agent 2: Stone Identifier**
- Generates 5-8 personalized questions based on the goal
- Questions determine training environment, fitness level, resources, motivation, etc.
- Each answer has impact data that shapes the curriculum

**Agent 3: Curriculum Builder**
- Creates 90-day roadmap with 3-4 phases
- Uses pedagogical principles (scaffolding, progressive overload, spacing effect)
- Adapts structure based on stone answers
- Includes review moments and rest days

**Agent 4: Task Generator**
- Writes specific, actionable daily tasks
- Step-by-step instructions with durations
- Includes tips, success criteria, and motivational context
- Tasks adapt to user's resources and limitations

### ✅ Onboarding Flow
**3-Phase Process:**
1. **Conversation** - Chat-based collection of goal, name, skill level, timeline, daily time
2. **Stone Questions** - Beautiful UI for answering personalized questions
3. **Plan Generation** - AI creates roadmap and first day's tasks

### ✅ Stone Questions Component
- Progress bar with question counter
- Multiple choice with impact previews
- Back navigation support
- Importance badges (critical/high/medium)

### ✅ Integration
- Agents integrated into ChatOnboarding
- Fallback to old system if agents fail
- Backend sync (optional - works offline)
- Type-safe TypeScript throughout

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **AI:** Groq (Llama 3.3 70B), Multi-agent architecture
- **State:** Zustand
- **Styling:** Design system with tokens
- **Animation:** Framer Motion
- **Backend:** Supabase (optional, offline-first)

---

## File Structure

```
src/
├── agents/
│   ├── agent1-goal-analyzer.ts
│   ├── agent2-stone-identifier.ts
│   ├── agent3-curriculum-builder.ts
│   ├── agent4-task-generator.ts
│   ├── orchestrator.ts
│   └── README.md
├── components/
│   ├── StoneQuestions.tsx
│   └── LoadingAnimation.tsx
├── pages/
│   ├── LandingPage.tsx
│   └── ChatOnboarding.tsx
├── types/
│   └── agents.ts
└── design-system/
```

---

## What Needs to Be Done

### 🔨 High Priority

1. **Test Agent Flow End-to-End**
   - Test with different goals (boxing, guitar, UPSC, cooking)
   - Verify stone questions adapt per goal
   - Confirm roadmap quality and task specificity

2. **Backend Server Setup**
   - Start backend API (currently getting connection refused)
   - Or confirm offline-mode works completely
   - Test data persistence

3. **Error Handling**
   - Add error boundaries
   - Better fallback UI if agents fail
   - Retry logic for API calls

4. **Stone Question Improvements**
   - Add open-ended text input support
   - Add yes/no question type
   - Add follow-up question logic

### 🎨 Medium Priority

5. **UI/UX Polish**
   - Loading states during agent calls
   - Skeleton screens
   - Better progress indicators
   - Mobile responsiveness check

6. **Agent System Optimization**
   - Cache Agent 1 & 2 outputs per goal type
   - Pre-generate first week of tasks
   - Rate limiting for Groq API
   - Cost optimization (consider model selection per agent)

7. **Roadmap Display**
   - Show full 90-day roadmap view
   - Phase breakdown visualization
   - Week-by-week preview
   - Edit/regenerate options

### 🚀 Low Priority / Future

8. **Advanced Features**
   - Save and load stone answers
   - A/B test different roadmaps
   - Community-shared roadmaps
   - Integration with calendar apps

9. **Analytics & Monitoring**
   - Track agent performance
   - Monitor task completion rates
   - User feedback loop
   - Error tracking (Sentry)

10. **Documentation**
    - User guide for onboarding
    - API documentation
    - Deployment guide
    - Contributing guidelines

---

## Current Status

✅ **Landing Page:** Complete with sticky scroll
✅ **Agent System:** Built and integrated
✅ **Onboarding:** 3-phase flow working
⚠️ **Backend:** Not running (optional)
🧪 **Testing:** Needs end-to-end testing

**Next Immediate Step:** Test the agent flow with a real goal or fix backend connection.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Access app
http://localhost:3000
```

**To test agent system:**
1. Navigate to onboarding
2. Chat with AI (provide goal, name, skill level, timeline)
3. Answer personalized stone questions
4. Receive AI-generated 90-day roadmap

---

## Key Innovation

The **multi-agent architecture** makes Coheren universal. The same 4 agents work for:
- Physical skills (boxing, swimming)
- Creative pursuits (guitar, painting)
- Knowledge acquisition (UPSC, coding)
- Habit formation (meditation, reading)
- ANY goal a user can imagine

This is the competitive moat—personalized, science-backed roadmaps at scale.
