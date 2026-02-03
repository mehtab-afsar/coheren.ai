import Groq from 'groq-sdk';
import type { Agent1Output, Agent2Output, AgentContext } from '../types/agents';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

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
- Resources available (equipment, location, money, time)
- Physical limitations or injuries
- Prior experience
- Motivation and goals (why they want this)
- Learning style preferences
- Social context (alone vs. with others)
- Current baseline (fitness, knowledge, skills)

IMPORTANT:
- Only ask questions that will SIGNIFICANTLY change the plan
- Don't ask for nice-to-know info, only need-to-know
- Make questions clear and answerable
- Provide 2-4 options for multiple choice questions
- Define specific impacts for each option

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

Goal Analysis:
${JSON.stringify(goalAnalysis.goalAnalysis, null, 2)}

Identify 5-8 building stones (critical questions) that will shape the curriculum.
Focus on information that will create significantly different learning paths.
`;

  try {
    const completion = await groq.chat.completions.create({
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
      model: 'llama-3.3-70b-versatile',
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
