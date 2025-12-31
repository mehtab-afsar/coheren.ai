# CONSIST - AI-Powered Consistency & Habit Formation App

Your everyday ally for building consistency in anything.

## Overview

CONSIST is a minimalist web app that helps users build consistency through AI-powered personalized roadmaps. Instead of forcing users to plan, CONSIST learns about them and creates adaptive micro-tasks that minimize cognitive load.

## Features Implemented (MVP)

### Complete Onboarding Flow
1. **Welcome Screen** - Introduction to CONSIST
2. **Goal Selection** - Choose from 6 categories (Fitness, Exam, Hobby, Learning, Habit, Creative)
3. **Specific Goal Input** - Curated suggestions or custom goals
4. **Universal Questions** - 5 essential questions asked once for all goals
5. **Category-Specific Questions** - 3-5 targeted questions per category
6. **Roadmap Generation** - AI-powered personalized plan with phases
7. **Check-in Setup** - Choose daily reminder time
8. **Dashboard** - View today's tasks, streak, and progress
9. **Settings** - View/manage profile and roadmap details

## Getting Started

### Installation
\`\`\`bash
cd consist
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:5173 in your browser.

### Build
\`\`\`bash
npm run build
\`\`\`

## Tech Stack

- React 18 + TypeScript
- Vite
- Zustand (state management with persist)
- Lucide React (icons)
- Inter font (Google Fonts)
- Inline styles (minimalist design)

## User Flow

**Onboarding (5 minutes):**
- Step 0: Welcome
- Step 1: Select goal category
- Step 2: Enter specific goal
- Step 3: Answer 5 universal questions
- Step 4: Answer 3-5 category questions
- Step 5: View generated roadmap
- Step 6: Set check-in time

**Daily Use:**
- Step 7: Dashboard (tasks, streak, progress)
- Step 8: Settings (profile, roadmap)

## Project Structure

\`\`\`
consist/
├── src/
│   ├── pages/           # 9 screens
│   ├── store/           # Zustand store
│   ├── types/           # TypeScript types
│   └── App.tsx
├── package.json
└── README.md
\`\`\`

## Philosophy

> "Stop planning. Start doing."

- Minimal questions (8-14 total)
- Smart defaults (infer 80% from behavior)
- Atomic micro-tasks (one action each)
- Personalized roadmaps
- Zero cognitive load

---

**Version**: 1.0.0 (MVP)
