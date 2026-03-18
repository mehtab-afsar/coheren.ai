/**
 * Session Blueprint Generator
 *
 * Deterministic (no LLM) function that splits daily time into structured blocks.
 * This is injected into Agent 4's prompt so the LLM generates task steps
 * that map 1:1 to session blocks.
 *
 * The templates are derived from learning science:
 * - Warm-up activates prior knowledge (retrieval priming)
 * - Learn blocks introduce new material
 * - Practice blocks consolidate through doing
 * - Drill blocks build speed/automaticity
 * - Cooldown provides metacognitive reflection
 */

export interface SessionBlock {
  type: 'warmup' | 'review' | 'learn' | 'practice' | 'drill' | 'cooldown' | 'assessment';
  minutes: number;
  description: string;
  resourceSlot?: boolean;        // true = this block should have a video/article
  maxResourceMinutes?: number;   // cap for video length in this block
}

export interface SessionBlueprint {
  totalMinutes: number;
  blocks: SessionBlock[];
  restBreaks: { afterBlock: number; minutes: number }[];
}

/**
 * Plan a structured session based on available time and phase progress.
 *
 * @param dailyMinutes Total minutes available
 * @param phaseProgress 0-1, how far into the current phase (affects learn/practice ratio)
 * @param domain Goal domain (affects block descriptions)
 * @param isAssessmentDay If true, allocates time for assessment blocks
 */
export function planSession(
  dailyMinutes: number,
  phaseProgress: number,
  domain: string,
  isAssessmentDay: boolean,
): SessionBlueprint {
  // Clamp phase progress
  const progress = Math.max(0, Math.min(1, phaseProgress));

  // Assessment days have a simplified structure
  if (isAssessmentDay) {
    return planAssessmentSession(dailyMinutes);
  }

  // Phase-based learn/practice ratio
  // Early: 60/40 learn/practice → Late: 35/65 learn/practice
  const learnRatio = progress < 0.25 ? 0.6
    : progress < 0.5 ? 0.5
    : progress < 0.75 ? 0.4
    : 0.35;

  if (dailyMinutes <= 20) {
    return plan15to20(dailyMinutes, learnRatio, domain);
  } else if (dailyMinutes <= 30) {
    return plan25to30(dailyMinutes, learnRatio, domain);
  } else if (dailyMinutes <= 50) {
    return plan45(dailyMinutes, learnRatio, domain);
  } else if (dailyMinutes <= 70) {
    return plan60(dailyMinutes, learnRatio, domain);
  } else if (dailyMinutes <= 100) {
    return plan90(dailyMinutes, learnRatio, domain);
  } else {
    return plan120(dailyMinutes, learnRatio, domain);
  }
}

// ── Templates ──────────────────────────────────────────────────────────────

function plan15to20(total: number, learnRatio: number, domain: string): SessionBlueprint {
  const warmup = 2;
  const core = total - warmup;
  const learnMin = Math.round(core * learnRatio);
  const practiceMin = core - learnMin;

  const blocks: SessionBlock[] = [
    { type: 'warmup', minutes: warmup, description: domainWarmup(domain) },
    { type: 'learn', minutes: learnMin, description: 'Core learning', resourceSlot: true, maxResourceMinutes: learnMin },
  ];
  if (practiceMin > 0) {
    blocks.push({ type: 'practice', minutes: practiceMin, description: 'Apply what you just learned' });
  }

  return { totalMinutes: total, blocks, restBreaks: [] };
}

function plan25to30(total: number, learnRatio: number, domain: string): SessionBlueprint {
  const warmup = 3;
  const core = total - warmup;
  const learnMin = Math.round(core * learnRatio);
  const practiceMin = core - learnMin;

  return {
    totalMinutes: total,
    blocks: [
      { type: 'warmup', minutes: warmup, description: domainWarmup(domain) },
      { type: 'learn', minutes: learnMin, description: 'New material', resourceSlot: true, maxResourceMinutes: learnMin },
      { type: 'practice', minutes: practiceMin, description: 'Hands-on practice' },
    ],
    restBreaks: [],
  };
}

function plan45(total: number, learnRatio: number, domain: string): SessionBlueprint {
  const warmup = 3;
  const cooldown = 4;
  const core = total - warmup - cooldown;
  const learnMin = Math.round(core * learnRatio);
  const practiceMin = core - learnMin;

  return {
    totalMinutes: total,
    blocks: [
      { type: 'warmup', minutes: warmup, description: `${domainWarmup(domain)} + review yesterday's key points` },
      { type: 'learn', minutes: learnMin, description: 'New material', resourceSlot: true, maxResourceMinutes: learnMin },
      { type: 'practice', minutes: practiceMin, description: 'Active practice' },
      { type: 'cooldown', minutes: cooldown, description: domainCooldown(domain) },
    ],
    restBreaks: [],
  };
}

function plan60(total: number, learnRatio: number, domain: string): SessionBlueprint {
  const warmup = 5;
  const review = 5;
  const cooldown = 5;
  const drill = 5;
  const core = total - warmup - review - cooldown - drill;
  const learnMin = Math.round(core * learnRatio);
  const practiceMin = core - learnMin;

  return {
    totalMinutes: total,
    blocks: [
      { type: 'warmup', minutes: warmup, description: domainWarmup(domain) },
      { type: 'review', minutes: review, description: 'Recall previous session key points' },
      { type: 'learn', minutes: learnMin, description: 'New material', resourceSlot: true, maxResourceMinutes: learnMin },
      { type: 'practice', minutes: practiceMin, description: 'Guided practice' },
      { type: 'drill', minutes: drill, description: 'Speed/repetition drill' },
      { type: 'cooldown', minutes: cooldown, description: domainCooldown(domain) },
    ],
    restBreaks: [],
  };
}

