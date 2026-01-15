# Coheren - AI-Powered Goal Coaching Platform

## Overview

Coheren is an AI-powered personal goal coaching application designed to help users achieve their objectives through structured, personalized roadmaps and daily task management. The platform uses artificial intelligence to create customized learning paths and track progress over time.

**Tagline:** *Think less. Do more.*

## Core Philosophy

Coheren follows a "Focused Clarity" design philosophy, emphasizing:
- Clean, distraction-free interfaces
- Intelligent task prioritization
- Consistent daily engagement
- Data-driven progress tracking

## Key Features

### 1. Intelligent Onboarding & Roadmap Generation

**Conversational Chat Interface**
- Interactive AI chat that learns about your goals
- Natural language processing to understand objectives
- Personalized question flow to gather user context

**AI-Generated Roadmaps**
- Custom learning/achievement plans based on your goals
- Duration-based planning (months)
- Phase-based curriculum breakdown
- Strategic planning with weekly targets
- Adaptive scheduling based on daily time commitment

### 2. Daily Task Management (Today View)

**Smart Task Presentation**
- Daily task cards with clear objectives
- Progress tracking per task
- Visual completion states

**Gamified Completion Experience**
- Magic vanish animation when tasks are completed
- Star particle effects that flow to progress card
- Real-time progress bar updates
- Celebration animations for daily completion
- "Advance to next day" functionality

**Progress Tracking**
- Real-time completion percentage
- Tasks completed counter
- Visual progress indicators

### 3. Comprehensive Progress Analytics

**Streak Tracking**
- Current streak counter with flame icon
- Visual emphasis on consistency

**Multi-Level Statistics**
- Overall completion percentage
- Weekly completion metrics
- Current day tracking
- Week-by-week progress visualization

**Progress by Week**
- Detailed breakdown of each week's tasks
- Completion percentage per week
- Visual progress bars with current week highlighting

### 4. Goals & Roadmap Management

**Goal Overview**
- Capitalized goal title with icon
- Timeline visualization (Start Date → Target Date)
- Overall progress percentage
- Duration and daily time commitment display

**Learning Phases**
- Phase-based curriculum breakdown
- Week range for each phase
- Phase descriptions
- Status indicators (pending, active, completed)
- Current phase highlighting
- Visual progress through phases

### 5. User Profile & Settings

**Profile Information**
- User name display
- Current goal tracking
- Energy pattern preferences (Morning/Afternoon/Evening)
- Daily time commitment
- Journey duration

**Settings Management**
- Name editing (inline)
- Daily check-in time configuration (inline editing)
- Energy pattern display
- Daily commitment display
- Notifications preferences
- Appearance settings (theme toggle)
- Compact card-based layout for easy scanning

### 6. Personalization System

**Universal Profile**
- Energy levels and preferred work times
- Learning style preferences
- Daily availability
- Goal specificity

**Adaptive Scheduling**
- Check-in time customization
- Daily reminder system
- Time-based task distribution

## Technical Features

### Design System

**Premium UI/UX**
- Muted indigo color palette (#4338CA primary)
- Consistent spacing tokens
- Typography hierarchy
- Card-based component system
- Shadows and depth
- Responsive grid layouts

**Animations & Interactions**
- Smooth transitions
- Particle systems
- Pulse effects
- Magic vanish animations
- Progress animations
- Loading animations with branded elements

**Brand Identity**
- Custom logo integration
- Loading animation with connected dots and arrows
- Consistent visual language throughout

### State Management
- Zustand for global state
- Persistent storage
- Real-time updates
- Task tracking
- Progress calculations

### Data Structures

**Roadmap Schema**
- Title and description
- Start/end dates
- Duration in months
- Daily time commitment
- Phases with weekly breakdown
- Strategic planning components

**Task Schema**
- Daily assignments
- Completion tracking
- Day numbering
- Task descriptions

**Progress Tracking**
- Current day counter
- Streak management
- Completion percentages
- Historical data

## User Journey

1. **Onboarding**
   - Land on welcome page with logo and tagline
   - Engage with AI chat to discuss goals
   - Provide context (energy patterns, time availability, learning style)
   - Receive AI-generated personalized roadmap

2. **Daily Engagement**
   - Check in at preferred time
   - View today's tasks
   - Complete tasks with satisfying animations
   - Track progress in real-time
   - Advance to next day when complete

3. **Progress Monitoring**
   - Review weekly completion rates
   - Track overall journey progress
   - Monitor streak maintenance
   - View phase progression

4. **Goal Management**
   - Review roadmap phases
   - Understand current position in journey
   - See timeline and milestones
   - Track towards target completion date

5. **Customization**
   - Adjust check-in times
   - Update personal preferences
   - Manage notifications
   - Switch appearance themes

## Views & Navigation

### Main Views

1. **Today** - Daily task management and completion
2. **Progress** - Analytics and statistics dashboard
3. **Goals** - Roadmap overview and phase tracking
4. **Profile** - User information display
5. **Settings** - Preferences and configuration

### Navigation
- Sidebar navigation with view switching
- Branded header with logo
- Clean, minimal interface
- Easy access to all sections

## Value Proposition

**For Users:**
- Eliminates decision fatigue with daily task clarity
- Maintains motivation through gamification and streaks
- Provides structured path to achievement
- Tracks progress comprehensively
- Adapts to personal schedules and preferences

**Differentiation:**
- AI-powered personalization
- Beautiful, premium UI/UX
- Focus on consistency over intensity
- Comprehensive progress tracking
- Gamified completion experience

## Technology Stack

- **Frontend:** React with TypeScript
- **State Management:** Zustand
- **Styling:** Inline styles with design tokens
- **Icons:** Lucide React
- **AI Integration:** OpenAI API for roadmap generation
- **Animations:** CSS keyframes and transitions

## Future Enhancement Opportunities

Based on current structure:
- Mobile responsiveness optimization
- Social features (sharing progress)
- Multiple goal tracking
- Advanced analytics and insights
- Export progress reports
- Integration with calendar apps
- Habit tracking expansion
- Community features
- Coach matching
- Achievement badges system

---

**Coheren** - Your AI-powered companion for achieving meaningful goals through focused, consistent action.
