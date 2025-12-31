# CONSIST: AI-Powered Consistency & Habit Formation App
## Product Requirements & Technical Architecture

---

## 🎯 Vision

**CONSIST** is your everyday ally for building consistency in anything - learning boxing, preparing for UPSC, mastering cooking, building reading habits, writing a book, or starting a podcast. The core philosophy: **minimize cognitive load, maximize action**.

Instead of forcing users to plan and think, CONSIST learns about them deeply and creates personalized, adaptive roadmaps that break down any goal into micro-tasks requiring zero mental overhead.

---

## 🧠 Core Psychological Principles

### 1. **Cognitive Load Minimization**
- Users shouldn't spend energy *planning* - they should spend it *doing*
- Break complex goals into atomic micro-tasks ("walk fast for 10 min" vs "get fit")
- Each task requires minimal decision-making: just follow what the AI says

### 2. **Habit Formation Science**
- **66-day average** to form habits (varies 18-254 days based on complexity)
- Use **Habit Loop**: Cue → Craving → Response → Reward
- **Implementation intentions**: specific "when, where, how" plans increase success 2-3x
- **Spaced repetition**: revisit critical behaviors at increasing intervals to strengthen neural pathways

### 3. **Personalization Over Templates**
- No generic advice: AI learns WHO you are first
- Understands your constraints (time, resources, body, schedule)
- Adapts timeline based on YOUR pace, not average pace
- Respects your energy levels and existing commitments

### 4. **Progressive Disclosure**
- Start with simple questions during onboarding
- Build detailed user profile incrementally through natural conversation
- Avoid overwhelming forms - chat feels warm and engaging

---

## 🏗️ System Architecture

### **Platform Strategy**
Given your requirements (local-first, both mobile & web, solo developer, MVP focus):

**Phase 1 (MVP): Progressive Web App (PWA)**
- Fast to build, works on all devices
- Can be installed on mobile home screens
- Easier to iterate and debug
- Lower complexity for solo developer

**Phase 2: React Native Mobile App**
- Better native performance
- Push notifications more reliable
- Deeper OS integration
- Reuse business logic from PWA

### **Technology Stack**

#### **Frontend**
- **Framework**: React + Vite (PWA) → React Native (mobile)
- **UI Library**: Tailwind CSS (PWA) / React Native Paper (mobile)
- **State Management**: Zustand (lightweight, simple)
- **Animations**: Framer Motion (PWA) / React Native Reanimated (mobile)

#### **AI Layer (Hybrid Local-First)**
This is the critical architectural decision. Given local-first requirement but need for powerful AI:

**On-Device AI (for privacy & offline capability)**
- **Web**: WebLLM with Phi-3-mini (3B parameters, 4-bit quantized)
  - Runs in browser using WebGPU
  - ~2GB model size
  - Fast responses for routine tasks
  - 100% private, no API costs

- **Mobile**: MLC-LLM or llama.cpp
  - Optimized for mobile NPUs (Neural Processing Units)
  - Sub-50ms response time for simple queries
  - Works completely offline

**Cloud Fallback (for complex reasoning)**
- Use cloud LLM (GPT-4, Claude, or Gemini) when:
  - User explicitly requests "detailed replanning"
  - On-device model confidence is low
  - Complex multi-step reasoning needed (e.g., creating 6-month roadmap)
- User must explicitly consent to cloud usage
- Only send minimal, anonymized context

**Why Hybrid?**
- On-device handles 80% of interactions (daily check-ins, progress logging, simple questions)
- Cloud handles 20% (initial goal decomposition, major re-planning)
- Balances privacy, cost, and capability

#### **Local Storage (Fully Local-First)**
- **Web**: IndexedDB with Dexie.js wrapper
  - Store all user data, conversation history, roadmaps locally
  - Fast queries with indexes
  - Supports complex JSON objects

- **Mobile**: SQLite with WatermelonDB
  - Native performance
  - Reactive queries
  - Offline-first by design

- **Vector Database**: ChromaDB (for semantic search)
  - Find similar goals/tasks from past conversations
  - Enable AI to learn from user's history
  - All embeddings stored locally

#### **Notifications**
- **Web**: Service Workers + Push API
- **Mobile**: Local notifications (no external service needed)
- **Scheduling**: Background tasks for daily check-ins at user's preferred time

---

## 🎯 Goal Categories (Universal Framework)

CONSIST uses **broad categories** that cover all possible goals:

1. **Fitness** → Examples: boxing, running, yoga, weightlifting, swimming
2. **Exam** → Examples: UPSC, GMAT, bar exam, medical licensing, coding interviews
3. **Hobby** → Examples: cooking, guitar, painting, photography, gardening
4. **Learning** → Examples: languages, programming, writing, public speaking
5. **Habit** → Examples: reading daily, journaling, meditation, sleep routine
6. **Creative** → Examples: write a book, start podcast, YouTube channel

**User Flow**:
- User selects category (Fitness)
- Then narrows down (Boxing)
- AI uses category-specific questioning framework

---

## 🧠 The Minimal Data Problem: What Questions to Ask?

**THE CHALLENGE**: We need enough data to personalize effectively, but asking 50 questions kills motivation.

### **Solution: Progressive Profiling with Smart Defaults**

#### **Principle 1: Ask only what CHANGES the plan**
Don't ask questions whose answers won't materially affect the roadmap.

#### **Principle 2: Category-Specific Core Questions**
Each category has **3-5 mandatory questions** + **inferred data** from behavior.

#### **Principle 3: Assume Defaults, Correct Later**
Start with reasonable assumptions. Let AI adapt based on task completion patterns.

---

## 📊 Data Architecture

### **Universal User Profile (Category-Agnostic)**

These questions apply to ALL goals - asked ONCE, reused forever:

```json
{
  "userId": "uuid-v4",
  "createdAt": "2025-12-31T10:00:00Z",

  // UNIVERSAL DATA (asked once, applies to all goals)
  "universal": {
    "name": "Mehtab",
    "dailyRoutine": {
      "wakeTime": "06:00",
      "sleepTime": "23:00",
      "workHours": "10:00-19:00",
      "freeTimeSlots": [
        {"start": "06:00", "end": "09:30", "type": "morning"},
        {"start": "19:30", "end": "22:30", "type": "evening"}
      ]
    },
    "energyPattern": "morning_person", // inferred or asked once
    "weekendAvailability": "flexible" // more time on weekends?
  }
}
```

**Questions for Universal Profile (5 questions max, asked ONCE)**:
1. "What's your name?"
2. "What time do you usually wake up and sleep?"
3. "What hours do you work?" (AI infers free time slots)
4. "When do you feel most energized - mornings, afternoons, or evenings?"
5. "Do you have more free time on weekends?"

**Result**: 80% of users answer these in 2 minutes.

---

### **Category-Specific Profiles**

Each category has **ONLY 3-5 critical questions**. Everything else is inferred or assumed.

---

#### **CATEGORY 1: FITNESS**
Examples: Boxing, Running, Yoga, Weightlifting, Swimming

