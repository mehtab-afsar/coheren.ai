/**
 * Agent 4: Task Generator
 *
 * Responsibilities:
 *   - Translate the current phase theme into ONE specific, step-by-step daily task
 *   - Apply stone-aware delivery rules (Starter Steps, Permission to Fail, time-boxing, etc.)
 *   - Inject RAG science context as expert coaching cues
 *   - Enrich each task with a Cinema Mode resource block (video + timestamp + coaching cue)
 *   - Output a validated DailyTask consumed directly by the Dashboard TodayView
 *
 * Model: economy (8b) by default — task generation runs daily; cost matters.
 *        Falls back to standard on rate limit or bad JSON.
 * Temperature: 0.5 — enough creativity for varied daily tasks, structured enough for JSON.
 */

import type {
  Agent2ProfileOutput,
  Agent3Output,
  DailyTask,
  Phase,
  StoneType,
  TaskStep,
} from '@types-app/agents';
import { callEconomy, callReasoning } from '@lib/ai-router';
import { matchTaskToResources } from '@lib/resourceMatcher';
import { retrieveKnowledgeSemantic } from '@core/rag/semantic-retriever';

// ─── Stone Delivery Rules ─────────────────────────────────────────────────────
// Each stone type changes HOW the task is delivered, not what it teaches.

const STONE_DELIVERY_RULES: Partial<Record<StoneType, string>> = {
  TimeConstraint: `
DELIVERY RULE — TimeConstraint:
- estimatedMinutes must be ≤ dailyTimeAvailable.
- Break each step into 15–20 min micro-blocks with explicit timers: "Set a 15-min timer."
- Prefer depth over breadth — one skill done well beats three skills rushed.`,

  ProcrastinationPattern: `
DELIVERY RULE — ProcrastinationPattern:
- Step 1 is ALWAYS a "Starter Step": ≤2 min, zero setup, trivially easy (e.g., "Open your IDE and create a new file." / "Put on your boxing gloves and stand in front of the mirror.").
- Place the hardest / most effortful step at position 2 (after the starter).
- Add an implementation intention as the final tip: "If I feel stuck, I will [specific tiny action]."`,

  Inconsistency: `
DELIVERY RULE — Inconsistency:
- Step 1 is a "Starter Step": the only goal is to begin (e.g., "Put on your shoes and stand at your desk.").
- Final tip must be a "Never Miss Twice" reminder: "If you skip today, the only rule is: do step 1 tomorrow no matter what."
- Keep the task completable in 60% of the time budget so "partial done" still counts.`,

  FearOfFailure: `
DELIVERY RULE — FearOfFailure:
- Frame the task as an experiment: title starts with "Experiment:" (e.g., "Experiment: Lead Jab Mechanics").
- Replace pass/fail success criteria with observation-based criteria (e.g., "You're done when you've tried the drill 10 times and noticed what feels awkward — there's no wrong answer.").
- Add a "Permission to Fail" tip: "Today's only job is to do the reps. Quality is irrelevant. Your nervous system is learning even when it feels wrong."`,

  Perfectionism: `
DELIVERY RULE — Perfectionism:
- Add an explicit time-box to every step (e.g., "Spend exactly 10 min — stop when the timer rings, even if it feels unfinished.").
- Add a "Permission to Fail" tip: "Your draft doesn't need to be good. It needs to exist. A rough version you finish beats a perfect version you never start."
- If domain is Creative, label the task as a "ROUGH DRAFT TASK" in the title.
- Success criteria must focus on completion, never quality.`,

  Overcommitment: `
DELIVERY RULE — Overcommitment:
- Hard cap: estimatedMinutes must not exceed Math.floor(dailyTimeAvailable × 0.85).
- Add a visible "STOP HERE" marker after the core exercise step: "If you've reached this point — you're done. Resist the urge to add more."
- Final tip: "The goal is sustainable momentum, not maximum output. Stop when planned."`,

  SkillGap: `
DELIVERY RULE — SkillGap:
- Step 1 is a 2-min prerequisite check: "Quick check: can you do [prerequisite]? If not, do [micro-resource] first."
- Use plain, directive language — no jargon. Every technical term must be explained in parentheses.
- Add a "Building Blocks" reference listing 1–2 previously mastered skills this task relies on.`,

  CognitiveFatigue: `
DELIVERY RULE — CognitiveFatigue:
- Maximum 3 steps per task. If more are needed, split into "Core" and "Optional Extension."
- Insert a mandatory 5-min break after step 2: "5-min break — stand up, get water, do not check your phone."
- Use bold headers for each step. Short paragraphs only (2–3 sentences max).`,

  FocusFragility: `
DELIVERY RULE — FocusFragility:
- Single-focus task only. Remove all optional, supplementary, or bonus sections.
- Task title must name exactly ONE action (e.g., "Practice the Lead Jab" not "Lead Jab + Defense Drill").
- Add an environment-prep step: "Before starting: phone on silent, close all browser tabs, set a 25-min timer."`,

  LowConfidence: `
DELIVERY RULE — LowConfidence:
- Success criteria must be very easy to achieve — the user should feel certain they can do it.
- Add a "You Already Know This" connection: reference a skill from a previous day that this builds on.
- whyThisMatters must emphasize identity growth: "Every rep is a vote for the person you're becoming."`,

  UnrealisticExpectations: `
DELIVERY RULE — UnrealisticExpectations:
- Add a calibration note in the description: "At this stage, [realistic expectation]. That is completely normal and expected."
- successCriteria.primary must include a realistic benchmark (e.g., "You're on track if you can do this at 60% of full speed.").`,
};