function plan90(total: number, learnRatio: number, domain: string): SessionBlueprint {
  const warmup = 5;
  const review = 10;
  const cooldown = 5;
  const drill = 10;
  const reflection = 5;
  const breakMin = 5;
  const core = total - warmup - review - cooldown - drill - reflection - breakMin;
  const learnMin = Math.round(core * learnRatio);
  const practiceMin = core - learnMin;

  return {
    totalMinutes: total,
    blocks: [
      { type: 'warmup', minutes: warmup, description: domainWarmup(domain) },
      { type: 'review', minutes: review, description: 'Review and recall previous material' },
      { type: 'learn', minutes: learnMin, description: 'New material', resourceSlot: true, maxResourceMinutes: learnMin },
      { type: 'practice', minutes: practiceMin, description: 'Extended practice' },
      { type: 'drill', minutes: drill, description: 'Targeted drill' },
      { type: 'cooldown', minutes: cooldown, description: domainCooldown(domain) },
    ],
    restBreaks: [{ afterBlock: 2, minutes: breakMin }], // break after learn block
  };
}

function plan120(total: number, learnRatio: number, domain: string): SessionBlueprint {
  const warmup = 5;
  const review = 10;
  const cooldown = 10;
  const drill = 20;
  const reflection = 5;
  const break1 = 5;
  const break2 = 5;
  const core = total - warmup - review - cooldown - drill - reflection - break1 - break2;
  const learnMin = Math.round(core * learnRatio);
  const practiceMin = core - learnMin;

  return {
    totalMinutes: total,
    blocks: [
      { type: 'warmup', minutes: warmup, description: domainWarmup(domain) },
      { type: 'review', minutes: review, description: 'Review and recall previous material' },
      { type: 'learn', minutes: learnMin, description: 'New material (Part 1)', resourceSlot: true, maxResourceMinutes: Math.ceil(learnMin * 0.6) },
      { type: 'practice', minutes: practiceMin, description: 'Extended guided practice' },
      { type: 'drill', minutes: drill, description: 'Deep drill and repetition' },
      { type: 'cooldown', minutes: cooldown, description: domainCooldown(domain) },
    ],
    restBreaks: [
      { afterBlock: 2, minutes: break1 }, // after learn
      { afterBlock: 3, minutes: break2 }, // after practice
    ],
  };
}

function planAssessmentSession(total: number): SessionBlueprint {
  const warmup = Math.min(3, Math.floor(total * 0.1));
  const assessmentMin = total - warmup;

  return {
    totalMinutes: total,
    blocks: [
      { type: 'warmup', minutes: warmup, description: 'Take a moment to center yourself before the assessment' },
      { type: 'assessment', minutes: assessmentMin, description: 'Complete the assessment questions' },
    ],
    restBreaks: [],
  };
}

// ── Domain-specific descriptions ──────────────────────────────────────────

function domainWarmup(domain: string): string {
  switch (domain) {
    case 'Kinesthetic': return 'Dynamic warm-up and mobility drills';
    case 'Cognitive': return 'Quick recall of key concepts from last session';
    case 'Creative': return 'Free-form sketching or noodling to loosen up';
    case 'Career': return 'Review your current portfolio and set today\'s intention';
    case 'Financial': return 'Check market context and review your simulation journal';
    case 'Health': return 'Rate your energy 1-5 and light movement';
    default: return 'Review yesterday\'s key points and set your intention';
  }
}

function domainCooldown(domain: string): string {
  switch (domain) {
    case 'Kinesthetic': return 'Stretch and write one thing that felt better than last time';
    case 'Cognitive': return 'Close the material and write 3 key takeaways from memory';
    case 'Creative': return 'Step back and note what surprised you about today\'s work';
    case 'Career': return 'Screenshot or save today\'s output. Note one next step.';
    case 'Financial': return 'Log today\'s simulation result and one lesson learned';
    case 'Health': return 'Rate how you feel now vs. before. Note any changes.';
    default: return 'Reflect on what you learned and preview tomorrow';
  }
}

/**
 * Serialize a SessionBlueprint into a prompt-ready string for Agent 4.
 */
export function serializeBlueprint(blueprint: SessionBlueprint): string {
  const lines = [`── SESSION BLUEPRINT (follow this structure) ──`, `Total: ${blueprint.totalMinutes} minutes`, ''];

  blueprint.blocks.forEach((block, i) => {
    const resourceNote = block.resourceSlot
      ? ` — Video resource slot, max ${block.maxResourceMinutes} min video`
      : '';
    lines.push(`Block ${i + 1}: ${capitalize(block.type)} (${block.minutes} min) — ${block.description}${resourceNote}`);

    // Insert break notation if applicable
    const breakAfter = blueprint.restBreaks.find(b => b.afterBlock === i);
    if (breakAfter) {
      lines.push(`  ↳ ${breakAfter.minutes}-min break`);
    }
  });

  lines.push('');
  lines.push('RULES:');
  lines.push('- Each task step must map to exactly one block above');
  lines.push('- Video resources must fit within their block\'s max resource minutes');
  lines.push('- Do not combine learn + practice in one step');
  lines.push(`- Total step durations must sum to ${blueprint.totalMinutes} minutes`);
  lines.push('- Include break instructions between blocks where indicated');

  return lines.join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
