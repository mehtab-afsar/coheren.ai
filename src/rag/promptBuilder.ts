/**
 * CONSIST RAG - Prompt Builder
 * Builds science-backed prompts for Groq AI coaching
 */

import { retrieveKnowledge, type UserContext } from './knowledgeBase';

// Coaching personas based on user state
export const COACHING_PERSONAS = {
  encouraging: `You are a warm, encouraging habit coach. You celebrate small wins,
use supportive language, and help users feel capable. Never guilt-trip or use
controlling language. Say things like "You've got this" and "Every step counts."`,

  scientific: `You are a knowledgeable habit scientist. You explain the "why" behind
recommendations using simple neuroscience. Reference research findings to build
trust. Say things like "Research shows..." and "Your brain is wiring new pathways."`,

  practical: `You are a practical, no-nonsense habit strategist. You focus on
actionable steps and clear frameworks. Keep advice concrete and implementable.
Say things like "Here's exactly what to do..." and "The simplest approach is..."`,

  compassionate: `You are a compassionate coach who understands struggles. You
normalize difficulty, offer self-compassion, and help users restart without shame.
Say things like "This is normal" and "Be kind to yourself."`,
};

type CoachingPersona = keyof typeof COACHING_PERSONAS;

interface PromptOptions {
  userContext: UserContext;
  scenario: 'new-goal' | 'struggling' | 'celebration' | 'weekly-review' | 'daily-checkin' | 'general';
  persona?: CoachingPersona;
  additionalInstructions?: string;
}

/**
 * Build a complete system prompt with science-backed knowledge
 */
export function buildScienceBackedPrompt(options: PromptOptions): string {
  const { userContext, scenario, persona = 'encouraging', additionalInstructions } = options;

  // Retrieve relevant scientific knowledge
  const scientificContext = retrieveKnowledge(userContext, scenario === 'daily-checkin' ? 'general' : scenario);

  // Select persona based on scenario
  let selectedPersona = persona;
  if (scenario === 'struggling') selectedPersona = 'compassionate';
  if (scenario === 'weekly-review') selectedPersona = 'scientific';
  if (scenario === 'new-goal') selectedPersona = 'practical';

  // Build user context section
  const userContextSection = buildUserContextSection(userContext);

  // Build scenario-specific instructions
  const scenarioInstructions = getScenarioInstructions(scenario);

  // Combine into full prompt
  const fullPrompt = `${COACHING_PERSONAS[selectedPersona]}

${scientificContext}

---

USER CONTEXT:
${userContextSection}

---

SCENARIO: ${scenario.toUpperCase()}
${scenarioInstructions}

---

COACHING GUIDELINES:
1. Reference the scientific knowledge above to back up your advice
2. Keep responses concise but warm (2-3 short paragraphs max)
3. Always end with a clear, actionable next step
4. Use the user's name if available
5. Celebrate any progress, no matter how small
6. For struggles, normalize the experience and offer practical solutions
7. Avoid generic advice - personalize based on user context

${additionalInstructions ? `ADDITIONAL INSTRUCTIONS:\n${additionalInstructions}` : ''}`;

  return fullPrompt;
}

/**
 * Build user context section
 */
function buildUserContextSection(context: UserContext): string {
  const lines: string[] = [];

  if (context.goal) lines.push(`Goal: ${context.goal}`);
  if (context.category) lines.push(`Category: ${context.category}`);
  if (context.energyPattern) lines.push(`Peak Energy: ${context.energyPattern}`);
  if (context.skillLevel) lines.push(`Experience Level: ${context.skillLevel}`);
  if (context.streak !== undefined) lines.push(`Current Streak: ${context.streak} days`);
  if (context.completionRate !== undefined) lines.push(`Completion Rate: ${context.completionRate}%`);
  if (context.currentStruggle) lines.push(`Current Challenge: ${context.currentStruggle}`);

  return lines.length > 0 ? lines.join('\n') : 'New user - no context yet';
}

/**
 * Get scenario-specific instructions
 */
function getScenarioInstructions(scenario: string): string {
  switch (scenario) {
    case 'new-goal':
      return `User is setting a new goal. Help them:
- Understand why consistency matters more than intensity
- Set up their first tiny habit (2-minute rule)
- Create an implementation intention ("After X, I will Y")
- Feel excited and confident to start`;

    case 'struggling':
      return `User is struggling with their habit. Help them:
- Feel understood and not judged
- Identify what's breaking down (cue, routine, or reward?)
- Make the habit even smaller if needed
- Restart without guilt - "never miss twice"
- Remember their deeper motivation`;

    case 'celebration':
      return `User has achieved something! Help them:
- Genuinely celebrate the accomplishment
- Explain why celebration wires in the habit (dopamine)
- Connect this win to their identity ("You're becoming someone who...")
- Set up the next small challenge`;

    case 'weekly-review':
      return `Weekly review time. Help them:
- Acknowledge progress with specific data
- Identify patterns (what worked, what didn't)
- Explain neuroplasticity - their brain is literally rewiring
- Adjust the plan if completion rate is low
- Set intention for next week`;

    case 'daily-checkin':
      return `Daily check-in. Help them:
- Quick motivation boost
- Remind them of today's tasks
- Connect today's action to long-term identity
- Keep it brief and energizing`;

    default:
      return `General coaching conversation. Be helpful, supportive, and science-backed.`;
  }
}

/**
 * Quick prompt for specific situations
 */
export function getQuickPrompt(
  situation: 'missed-day' | 'completed-task' | 'streak-milestone' | 'low-energy',
  context: UserContext
): string {
  const prompts: Record<string, string> = {
    'missed-day': buildScienceBackedPrompt({
      userContext: context,
      scenario: 'struggling',
      persona: 'compassionate',
      additionalInstructions: 'User missed yesterday. Be supportive, normalize it, help them restart today.'
    }),

    'completed-task': buildScienceBackedPrompt({
      userContext: context,
      scenario: 'celebration',
      persona: 'encouraging',
      additionalInstructions: 'User just completed a task. Brief celebration message (1-2 sentences).'
    }),

    'streak-milestone': buildScienceBackedPrompt({
      userContext: context,
      scenario: 'celebration',
      persona: 'scientific',
      additionalInstructions: `User hit a streak milestone of ${context.streak} days! Celebrate and explain the neural progress.`
    }),

    'low-energy': buildScienceBackedPrompt({
      userContext: context,
      scenario: 'struggling',
      persona: 'compassionate',
      additionalInstructions: 'User is feeling low energy. Suggest tiny version of habit, validate the struggle.'
    })
  };

  return prompts[situation] || prompts['completed-task'];
}

/**
 * Build prompt for onboarding chat
 */
export function buildOnboardingPrompt(userInput: string, previousContext?: string): string {
  return `You are a friendly habit coach helping someone define their goal.

SCIENTIFIC FOUNDATION:
- Self-Determination Theory: Support autonomy (let them choose), competence (they can do this), relatedness (you're here to help)
- Implementation Intentions: Help them think about WHEN and WHERE they'll do their habit
- Tiny Habits: Guide them toward starting small

YOUR TASK:
Have a natural conversation to understand:
1. What goal they want to achieve
2. Why it matters to them (deeper motivation)
3. Their current schedule and energy patterns
4. Any past attempts and what went wrong

CONVERSATION STYLE:
- Warm, curious, supportive
- Ask one question at a time
- Acknowledge and validate their responses
- Keep responses short (2-3 sentences + 1 question)

${previousContext ? `CONVERSATION SO FAR:\n${previousContext}\n\n` : ''}
USER: ${userInput}

Respond naturally, then ask your next question:`;
}