// ─── Domain Delivery Contexts ─────────────────────────────────────────────────

const DOMAIN_DELIVERY_CONTEXT: Record<string, string> = {
  Kinesthetic: `Domain: Physical/Motor Skill
- Every step must include body cues (e.g., "Lead shoulder forward. Chin tucked. Pivot off the ball of your foot.").
- Add a safety / warm-up reminder in the first or second step.
- Use imperative verbs: STAND, THROW, STEP, ROTATE. Not "try to" or "attempt."
- Cinema Mode coaching_cue must point to a specific body part or movement at a timestamp.`,

  Cognitive: `Domain: Knowledge/Study
- Emphasize active recall over passive reading. Include self-testing moments (e.g., "Close the guide and write the answer from memory.").
- Use Pomodoro framing: "25 minutes focused → 5 min break."
- coaching_cue should reference a concept, diagram, or example demonstrated in the video.`,

  Creative: `Domain: Creative Production
- Separate the "generative" steps (write, draw, draft) from "analytical" steps (review, edit).
- Never ask the user to edit and create in the same task.
- coaching_cue should highlight a creative principle or "how the expert approached the blank page."`,

  Career: `Domain: Career Development
- Tasks should produce a tangible artifact (e.g., a commit, a LinkedIn post, a sent email).
- Steps should have a "Proof of Work" end state (e.g., "Screenshot your output for your portfolio.").
- coaching_cue should highlight a professional principle or specific workflow tactic.`,

  Financial: `Domain: Financial Learning
- Label EVERY step explicitly as either "(Simulation)" or "(Real Action — only if ready)". Never mix both in the same step.
- Step 1 is ALWAYS a learning/simulation step — never a real-money action on Day 1 of a phase.
- Add a "Real Money Check" tip: "Before taking any real action with money, complete the simulation version first. Papertrading and hypothetical portfolios are valid practice."
- Use plain definitions for every financial term: write "ETF (Exchange-Traded Fund — a basket of stocks)" not just "ETF".
- coaching_cue should highlight a key risk/reward concept or mental model.`,

  Health: `Domain: Health & Wellness
- Include a check-in in step 1: "Rate your energy 1–5 right now. If ≤2, replace this with the recovery alternative."
- Safety note required if any physical risk exists.
- coaching_cue should highlight form, breathing, or a wellness principle.`,

  Lifestyle: `Domain: Lifestyle / Habit Building
- Anchor each step to an existing routine (e.g., "After your morning coffee, do step 2.").
- Include an environment-design tip: "Remove one friction point before starting."
- coaching_cue should highlight the habit formation principle the video demonstrates.`,
};

