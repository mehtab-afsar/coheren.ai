import type { Agent1Output, AgentContext } from '../types/agents';
import { callGroqWithFallback } from '../lib/groq-client';

const AGENT1_SYSTEM_PROMPT = `You are a Goal Classification Expert.

Your job is to deeply analyze a user's goal and extract structured information about it.

Given a user's goal, analyze and extract:

1. **Goal Type**: Is this skill_acquisition, habit_formation, knowledge_learning, creative_pursuit, fitness, or other?
2. **Domain**: What field does this belong to? (sports, music, technology, language, academics, etc.)
3. **Sub-Domain**: More specific category within the domain
4. **Complexity Level**: Is this beginner, intermediate, or advanced?
5. **Learning Types**: What types of learning are involved? (physical, cognitive, creative, social, mental)
6. **Typical Timeline**: Realistic time expectations
   - minimum: Bare minimum to see basic results
   - realistic: Expected time for solid foundation
   - mastery: Time to reach expert level
7. **Key Milestones**: What are the major checkpoints along the way?
8. **Success Criteria**: What does "learned" or "achieved" mean for this goal?
9. **Prerequisites**: What does someone need before starting?
10. **Common Obstacles**: What challenges do people typically face?

IMPORTANT:
- Be realistic about timelines
- Consider the user's stated timeline (${undefined} days) but don't let it override reality
- Think about what's actually achievable
- Use your knowledge of pedagogy and learning science

Return ONLY valid JSON in this exact format:
{
  "goalAnalysis": {
    "rawGoal": "the user's goal as stated",
    "goalType": "skill_acquisition|habit_formation|knowledge_learning|creative_pursuit|fitness|other",
    "domain": "string",
    "subDomain": "string",
    "complexity": "beginner|intermediate|advanced",
    "learningTypes": ["physical", "cognitive", etc.],
    "typicalTimeline": {
      "minimum": "X weeks/months",
      "realistic": "X-Y months",
      "mastery": "X-Y years"
    },
    "keyMilestones": ["milestone 1", "milestone 2", ...],
    "successCriteria": ["criteria 1", "criteria 2", ...],
    "prerequisites": ["prereq 1", "prereq 2", ...],
    "commonObstacles": ["obstacle 1", "obstacle 2", ...]
  }
}`;

export async function analyzeGoal(context: AgentContext): Promise<Agent1Output> {
  const userPrompt = `
Analyze this goal:

Goal: "${context.goal}"
User's Timeline: ${context.timeline} days
Daily Time Available: ${context.dailyTimeAvailable} minutes

Provide a comprehensive analysis of this goal.
`;

  try {
    const completion = await callGroqWithFallback({
      messages: [
        {
          role: 'system',
          content: AGENT1_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Agent 1');
    }

    const result = JSON.parse(response) as Agent1Output;
    return result;

  } catch (error) {
    console.error('Agent 1 Error:', error);
    throw new Error(`Goal analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
