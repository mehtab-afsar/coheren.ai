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
  ReviewMoment,
  Stone,
  StoneType,
  TaskStep,
  AssessmentQuestion,
} from '@types-app/agents';
import { callEconomy, callReasoning, callWithTools } from '@lib/ai-router';
import type { GroqTool } from '@lib/ai-router';
import { dailyTaskOutputSchema, safeValidate } from './schemas';
import { flags } from '@config/feature-flags';
import { retrieveKnowledgeSemantic, retrieveKnowledgeHybrid } from '@core/rag/semantic-retriever';
import { getSimilarTaskPatterns } from '@lib/sprintMemory';
import { getResourcesForTask, getEmbeddableVideoFallback } from '@lib/resourceRetriever';
import { isEmbeddableVideoUrl } from '@lib/youtube';
import { planSession, serializeBlueprint } from './session-planner';

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
  stones: Stone[],
  dailyTimeAvailable: number,
): string {
  const domainCtx  = DOMAIN_DELIVERY_CONTEXT[domain] ?? '';
  // Severity-weighted: Critical/High stones get full rules, Moderate get condensed, Low are mentioned only
  const stoneRules = stones
    .sort((a, b) => {
      const order: Record<string, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    })
    .map(s => {
      const rule = STONE_DELIVERY_RULES[s.type] ?? '';
      if (!rule) return '';
      if (s.severity === 'Low') return `DELIVERY NOTE — ${s.type} (low severity): Be aware of this tendency but don't restructure the task for it.`;
      if (s.severity === 'Moderate') return rule + `\n(Moderate severity — apply these rules but allow flexibility)`;
      return rule; // Critical/High — full rules
    })
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
- successCriteria must name a specific deliverable — even a rough one counts.
  Examples: "About section written (quality is irrelevant, existence is the goal)",
            "Three job titles researched and noted down", "Email draft saved in drafts folder".
- Do NOT use open-ended criteria such as "just try it" or "see what happens".

If domain is Financial AND FearOfFailure is an active stone:
- ALL steps MUST be labeled "(Simulation)" — zero real-money action in this session.
- Title starts with "Experiment:" (e.g. "Experiment: Paper-Trade Your First ETF Purchase").
- successCriteria measures understanding, not financial outcome.
- Add a "Safety Net" coachTip as the final tip: "This is a simulation. No real money will move. Your only job is to notice how the process feels."

If domain is Financial AND ProcrastinationPattern is an active stone:
- Step 1 MUST be a concrete platform/tool ACTION — not a video or reading step.
- Step 2 is a ≤10-min simulation action before any learning content.
- Remove ALL standalone "watch/read X" steps — any learning must be embedded inside action steps as brief parenthetical notes.
- Add an implementation intention as the final coachTip.

If domain is Financial AND Overcommitment is an active stone:
- Any real-money step must specify the minimum viable amount: "Use no more than $5 or 1% of your planned budget — whichever is smaller."
- Add a hard-stop coachTip: "One action per session. Close the platform after completing step [N]. More moves do not mean more progress."

── GLOBAL RULES ──
1. duration (minutes) ≤ ${dailyTimeAvailable}. Never exceed the daily time budget.
2. Steps must be specific and actionable — no vague instructions ("practice X" → "do 3×10 reps of X with a 90-second rest").
3. Every step has a duration (e.g., "10 minutes", "2 sets of 8 reps").
4. RESOURCE HANDLING:
   - If a "RESOURCE FOR TODAY'S TASK" block is provided below: Step 1 of the task MUST direct the user to watch/read it using the exact URL and timestamps provided. Reference specific timestamps in subsequent steps (e.g., "at 3:15 in the video, notice how…"). Do NOT invent any other URLs. Use ONLY the resource provided.
   - If NO resource is provided: keep the task fully self-contained. No external URLs. No "go watch this video."
5. For learning tasks with a resource: guide the user through the content — what to pay attention to and when.
   For learning tasks without a resource: explain the concept inline with examples. The user must understand without going elsewhere.
6. For practice tasks: describe the exercise precisely. The user must know exactly what to do.
7. successCriteria must be completion-based — not "do it perfectly" but "do it the specified number of times."
8. coachTips come from the RAG science context provided — cite the framework/principle.

── 30-30-40 ACTIVITY SEGMENTS (MANDATORY) ──
Every task MUST have exactly 3 segments. Segment durations must sum exactly to the task duration.
- Segment 1 (~30%): Acquisition — reading, watching, theory, concept intake
- Segment 2 (~30%): Active processing — problems, drills, practice, exercises  
- Segment 3 (~40%): Consolidation — recall, review, synthesis, note-making, reflection

Each segment needs a concrete 1-2 sentence description of exactly what to do in that block.
For rest days (type=rest): use a single segment { label: "Rest", duration: <full duration>, description: "Recovery day — no structured activity today." }

── PREP REQUIRED (OPTIONAL) ──
Only include requiresPrep if this task genuinely needs physical setup, printed materials, or downloads before starting (e.g., "print past papers", "install app X"). Leave it out entirely if no prep is needed — most tasks don't need it.

OUTPUT FORMAT — return ONLY valid JSON:
{
  "day": <number>,
  "week": <number>,
  "month": <number>,
  "task": {
    "title": "<action-oriented, specific>",
    "type": "<learning|practice|reflection|challenge|retrieval|rest>",
    "duration": <number in minutes>,
    "description": "<2-3 paragraphs explaining the concept OR describing the exercise. For learning tasks: teach the concept inline with examples. For practice tasks: describe exactly what the user will do. For reflection tasks: pose a thoughtful question. NO external links. NO 'go watch this video'. All content is self-contained.>",
    "segments": [
      { "label": "Learn", "duration": <minutes>, "description": "<1-2 sentences: exactly what to do>", "tip": "<optional>" },
      { "label": "Practice", "duration": <minutes>, "description": "<1-2 sentences: specific exercise>", "tip": "<optional>" },
      { "label": "Review", "duration": <minutes>, "description": "<1-2 sentences: how to consolidate>", "tip": "<optional>" }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "<imperative verb + specific action>",
        "duration": "<time or rep count>",
        "tip": "<optional coaching cue>"
      }
    ],
    "coachTips": ["<tip 1 from RAG knowledge>", "<tip 2 stone-aware>", "<tip 3>"],
    "successCriteria": "<how the user knows they are done — completion-based, never quality-based>",
    "reflection": "<optional end-of-task question>",
    "requiresPrep": { "items": ["<item>"], "note": "<one action to do before starting>" },
    "adaptations_applied": {
      "<StoneType>": "<what was changed and why>"
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
  resourceContext?: import('@types-app/agents').TaskResource | null,
  weekContentSummary?: string,
): string {
  const sp = stoneProfile.stoneProfile;
  const phasePct = Math.round((dayInPhase / (phase.durationDays ?? 14)) * 100);

  let progressionNote: string;
  if (phasePct < 20) {
    progressionNote = 'EARLY PHASE (0-20%): Build confidence. Keep tasks simple and achievable. Prioritize showing up over difficulty.';
  } else if (phasePct < 50) {
    progressionNote = 'MID-EARLY PHASE (20-50%): Introduce moderate complexity. User has baseline — start building real skill reps.';
  } else if (phasePct < 80) {
    progressionNote = 'MID-LATE PHASE (50-80%): Challenge the user. Tasks should approach milestone difficulty. Push toward the phase goal.';
  } else {
    progressionNote = `PHASE TRANSITION (80-100%): Consolidate and prepare. This task should review key learnings and bridge to the next phase. Hint at what comes next.`;
  }

  return `
ORIGINAL GOAL: "${goalLine}"
TIMELINE: ${timeline} days | DAILY TIME: ${dailyTimeAvailable} min

TODAY: Day ${dayNumber} | Phase ${phase.phaseNumber} ("${phase.phaseName}") | Week ${week} | Day ${dayInPhase} of ${phase.durationDays ?? '?'} in phase (${phasePct}% through phase)

PHASE PROGRESSION DIRECTIVE: ${progressionNote}

PHASE CONTEXT:
- Primary Goals: ${phase.primaryGoals.join('; ')}
- Key Milestones: ${phase.keyMilestones.slice(0, 3).join('; ')}
- Science Rationale: ${phase.scienceRationale}
- Focus Areas: ${JSON.stringify(phase.focusAreas)}
${phase.adaptationRules ? `- If completing easily: ${phase.adaptationRules.if_completing_easily}` : ''}
${phase.adaptationRules ? `- If struggling: ${phase.adaptationRules.if_struggling}` : ''}
${phase.daySkeleton?.[dayInPhase - 1] ? `
TODAY'S SKELETON (from curriculum plan — follow this closely):
- Theme: ${phase.daySkeleton[dayInPhase - 1].theme}
- Task Type: ${phase.daySkeleton[dayInPhase - 1].taskType}
- Intensity: ${phase.daySkeleton[dayInPhase - 1].intensity}
- Focus Area: ${phase.daySkeleton[dayInPhase - 1].focusArea}
Generate a task that matches this skeleton exactly. The theme tells you WHAT to teach, the type tells you HOW.` : ''}

USER BEHAVIORAL PROFILE:
- Archetype: ${sp.userArchetype}
- Primary Stone: ${sp.primaryStone}
- Active Stones: ${sp.stones.map(s => `${s.type} [${s.severity}]`).join(', ')}
- Agent Guidance: ${sp.agent3Guidance.join(' | ')}

${resourceContext ? `RESOURCE FOR TODAY'S TASK:
  Title: "${resourceContext.title}"
  URL: ${resourceContext.url}
  Platform: ${resourceContext.platform ?? 'YouTube'}${resourceContext.channel ? `\n  Channel: ${resourceContext.channel}` : ''}${resourceContext.duration ? `\n  Duration: ${resourceContext.duration}` : ''}${(resourceContext as { watchFrom?: string }).watchFrom ? `\n  Watch from: ${(resourceContext as { watchFrom?: string }).watchFrom}` : ''}${(resourceContext as { watchTo?: string }).watchTo ? ` → ${(resourceContext as { watchTo?: string }).watchTo}` : ''}${resourceContext.timestamps && Object.keys(resourceContext.timestamps).length > 0 ? `\n  Key timestamps: ${Object.entries(resourceContext.timestamps).map(([k, v]) => `${v} — ${k}`).join(', ')}` : ''}
  Why this resource: ${resourceContext.why}

INSTRUCTION: Step 1 MUST direct the user to watch/read this resource with the exact URL. Reference specific timestamps when instructing the user to pay attention to something.

` : ''}${ragContext ? `EXPERT SCIENCE CONTEXT (use for coaching cues and whyThisMatters):
${ragContext}

` : ''}${weekContentSummary ? `CONTENT LEARNED THIS WEEK (this is a practice/retrieval task — reference these specifically):
${weekContentSummary}

` : ''}${previousTasksContext ? `RECENT TASK HISTORY — DO NOT repeat these topics. Build on them:
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

export function sanitizeResourceUrl(url: unknown, taskTitle?: string): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;

  const raw = url.trim();

  // Search URLs are not embeddable as iframes but ResourceCard renders them as a clickable
  // "Search YouTube" card — keep them so users get a usable link
  if (raw.includes('youtube.com/results?search_query=')) return raw;

  // Detect watch?v= URLs — check if the video ID is a known placeholder
  const watchMatch = raw.match(/[?&]v=([A-Za-z0-9_-]{6,12})/);
  if (watchMatch) {
    const videoId = watchMatch[1];
    if (PLACEHOLDER_VIDEO_IDS.has(videoId)) {
      // Known placeholder — convert to a search URL using the task title so
      // ResourceCard can still show a usable "Search YouTube" link
      if (taskTitle) {
        const q = encodeURIComponent(taskTitle);
        return `https://www.youtube.com/results?search_query=${q}`;
      }
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

// ─── JSON Repair ──────────────────────────────────────────────────────────────
// LLMs often wrap JSON in markdown code fences or produce minor syntax errors.

export function repairJSON(raw: string): string {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1];

  // Find the outermost JSON object boundaries
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    raw = raw.substring(start, end + 1);
  }

  // Fix common LLM JSON errors
  raw = raw
    .replace(/,\s*}/g, '}')       // trailing commas before }
    .replace(/,\s*]/g, ']')       // trailing commas before ]
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"'); // smart double quotes

  return raw;
}

// ─── Task Validator ───────────────────────────────────────────────────────────
// Catches low-quality outputs before they reach the user.
// Returns a list of issues; empty array = valid.

const VAGUE_STEP_PATTERNS = [
  /^practice\b/i,
  /^study\b/i,
  /^work on\b/i,
  /^learn\b/i,
  /^review\b/i,
  /\[insert\]/i,
  /\[your\]/i,
  /\bTBD\b/,
  /etc\.?\s*$/i,
  /and so on/i,
  /find a tutorial/i,
  /search for/i,
  /look up.*tutorial/i,
];

const VAGUE_CRITERIA_PATTERNS = [
  /\bunderstand\b/i,
  /\blearn\b/i,
  /\bknow\b/i,
  /\bfeel\b/i,
  /\bget comfortable\b/i,
  /\bgrasp\b/i,
  /\bfamiliar\b/i,
];

interface TaskValidationResult {
  valid: boolean;
  issues: string[];
}

function validateTaskQuality(task: DailyTask['task'], dailyTimeAvailable?: number): TaskValidationResult {
  const issues: string[] = [];

  // Must have at least 3 steps
  if (!task.steps || task.steps.length < 3) {
    issues.push(`Only ${task.steps?.length ?? 0} steps — minimum 3 required`);
  }

  // Title must be specific (not generic like "Day 5 Task")
  const genericTitlePatterns = [/^day\s+\d+/i, /^task\s+\d+/i, /^today'?s?\s+task/i, /^practice\s+session$/i];
  for (const pattern of genericTitlePatterns) {
    if (pattern.test(task.title)) {
      issues.push(`Generic title: "${task.title}" — must name the specific activity`);
      break;
    }
  }

  // Duration must not exceed daily time budget
  const taskDuration = task.estimatedMinutes ?? (task as unknown as Record<string, unknown>).duration;
  if (dailyTimeAvailable && typeof taskDuration === 'number' && taskDuration > dailyTimeAvailable * 1.1) {
    issues.push(`Duration ${taskDuration}min exceeds budget ${dailyTimeAvailable}min`);
  }

  // Steps must be specific (at least 6 words)
  for (const step of task.steps ?? []) {
    const wordCount = step.instruction.split(/\s+/).length;
    if (wordCount < 6) {
      issues.push(`Step ${step.stepNumber} too short (${wordCount} words): "${step.instruction}"`);
    }
    for (const pattern of VAGUE_STEP_PATTERNS) {
      if (pattern.test(step.instruction)) {
        issues.push(`Step ${step.stepNumber} is vague: "${step.instruction.slice(0, 60)}"`);
        break;
      }
    }
    // Each step should have a duration
    if (!step.duration || step.duration.trim().length === 0) {
      issues.push(`Step ${step.stepNumber} missing duration`);
    }
  }

  // Must have at least 2 coachTips (or tips in legacy format)
  const tipCount = task.tips?.length ?? 0;
  if (tipCount < 2) {
    issues.push(`Only ${tipCount} tips — minimum 2 required`);
  }

  // Success criteria must be concrete
  const primary = typeof task.successCriteria === 'string'
    ? task.successCriteria
    : (task.successCriteria as Record<string, unknown> | undefined)?.primary as string ?? '';
  if (!primary) {
    issues.push('Missing success criteria');
  } else {
    for (const pattern of VAGUE_CRITERIA_PATTERNS) {
      if (pattern.test(primary)) {
        issues.push(`Vague success criteria: "${primary.slice(0, 80)}"`);
        break;
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

// ─── Validate & Normalize ─────────────────────────────────────────────────────

function validateAndNormalize(
  raw: unknown,
  dayNumber: number,
  phaseNumber: number,
  week: number,
  dailyTimeAvailable: number,
): DailyTask {
  // Boundary contract: validate the raw LLM output against the zod schema. Non-throwing —
  // a mismatch is logged (drift observability) and we fall through to the coercion below,
  // which fills safe defaults. (The pipeline also has quality-gate retry + a deterministic
  // fallback, so genuinely-broken output still degrades gracefully.)
  safeValidate(dailyTaskOutputSchema, raw, 'agent4-task');

  const parsed = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const task   = (typeof parsed.task === 'object' && parsed.task !== null
    ? parsed.task : {}) as Record<string, unknown>;

  // Steps
  const rawSteps = Array.isArray(task.steps) ? task.steps : [];
  const steps: TaskStep[] = rawSteps.map((s: unknown, i: number) => {
    const st = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
    return {
      stepNumber:  typeof st.stepNumber  === 'number' ? st.stepNumber : i + 1,
      instruction: typeof st.instruction === 'string' ? st.instruction : `Step ${i + 1}`,
      duration:    typeof st.duration    === 'string' ? st.duration    : '5 minutes',
      details:     typeof st.tip === 'string' ? st.tip : undefined, // map tip → details
    } as TaskStep;
  });

  if (steps.length === 0) {
    steps.push({ stepNumber: 1, instruction: 'Complete today\'s practice.', duration: `${dailyTimeAvailable} minutes` });
  }

  // Minimum 2-step guard
  if (steps.length === 1) {
    const mainStep = steps[0];
    steps.unshift({
      stepNumber: 1,
      instruction: 'Set up your space: open what you need, set a timer, and take one slow breath. You are ready.',
      duration: '2 minutes',
    });
    mainStep.stepNumber = 2;
  }

  // Clamp estimatedMinutes — support both old (estimatedMinutes) and new (duration) field name
  const rawMin = typeof task.estimatedMinutes === 'number' ? task.estimatedMinutes
    : typeof task.duration === 'number' ? task.duration
    : dailyTimeAvailable;
  const estimatedMinutes = Math.min(rawMin, dailyTimeAvailable);

  // Segments (Learn / Practice / Review blocks)
  const rawSegments = Array.isArray(task.segments) ? task.segments : [];
  let segments: import('@types-app/agents').TaskSegment[] | undefined;
  if (rawSegments.length > 0) {
    segments = rawSegments.map((s: unknown) => {
      const seg = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
      return {
        label:       typeof seg.label       === 'string' ? seg.label       : 'Practice',
        duration:    typeof seg.duration    === 'number' ? seg.duration    : Math.round(estimatedMinutes / rawSegments.length),
        description: typeof seg.description === 'string' ? seg.description : '',
        tip:         typeof seg.tip         === 'string' ? seg.tip         : undefined,
      };
    });
    // Validate segment sum — redistribute if off by > 10%
    const segSum = segments.reduce((s, seg) => s + seg.duration, 0);
    if (segSum > 0 && Math.abs(segSum - estimatedMinutes) / estimatedMinutes > 0.10) {
      const scale = estimatedMinutes / segSum;
      segments = segments.map((seg, i) => ({
        ...seg,
        duration: i === segments!.length - 1
          ? Math.max(1, estimatedMinutes - segments!.slice(0, -1).reduce((s, sg) => s + Math.max(1, Math.round(sg.duration * scale)), 0))
          : Math.max(1, Math.round(seg.duration * scale)),
      }));
    }
  }

  // coachTips (new) — fall back to tips (old) if present
  const coachTips = Array.isArray(task.coachTips)
    ? (task.coachTips as unknown[]).filter((t): t is string => typeof t === 'string')
    : Array.isArray(task.tips)
    ? (task.tips as unknown[]).filter((t): t is string => typeof t === 'string')
    : ['Focus on consistency over perfection today.'];

  // successCriteria — support both string (new) and object (old) format
  let successCriteriaStr: string;
  if (typeof task.successCriteria === 'string') {
    successCriteriaStr = task.successCriteria;
  } else if (typeof task.successCriteria === 'object' && task.successCriteria !== null) {
    const sc = task.successCriteria as Record<string, unknown>;
    successCriteriaStr = typeof sc.primary === 'string' ? sc.primary : 'Complete all steps.';
  } else {
    successCriteriaStr = 'Complete all steps.';
  }

  return {
    day:   typeof parsed.day   === 'number' ? parsed.day   : dayNumber,
    phase: typeof parsed.phase === 'number' ? parsed.phase : phaseNumber,
    week:  typeof parsed.week  === 'number' ? parsed.week  : week,
    task: {
      title:           typeof task.title       === 'string' ? task.title       : 'Today\'s Practice',
      description:     typeof task.description === 'string' ? task.description : '',
      estimatedMinutes,
      segments,
      steps,
      tips: coachTips,
      successCriteria: {
        primary: successCriteriaStr,
      },
      whyThisMatters:      typeof task.whyThisMatters  === 'string'   ? task.whyThisMatters as string : '',
      commonMistakes:      Array.isArray(task.commonMistakes)         ? task.commonMistakes as string[] : undefined,
      buildingOn:          Array.isArray(task.buildingOn)             ? task.buildingOn as string[] : undefined,
      nextUp:              typeof task.nextUp            === 'string'  ? task.nextUp as string : undefined,
      adaptations_applied: (typeof task.adaptations_applied === 'object' && task.adaptations_applied !== null)
        ? task.adaptations_applied as Record<string, string> : undefined,
      resources: { primary: null, supplementary: [] },
    },
  };
}

// ─── Assessment Task Generation ──────────────────────────────────────────────
// When the current day is a ReviewMoment, generate assessment questions instead
// of a regular practice task.

const DOMAIN_ASSESSMENT_FORMAT: Record<string, string> = {
  Kinesthetic: `ASSESSMENT FORMAT: Self-Assessment Rubric
This is a PHYSICAL domain — you cannot auto-grade motor skills.
Generate questions using "self_rate" type with rubric criteria.
Each question should ask the user to perform a skill and rate themselves.
Example: "Perform 10 jabs. Rate yourself on: guard position (1-5), hip rotation (1-5), return to stance (1-5)."
Include specific body cues they should look for.`,

  Cognitive: `ASSESSMENT FORMAT: Knowledge Check (Auto-Gradeable)
This is a KNOWLEDGE domain — use auto-gradeable question types.
Generate questions using "multiple_choice" and "true_false" types.
Include the correct answer in the "correctAnswer" field.
Questions should test recall, application, and analysis.`,

  Creative: `ASSESSMENT FORMAT: Portfolio Self-Assessment
This is a CREATIVE domain — quality is subjective.
Generate questions using "self_rate" and "open_ended" types.
Ask users to recreate/perform something from earlier days and rate themselves.
Include specific criteria in the rubric (timing, tone, technique).
Example: "Play the chord progression from Day 3. Rate: smooth transitions (1-5), consistent rhythm (1-5)."`,

  Career: `ASSESSMENT FORMAT: Artifact Review
This is a CAREER domain — assess tangible outputs.
Generate questions using "self_rate" and "open_ended" types.
Ask users to review their artifacts and rate completeness.
Example: "Review your portfolio draft. Does it include: project description (1-5), measurable outcomes (1-5), clear role statement (1-5)?"`,

  Financial: `ASSESSMENT FORMAT: Simulation Check
This is a FINANCIAL domain — test understanding through scenarios.
Generate questions using "multiple_choice" and "true_false" types for concept knowledge.
Add "self_rate" questions for decision-making confidence.
All questions must be labeled "(Simulation)" — never reference real money.`,

  Health: `ASSESSMENT FORMAT: Self-Assessment + Tracking
This is a HEALTH domain — combine objective metrics with subjective ratings.
Generate "self_rate" questions for form/technique and "multiple_choice" for knowledge.`,

  Lifestyle: `ASSESSMENT FORMAT: Habit Tracking Review
This is a LIFESTYLE domain — assess habit consistency and identity shift.
Generate "self_rate" questions about habit execution and "open_ended" for reflection.`,
};

function buildAssessmentSystemPrompt(domain: string, reviewType: ReviewMoment['type']): string {
  const formatGuide = DOMAIN_ASSESSMENT_FORMAT[domain] ?? DOMAIN_ASSESSMENT_FORMAT['Cognitive'];

  const questionCount = reviewType === 'reflection' ? '2-3'
    : reviewType === 'checkpoint' ? '3-4'
    : reviewType === 'mid_assessment' ? '4-6'
    : '5-8'; // final_assessment

  return `You are Agent 4: Assessment Generator for Coheren AI.

Your job: Generate assessment questions that test what the user has learned.
This is a ${reviewType.replace('_', ' ')} — generate ${questionCount} questions.

${formatGuide}

── QUESTION DIFFICULTY LEVELS ──
- "recall": Can the user remember key facts/techniques? (easiest)
- "apply": Can the user use what they learned in a new context? (medium)
- "analyze": Can the user break down and evaluate their own performance? (hardest)

Mix difficulty levels. Start with recall, end with analyze.

── RULES ──
1. Every question must reference a specific skill or concept from the related days.
2. For self_rate questions, always provide a clear rubric explaining what each score means.
3. For multiple_choice, provide 3-4 options with exactly one correct answer.
4. For true_false, the correct answer must be "true" or "false".
5. Each question needs a unique id (snake_case).

Return ONLY valid JSON:
{
  "assessmentQuestions": [
    {
      "id": "unique_snake_case_id",
      "type": "multiple_choice|open_ended|true_false|self_rate|ordering",
      "question": "The question text",
      "options": [{"value": "a", "label": "Option A", "correct": true}],
      "correctAnswer": "a",
      "rubric": "For self_rate: what 1 means, what 5 means",
      "relatedDay": 1,
      "relatedSkill": "specific skill being tested",
      "difficulty": "recall|apply|analyze"
    }
  ],
  "assessmentTitle": "Short title for this assessment",
  "assessmentDescription": "One sentence explaining what this tests"
}`;
}

function buildAssessmentUserPrompt(
  reviewMoment: ReviewMoment,
  phase: Phase,
  goalLine: string,
  previousTasksContext?: string,
): string {
  return `Generate assessment questions for this review moment.

GOAL: "${goalLine}"
REVIEW TYPE: ${reviewMoment.type}
REVIEW DAY: Day ${reviewMoment.day}
PHASE: ${phase.phaseName} (Phase ${phase.phaseNumber})
PHASE GOALS: ${phase.primaryGoals.join('; ')}

${reviewMoment.relatedSkills && reviewMoment.relatedSkills.length > 0
  ? `SKILLS TO TEST:\n${reviewMoment.relatedSkills.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
  : 'Test the core skills from this phase.'}

${reviewMoment.relatedDays && reviewMoment.relatedDays.length > 0
  ? `CONTENT FROM DAYS: ${reviewMoment.relatedDays.join(', ')}`
  : ''}

${previousTasksContext ? `RECENT TASKS (reference these for question content):\n${previousTasksContext}` : ''}

${reviewMoment.prompt ? `REVIEW PROMPT: ${reviewMoment.prompt}` : ''}

Generate questions that genuinely test retention and application — not just recognition.`.trim();
}

interface AssessmentLLMOutput {
  assessmentQuestions: AssessmentQuestion[];
  assessmentTitle: string;
  assessmentDescription: string;
}

async function generateAssessmentQuestions(
  reviewMoment: ReviewMoment,
  phase: Phase,
  domain: string,
  goalLine: string,
  previousTasksContext?: string,
): Promise<AssessmentLLMOutput> {
  const systemPrompt = buildAssessmentSystemPrompt(domain, reviewMoment.type);
  const userPrompt = buildAssessmentUserPrompt(reviewMoment, phase, goalLine, previousTasksContext);

  const { content } = await callReasoning({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  if (!content) throw new Error('Agent 4 Assessment: No response from model');

  let raw: AssessmentLLMOutput;
  try {
    raw = JSON.parse(repairJSON(content)) as AssessmentLLMOutput;
  } catch (e) {
    throw new Error(`Agent 4 Assessment: invalid JSON — ${(e as Error).message}`);
  }

  // Validate
  if (!Array.isArray(raw.assessmentQuestions) || raw.assessmentQuestions.length === 0) {
    throw new Error('Agent 4 Assessment: No questions generated');
  }

  // Normalize questions
  raw.assessmentQuestions = raw.assessmentQuestions.map((q, i) => ({
    ...q,
    id: q.id || `q_${i + 1}`,
    relatedDay: q.relatedDay || reviewMoment.day,
    relatedSkill: q.relatedSkill || 'general',
    difficulty: q.difficulty || 'recall',
  }));

  return raw;
}

// ─── Tool Schema (for native function calling) ────────────────────────────────

const GENERATE_TASK_TOOL: GroqTool = {
  type: 'function',
  function: {
    name: 'generate_daily_task',
    description: 'Generate a structured daily practice task for the user.',
    parameters: {
      type: 'object',
      properties: {
        day:   { type: 'integer' },
        week:  { type: 'integer' },
        phase: { type: 'integer' },
        task: {
          type: 'object',
          properties: {
            title:            { type: 'string' },
            type:             { type: 'string', enum: ['learning', 'practice', 'reflection', 'challenge', 'retrieval', 'rest'] },
            estimatedMinutes: { type: 'integer', minimum: 5, maximum: 180 },
            description:      { type: 'string' },
            coachTips:        { type: 'array', items: { type: 'string' }, minItems: 2 },
            successCriteria:  { type: 'string' },
            whyThisMatters:   { type: 'string' },
            steps: {
              type: 'array',
              minItems: 3,
              items: {
                type: 'object',
                properties: {
                  stepNumber:  { type: 'integer' },
                  instruction: { type: 'string' },
                  duration:    { type: 'string' },
                  tip:         { type: 'string' },
                },
                required: ['stepNumber', 'instruction', 'duration'],
              },
            },
            segments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label:       { type: 'string' },
                  duration:    { type: 'integer' },
                  description: { type: 'string' },
                  tip:         { type: 'string' },
                },
                required: ['label', 'duration', 'description'],
              },
            },
          },
          required: ['title', 'estimatedMinutes', 'steps', 'successCriteria', 'coachTips'],
        },
      },
      required: ['task'],
    },
  },
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generateTask(
  dayNumber: number,
  roadmap: Agent3Output,
  stoneProfile: Agent2ProfileOutput,
  dailyTimeAvailable: number,
  previousTasksContext?: string,
  category?: string,
  _skillLevel?: 'beginner' | 'intermediate' | 'advanced',
  ragContext?: string,
  goalText?: string,
  variantHint?: string,
  weekContentSummary?: string,
): Promise<DailyTask> {
  const phases                       = roadmap.roadmap.phases;
  const { phase, week, dayInPhase }  = resolvePhaseForDay(phases, dayNumber);
  const detectedStones               = stoneProfile.stoneProfile.stones;

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
  const goalLine = goalText ?? phase.primaryGoals?.[0] ?? 'achieve the goal';

  // ── Assessment Day Check ──
  // If today is a ReviewMoment (assessment/retrieval/challenge), generate assessment questions
  const reviewMoment = roadmap.roadmap.reviewMoments?.find(
    rm => rm.day === dayNumber && (rm.type === 'mid_assessment' || rm.type === 'final_assessment' || rm.type === 'checkpoint')
  );

  if (reviewMoment) {
    try {
      const assessment = await generateAssessmentQuestions(
        reviewMoment, phase, domain, goalLine, previousTasksContext,
      );

      // Map review type to task type
      const taskType: 'challenge' | 'retrieval' | 'assessment' =
        reviewMoment.type === 'checkpoint' ? 'retrieval'
        : reviewMoment.type === 'final_assessment' ? 'assessment'
        : 'challenge';

      // Build a DailyTask that wraps the assessment
      const assessmentTask: DailyTask = {
        day: dayNumber,
        phase: phase.phaseNumber,
        week,
        task: {
          title: assessment.assessmentTitle || `${reviewMoment.type.replace('_', ' ')} — Day ${dayNumber}`,
          description: assessment.assessmentDescription || reviewMoment.prompt || 'Show what you know.',
          estimatedMinutes: Math.min(dailyTimeAvailable, reviewMoment.type === 'final_assessment' ? 30 : 15),
          steps: [{
            stepNumber: 1,
            instruction: 'Complete the assessment questions below. Take your time and be honest with your answers.',
            duration: `${Math.min(dailyTimeAvailable, 15)} minutes`,
          }],
          tips: [
            'Be honest with your self-assessments — accuracy helps the curriculum adapt to you.',
            'If you are unsure about an answer, mark your confidence level accordingly.',
          ],
          successCriteria: {
            primary: 'Complete all assessment questions with honest responses.',
          },
          whyThisMatters: 'Regular assessment helps identify what you have mastered and what needs more practice. This directly improves your curriculum.',
          resources: { primary: null, supplementary: [] },
        },
      };

      // Attach assessment questions as extra metadata (consumed by the store)
      (assessmentTask as DailyTask & { assessmentQuestions: AssessmentQuestion[]; taskType: string }).assessmentQuestions = assessment.assessmentQuestions;
      (assessmentTask as DailyTask & { taskType: string }).taskType = taskType;

      return assessmentTask;
    } catch (err) {
      console.warn(`⚠️ Agent 4: Assessment generation failed for Day ${dayNumber}, falling back to regular task:`, err);
      // Fall through to regular task generation
    }
  }

  // ── Resource-first fetch ──
  // Fetch the best curated resource for today's topic BEFORE building the prompt
  // so Agent 4 can write steps that reference the specific video/article.
  // Uses the day skeleton theme as the search query (more precise than task title,
  // which isn't known yet). Falls back to goalText if no skeleton exists.
  const primaryResourcePromise = (async (): Promise<import('@types-app/agents').TaskResource | null> => {
    if (!flags.USE_DYNAMIC_RESOURCES) return null;
    const skeletonTheme = phase.daySkeleton?.[dayInPhase - 1]?.theme ?? goalText ?? goalLine;
    try {
      const res = await getResourcesForTask({
        taskTitle:         skeletonTheme,
        domain,
        phase:             phase.phaseNumber,
        stoneTypes:        [stoneProfile.stoneProfile.primaryStone],
        difficultyLevel:   3,
        durationAvailable: dailyTimeAvailable,
        goalText,
      });
      return res.primary ?? null;
    } catch {
      return null;
    }
  })();

  // ── Parallel: RAG fetch + Session Blueprint ──
  // RAG is async network I/O; blueprint is sync CPU.
  // Run RAG in parallel with the sync work to save ~300-800ms.

  const ragPromise = (async () => {
    if (ragContext) return ragContext;
    const primaryStone = stoneProfile.stoneProfile.primaryStone;
    const stoneTypes = detectedStones.map(s => s.type);
    const goalHint = goalText
      ? goalText.replace(/^(i want to|learn|become|get|start|build|improve|master)\s+/i, '').slice(0, 40)
      : '';
    const subDomainPrefix = goalHint ? `${goalHint} ` : '';
    const domainQuery = domain === 'Financial'
      ? `${subDomainPrefix}financial daily practice ${phase.phaseName} simulation exercises specific steps`
      : `${subDomainPrefix}${domain} ${phase.phaseName} daily practice exercises activities specific steps`;
    const ragOptions = {
      query: domainQuery,
      additionalQueries: [
        `${primaryStone} ${domain} coaching intervention habit delivery`,
      ],
      boostCategories: [domain.toLowerCase(), ...stoneTypes.map(s => s.toLowerCase())],
      boostKeywords: [domain.toLowerCase(), phase.phaseName.toLowerCase()],
      matchCount: 4,
    };
    return flags.USE_HYBRID_RAG
      ? retrieveKnowledgeHybrid(ragOptions)
      : retrieveKnowledgeSemantic(ragOptions);
  })();

  // Session Blueprint (sync — runs while RAG is in-flight)
  const isAssessmentDay = !!roadmap.roadmap.reviewMoments?.some(
    rm => rm.day === dayNumber && (rm.type === 'mid_assessment' || rm.type === 'final_assessment')
  );
  const phaseProgress = phase.durationDays
    ? dayInPhase / phase.durationDays
    : 0.5;
  const blueprint = planSession(dailyTimeAvailable, phaseProgress, domain, isAssessmentDay);
  const blueprintBlock = `\n${serializeBlueprint(blueprint)}\n`;

  // Sprint memory hint — runs in parallel with RAG (Change 5)
  const sprintHintPromise = (async (): Promise<string> => {
    if (!flags.USE_SPRINT_MEMORY_IN_ALL_AGENTS) return '';
    const taskType     = phase.daySkeleton?.[dayInPhase - 1]?.taskType ?? 'practice';
    const primaryStone = stoneProfile.stoneProfile.primaryStone;
    return getSimilarTaskPatterns(domain, primaryStone, taskType).catch(() => '');
  })();

  // Await RAG + sprint hint + resource in parallel (all already in-flight)
  const [science, sprintHint, primaryResource] = await Promise.all([ragPromise, sprintHintPromise, primaryResourcePromise]);

  const sprintHintBlock = sprintHint
    ? `\n── HISTORICAL PATTERN (from user's past sprints) ──\n${sprintHint}\nApply this when choosing task format and delivery style.\n`
    : '';

  const variantPrefix = variantHint ? `VARIANT INSTRUCTION: ${variantHint}\n\n` : '';
  const systemPrompt = variantPrefix + buildSystemPrompt(domain, detectedStones, dailyTimeAvailable) + blueprintBlock + sprintHintBlock;
  const userPrompt   = buildUserPrompt(
    dayNumber, goalLine, roadmap.roadmap.totalDays, dailyTimeAvailable,
    phase, week, dayInPhase, stoneProfile, science, previousTasksContext,
    primaryResource,
    weekContentSummary,
  );

  const callMessages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user'   as const, content: userPrompt   },
  ];

  let raw: unknown;
  if (flags.USE_TOOL_CALLING) {
    const args = await callWithTools(
      { messages: callMessages, temperature: 0.5, max_tokens: 2500, tools: [GENERATE_TASK_TOOL], tool_name: 'generate_daily_task' },
      'economy'
    );
    try {
      raw = JSON.parse(args) as unknown;
    } catch (e) {
      throw new Error(`Agent 4 (tool): invalid JSON — ${(e as Error).message}`);
    }
  } else {
    const { content } = await callEconomy({
      messages: callMessages,
      temperature:     0.5,
      max_tokens:      2500,
      response_format: { type: 'json_object' },
    });
    if (!content) throw new Error('Agent 4: No response from model');
    try {
      raw = JSON.parse(repairJSON(content)) as unknown;
    } catch (e) {
      throw new Error(`Agent 4 (reasoning): invalid JSON — ${(e as Error).message}`);
    }
  }

  let result = validateAndNormalize(raw, dayNumber, phase.phaseNumber, week, dailyTimeAvailable);

  // Assign the primary resource. Guarantee it is a real, embeddable video so the
  // study card always plays something — never a dead "Search" link when a library
  // video exists for this goal.
  const isEmbeddablePrimary = primaryResource?.type === 'video' && isEmbeddableVideoUrl(primaryResource.url);
  const embeddable = isEmbeddablePrimary
    ? primaryResource
    : (getEmbeddableVideoFallback(goalText ?? result.task.title, dailyTimeAvailable) ?? primaryResource);

  if (embeddable) {
    result.task.resources = {
      primary: embeddable,
      supplementary: result.task.resources?.supplementary ?? [],
    };
  } else if (!result.task.resources?.primary) {
    // No validated resource anywhere — add a searchable tip so the user isn't left empty-handed
    const searchTitle = encodeURIComponent(result.task.title);
    result.task.tips = [
      ...result.task.tips,
      `Search YouTube for "${result.task.title}" to find supporting videos and tutorials.`,
    ];
    result.task.resources = {
      primary: null,
      supplementary: [{
        type: 'article',
        title: `Search: ${result.task.title}`,
        url: `https://www.youtube.com/results?search_query=${searchTitle}`,
        description: 'Find relevant videos and tutorials for this task.',
        why: 'No validated resource was found — use this search to discover supporting materials.',
      }],
    };
  }

  // Validate quality — retry with 70b if issues found OR if 8b collapsed to 1 real step
  const validation = validateTaskQuality(result.task, dailyTimeAvailable);
  const isGenericStarter = result.task.steps[0]?.instruction.includes('Set up your space');
  const needsRetry = !validation.valid || (result.task.steps.length <= 2 && isGenericStarter);

  if (needsRetry) {
    const reason = !validation.valid
      ? `Quality issues: ${validation.issues.join('; ')}`
      : 'Collapsed to 1 real step';
    console.warn(`⚠️  Agent 4: Retrying with 70b — ${reason}`);
    try {
      const retryUserPrompt = userPrompt + (validation.issues.length
        ? `\n\nPREVIOUS ATTEMPT HAD QUALITY ISSUES — FIX ALL OF THESE:\n${validation.issues.map(i => `- ${i}`).join('\n')}`
        : '');
      const retryMessages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user'   as const, content: retryUserPrompt },
      ];
      let retryRaw: unknown;
      if (flags.USE_TOOL_CALLING) {
        const retryArgs = await callWithTools(
          { messages: retryMessages, temperature: 0.5, max_tokens: 2500, tools: [GENERATE_TASK_TOOL], tool_name: 'generate_daily_task' },
          'reasoning'
        );
        retryRaw = JSON.parse(retryArgs) as unknown;
      } else {
        const { content: retryContent } = await callReasoning({
          messages: retryMessages,
          temperature:     0.5,
          max_tokens:      2500,
          response_format: { type: 'json_object' },
        });
        if (!retryContent) throw new Error('empty retry');
        retryRaw = JSON.parse(repairJSON(retryContent)) as unknown;
      }
      const retryResult = validateAndNormalize(retryRaw, dayNumber, phase.phaseNumber, week, dailyTimeAvailable);
      const retryValidation = validateTaskQuality(retryResult.task, dailyTimeAvailable);
      if (retryValidation.valid || retryResult.task.steps.length > result.task.steps.length) {
        result = retryResult;
      }
    } catch {
      // Non-blocking — original result is still used
    }
  }

  // ── Step Duration Validation (F2.4) ──
  // Ensure step durations sum close to dailyTimeAvailable
  validateStepDurations(result, dailyTimeAvailable);

  return result;
}

/**
 * Parse a step's duration string to minutes.
 * Handles: "10 minutes", "2 sets of 8 reps", "5 min", "15–20 min", etc.
 */
function parseStepDuration(duration: string): number {
  // Try direct number extraction: "10 minutes" → 10
  const minMatch = duration.match(/(\d+)\s*(?:min|minutes?)/i);
  if (minMatch) return parseInt(minMatch[1]);

  // Range: "15–20 min" → take average
  const rangeMatch = duration.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:min|minutes?)/i);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);

  // Just a number: "10" → 10
  const numMatch = duration.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1]);

  // Reps-based: estimate 5 minutes for any rep-based step
  if (/\breps?\b/i.test(duration) || /\bsets?\b/i.test(duration)) return 5;

  return 5; // fallback
}

