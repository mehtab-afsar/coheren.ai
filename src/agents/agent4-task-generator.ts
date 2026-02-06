import type { Agent3Output, DailyTask, StoneAnswer } from '../types/agents';
import { matchTaskToResources } from '../lib/resourceMatcher';
import { callGroqWithFallback } from '../lib/groq-client';

const AGENT4_SYSTEM_PROMPT = `You are a Daily Task Instruction Expert.

Your job is to create ONE specific, actionable task for a given day in a learning curriculum.

Each task must be:
1. **Clear and Specific**: No vague instructions like "practice guitar" - instead "Practice G-C-D chord transitions for 15 minutes"
2. **Completable in Allocated Time**: Must fit within the user's daily time budget
3. **Progressive**: Build on previous days naturally
4. **Structured**: Include step-by-step instructions
5. **Motivating**: Include context (why this matters) and success criteria

Required Components:
- **Title**: Action-oriented, clear (e.g., "Master the Boxing Stance")
- **Description**: One sentence overview
- **Estimated Minutes**: Realistic time estimate
- **Steps**: Detailed, numbered instructions with durations
  - Each step should have: stepNumber, instruction, duration
  - Can include: details, resource (video/article), practice instructions
- **Tips**: 3-5 practical tips for success
- **Success Criteria**: How to know you did it right (primary + bonus)
- **Why This Matters**: Context and motivation (2-3 sentences)
- **Common Mistakes**: What to avoid (optional)
- **Building On**: What previous days/skills this connects to (optional)
- **Next Up**: Preview of tomorrow (optional)
- **Adaptations Applied**: How stone answers modified this task

Pedagogical Principles:
- **Specificity**: Exact numbers, durations, repetitions
- **Scaffolding**: Reference what they've learned
- **Feedback**: Include self-check moments
- **Motivation**: Connect to bigger goal

Return ONLY valid JSON in this exact format:
{
  "day": number,
  "phase": number,
  "week": number,
  "task": {
    "title": "Action-Oriented Title",
    "description": "Brief overview",
    "estimatedMinutes": number,
    "steps": [
      {
        "stepNumber": 1,
        "instruction": "What to do",
        "duration": "X minutes",
        "details": "More info or array of details",
        "resource": {
          "type": "video|article|audio|practice",
          "url": "URL or identifier",
          "timestamp": "specific part to watch",
          "focusPoints": ["point 1", "point 2"]
        }
      }
    ],
    "tips": ["tip 1", "tip 2"],
    "successCriteria": {
      "primary": "Main success measure",
      "bonus": "Extra achievement"
    },
    "whyThisMatters": "Motivation and context",
    "commonMistakes": ["mistake 1", "mistake 2"],
    "buildingOn": ["Day X: skill", "Day Y: concept"],
    "nextUp": "Preview of tomorrow",
    "adaptations_applied": {
      "stone_id": "how this affected the task"
    }
  }
}`;

export async function generateTask(
  dayNumber: number,
  roadmap: Agent3Output,
  stoneAnswers: StoneAnswer[],
  dailyTimeAvailable: number,
  previousTasksContext?: string,
  category?: string,
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
): Promise<DailyTask> {
  // Determine which phase and week this day belongs to
  const totalDays = roadmap.roadmap.totalDays;
  const phases = roadmap.roadmap.phases;

  let currentPhase = phases[0];
  let currentWeek = 1;

  for (const phase of phases) {
    const phaseStartDay = phase.weeks[0] * 7 - 6;
    const phaseEndDay = phase.weeks[phase.weeks.length - 1] * 7;

    if (dayNumber >= phaseStartDay && dayNumber <= phaseEndDay) {
      currentPhase = phase;
      currentWeek = Math.ceil(dayNumber / 7);
      break;
    }
  }

  const userPrompt = `
Generate a specific, actionable task for Day ${dayNumber} of the curriculum.

Curriculum Context:
${JSON.stringify(roadmap.roadmap, null, 2)}

Current Phase: ${currentPhase.phaseName} (Phase ${currentPhase.phaseNumber})
Current Week: ${currentWeek}
Day: ${dayNumber} of ${totalDays}

User Context:
${JSON.stringify(stoneAnswers, null, 2)}

Daily Time Budget: ${dailyTimeAvailable} minutes

${previousTasksContext ? `Recent Tasks Context:\n${previousTasksContext}` : ''}

Create a task that:
1. Aligns with Phase ${currentPhase.phaseNumber}'s goals: ${currentPhase.primaryGoals.join(', ')}
2. Fits within ${dailyTimeAvailable} minutes
3. Is specific and actionable (not vague)
4. Builds naturally on previous days
5. Adapts based on user's stone answers
6. Includes clear steps, tips, and success criteria

Make it feel like a personal coach wrote this task specifically for this user.
`;

  try {
    // Use economy model (8b) for task generation - faster and higher rate limits
    const completion = await callGroqWithFallback({
      messages: [
        {
          role: 'system',
          content: AGENT4_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    }, 'economy'); // Start with 8b model to avoid rate limits

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Agent 4');
    }

    const result = JSON.parse(response) as DailyTask;

    // Match resources to this task
    if (category) {
      try {
        console.log(`🔍 Matching resources for: "${result.task.title}"`);
        const matchedResources = await matchTaskToResources(
          result.task.title,
          result.task.description,
          category,
          skillLevel || 'beginner'
        );

        // Add resources to task
        result.task.resources = {
          primary: matchedResources.primary,
          supplementary: matchedResources.supplementary
        };

        console.log(`✅ Resources matched:`,
          matchedResources.primary ? `${matchedResources.primary.title} (${matchedResources.matchMethod})` : 'none');
      } catch (error) {
        console.error('Resource matching failed:', error);
        // Don't block task generation if resource matching fails
        result.task.resources = {
          primary: null,
          supplementary: []
        };
      }
    }

    return result;

  } catch (error) {
    console.error('Agent 4 Error:', error);
    throw new Error(`Task generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
