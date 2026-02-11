import type { Agent1Output, Agent2Output, AgentContext } from '@types-app/agents';
import { callGroqWithFallback } from '@lib/groq-client';

const AGENT2_SYSTEM_PROMPT = `You are an Information Requirements Expert.

Your job is to determine what CRITICAL information you need from the user to create a personalized learning plan.

Given a goal analysis, identify 5-8 "Building Stones" - pieces of information that will significantly change how the curriculum is built.

For each stone:
1. **stoneId**: Unique identifier (snake_case)
2. **stoneName**: Human-readable name
3. **importance**: critical, high, medium, or low
4. **reasoning**: Why this information matters (be specific about how it changes the plan)
5. **question**: The question to ask the user
   - text: Clear, concise question
   - type: multiple_choice, open_ended, yes_no, or scale
   - options (if multiple_choice): Array of {value, label, impact}
   - impact: How each answer changes the curriculum

Think about:
- Resources available (equipment, location, money) - NOTE: Time commitment is already collected, don't ask again
- Physical limitations or injuries
- Prior experience - NOTE: General skill level is already collected, ask about SPECIFIC prior experience
- Motivation and goals (why they want this) - NOTE: The goal itself is already collected, ask about specific sub-goals or motivations
- Learning style preferences
- Social context (alone vs. with others)
- Current baseline (fitness, knowledge, skills) - Be specific to the domain

DO NOT ASK ABOUT:
- Time commitment (already collected in chat)
- General goal or purpose (already collected in chat)
- Their name (already collected in chat)
- General skill level (already collected in chat)
- Timeline (already collected in chat)

IMPORTANT:
- Only ask questions that will SIGNIFICANTLY change the plan
- Don't ask for nice-to-know info, only need-to-know
- Make questions clear and answerable
- PREFER multiple_choice questions with 2-4 options whenever possible
- For sensitive topics (injuries, health, limitations), ALWAYS use multiple_choice with options like "None", "Minor", "Significant", etc.
- Only use open_ended for truly free-form answers (e.g., specific goals, motivations)
- Only use yes_no for simple binary decisions
- Define specific impacts for each option

EXAMPLE for injuries question (boxing):
{
  "stoneId": "pre_existing_injuries",
  "stoneName": "Physical Limitations",
  "importance": "critical",
  "reasoning": "Injuries determine which techniques to avoid and require exercise modifications",
  "question": {
    "text": "Do you have any pre-existing injuries or conditions that could be affected by boxing training?",
    "type": "multiple_choice",
    "options": [
      {
        "value": "none",
        "label": "No injuries or limitations",
        "impact": {
          "curriculum": "Full boxing curriculum with all techniques",
          "modifications": "No special modifications needed"
        }
      },
      {
        "value": "minor",
        "label": "Minor issues (occasional joint pain, old injuries)",
        "impact": {
          "curriculum": "Add extra warm-up time, lighter impact drills",
          "modifications": "Focus on technique over power, add recovery days"
        }
      },
      {
        "value": "significant",
        "label": "Significant limitations (shoulder, wrist, knee issues)",
        "impact": {
          "curriculum": "Heavy bag work reduced, focus on shadowboxing and technique",
          "modifications": "Avoid certain punches, emphasize footwork and defense"
        }
      }
    ]
  }
}

Return ONLY valid JSON in this exact format:
{
  "requiredStones": [
    {
      "stoneId": "unique_id",
      "stoneName": "Display Name",
      "importance": "critical|high|medium|low",
      "reasoning": "Why this matters for the curriculum",
      "question": {
        "text": "Question text?",
        "type": "multiple_choice|open_ended|yes_no|scale",
        "options": [
          {
            "value": "option_value",
            "label": "Display label",
            "impact": {
              "key": "value describing how this changes the plan"
            }
          }
        ]
      }
    }
  ]
}`;

export async function identifyStones(
  context: AgentContext,
  goalAnalysis: Agent1Output
): Promise<Agent2Output> {
  const userPrompt = `
Based on this goal analysis, identify the critical information needed:

Goal: "${context.goal}"
Timeline: ${context.timeline} days
Daily Time: ${context.dailyTimeAvailable} minutes

INFORMATION ALREADY COLLECTED (DO NOT ASK AGAIN):
- The user's goal: "${context.goal}"
- Timeline target: ${context.timeline} days
- Daily time commitment: ${context.dailyTimeAvailable} minutes per day
- General skill level (beginner/intermediate/advanced)
- User's name and energy patterns

Goal Analysis:
${JSON.stringify(goalAnalysis.goalAnalysis, null, 2)}

Identify 5-8 building stones (critical questions) that will shape the curriculum.
Focus on GOAL-SPECIFIC information that will create significantly different learning paths.
DO NOT ask about time, timeline, or general goal - these are already known.
`;

  try {
    const completion = await callGroqWithFallback({
      messages: [
        {
          role: 'system',
          content: AGENT2_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Agent 2');
    }

    const result = JSON.parse(response) as Agent2Output;
    return result;

  } catch (error) {
    console.error('Agent 2 Error:', error);
    throw new Error(`Stone identification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
