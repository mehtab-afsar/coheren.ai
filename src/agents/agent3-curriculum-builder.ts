import Groq from 'groq-sdk';
import type { Agent1Output, Agent3Output, AgentContext, StoneAnswer } from '../types/agents';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const AGENT3_SYSTEM_PROMPT = `You are a Curriculum Architecture Expert.

Your job is to design a comprehensive learning roadmap based on a goal and user context.

Create a structured learning plan with:

1. **Phases**: Major learning stages (typically 3-5 phases)
   - Each phase has a clear focus and set of goals
   - Builds progressively on previous phases

2. **Weeks**: What to focus on each week within phases

3. **Progression Logic**: How difficulty and complexity increase
   - Use progressive overload principle
   - Gradual intensity increases
   - Skill scaffolding (simple → complex)

4. **Milestones**: Checkpoints to measure progress

5. **Adaptation Rules**: How to adjust based on user performance

Use these pedagogical principles:
- **Scaffolding**: Build on previous knowledge systematically
- **Spacing Effect**: Review concepts at intervals (don't cram)
- **Progressive Overload**: Gradually increase challenge
- **Variation**: Mix up activities to prevent monotony and enhance retention
- **Feedback Loops**: Include self-assessment moments

IMPORTANT:
- Be realistic about what's achievable in the given timeline
- Consider the user's daily time availability
- Apply the stone impacts to customize the plan
- Include specific milestones that are measurable
- Define clear adaptation rules for struggling/excelling users

Return ONLY valid JSON in this exact format:
{
  "roadmap": {
    "totalDays": number,
    "totalPhases": number,
    "phases": [
      {
        "phaseNumber": 1,
        "phaseName": "Phase Name",
        "weeks": [1, 2, 3],
        "primaryGoals": ["goal 1", "goal 2"],
        "focusAreas": {
          "area1": 40,
          "area2": 30,
          "area3": 30
        },
        "keyMilestones": ["milestone 1", "milestone 2"],
        "adaptationRules": {
          "if_completing_easily": "what to do",
          "if_struggling": "what to adjust"
        }
      }
    ],
    "progressionCurve": {
      "week1": {"intensity": 0.3, "volume": "low", "technique_depth": "shallow"},
      "week4": {"intensity": 0.5, "volume": "medium", "technique_depth": "medium"}
    },
    "reviewMoments": [
      {"day": 7, "type": "reflection", "prompt": "How did week 1 feel?"}
    ],
    "restDays": {
      "pattern": "every_7th_day",
      "customDays": [21, 45],
      "restType": "active_recovery"
    },
    "modifiers_from_stones": {
      "stone_id": {
        "removed": ["element to skip"],
        "added": ["element to add"],
        "modified": ["what to change"]
      }
    }
  }
}`;

export async function buildCurriculum(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  stoneAnswers: StoneAnswer[]
): Promise<Agent3Output> {
  const userPrompt = `
Create a ${context.timeline}-day learning roadmap for this goal:

Goal: "${context.goal}"
Daily Time Available: ${context.dailyTimeAvailable} minutes

Goal Analysis:
${JSON.stringify(goalAnalysis.goalAnalysis, null, 2)}

User Context (Stone Answers):
${JSON.stringify(stoneAnswers, null, 2)}

Design a comprehensive curriculum that:
1. Fits within ${context.timeline} days
2. Uses ${context.dailyTimeAvailable} minutes per day effectively
3. Adapts to the user's context (stone answers)
4. Follows pedagogical best practices
5. Includes clear phases, milestones, and progression

Be specific about how stone answers modify the curriculum.
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: AGENT3_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Agent 3');
    }

    const result = JSON.parse(response) as Agent3Output;
    return result;

  } catch (error) {
    console.error('Agent 3 Error:', error);
    throw new Error(`Curriculum building failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