/**
 * Validate and redistribute step durations to match dailyTimeAvailable.
 * Mutates the result in-place. Logs a warning if correction was needed.
 */
function validateStepDurations(result: DailyTask, dailyTimeAvailable: number): void {
  const steps = result.task.steps;
  if (steps.length === 0) return;

  const parsedDurations = steps.map(s => parseStepDuration(s.duration));
  const totalParsed = parsedDurations.reduce((a, b) => a + b, 0);

  // Allow 15% deviation
  const deviation = Math.abs(totalParsed - dailyTimeAvailable) / dailyTimeAvailable;
  if (deviation <= 0.15) return; // within tolerance

  console.warn(`⚠️ Agent 4: Step durations sum to ${totalParsed}min (target: ${dailyTimeAvailable}min, ${Math.round(deviation * 100)}% off). Redistributing.`);

  // Redistribute proportionally
  const scale = dailyTimeAvailable / totalParsed;
  steps.forEach((step, i) => {
    const newMin = Math.max(1, Math.round(parsedDurations[i] * scale));
    step.duration = `${newMin} minutes`;
  });

  // Fix rounding errors on the last step
  const newTotal = steps.reduce((sum, s) => sum + parseStepDuration(s.duration), 0);
  const diff = dailyTimeAvailable - newTotal;
  if (diff !== 0 && steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    const lastMin = parseStepDuration(lastStep.duration);
    lastStep.duration = `${Math.max(1, lastMin + diff)} minutes`;
  }

  result.task.estimatedMinutes = dailyTimeAvailable;
}