**Critical Questions (3-5 only)**:
1. "What's your current fitness level?"
   - Options: Beginner (can't jog 10 min), Intermediate (can jog 20+ min), Advanced (regular athlete)
   - **Why it matters**: Determines starting intensity

2. "Do you have any injuries or physical limitations?"
   - **Why it matters**: Safety-critical, affects exercise selection

3. "What equipment/spaces do you have access to?"
   - Options: Just outdoor space, Gym membership, Home equipment, None
   - **Why it matters**: Determines what exercises are possible

**Smart Defaults (NO questions asked)**:
- Age: Assume 25-35 unless fitness level suggests otherwise
- Weight/height: Don't ask! Adjust intensity based on task completion speed
- Diet: Don't ask initially! Only relevant for advanced goals (bodybuilding)
- Medical conditions: Assume none unless user volunteers

**Inferred from Behavior**:
- Actual fitness level: How fast they complete cardio tasks
- Preferred workout time: When they actually complete tasks
- Progression rate: How quickly they master skills

**Example Conversation**:
```
AI: Boxing! Love it. Quick question: if you had to jog for 10 minutes right now, how would that feel?
User: I can do that, I jog sometimes
AI: [Infers: Intermediate fitness level]

AI: Got it. Any injuries or physical stuff I should know about?
User: Nope, all good
AI: [Infers: No limitations]

AI: Do you have a gym membership, or will you be training at home/outdoors?
User: I have a gym membership
AI: [Infers: Has access to equipment]

AI: Perfect! Give me 30 seconds to build your boxing roadmap...
```

**Total questions: 3**
**Time: 90 seconds**

---

#### **CATEGORY 2: EXAM**
Examples: UPSC, GMAT, Bar Exam, Medical Licensing, Coding Interviews

**Critical Questions (4-5 only)**:
1. "Which exam are you preparing for?"
   - **Why it matters**: Determines syllabus and structure

2. "When is your exam date?" (or "How many months do you have?")
   - **Why it matters**: Timeline is everything for exam prep

3. "Have you studied for this before, or starting fresh?"
   - Options: First attempt, Retaking (studied X months before)
   - **Why it matters**: Determines if we skip basics

4. "How many hours per day can you realistically study?"
   - Options: 1-2 hours, 3-4 hours, 5+ hours (full-time prep)
   - **Why it matters**: Determines if timeline is realistic

5. "What's your biggest challenge with studying?" (OPTIONAL)
   - Options: Staying consistent, Understanding concepts, Time management, Anxiety
   - **Why it matters**: Helps personalize approach (more check-ins, simpler breakdown, etc.)

**Smart Defaults (NO questions asked)**:
- Educational background: Don't ask! Adapt based on how fast they grasp concepts
- Previous exam scores: Don't ask! Focus on forward progress
- Learning style: Don't ask! Infer from task completion (skipping videos = prefers reading)

**Inferred from Behavior**:
- Actual study capacity: Do they complete 3-hour blocks, or tire after 1 hour?
- Weak subjects: Which topics take longer to complete?
- Retention rate: Do they need more spaced repetition?

**Example Conversation**:
```
AI: UPSC! That's a big one. When's your exam?
User: June 2026, so about 18 months
AI: [Calculates: 18 months available]

AI: First attempt, or have you prepared before?
User: First attempt
AI: [Infers: Need full syllabus coverage]

AI: How many hours per day can you study?
User: 3-4 hours on weekdays, more on weekends
AI: [Infers: Part-time prep, 25-30 hours/week]

AI: Last question: what's usually harder for you - staying consistent, or understanding tough concepts?
User: Honestly, staying consistent
AI: [Infers: Needs strong daily check-in system, smaller tasks]

AI: Got it. Building your 18-month UPSC roadmap now...
```

**Total questions: 4**
**Time: 2 minutes**

---

#### **CATEGORY 3: HOBBY**
Examples: Cooking, Guitar, Painting, Photography, Gardening

**Critical Questions (3 only)**:
1. "Complete beginner, or have you tried [hobby] before?"
   - **Why it matters**: Determines starting point

2. "What do you already have?" (equipment/tools)
   - For cooking: "Do you have a basic kitchen?"
   - For guitar: "Do you have a guitar?"
   - **Why it matters**: Can't practice guitar without a guitar

3. "What's your goal with [hobby]?"
   - Options: Just for fun, Want to get really good, Specific project (e.g., "cook for family")
   - **Why it matters**: Determines depth and timeline

**Smart Defaults**:
- Budget: Assume moderate (willing to buy basics if needed)
- Talent/aptitude: Assume average, adjust based on progress

**Example Conversation**:
```
AI: Cooking! Have you cooked before, or total beginner?
User: I can boil water and make instant noodles, that's it
AI: [Infers: Complete beginner]

AI: Do you have a kitchen with basic stuff - stove, pan, knife?
User: Yeah, I have a kitchen
AI: [Infers: Has required tools]

AI: What's driving this - just want to eat better, or aiming to become a great cook?
User: I want to cook healthy meals for myself
AI: [Infers: Practical focus, not professional-level]

AI: Perfect. Building your cooking roadmap...
```

**Total questions: 3**
**Time: 60 seconds**

---

#### **CATEGORY 4: LEARNING**
Examples: Languages, Programming, Writing, Public Speaking

**Critical Questions (3-4)**:
1. "Why do you want to learn [skill]?"
   - **Why it matters**: Affects content focus (conversational Spanish vs business Spanish)

2. "Any prior experience?"
   - **Why it matters**: Skip basics if needed

3. "What's your target level?"
   - Options: Basic understanding, Conversational/functional, Professional/fluent
   - **Why it matters**: Determines depth

4. "When do you want to reach that level?" (OPTIONAL)
   - **Why it matters**: Adjusts intensity

---

#### **CATEGORY 5: HABIT**
Examples: Reading Daily, Journaling, Meditation, Sleep Routine

**Critical Questions (2-3)**:
1. "Have you tried building this habit before?"
   - Options: Never tried, Tried but failed, Used to do it but stopped
   - **Why it matters**: Address past failure points

2. "What's your target?"
   - For reading: "How much do you want to read?" (15 min/day, 1 book/month)
   - **Why it matters**: Sets success criteria

**Smart Defaults**:
- When to do habit: Use their energy pattern from universal profile
- Duration: Start small (5-10 min), increase based on completion

---

#### **CATEGORY 6: CREATIVE**
Examples: Write a Book, Start Podcast, YouTube Channel

**Critical Questions (4)**:
1. "What's the project?"
   - **Why it matters**: Defines scope

2. "When do you want to launch/finish?"
   - **Why it matters**: Timeline

3. "Any experience with [writing/video/audio]?"
   - **Why it matters**: Determines learning curve

4. "What's the biggest blocker you expect?"
   - Options: Don't know where to start, Time, Perfectionism, Technical skills
   - **Why it matters**: Personalize support

---

## 🔄 Handling Multiple Concurrent Goals

**THE PROBLEM**: User wants to do BOTH boxing (Fitness) AND UPSC (Exam). How to avoid asking 10 questions?

### **Solution: Shared Universal Profile + Goal-Specific Mini-Profiles**

**Scenario**: User already completed onboarding for Boxing (Fitness goal).

Now they add UPSC (Exam goal):

```
AI: You want to add UPSC prep! Smart to keep fitness going while studying.

[AI already knows from universal profile]:
- Wake time: 6 AM
- Sleep time: 11 PM
- Work hours: 10 AM - 7 PM
- Energy peak: Mornings
- Free slots: 6-9:30 AM, 7:30-10:30 PM

AI: Quick question - when's your UPSC exam?
User: June 2026

AI: First attempt or retaking?
User: First attempt

AI: How many hours per day can you study? (I see you're already doing boxing in mornings)
User: Maybe 2-3 hours in evenings

AI: [SMART INFERENCE]: User has:
- 3.5 hours morning (currently: 30 min boxing)
- 3 hours evening (available for study)
- Wants 2-3 hours study/day

AI: Got it. I'll schedule:
- Boxing: 6:00-6:45 AM (keep your current routine)
- UPSC Study: 7:30-10:00 PM (2.5 hours/day)

Sound good?
User: Perfect

AI: Building your UPSC roadmap...
```

**Total NEW questions for second goal: 3**
**Time: 90 seconds**

### **Smart Scheduling Algorithm for Multiple Goals**

```python
def schedule_multiple_goals(user_profile, goals):
    available_slots = user_profile.universal.freeTimeSlots
    total_available_minutes = sum([slot.duration for slot in available_slots])

    # Calculate time needed per goal
    for goal in goals:
        goal.daily_time_needed = estimate_daily_time(goal)

    total_needed_minutes = sum([g.daily_time_needed for g in goals])

    # Check feasibility
    if total_needed_minutes > total_available_minutes * 0.8:  # Leave 20% buffer
        return "WARNING: Not enough time. Ask user to prioritize or extend timeline."

    # Allocate time slots based on:
    # 1. Goal priority (user-set)
    # 2. Energy match (hard goals → peak energy time)
    # 3. Category needs (Fitness → morning, Creative → evening)

    fitness_goals = [g for g in goals if g.category == "Fitness"]
    exam_goals = [g for g in goals if g.category == "Exam"]

    # Fitness → Morning slots (energy + practical for gym/outdoor)
    for goal in fitness_goals:
        assign_slot(goal, find_best_slot(morning_slots, goal))

    # Exam → Evening slots (sustained focus after work)
    for goal in exam_goals:
        assign_slot(goal, find_best_slot(evening_slots, goal))

    return schedule
```

---

## 📋 Complete Onboarding Flow (Visual)

### **Scenario: New User, 2 Goals (Boxing + UPSC)**

```
[App Opens]

Screen 1: Welcome
┌─────────────────────────────────────┐
│  Welcome to CONSIST! 👋             │
│                                     │
│  I'm your AI ally for building      │
│  consistency. Let's get started.    │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

Screen 2: Goal Selection
┌─────────────────────────────────────┐
│  What do you want to get            │
│  consistent at?                     │
│                                     │
│  💪 Fitness                         │
│  📚 Exam Prep                       │
│  🎨 Hobby                           │
│  🧠 Learning                        │
│  ✅ Habit                           │
│  🎬 Creative Project                │
│                                     │
│  [Select one to start]              │
└─────────────────────────────────────┘

[User selects "Fitness"]

Screen 3: Narrow Down
┌─────────────────────────────────────┐
│  What fitness goal?                 │
│                                     │
│  🥊 Boxing                          │
│  🏃 Running                         │
│  🧘 Yoga                            │
│  🏋️ Weightlifting                  │
│  🏊 Swimming                        │
│  ✏️ Other (type it)                 │
└─────────────────────────────────────┘

[User selects "Boxing"]

Screen 4-5: Universal Questions (ONLY asked ONCE)
┌─────────────────────────────────────┐
│  AI: Hey! I'm CONSIST. What's your  │
│      name?                          │
│                                     │
│  [Text input: Mehtab]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  AI: Nice to meet you, Mehtab!      │
│      What time do you usually       │
│      wake up?                       │
│                                     │
│  [Time picker: 6:00 AM]             │
│                                     │
│  AI: And when do you sleep?         │
│  [Time picker: 11:00 PM]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  AI: When do you work?              │
│                                     │
│  [Start: 10:00 AM]                  │
│  [End: 7:00 PM]                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  AI: When do you feel most          │
│      energized?                     │
│                                     │
│  ○ Mornings                         │
│  ○ Afternoons                       │
│  ○ Evenings                         │
│  ○ Late nights                      │
└─────────────────────────────────────┘

[User selects "Mornings"]

Screen 6-8: Fitness-Specific Questions
┌─────────────────────────────────────┐
│  AI: If you had to jog for 10       │
│      minutes right now, how would   │
│      that feel?                     │
│                                     │
│  ○ I can't / Very difficult         │
│  ○ I can do it (Beginner)           │
│  ○ Easy, I jog regularly            │
└─────────────────────────────────────┘

[User selects "I can do it"]

┌─────────────────────────────────────┐
│  AI: Any injuries or physical       │
│      limitations I should know?     │
│                                     │
│  [Text input: None]                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  AI: Last one - where will you      │
│      train?                         │
│                                     │
│  ☑ Gym membership                   │
│  ☐ Home equipment                   │
│  ☐ Outdoor space (park, etc.)       │
│  ☐ None (bodyweight only)           │
└─────────────────────────────────────┘

[User selects "Gym membership"]

Screen 9: Generating Roadmap
┌─────────────────────────────────────┐
│  🤖 Building your boxing roadmap... │
│                                     │
│  [Progress bar]                     │
│                                     │
│  Analyzing your schedule...         │
│  Creating skill progression...      │
│  Scheduling micro-tasks...          │
└─────────────────────────────────────┘

Screen 10: Roadmap Preview
┌─────────────────────────────────────┐
│  Your Boxing Roadmap 🥊             │
│                                     │
│  Timeline: 6 months                 │
│  Daily time: 30-45 min              │
│  Schedule: 6:00-6:45 AM             │
│                                     │
│  Weeks 1-4: Cardio foundation       │
│  Weeks 5-6: Stance & footwork       │
│  Weeks 7-10: Basic punches          │
│  Weeks 11-16: Combinations          │
│  Weeks 17-24: Shadow boxing         │
│                                     │
│  [Looks good!] [Adjust]             │
└─────────────────────────────────────┘

[User clicks "Looks good!"]

Screen 11: Daily Check-in Setup
┌─────────────────────────────────────┐
│  When should I check in with you    │
│  each day?                          │
│                                     │
│  ○ 6:00 AM (before workout)         │
│  ○ 7:00 AM (after workout)          │
│  ○ 9:00 PM (evening)                │
│  ○ Custom time                      │
└─────────────────────────────────────┘

[User selects "6:00 AM"]

Screen 12: Add Another Goal?
┌─────────────────────────────────────┐
│  ✅ Boxing roadmap ready!           │
│                                     │
│  Want to add another goal?          │
│  (You can always add more later)    │
│                                     │
│  [Yes, add another]                 │
│  [No, start tomorrow]               │
└─────────────────────────────────────┘

[User clicks "Yes, add another"]

[BACK TO Screen 2: Goal Selection]

[User selects "Exam Prep" → UPSC]

Screen 13-15: Exam-Specific (REUSES universal data)
┌─────────────────────────────────────┐
│  AI: UPSC prep alongside boxing -   │
│      ambitious! When's your exam?   │
│                                     │
│  [Date picker: June 2026]           │
│  (18 months from now)               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  AI: First attempt or retaking?     │
│                                     │
│  ○ First attempt                    │
│  ○ Retaking (studied before)        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  AI: You're already doing boxing    │
│      6-6:45 AM. How many hours/day  │
│      can you study?                 │
│                                     │
│  ○ 1-2 hours                        │
│  ○ 3-4 hours                        │
│  ○ 5+ hours (full-time)             │
└─────────────────────────────────────┘

[User selects "3-4 hours"]

Screen 16: Multi-Goal Schedule Preview
┌─────────────────────────────────────┐
│  Your Daily Schedule                │
│                                     │
│  🥊 Boxing: 6:00-6:45 AM            │
│  📚 UPSC Study: 7:30-10:30 PM       │
│                                     │
│  Total: 3h 45min/day                │
│  Free time left: 2h 15min           │
│                                     │
│  [Perfect!] [Adjust times]          │
└─────────────────────────────────────┘

Screen 17: Ready to Start
┌─────────────────────────────────────┐
│  You're all set, Mehtab! 🎉         │
│                                     │
│  Starting tomorrow:                 │
│  • Boxing roadmap (6 months)        │
│  • UPSC prep (18 months)            │
│                                     │
│  I'll check in at 6:00 AM daily.    │
│                                     │
│  [Start Tomorrow]                   │
└─────────────────────────────────────┘
```

**TOTAL QUESTIONS ASKED**:
- Universal (once): 5 questions
- Fitness (Boxing): 3 questions
- Exam (UPSC): 3 questions
- **GRAND TOTAL: 11 questions**

**TOTAL TIME: ~5 minutes**

---

## 🧮 Data Collected Summary

| Data Point | How Collected | When Asked |
|------------|---------------|------------|
| Name | Direct question | Once (universal) |
| Sleep/wake time | Direct question | Once (universal) |
| Work hours | Direct question | Once (universal) |
| Energy pattern | Direct question | Once (universal) |
| Weekend availability | Direct question | Once (universal) |
| Fitness level | Direct question | Per fitness goal |
| Injuries | Direct question | Per fitness goal |
| Equipment | Direct question | Per fitness goal |
| Exam date | Direct question | Per exam goal |
| Exam experience | Direct question | Per exam goal |
| Study capacity | Direct question | Per exam goal |
| **Completion rate** | **Inferred from behavior** | **Ongoing** |
| **Preferred time** | **Inferred from behavior** | **Ongoing** |
| **Actual capacity** | **Inferred from behavior** | **Ongoing** |
| **Learning speed** | **Inferred from behavior** | **Ongoing** |
| **Weak areas** | **Inferred from behavior** | **Ongoing** |

**Key Insight**:
- **11 questions upfront** (5 min)
- **Infinite personalization ongoing** (through behavioral inference)

---

## 🎯 Why This Works

### **1. Respects User Time**
- 11 questions = 5 minutes
- Users see value immediately (roadmap generated)

### **2. Avoids Cognitive Overload**
- Don't ask about preferences (learning style, motivation) - infer from behavior
- Don't ask demographic details that don't affect plan (age, occupation)
- Progressive profiling: learn more AFTER user is engaged

### **3. Acts on Real Data, Not Self-Reported**
- Users lie about capacity ("I can study 5 hours/day") → Track actual completion
- Users don't know their learning style → Observe if they skip videos
- Behavior > Survey answers

### **4. Scales to N Goals**
- Universal profile asked ONCE
- Each new goal = 3-5 questions
- 3 goals = 5 + 3 + 3 + 3 = 14 questions total

---

## 🧠 Updated Data Schema (Final)

```json
{
  "userId": "uuid-v4",
  "createdAt": "2025-12-31T10:00:00Z",

  // ===== UNIVERSAL PROFILE (asked once) =====
  "universal": {
    "name": "Mehtab",
      "wakeTime": "06:00",
      "sleepTime": "23:00",
      "workHours": "10:00-19:00",
      "freeTimeSlots": [
        {"start": "06:00", "end": "09:30", "type": "morning"},
        {"start": "19:30", "end": "22:30", "type": "evening"}
      ]
    },
    "energyPattern": "morning_person",
    "weekendAvailability": "flexible"
  },

  // ===== GOALS (array of all active goals) =====
  "goals": [
    {
      "goalId": "g_boxing_001",
      "category": "Fitness",
      "specificGoal": "Boxing",
      "createdAt": "2025-12-31T10:00:00Z",
      "status": "active",

      // Category-specific data (only 3-5 fields per category)
      "fitnessData": {
        "currentLevel": "intermediate",
        "injuries": [],
        "equipment": ["gym_membership"]
      },

      // Timeline
      "timeline": {
        "targetDate": "2026-06-30",
        "estimatedDuration_months": 6,
        "dailyTimeCommitment_minutes": 40,
        "scheduledSlot": {"start": "06:00", "end": "06:45"}
      }
    },
    {
      "goalId": "g_upsc_002",
      "category": "Exam",
      "specificGoal": "UPSC Civil Services",
      "createdAt": "2025-12-31T10:15:00Z",
      "status": "active",

      // Category-specific data
      "examData": {
        "examName": "UPSC",
        "examDate": "2026-06-15",
        "attempt": "first",
        "studyCapacity_hours": 3,
        "biggestChallenge": "consistency"
      },

      // Timeline
      "timeline": {
        "targetDate": "2026-06-15",
        "estimatedDuration_months": 18,
        "dailyTimeCommitment_minutes": 180,
        "scheduledSlot": {"start": "19:30", "end": "22:30"}
      }
    }
  ],

  // ===== BEHAVIORAL DATA (inferred over time, NOT asked) =====
  "behavioralProfile": {
    "overallCompletionRate": 0.78,
    "currentStreak": 12,
    "longestStreak": 45,
    "actualPreferredTime": "morning",  // When they ACTUALLY complete tasks
    "averageSessionDuration_minutes": 35,
    "respondsToGamification": true,  // Inferred from engagement with badges
    "needsFrequentCheckIns": true,  // Inferred from completion dropping without check-ins
    "lastActive": "2025-12-31T07:30:00Z"
  },

  // ===== LEARNING PATTERNS (inferred, NOT asked) =====
  "learningPatterns": {
    "prefersVideosOverText": true,  // Skips reading tasks, completes videos
    "graspSpeed": "fast",  // Completes conceptual tasks quickly
    "needsMoreRepetition": false,  // Retains well without extra spaced repetition
    "completesLongTasks": false  // Tasks > 45 min often abandoned
  }
}
```

**How This Gets Built:**
1. **Day 0 (Onboarding)**: Ask 5 universal questions + 3-5 per goal
2. **Day 1-7**: Observe completion patterns, actual time preferences
3. **Week 2+**: Behavioral and learning patterns emerge from data
4. **Ongoing**: Continuously refine based on behavior (NOT additional questions)

### **Goal & Roadmap Schema**

```json
{
  "goalId": "g_boxing_001",
  "userId": "uuid-v4",
  "createdAt": "2025-12-31T10:00:00Z",

  "goal": {
    "title": "Learn boxing fundamentals",
    "description": "Go from zero to confident beginner boxer",
    "category": "fitness",
    "targetDate": "2026-06-30",
    "targetLevel": "beginner-proficient",
    "userMotivation": "Self-defense and fitness",
    "priority": "high"
  },

  "skillGraph": {
    "nodes": [
      {
        "skillId": "s1",
        "name": "Cardiovascular foundation",
        "level": 1,
        "prerequisites": [],
        "estimatedDuration_days": 28,
        "completed": false
      },
      {
        "skillId": "s2",
        "name": "Basic boxing stance",
        "level": 1,
        "prerequisites": ["s1"],
        "estimatedDuration_days": 7,
        "completed": false
      },
      {
        "skillId": "s3",
        "name": "Jab technique",
        "level": 2,
        "prerequisites": ["s2"],
        "estimatedDuration_days": 14,
        "completed": false
      },
      {
        "skillId": "s4",
        "name": "Cross and hook",
        "level": 2,
        "prerequisites": ["s3"],
        "estimatedDuration_days": 14,
        "completed": false
      },
      {
        "skillId": "s5",
        "name": "Footwork basics",
        "level": 2,
        "prerequisites": ["s2"],
        "estimatedDuration_days": 14,
        "completed": false
      },
      {
        "skillId": "s6",
        "name": "Shadow boxing",
        "level": 3,
        "prerequisites": ["s3", "s4", "s5"],
        "estimatedDuration_days": 21,
        "completed": false
      }
    ],
    "edges": [
      {"from": "s1", "to": "s2"},
      {"from": "s2", "to": "s3"},
      {"from": "s2", "to": "s5"},
      {"from": "s3", "to": "s4"},
      {"from": "s3", "to": "s6"},
      {"from": "s4", "to": "s6"},
      {"from": "s5", "to": "s6"}
    ]
  },

  "microTasks": [
    {
      "taskId": "t1",
      "skillId": "s1",
      "week": 1,
      "day": 1,
      "title": "Fast walk for 15 minutes",
      "description": "Walk at a brisk pace (talking is slightly difficult). Focus on breathing.",
      "type": "practice",
      "cognitiveLoad": "low",
      "estimatedDuration_minutes": 15,
      "resources": ["outdoor_space"],
      "instructions": "Find a quiet path. Start slow, gradually increase pace. Breathe through nose.",
      "videoUrl": null,
      "completed": false,
      "scheduledFor": "2025-12-31T07:00:00Z",
      "completedAt": null,
      "userRating": null
    },
    {
      "taskId": "t2",
      "skillId": "s1",
      "week": 1,
      "day": 2,
      "title": "Interval walk-jog for 20 minutes",
      "description": "Alternate: 2 min walk, 1 min jog. Repeat 6 times.",
      "type": "practice",
      "cognitiveLoad": "low",
      "estimatedDuration_minutes": 20,
      "resources": ["outdoor_space"],
      "instructions": "Warm up with 5 min walk. Then intervals. Cool down 5 min.",
      "videoUrl": null,
      "completed": false,
      "scheduledFor": "2026-01-01T07:00:00Z",
      "completedAt": null,
      "userRating": null
    },
    {
      "taskId": "t15",
      "skillId": "s2",
      "week": 5,
      "day": 1,
      "title": "Watch: Proper boxing stance (5 min video)",
      "description": "Learn foot position, weight distribution, guard position",
      "type": "learning",
      "cognitiveLoad": "low",
      "estimatedDuration_minutes": 5,
      "resources": ["smartphone"],
      "instructions": "Take notes on: feet width, knee bend, hand position",
      "videoUrl": "https://example.com/boxing-stance-tutorial",
      "completed": false,
      "scheduledFor": "2026-01-28T19:30:00Z",
      "completedAt": null,
      "userRating": null
    },
    {
      "taskId": "t16",
      "skillId": "s2",
      "week": 5,
      "day": 1,
      "title": "Practice stance in front of mirror (10 min)",
      "description": "Apply what you learned. Check form in mirror.",
      "type": "practice",
      "cognitiveLoad": "medium",
      "estimatedDuration_minutes": 10,
      "resources": ["mirror", "space"],
      "instructions": "Focus on: feet shoulder-width, knees slightly bent, hands up, chin down",
      "videoUrl": null,
      "completed": false,
      "scheduledFor": "2026-01-28T19:40:00Z",
      "completedAt": null,
      "userRating": null
    }
  ],

  "adaptiveMetrics": {
    "overallProgress": 0.12,
    "currentSkill": "s1",
    "currentWeek": 2,
    "difficultyLevel": 0.6,
    "pacingMultiplier": 1.15,
    "lastAdjusted": "2026-01-07T20:00:00Z",
    "adjustmentReason": "User completing cardio tasks 15% faster than average. Accelerating timeline.",
    "predictedCompletionDate": "2026-06-15"
  }
}
```

**Key Design Decisions:**

1. **Skill Graph (not linear)**
   - Some skills are parallel (footwork + punches)
   - Prerequisites ensure proper progression
   - Allows flexible paths

2. **Micro-Tasks: The Heart of CONSIST**
   - Each task is atomic: ONE clear action
   - Low cognitive load: user doesn't think, just does
   - Time-bound: "15 minutes", not "as long as you want"
   - Scheduled: removes decision fatigue
   - Type-tagged: learning (videos, reading) vs practice (doing)

3. **Adaptive Metrics**
   - Tracks pacing relative to original plan
   - Automatically adjusts timeline based on completion rate
   - Records *why* adjustments were made (transparency)

---

## 🤖 AI System Design

### **Core AI Modules**

#### **1. Conversational Onboarding Agent**
**Purpose**: Build user profile through natural conversation

**Prompt Template**:
```
You are CONSIST's onboarding assistant. Your job is to learn about the user through friendly, natural conversation - NOT interrogation.

Guidelines:
- Ask 1-2 questions at a time max
- Show genuine interest in their answers
- Infer information when possible (don't ask everything directly)
- Be warm and encouraging
- Session should feel like chatting with a friend who wants to help

Current profile completeness: {profile_completeness}%
Missing critical info: {missing_fields}

Start the conversation naturally based on what you already know.
```

**Example Flow**:
```
AI: Hey! I'm CONSIST. What brings you here today?
User: I want to learn boxing
AI: That's awesome! What got you interested in boxing?
User: Self-defense and getting fit
AI: Makes sense. Are you starting from scratch, or have you done any combat sports before?
User: Complete beginner
AI: Perfect - we'll build from the ground up. Quick question: how's your current fitness level? Like, can you jog for 10 minutes comfortably, or would that be tough right now?
User: I can run, I do some jogging already
AI: Great! That'll help. One more thing - what's your typical day look like? When do you usually have free time?
User: I work remotely 10-7, so mornings or late evenings
AI: Got it. Mornings or evenings - which is when you feel most energized?
User: Definitely mornings
AI: Perfect. I'm getting a clear picture. Give me a moment to create your personalized boxing roadmap...
```

#### **2. Goal Decomposition Agent**
**Purpose**: Break down ANY goal into skill graph + micro-tasks

**Algorithm**:
```
INPUT: Goal description, user profile, timeline
OUTPUT: Skill graph + micro-tasks

STEP 1: Identify prerequisite skills
- What foundational skills are needed?
- What's the dependency order?
- For boxing: cardio → stance → punches → combinations → sparring

STEP 2: Decompose each skill into learning + practice tasks
- Learning tasks: videos, reading, observation (low cognitive load)
- Practice tasks: doing, repetition (medium cognitive load)
- Rule: No task > 30 minutes
- Rule: Each task has ONE clear success criterion

STEP 3: Schedule tasks based on user constraints
- Respect available time slots
- Respect energy levels (hard tasks during peak energy)
- Add buffer days (life happens)
- Use spaced repetition for retention

STEP 4: Estimate timeline
- Use historical data if available
- Adjust for user's learning speed (inferred from profile)
- Add 20% buffer for reality

STEP 5: Generate adaptive checkpoints
- Week 1, 2, 4, 8, 12, 16, 20, 24 check-ins
- Assess: completion rate, difficulty perception, motivation
- Trigger replanning if needed
```

**Example Decomposition for "Learn Cooking"**:
```
GOAL: Learn cooking (beginner to intermediate)
TIMELINE: 3 months
USER: Works full-time, no cooking experience, has basic kitchen

SKILL GRAPH:
1. Kitchen basics (week 1-2)
   - Learn kitchen safety
   - Understand tools
   - Basic knife skills

2. Fundamental techniques (week 3-6)
   - Boiling, steaming
   - Sautéing, stir-frying
   - Baking basics

3. Recipe execution (week 7-10)
   - Follow simple recipes
   - Taste and adjust
   - Meal prep basics

4. Creative cooking (week 11-12)
   - Modify recipes
   - Create own dishes
   - Presentation

MICRO-TASKS (Week 1, Day 1):
- [5 min, learning] Watch: Kitchen safety basics
- [10 min, practice] Practice proper knife grip with a carrot
- [15 min, practice] Dice 2 onions following video guide
- [5 min, reflection] Rate difficulty, note questions
```

#### **3. Daily Check-In Agent**
**Purpose**: Minimalist daily engagement, track progress, provide encouragement

**Prompt Template**:
```
You are CONSIST's daily check-in assistant. Be brief, encouraging, and action-oriented.

User's name: {name}
Current streak: {streak_days} days
Today's scheduled tasks: {tasks}
Completion rate (last 7 days): {completion_rate}

If completion_rate < 50%: Be extra encouraging, offer to simplify tasks
If completion_rate > 90%: Celebrate, consider increasing difficulty
If streak > 20: Acknowledge milestone

Keep responses under 50 words. Focus on today's action, not long-term planning.
```

**Example**:
```
AI: Morning, Mehtab! 🔥 12-day streak. Today: 20-min jog + stance practice. You got 35 mins?
User: Yeah, let's do it
AI: Perfect. Start with the jog now. I'll check in after. Go!

[User marks jog as complete]

AI: Solid work! Now: 10 min stance practice in front of mirror. Focus on keeping hands up. Ready?
User: Done
AI: 💪 Day 13 complete. See you tomorrow at 7 AM.
```

#### **4. Adaptive Replanning Agent**
**Purpose**: Detect when plan needs adjustment, replan intelligently

**Triggers for Replanning**:
```python
def should_replan(user_data, roadmap):
    # 1. Consistent underperformance
    if completion_rate(last_7_days) < 0.5:
        return True, "Tasks too difficult or time-intensive"

    # 2. Consistent overperformance
    if completion_rate(last_14_days) > 0.95 and avg_time < estimated_time * 0.7:
        return True, "User ready for faster progression"

    # 3. Streak broken > 3 days
    if days_since_last_activity > 3:
        return True, "Re-engagement needed"

    # 4. User explicitly requests
    if user_message_contains("too hard", "too easy", "change plan"):
        return True, "User feedback"

    # 5. Major life change detected
    if user_reported_constraint_change:
        return True, "Constraints changed"

    return False, None
```

**Replanning Process**:
1. Identify what's not working (too hard? too boring? time constraints?)
2. Ask user 1-2 clarifying questions
3. Regenerate affected portion of roadmap
4. Preserve completed progress
5. Explain changes clearly

---

## 🎨 User Experience Flow

### **First-Time User Journey**

**Day 0: Onboarding (15-20 minutes)**
1. Welcome screen: "What do you want to get consistent at?"
2. User enters goal (e.g., "learn boxing")
3. Conversational profiling (5-10 min chat)
4. AI generates roadmap (loading: 30-60 seconds)
5. Show roadmap overview with timeline
6. "When should I check in with you daily?" → User picks time
7. "Ready to start tomorrow?"

**Day 1: First Tasks**
1. Push notification at chosen time: "Morning! Ready for Day 1?"
2. Show today's tasks (2-3 micro-tasks max)
3. User completes tasks, marks them done
4. Celebration animation
5. "See you tomorrow!"

**Week 1: Building Habit**
- Daily check-ins at same time
- Micro-tasks gradually increase in complexity
- Streaks start to matter
- Gamification kicks in (badges for week 1 complete)

**Week 4: First Checkpoint**
- AI: "One month in! How's it feeling?"
- Quick survey: difficulty, enjoyment, progress perception
- Adaptive adjustment if needed
- Celebration of milestone

**Month 3-6: Autonomy Building**
- Tasks become more open-ended
- User starts to internalize structure
- AI reduces hand-holding
- Transition from "follow AI" to "own the habit"

### **Daily User Flow**

```
07:00 - Push notification: "Morning, Mehtab! Day 23. Ready?"

[User opens app]

Home Screen:
┌─────────────────────────────────────┐
│  Good morning, Mehtab 🌅           │
│  Streak: 🔥 23 days                 │
│                                     │
│  Today's Focus: Boxing Stance       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━ 65%     │
│                                     │
│  ☑ 20-min jog (completed 07:15)    │
│  □ Watch stance video (5 min)      │
│  □ Practice stance (10 min)        │
│                                     │
│  [Start Next Task]                  │
│                                     │
│  Quick Actions:                     │
│  💬 Chat with AI                    │
│  📊 View Progress                   │
│  ⚙️ Adjust Plan                    │
└─────────────────────────────────────┘
```

[User clicks "Start Next Task"]

```
┌─────────────────────────────────────┐
│  Task: Watch stance video           │
│  ⏱️ 5 minutes                        │
│                                     │
│  [Video Player]                     │
│  "Proper Boxing Stance for          │
│   Beginners"                        │
│                                     │
│  Focus on:                          │
│  • Feet shoulder-width apart        │
│  • Knees slightly bent              │
│  • Hands protecting face            │
│                                     │
│  [Mark as Done]                     │
│  [Need Help?]                       │
└─────────────────────────────────────┘
```

[User marks done]

```
┌─────────────────────────────────────┐
│  ✅ Great work!                     │
│                                     │
│  Next: Practice stance (10 min)     │
│                                     │
│  Find a mirror and apply what you   │
│  just learned. I'll guide you.      │
│                                     │
│  [Start Practice] [Later]           │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation Roadmap

### **Phase 1: MVP (4-6 weeks) - PWA**

**Week 1-2: Foundation**
- [ ] Set up React + Vite + TypeScript project
- [ ] Set up Tailwind CSS
- [ ] Implement IndexedDB with Dexie.js
- [ ] Create basic data schemas (User, Goal, Task)
- [ ] Build simple chat UI
- [ ] Implement mock AI responses (hardcoded conversation tree)

**Week 3-4: AI Integration**
- [ ] Integrate WebLLM with Phi-3-mini model
- [ ] Create prompt templates for onboarding
- [ ] Implement goal decomposition (initially rule-based, then AI-enhanced)
- [ ] Build task scheduler algorithm
- [ ] Test AI responses for quality

**Week 5-6: Core Features**
- [ ] Daily check-in system
- [ ] Task completion tracking
- [ ] Streak counter
- [ ] Basic progress visualization
- [ ] Service Worker for offline capability
- [ ] Push notifications
- [ ] PWA manifest for installability

**Launch MVP**: Single goal type (fitness), local-only, basic AI

---

### **Phase 2: Enhanced Personalization (4-6 weeks)**

**Week 7-8: Adaptive Intelligence**
- [ ] Implement ChromaDB for semantic search
- [ ] Build behavioral analytics engine
- [ ] Create adaptive replanning algorithm
- [ ] Add "difficulty rating" after each task
- [ ] Implement spaced repetition for check-ins

**Week 9-10: Multiple Goal Types**
- [ ] Expand to: learning (languages, skills), productivity (writing, reading), creative (cooking, art)
- [ ] Category-specific task templates
- [ ] Resource library (curated videos, articles per category)

**Week 11-12: Social & Gamification**
- [ ] Achievement badges
- [ ] Milestone celebrations
- [ ] Optional: Accountability partners (share progress)
- [ ] Weekly/monthly reports

---

### **Phase 3: Mobile App (6-8 weeks)**

**Week 13-16: React Native Port**
- [ ] Set up React Native project
- [ ] Port UI components
- [ ] Implement SQLite storage
- [ ] Integrate MLC-LLM for on-device AI
- [ ] Native push notifications
- [ ] Sync data between web and mobile (optional, breaks local-first unless using peer-to-peer sync)

**Week 17-20: Mobile-Specific Features**
- [ ] Widget for home screen (today's task)
- [ ] Voice input for logging
- [ ] Camera integration (for form checks in fitness)
- [ ] Health app integration (Apple Health, Google Fit)

---

### **Phase 4: Advanced AI (4-6 weeks)**

**Week 21-24: Hybrid AI Architecture**
- [ ] Implement cloud LLM fallback (user opt-in)
- [ ] Smart routing (simple queries → local, complex → cloud)
- [ ] Improve goal decomposition quality
- [ ] Add AI coach mode (chat anytime for advice)

**Week 25-26: Community & Expansion**
- [ ] User-generated roadmaps (share your boxing plan with community)
- [ ] AI learns from aggregated (anonymized) success patterns
- [ ] Premium features (advanced analytics, expert consultations)

---

## ⚠️ Critical Considerations

### **1. AI Accuracy & Safety**
- **Problem**: AI might suggest unsafe progressions (e.g., too intense exercise, bad form)
- **Solution**:
  - Use expert-vetted templates for each category
  - AI can personalize timing/intensity, but not core technique
  - Add disclaimer: "CONSIST is not a substitute for professional coaching"
  - For medical/health goals, require user to confirm doctor approval

### **2. Local-First Challenges**
- **Problem**: On-device LLMs are 10x less capable than cloud models
- **Solution**:
  - Use hybrid approach (local for routine, cloud for complex)
  - Pre-generate roadmaps using cloud, then local handles daily interactions
  - Cache common responses locally

### **3. User Retention**
- **Problem**: 40% of users drop off after week 1
- **Solution**:
  - Super easy first week (build confidence)
  - Immediate wins (complete Day 1 = badge)
  - Re-engagement flow if user misses 2 days
  - Flexibility: "Life happened? Let's adjust your plan, not abandon it."

### **4. Over-Engineering Risk**
- **Problem**: Trying to handle every edge case from day 1
- **Solution**:
  - MVP focuses on ONE use case (fitness/boxing) for ONE user type (beginners)
  - Expand categories only after validating core loop
  - Don't build social features until core habit loop is proven

### **5. Privacy & Data Ethics**
- **Problem**: Collecting intimate behavioral/personal data
- **Solution**:
  - 100% local storage (no cloud backup unless explicit opt-in)
  - Clear data policy: "Your data never leaves your device"
  - Export/delete data anytime
  - No tracking, no analytics sent to servers

---

## 📐 Success Metrics

### **User Engagement**
- Daily Active Users (DAU) / Monthly Active Users (MAU) ratio
- Target: 70%+ (high for habit apps)
- Average streak length
- Target: 14+ days (2-week habit formation)

### **Completion Rates**
- Task completion rate
- Target: 75%+ average
- Goal completion rate
- Target: 40%+ reach their target milestone

### **Retention**
- Day 7 retention: 60%+
- Day 30 retention: 40%+
- Day 90 retention: 25%+

### **AI Quality**
- User satisfaction with roadmap (1-5 rating)
- Target: 4.2+ average
- Replanning frequency
- Target: < 1 per month per user (plan was good from start)

---

## 🎯 Competitive Differentiation

**vs. Habit Trackers (Streaks, Habitica)**
- CONSIST creates the plan FOR you
- Zero cognitive load (they still make you decide what to do)

**vs. Generic AI Coaches (ChatGPT, Pi)**
- CONSIST is deeply personalized + has memory
- Structured around YOUR specific goal and life

**vs. Learning Platforms (Duolingo, Coursera)**
- CONSIST adapts to ANY goal (not pre-packaged courses)
- Focuses on building the HABIT, not just content delivery

**Unique Value Proposition**:
> "Stop planning. Start doing. CONSIST learns who you are, builds your roadmap, and holds your hand every single day until the habit is yours."

---

## 🚀 Go-To-Market Strategy

### **Phase 1: Niche Community Launch**
- Target: r/getdisciplined, r/boxing, productivity Twitter
- Position: "AI that builds your personalized training plan"
- Free during beta, gather testimonials

### **Phase 2: Content Marketing**
- Blog: "How I used AI to learn boxing in 6 months"
- YouTube: Demo videos of CONSIST in action
- SEO: "personalized habit tracker", "AI fitness coach"

### **Phase 3: Freemium Model**
- Free: 1 active goal, basic AI
- Premium ($5/mo): Unlimited goals, advanced AI, analytics, priority support

---

## 🛠️ Technical Challenges & Solutions

### **Challenge 1: Model Size for Local AI**
- **Problem**: Phi-3-mini is 2GB, slow to download
- **Solution**: Progressive loading (download in background during onboarding)

### **Challenge 2: Generating Quality Roadmaps**
- **Problem**: Decomposing "learn cooking" into micro-tasks is HARD
- **Solution**:
  - Start with expert-vetted templates per category
  - AI personalizes by adjusting timing, intensity, resources
  - Iterate based on user feedback

### **Challenge 3: Spaced Repetition Timing**
- **Problem**: When to revisit skills?
- **Solution**: Use FSRS algorithm (best in 2025), adapted for habit formation

### **Challenge 4: Cross-Device Sync (while staying local-first)**
- **Problem**: User wants data on phone AND laptop
- **Solution**:
  - Option 1: Export/import JSON (manual)
  - Option 2: End-to-end encrypted sync via user's own cloud (iCloud, Google Drive)
  - Option 3: Local network peer-to-peer sync

---

## 📝 Next Steps

1. **Validate Core Assumption**
   - Build landing page explaining CONSIST
   - Collect emails from interested users
   - Survey: "What habit do you want to build?"
   - Goal: 100 signups before coding

2. **Build MVP (Phase 1)**
   - Focus on boxing use case only
   - Hardcode some AI responses initially (faster to ship)
   - Ship in 6 weeks

3. **User Testing**
   - 10 beta users
   - Daily feedback calls
   - Iterate ruthlessly on core loop

4. **Scale**
   - Add more goal categories
   - Improve AI quality
   - Build community

---

## 🎓 Key Learnings from Research

1. **Hybrid AI is the future**: Pure local OR pure cloud is suboptimal. Mix both.
2. **Micro-tasks are essential**: Tasks > 30 min have 3x higher abandonment.
3. **Spaced repetition works**: Revisiting skills at increasing intervals = 2x retention.
4. **Personalization beats templates**: Generic plans have 40% completion rate, personalized have 75%.
5. **Cognitive load is the enemy**: Every decision point increases drop-off by 20%.
6. **Habit formation takes 66 days average**: Don't promise quick fixes.
7. **Streaks are powerful**: Gamification increases engagement by 35%.

---

## 🔗 Critical Files for Implementation

### **Phase 1 MVP Files to Create**

1. **`src/schemas/user.ts`** - User profile TypeScript types
2. **`src/schemas/goal.ts`** - Goal and roadmap types
3. **`src/schemas/task.ts`** - Micro-task types
4. **`src/db/dexie.ts`** - IndexedDB setup with Dexie
5. **`src/ai/webllm.ts`** - WebLLM initialization and prompts
6. **`src/ai/prompts.ts`** - All AI prompt templates
7. **`src/ai/decomposer.ts`** - Goal decomposition algorithm
8. **`src/ai/scheduler.ts`** - Task scheduling logic
9. **`src/ai/adaptive.ts`** - Adaptive replanning algorithm
10. **`src/components/ChatInterface.tsx`** - Onboarding chat UI
11. **`src/components/TaskList.tsx`** - Daily task view
12. **`src/components/StreakCounter.tsx`** - Streak visualization
13. **`src/components/ProgressDashboard.tsx`** - Progress overview
14. **`src/hooks/useAI.ts`** - React hook for AI interactions
15. **`src/hooks/useNotifications.ts`** - Push notification logic
16. **`src/utils/spaced-repetition.ts`** - FSRS algorithm implementation
17. **`src/workers/service-worker.ts`** - PWA offline support

---

## ✅ Definition of Done (MVP)

The MVP is ready when a user can:

1. ✅ Open CONSIST (PWA) on their phone/laptop
2. ✅ Chat with AI to explain their goal ("I want to learn boxing")
3. ✅ Answer 5-10 questions about themselves naturally
4. ✅ See a generated 6-month roadmap with weekly breakdown
5. ✅ View today's 2-3 micro-tasks
6. ✅ Complete tasks and mark them done
7. ✅ See their streak counter increment
8. ✅ Receive a daily push notification at their chosen time
9. ✅ Chat with AI anytime for encouragement/questions
10. ✅ See progress over time (tasks completed, skills mastered)
11. ✅ Have all data stored locally (works offline)

**Success = 5 users complete Week 1 with 80%+ task completion rate**

---

## 🧩 Summary

**CONSIST** is not just another habit tracker. It's a **personalized AI ally** that:
- **Learns WHO you are** (not what you want to be)
- **Builds your roadmap** (zero cognitive load)
- **Holds your hand daily** (consistency through simplicity)
- **Adapts to your pace** (no one-size-fits-all)

**Core Philosophy**: The brain's job is to DO, not to PLAN. CONSIST handles planning so you can focus on action.

**Technical Innovation**: Hybrid local-first AI that respects privacy while delivering powerful personalization.

**Business Model**: Freemium with focus on depth (one user mastering 3 goals > 100 users trying once).

**Success Metric**: Did the user build a LASTING habit? (90-day retention)

---

*This PRD combines insights from psychology (habit formation, cognitive load), AI architecture (local-first LLMs, adaptive learning), and product design (progressive disclosure, micro-tasks). Ready to build your everyday ally for consistency.*

---

## 📌 EXECUTIVE SUMMARY: Answering Your Core Question

### **"What data should the app take to make judgments?"**

**ANSWER: Ask only what CHANGES the plan. Infer everything else from behavior.**

#### **Data Collection Strategy**

**ASKED ONCE (Universal Profile) - 5 questions:**
1. Name
2. Sleep/wake times
3. Work hours
4. Energy pattern (morning/evening person)
5. Weekend availability

**ASKED PER GOAL (Category-Specific) - 3-5 questions:**

| Category | Questions | Why These Matter |
|----------|-----------|------------------|
| **Fitness** | Current level, Injuries, Equipment | Determines safety & feasibility |
| **Exam** | Exam name, Date, Attempt #, Study capacity | Timeline is everything |
| **Hobby** | Experience level, Equipment, Goal depth | Starting point & scope |
| **Learning** | Why learning, Experience, Target level | Content focus |
| **Habit** | Past attempts, Target frequency | Address failure points |
| **Creative** | Project scope, Timeline, Experience | Planning horizon |

**NEVER ASKED (Inferred from Behavior):**
- Actual capacity (users lie about this)
- Learning style (they don't know)
- Weak areas (revealed through completion patterns)
- Preferred times (where they ACTUALLY complete tasks)
- Response to gamification (engagement with badges)
- Need for accountability (completion drops without check-ins)

#### **Total Question Count**

| Scenario | Questions | Time |
|----------|-----------|------|
| 1 goal (e.g., Boxing) | 5 + 3 = **8 questions** | 3 minutes |
| 2 goals (Boxing + UPSC) | 5 + 3 + 3 = **11 questions** | 5 minutes |
| 3 goals | 5 + 3 + 3 + 3 = **14 questions** | 7 minutes |

**Key Insight**: More goals = LINEAR question growth, NOT exponential. Universal profile asked ONCE.

---

### **"How do we reduce questions and ensure work gets done?"**

#### **Solution 1: Smart Defaults**
- Don't ask age → Assume 25-35, adjust if fitness level suggests otherwise
- Don't ask learning style → Observe task completion patterns
- Don't ask preferences → Track actual behavior

#### **Solution 2: Progressive Profiling**
- **Week 0**: Ask minimum viable questions (5-8)
- **Week 1**: Observe completion, adjust intensity
- **Week 2**: Infer learning patterns (skips videos = prefers reading)
- **Month 1**: Full behavioral profile built automatically

#### **Solution 3: Action Over Questions**
Instead of asking "What's your learning style?":
- Give them BOTH a video and text option for Day 1
- Track which they complete
- Future tasks adapt automatically

Instead of asking "How much time do you have?":
- Schedule based on their stated capacity (3 hours)
- Observe if they complete 3-hour blocks
- Auto-adjust to their ACTUAL capacity (2.5 hours)

#### **Solution 4: Multi-Goal Intelligence**
When user adds 2nd goal (UPSC after Boxing):
- AI already knows: wake time, work hours, energy pattern
- Only asks: exam date, attempt, study capacity
- **3 questions instead of 8**

---

### **"How does the AI make judgments without asking everything?"**

#### **Decision Tree for Personalization**

```
START: User says "I want to learn boxing"

QUESTION 1: "Can you jog for 10 minutes?"
├─ "No" → Fitness Level: Beginner → Start Week 1 with walking
├─ "Yes" → Fitness Level: Intermediate → Start Week 1 with jogging
└─ "Easily" → Fitness Level: Advanced → Start Week 1 with running

QUESTION 2: "Any injuries?"
├─ "Knee injury" → Exclude: jump rope, lunges → Add: swimming for cardio
├─ "None" → No restrictions
└─ "Old shoulder injury" → Modify: punching form emphasis

QUESTION 3: "Where will you train?"
├─ "Gym" → Include: heavy bag, speed bag, equipment drills
├─ "Home" → Focus: bodyweight, shadow boxing
└─ "Outdoor only" → Focus: running, calisthenics, shadow boxing

INFER FROM UNIVERSAL PROFILE:
- Available time: 6:00-9:30 AM → Schedule boxing 6:00-6:45 AM
- Energy peak: Morning → Put intense cardio in morning slot
- Weekend: Flexible → Longer sessions on Sat/Sun

OBSERVE WEEK 1 BEHAVIOR:
- Completes 15-min jog in 12 min → Increase intensity Week 2
- Skips 2 tasks → Too aggressive, reduce intensity
- Completes everything at 8 PM (not 6 AM) → Adjust schedule to evening

ADJUST AUTOMATICALLY:
- Week 2: Increase jog to 20 min (based on fast completion)
- Week 2: Move boxing to 8 PM (based on actual completion time)
- Week 3: Add gamification (user engages with streak counter)
```

**Result**: Deep personalization with minimal questions.

---

## 🎯 Final Answer to Your Question

### **What data matters?**

**HIGH-IMPACT DATA (Must ask):**
1. **Timeline constraints**: Exam date, target completion (can't be inferred)
2. **Safety-critical**: Injuries, medical conditions (too risky to assume)
3. **Feasibility blockers**: Equipment access, time availability (affects plan viability)

**LOW-IMPACT DATA (Don't ask, infer or default):**
4. Demographics (age, occupation) → Only matters for edge cases
5. Learning preferences → Users don't know, behavior reveals truth
6. Motivation → Changes over time, actions matter more than words

### **The Golden Rule**

> **Ask only questions whose answers would make you generate a DIFFERENT roadmap.**

**Example**:
- Asking "Are you a morning person?" → CHANGES roadmap (schedule morning vs evening)
- Asking "What's your learning style?" → DOESN'T change roadmap (give both formats, see what they use)

### **How to ensure work gets done with minimal questions?**

1. **Start fast** (5 min onboarding → roadmap)
2. **Trust defaults** (assume average, adjust based on reality)
3. **Observe behavior** (completion patterns > survey answers)
4. **Adapt continuously** (plan evolves with user, not locked in)

**Result**: Users spend 5 minutes answering questions, get immediate value (roadmap), and the AI gets smarter every day through observation.

---

## 🚀 Implementation Priority for MVP

### **Phase 1 (Weeks 1-2): Question Flow**
Build the minimal onboarding:
- 5 universal questions
- 3-5 category questions (Fitness only for MVP)
- Generate basic roadmap (can be rule-based initially)

### **Phase 2 (Weeks 3-4): Behavioral Tracking**
- Track task completion times
- Track actual session duration
- Track skip patterns
- Store all in `behavioralProfile` object

### **Phase 3 (Weeks 5-6): Adaptive Logic**
- If completion_rate < 50% → Reduce task intensity
- If completion_rate > 90% → Increase task difficulty
- If tasks completed at different time → Adjust schedule
- Auto-replan without asking questions

**Success Metric**: User adds 2nd goal, only answers 3 new questions (reuses universal profile).

---

## ✅ Your Questions Answered

| Your Question | Answer |
|---------------|--------|
| What data should app take? | 5 universal + 3-5 per category = 8-14 questions total |
| How to reduce questions? | Ask once (universal), infer rest from behavior |
| Boxing + UPSC: how many questions? | 5 + 3 (boxing) + 3 (UPSC) = 11 questions, 5 minutes |
| How to ensure work gets done? | Daily check-ins + micro-tasks + adaptive difficulty |
| Can we avoid asking everything? | YES: Ask 20%, infer 80% from behavior over time |

---

**You now have a complete blueprint for building CONSIST with minimal user friction and maximum personalization.**



next steps


Great question! Now that the MVP UI is complete, here are the logical next steps to make CONSIST production-ready:
🚀 Immediate Next Steps
1. Test the Complete Flow (Priority: HIGH)
Currently, you should test the app end-to-end:
Go through the entire onboarding
Complete tasks on the dashboard
Check if data persists after refresh
Test the reset functionality
Try it now:

npm run dev
Then walk through from Welcome → Dashboard and verify everything works.
2. Fix Critical Bugs (if any)
Based on testing, address:
TypeScript errors
UI glitches
Data persistence issues
Missing functionality
3. Enhanced Task Generation (Priority: MEDIUM)
Right now, tasks are hardcoded for Day 1. You need: Option A: Simple Multi-Day Tasks
Create a task generator that produces 7-14 days of tasks
Gradually increase difficulty/duration
Add progression logic
Option B: AI-Powered Task Generation
Integrate actual AI (local or cloud)
Generate personalized daily tasks based on:
Goal category
User's fitness level / study capacity
Progress so far
Completion rate
4. Day Progression System (Priority: MEDIUM)
Add functionality to move to the next day:
"Start New Day" button when all tasks complete
Increment currentDay counter
Load tomorrow's tasks
Check and maintain streak
5. Progressive Web App Features (Priority: MEDIUM)
Make it installable and work offline:

# Add PWA plugin
npm install vite-plugin-pwa -D
Then configure:
Service worker for offline caching
Web manifest for install prompt
Push notification setup (for daily check-ins)
App icons
6. Data Persistence Upgrade (Priority: LOW-MEDIUM)
Current: localStorage via Zustand persist Future: More robust storage

# Install Dexie for IndexedDB
npm install dexie
Benefits:
Handle larger datasets
Better performance
Structured queries
Vector storage for AI features
7. AI Integration (Priority: HIGH for full vision)
Local-First AI (Recommended for MVP+):

npm install @mlc-ai/web-llm
Use cases:
Generate daily tasks dynamically
Personalized encouragement messages
Adaptive difficulty based on completion
Conversational coach for motivation
Cloud Fallback (for complex planning):
Integrate OpenAI API or Claude API
Use for initial roadmap generation
Keep local AI for daily interactions
8. Analytics & Insights (Priority: LOW-MEDIUM)
Add a Progress/Stats screen:
Weekly completion chart
Streak history
Total time invested
Skills mastered
Phase completion timeline
9. Multi-Goal Support (Priority: MEDIUM)
Allow users to work on multiple goals simultaneously:
Add goal switcher on dashboard
Manage multiple roadmaps
Combined daily tasks from all goals
Smart scheduling (no conflicts)
10. Polish & UX Improvements (Priority: MEDIUM)
Add loading skeletons instead of blank screens
Smooth page transitions
Empty states with helpful messages
Error handling and validation
Toast notifications for success/error
Keyboard shortcuts (j/k for tasks, / for search)
🎯 My Recommendation: Choose ONE Path
Path A: Complete Core Loop First (Fastest to useful product)
✅ Test current MVP thoroughly
✅ Build multi-day task generation (7 days ahead)
✅ Add day progression system
✅ Add basic analytics (charts)
✅ Make it a PWA (installable + offline)
Ship it! Get real users testing
Timeline: 1-2 weeks Outcome: Fully functional habit tracker
Path B: AI-First Approach (Most aligned with PRD vision)
✅ Test current MVP
✅ Integrate local AI (WebLLM)
✅ Build AI task generation engine
✅ Add conversational AI coach
✅ Implement adaptive replanning
Ship it! As AI-powered consistency app
Timeline: 3-4 weeks Outcome: True AI personalization
Path C: Polish & Ship Fast (Get feedback quickly)
✅ Test & fix bugs
✅ Add 7 days of tasks (simple progression)
✅ Make it a PWA
✅ Deploy to Vercel/Netlify
✅ Share with 10 beta users
Iterate based on feedback
Timeline: 3-5 days Outcome: Real user feedback ASAP
💡 What I'd Do Next (If This Were My Project)
Week 1:
Test the current MVP thoroughly
Build a simple task progression system (14 days of tasks)
Add day progression ("Tomorrow" button)
Deploy to Vercel
Week 2:
Add basic PWA features (installable)
Create a simple analytics screen
Get 5-10 people to test it
Collect feedback
Week 3-4:
Based on feedback, decide: AI integration vs more features
If users love the concept → invest in AI
If users want more basics → add multi-goal support
🤔 Questions for You
To help you decide:
What's your primary goal?
Ship fast and get feedback? → Path C
Build the AI vision? → Path B
Create a complete product first? → Path A
Do you have access to users for testing?
Yes → Ship current MVP + simple tasks
No → Build more features first
What excites you most?
AI/ML integration → Focus on that
Beautiful UX → Polish what exists
Helping users → Get it in their hands ASAP
Tell me which path resonates, or if you want to build something specific next, and I'll help you implement it!