// ─── Phase Resolution ─────────────────────────────────────────────────────────
// Uses durationDays accumulation — the old weeks[] arithmetic was fragile.

export function resolvePhaseForDay(
  phases: Phase[],
  dayNumber: number,
): { phase: Phase; week: number; dayInPhase: number } {
  let accumulated = 0;

  for (const phase of phases) {
    const duration   = phase.durationDays ?? Math.round(phase.weeks.length * 7);
    const phaseStart = accumulated + 1;
    const phaseEnd   = accumulated + duration;

    if (dayNumber >= phaseStart && dayNumber <= phaseEnd) {
      const dayInPhase = dayNumber - accumulated;
      const week       = Math.ceil(dayInPhase / 7);
      return { phase, week, dayInPhase };
    }

    accumulated += duration;
  }

  // Overflow: clamp to last phase
  const last      = phases[phases.length - 1];
  const totalDays = phases.reduce((s, p) => s + (p.durationDays ?? 7), 0);
  const dayInPhase = dayNumber - (totalDays - (last.durationDays ?? 7));
  return { phase: last, week: Math.ceil(Math.max(dayInPhase, 1) / 7), dayInPhase: Math.max(dayInPhase, 1) };
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(
  domain: string,
  stones: StoneType[],
  dailyTimeAvailable: number,
): string {
  const domainCtx  = DOMAIN_DELIVERY_CONTEXT[domain] ?? '';
  const stoneRules = stones
    .map(s => STONE_DELIVERY_RULES[s] ?? '')
    .filter(Boolean)
    .join('\n');

  return `You are Agent 4: Daily Task Generator for Coheren AI.

Your job: Generate ONE specific, step-by-step task for today's curriculum day.

${domainCtx ? `── DOMAIN CONTEXT ──\n${domainCtx}\n` : ''}
── STONE-AWARE DELIVERY RULES ──
${stoneRules || 'No special delivery adjustments required.'}

── DOMAIN + STONE TIEBREAKER ──
If domain is Career AND FearOfFailure is an active stone:
- KEEP the Experiment framing in the title (e.g. "Experiment: Write LinkedIn About section").
- successCriteria.primary MUST name a specific deliverable — even a rough one counts.
  Examples: "About section written (quality is irrelevant, existence is the goal)",
            "Three job titles researched and noted down", "Email draft saved in drafts folder".
- Do NOT use open-ended criteria such as "just try it" or "see what happens".

If domain is Financial AND FearOfFailure is an active stone:
- ALL steps MUST be labeled "(Simulation)" — zero real-money action in this session.
- Title starts with "Experiment:" (e.g. "Experiment: Paper-Trade Your First ETF Purchase").
- successCriteria.primary measures understanding, not financial outcome:
  e.g. "You're done when you've completed the simulation and written one thing you noticed — there's no wrong answer."
- Add a "Safety Net" tip as the final tip: "This is a simulation. No real money will move. Your only job is to notice how the process feels."
- coaching_cue must reinforce that observation is the goal, not profit.

If domain is Financial AND ProcrastinationPattern is an active stone:
- Step 1 MUST be a concrete platform/tool ACTION — not a video or reading step.
  e.g. "Open your paper-trading account (or Investopedia Stock Simulator) and navigate to the search bar." — zero setup reading allowed.
- Step 2 is a ≤10-min simulation action before any learning content.
- Remove ALL standalone "watch/read X" steps — any learning must be embedded inside action steps as brief parenthetical notes.
- Add an implementation intention as the final tip: "If I feel the urge to research more first, I will do step 1 anyway for just 2 minutes."

If domain is Financial AND Overcommitment is an active stone:
- Any real-money step must specify the minimum viable amount: "Use no more than $5 or 1% of your planned budget — whichever is smaller."
- Add a hard-stop tip: "One action per session. Close the platform after completing step [N]. More moves do not mean more progress."

── GLOBAL RULES ──
1. estimatedMinutes ≤ ${dailyTimeAvailable}. Never exceed the daily time budget.
2. Steps must be specific and actionable — no vague instructions ("practice X" → "do 3×10 reps of X with a 90-second rest").
3. Every step has a duration (e.g., "10 minutes", "2 sets of 8 reps").
4. Include a Cinema Mode resource: a REAL, embeddable YouTube video URL (https://www.youtube.com/watch?v=VIDEO_ID) from a specific well-known educational channel you know. Set watchFrom/watchTo to the exact segment relevant to this task. The video ID must be a real 11-character YouTube video ID — do NOT use search URLs.
5. successCriteria.primary must be completion-based — not "do it perfectly" but "do it the specified number of times."
6. whyThisMatters connects to the original goal, not just the phase theme.

Return ONLY valid JSON in this exact schema:
{
  "day": <number>,
  "phase": <number>,
  "week": <number>,
  "task": {
    "title": "<action-oriented, specific>",
    "description": "<one sentence>",
    "estimatedMinutes": <number>,
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "<imperative verb + specific action>",
        "duration": "<time or rep count>",
        "details": "<optional extra context>",
        "resource": {
          "type": "video",
          "url": "https://www.youtube.com/watch?v=<REAL_VIDEO_ID>",
          "timestamp": "<e.g. 1:30–4:00>",
          "focusPoints": ["<coaching cue 1>", "<coaching cue 2>"]
        }
      }
    ],
    "tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
    "successCriteria": {
      "primary": "<completion-based>",
      "bonus": "<optional stretch goal>"
    },
    "whyThisMatters": "<2 sentences connecting to original goal>",
    "commonMistakes": ["<mistake 1>", "<mistake 2>"],
    "buildingOn": ["<Day X: skill>"],
    "nextUp": "<one sentence preview of tomorrow>",
    "adaptations_applied": {
      "<StoneType>": "<how this stone changed this specific task>"
    },
    "resources": {
      "primary": {
        "type": "video",
        "title": "<specific video title from a real YouTube video>",
        "url": "https://www.youtube.com/watch?v=<REAL_11_CHAR_VIDEO_ID>",
        "platform": "YouTube",
        "channel": "<channel name, e.g. JustinGuitar / freeCodeCamp / PsycheTruth>",
        "duration": "<total video length, e.g. 12:34>",
        "description": "<what this video teaches>",
        "why": "<why this exact segment is perfect for this day's task>",
        "watchFrom": "<MM:SS — start of relevant segment, e.g. 2:30>",
        "watchTo": "<MM:SS — end of relevant segment, e.g. 8:45>",
        "watchMinutes": <number — watchTo minus watchFrom in minutes>
      },
      "supplementary": []
    }
  }
}`;
}

function buildUserPrompt(
  dayNumber: number,
  goalLine: string,
  timeline: number,
  dailyTimeAvailable: number,
  phase: Phase,
  week: number,
  dayInPhase: number,
  stoneProfile: Agent2ProfileOutput,
  ragContext: string,
  previousTasksContext?: string,
): string {
  const sp = stoneProfile.stoneProfile;
  return `
ORIGINAL GOAL: "${goalLine}"
TIMELINE: ${timeline} days | DAILY TIME: ${dailyTimeAvailable} min

TODAY: Day ${dayNumber} | Phase ${phase.phaseNumber} ("${phase.phaseName}") | Week ${week} | Day ${dayInPhase} of Phase

PHASE CONTEXT:
- Primary Goals: ${phase.primaryGoals.join('; ')}
- Key Milestones: ${phase.keyMilestones.slice(0, 3).join('; ')}
- Science Rationale: ${phase.scienceRationale}
- Focus Areas: ${JSON.stringify(phase.focusAreas)}
${phase.adaptationRules ? `- If completing easily: ${phase.adaptationRules.if_completing_easily}` : ''}
${phase.adaptationRules ? `- If struggling: ${phase.adaptationRules.if_struggling}` : ''}

USER BEHAVIORAL PROFILE:
- Archetype: ${sp.userArchetype}
- Primary Stone: ${sp.primaryStone}
- Active Stones: ${sp.stones.map(s => `${s.type} [${s.severity}]`).join(', ')}
- Agent Guidance: ${sp.agent3Guidance.join(' | ')}

${ragContext ? `EXPERT SCIENCE CONTEXT (use for coaching cues and whyThisMatters):
${ragContext}

` : ''}${previousTasksContext ? `RECENT TASK HISTORY (for progression continuity):
${previousTasksContext}

` : ''}Generate Day ${dayNumber}'s task. Apply ALL delivery rules for the detected stones listed above.
`.trim();
}

// ─── URL Sanitizer ────────────────────────────────────────────────────────────
// 8b model falls back to well-known placeholder video IDs (e.g. dQw4w9WgXcQ).
// Convert any watch?v= URL with a placeholder ID (or any non-search watch URL
// that the model made up) to a youtube.com/results?search_query= URL derived
// from the task title so Cinema Mode always has a usable, searchable link.

const PLACEHOLDER_VIDEO_IDS = new Set([
  'dQw4w9WgXcQ', // Rick Astley — most common 8b fallback
  'xvFZjo5PgG0', // another common placeholder
  'VIDEO_ID',
  'XXXXXXXXXX',
]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function sanitizeResourceUrl(url: unknown, _taskTitle?: string): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;

  const raw = url.trim();

  // Search URLs are not embeddable — drop them so the resource library can supply a real video
  if (raw.includes('youtube.com/results?search_query=')) return null;

  // Detect watch?v= URLs — check if the video ID is a known placeholder
  const watchMatch = raw.match(/[?&]v=([A-Za-z0-9_-]{6,12})/);
  if (watchMatch) {
    const videoId = watchMatch[1];
    if (PLACEHOLDER_VIDEO_IDS.has(videoId)) {
      // Known placeholder — drop it so the resource library fills in a real video
      return null;
    }
    // Non-placeholder watch URL — accept it (real video the model recalled)
    return raw;
  }

  // youtu.be short links — accept as-is
  if (raw.includes('youtu.be/')) return raw;

  // Any other URL format — drop (not embeddable)
  return null;
}

function sanitizeResourceObject(res: unknown, taskTitle: string): unknown {
  if (typeof res !== 'object' || res === null) return res;
  const r = res as Record<string, unknown>;
  if (typeof r.url === 'string') {
    return { ...r, url: sanitizeResourceUrl(r.url, taskTitle) ?? r.url };
  }
  return res;
}

// ─── Validate & Normalize ─────────────────────────────────────────────────────

function validateAndNormalize(
  raw: unknown,
  dayNumber: number,
  phaseNumber: number,
  week: number,
  dailyTimeAvailable: number,
): DailyTask {
  const parsed = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const task   = (typeof parsed.task === 'object' && parsed.task !== null
    ? parsed.task : {}) as Record<string, unknown>;

  const taskTitle = typeof task.title === 'string' ? task.title : 'daily practice';

  // Steps
  const rawSteps = Array.isArray(task.steps) ? task.steps : [];
  const steps: TaskStep[] = rawSteps.map((s: unknown, i: number) => {
    const st = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
    return {
      stepNumber:  typeof st.stepNumber  === 'number' ? st.stepNumber : i + 1,
      instruction: typeof st.instruction === 'string' ? st.instruction : `Step ${i + 1}`,
      duration:    typeof st.duration    === 'string' ? st.duration    : '5 minutes',
      details:     st.details ?? undefined,
      resource:    st.resource ? sanitizeResourceObject(st.resource, taskTitle) : undefined,
      practice:    st.practice ?? undefined,
    } as TaskStep;
  });

  if (steps.length === 0) {
    steps.push({ stepNumber: 1, instruction: 'Complete today\'s practice.', duration: `${dailyTimeAvailable} minutes` });
  }

  // Minimum 2-step guard — 8b model can collapse conflicting stone rules into 1 step.
  // Split the only step into a low-friction starter + the main action.
  if (steps.length === 1) {
    const mainStep = steps[0];
    steps.unshift({
      stepNumber: 1,
      instruction: 'Set up your space: open what you need, set a timer, and take one slow breath. You are ready.',
      duration: '2 minutes',
    });
    mainStep.stepNumber = 2;
  }

  // Clamp estimatedMinutes
  const rawMin = typeof task.estimatedMinutes === 'number' ? task.estimatedMinutes : dailyTimeAvailable;
  const estimatedMinutes = Math.min(rawMin, dailyTimeAvailable);

  // Tips
  const tips = Array.isArray(task.tips)
    ? task.tips.filter((t): t is string => typeof t === 'string')
    : ['Focus on consistency over perfection today.'];

  // Resources — sanitize placeholder URLs produced by economy model
  const rawResources = (typeof task.resources === 'object' && task.resources !== null
    ? task.resources : {}) as Record<string, unknown>;
  const resources = {
    primary:       rawResources.primary
      ? sanitizeResourceObject(rawResources.primary, taskTitle)
      : null,
    supplementary: Array.isArray(rawResources.supplementary)
      ? (rawResources.supplementary as unknown[]).map(r => sanitizeResourceObject(r, taskTitle))
      : [],
  };

  // successCriteria
  const sc = (typeof task.successCriteria === 'object' && task.successCriteria !== null
    ? task.successCriteria : {}) as Record<string, unknown>;

  return {
    day:   typeof parsed.day   === 'number' ? parsed.day   : dayNumber,
    phase: typeof parsed.phase === 'number' ? parsed.phase : phaseNumber,
    week:  typeof parsed.week  === 'number' ? parsed.week  : week,
    task: {
      title:           typeof task.title       === 'string' ? task.title       : 'Today\'s Practice',
      description:     typeof task.description === 'string' ? task.description : '',
      estimatedMinutes,
      steps,
      tips,
      successCriteria: {
        primary: typeof sc.primary === 'string' ? sc.primary : 'Complete all steps.',
        bonus:   typeof sc.bonus   === 'string' ? sc.bonus   : undefined,
      },
      whyThisMatters:      typeof task.whyThisMatters  === 'string'   ? task.whyThisMatters as string : '',
      commonMistakes:      Array.isArray(task.commonMistakes)         ? task.commonMistakes as string[] : undefined,
      buildingOn:          Array.isArray(task.buildingOn)             ? task.buildingOn as string[] : undefined,
      nextUp:              typeof task.nextUp            === 'string'  ? task.nextUp as string : undefined,
      adaptations_applied: (typeof task.adaptations_applied === 'object' && task.adaptations_applied !== null)
        ? task.adaptations_applied as Record<string, string> : undefined,
      resources: resources as DailyTask['task']['resources'],
    },
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generateTask(
  dayNumber: number,
  roadmap: Agent3Output,
  stoneProfile: Agent2ProfileOutput,
  dailyTimeAvailable: number,
  previousTasksContext?: string,
  category?: string,
  skillLevel?: 'beginner' | 'intermediate' | 'advanced',
  ragContext?: string,
): Promise<DailyTask> {
  const phases                       = roadmap.roadmap.phases;
  const { phase, week, dayInPhase }  = resolvePhaseForDay(phases, dayNumber);
  const detectedStones               = stoneProfile.stoneProfile.stones.map(s => s.type as StoneType);

  // Infer domain — category from Agent 1 is the primary signal (exact, reliable).
  // domainPedagogy from Agent 3 is the fallback (keyword-based, can vary in phrasing).
  const categoryLower = (category ?? '').toLowerCase();
  const pedagogy      = roadmap.domainPedagogy?.toLowerCase() ?? '';

  let domain: string;
  if      (categoryLower === 'financial'   || pedagogy.includes('knowledge laddering'))                             domain = 'Financial';
  else if (categoryLower === 'cognitive'   || pedagogy.includes('spaced repetition') || pedagogy.includes('interleaving')) domain = 'Cognitive';
  else if (categoryLower === 'kinesthetic' || pedagogy.includes('periodization'))                                   domain = 'Kinesthetic';
  else if (categoryLower === 'career'      || (pedagogy.includes('build') && pedagogy.includes('convert')))        domain = 'Career';
  else if (categoryLower === 'creative'    || pedagogy.includes('divergent') || pedagogy.includes('convergent'))   domain = 'Creative';
  else if (categoryLower === 'health'      || pedagogy.includes('behavioral activation'))                          domain = 'Health';
  else                                                                                                              domain = 'Lifestyle';

  // Goal line from phase context
  const goalLine = phase.primaryGoals?.[0] ?? 'achieve the goal';

  // Auto-fetch RAG if not provided
  // Financial domain benefits from money-psychology / behavioural-finance framing.
  let science = ragContext ?? '';
  if (!science) {
    const primaryStone = stoneProfile.stoneProfile.primaryStone;
    const query = domain === 'Financial'
      ? `financial habit building ${primaryStone} behavioral change money psychology action bias`
      : `${phase.phaseName} ${primaryStone} daily practice habit coaching`;
    science = await retrieveKnowledgeSemantic({ query, matchCount: 2 });
  }

  const systemPrompt = buildSystemPrompt(domain, detectedStones, dailyTimeAvailable);
  const userPrompt   = buildUserPrompt(
    dayNumber, goalLine, roadmap.roadmap.totalDays, dailyTimeAvailable,
    phase, week, dayInPhase, stoneProfile, science, previousTasksContext,
  );

  const { content } = await callEconomy({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    temperature:     0.5,
    max_tokens:      2500,
    response_format: { type: 'json_object' },
  });

  if (!content) throw new Error('Agent 4: No response from model');

  const raw    = JSON.parse(content) as unknown;
  let result   = validateAndNormalize(raw, dayNumber, phase.phaseNumber, week, dailyTimeAvailable);

  // If the 8b model collapsed to 1 real step (the min-step guard injected a generic starter),
  // retry with the reasoning (70b) model for better stone-aware generation.
  const isGenericStarter = result.task.steps[0]?.instruction.includes('Set up your space');
  if (result.task.steps.length <= 2 && isGenericStarter) {
    try {
      const { content: retryContent } = await callReasoning({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        temperature:     0.5,
        max_tokens:      2500,
        response_format: { type: 'json_object' },
      });
      if (retryContent) {
        const retryRaw    = JSON.parse(retryContent) as unknown;
        const retryResult = validateAndNormalize(retryRaw, dayNumber, phase.phaseNumber, week, dailyTimeAvailable);
        if (retryResult.task.steps.length >= 2 && !retryResult.task.steps[0]?.instruction.includes('Set up your space')) {
          result = retryResult;
        }
      }
    } catch {
      // Non-blocking — 8b result is still valid
    }
  }

  // Augment with static resource library if category provided and LLM left resources empty
  if (category && !result.task.resources?.primary) {
    try {
      const matched = await matchTaskToResources(
        result.task.title,
        result.task.description,
        category,
        skillLevel ?? 'beginner',
      );
      result.task.resources = {
        primary:       matched.primary,
        supplementary: matched.supplementary,
      };
    } catch {
      // Non-blocking — resource matching is best-effort
    }
  }

  return result;
}
