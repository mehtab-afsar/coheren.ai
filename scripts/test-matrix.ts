#!/usr/bin/env node
/**
 * E2E Test Matrix — 8 domains × 5 stones = 40 test cases
 *
 * Runs a representative goal through Agents 1→2→3→4 for every
 * domain × stone combination and validates output quality.
 *
 * Usage: node --env-file=.env node_modules/.bin/tsx scripts/test-matrix.ts
 *
 * Options:
 *   --quick     Run only 1 stone per domain (8 tests instead of 40)
 *   --domain=X  Run only domain X (e.g. --domain=Career)
 *   --stone=X   Run only stone X (e.g. --stone=FearOfFailure)
 */

import 'dotenv/config';
import { runOnboardingAgents, runCurriculumBuilder, runTaskGenerator } from '../src/core/agents/orchestrator.ts';
import { extractStones } from '../src/core/agents/stone-identifier.ts';
import type { Agent1Output, Agent2ProfileOutput, Agent3Output, StoneAnswer, StoneType } from '../src/types/agents.ts';

// ─── Test Matrix ──────────────────────────────────────────────────────────────

interface DomainCase {
  domain: string;
  goal: string;
  timeline: number;
  dailyTime: number;
  category: string;
}

const DOMAINS: DomainCase[] = [
  { domain: 'Cognitive',    goal: 'Learn to play chess competitively and reach 1500 ELO rating',                timeline: 90, dailyTime: 45, category: 'Learning' },
  { domain: 'Kinesthetic',  goal: 'Run a half-marathon in under 2 hours',                                      timeline: 120, dailyTime: 60, category: 'Fitness' },
  { domain: 'Career',       goal: 'Get promoted to senior software engineer within 6 months',                   timeline: 180, dailyTime: 45, category: 'Career' },
  { domain: 'Financial',    goal: 'Build a $10,000 emergency fund and start investing',                         timeline: 120, dailyTime: 30, category: 'Financial' },
  { domain: 'Creative',     goal: 'Write and self-publish a 50,000 word novel',                                 timeline: 90, dailyTime: 60, category: 'Creative' },
  { domain: 'Health',       goal: 'Establish a consistent meditation practice and improve sleep quality',        timeline: 60, dailyTime: 20, category: 'Health' },
  { domain: 'Lifestyle',    goal: 'Declutter my entire apartment and build a minimalist morning routine',        timeline: 45, dailyTime: 30, category: 'Lifestyle' },
  { domain: 'Hybrid',       goal: 'Launch a side business selling handmade pottery online',                      timeline: 120, dailyTime: 45, category: 'Creative' },
];

const STONES: StoneType[] = [
  'FearOfFailure',
  'ProcrastinationPattern',
  'Perfectionism',
  'Overcommitment',
  'Inconsistency',
];

function makeStoneAnswers(stone: StoneType): StoneAnswer[] {
  // Simulate high-impact answers for the target stone
  return [
    { stoneId: stone, answer: 'strongly agree', impact: { [stone]: 0.9, severity: 'Critical' } },
    { stoneId: 'Inconsistency', answer: 'agree', impact: { Inconsistency: 0.4, severity: 'Low' } },
  ];
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface TestResult {
  domain: string;
  stone: string;
  agent1: { pass: boolean; errors: string[] };
  agent2: { pass: boolean; errors: string[] };
  agent3: { pass: boolean; errors: string[] };
  agent4: { pass: boolean; errors: string[] };
  latencyMs: number;
  overallPass: boolean;
}

function validateAgent1(output: Agent1Output): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!output?.goalAnalysis) errors.push('Missing goalAnalysis');
  if (!output?.goalAnalysis?.domain) errors.push('Missing domain');
  if (!output?.goalAnalysis?.category) errors.push('Missing category');
  if (!output?.goalAnalysis?.complexity) errors.push('Missing complexity');
  return { pass: errors.length === 0, errors };
}

function validateAgent2(output: Agent2ProfileOutput): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!output?.stoneProfile) errors.push('Missing stoneProfile');
  if (!output?.stoneProfile?.primaryStone) errors.push('Missing primaryStone');
  if (!Array.isArray(output?.stoneProfile?.stones)) errors.push('stones not an array');
  if ((output?.stoneProfile?.stones?.length ?? 0) === 0) errors.push('Empty stones array');
  return { pass: errors.length === 0, errors };
}

function validateAgent3(output: Agent3Output): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!output?.roadmap) errors.push('Missing roadmap');
  const phases = output?.roadmap?.phases;
  if (!Array.isArray(phases) || phases.length < 2) errors.push(`Need ≥2 phases, got ${phases?.length ?? 0}`);
  for (const p of phases ?? []) {
    if (!p.phaseName) errors.push('Phase missing phaseName');
    if (!p.durationDays || p.durationDays < 1) errors.push(`Phase "${p.phaseName}" has invalid durationDays`);
    if (!p.focusAreas || Object.keys(p.focusAreas).length === 0) errors.push(`Phase "${p.phaseName}" has no focusAreas`);
  }
  if (!output?.domainPedagogy) errors.push('Missing domainPedagogy');
  return { pass: errors.length === 0, errors };
}

function validateAgent4(task: Record<string, unknown>): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const t = task as { task?: { title?: string; steps?: unknown[]; successCriteria?: { primary?: string }; estimatedMinutes?: number; tips?: unknown[] } };
  const inner = t.task ?? (task as typeof t.task);
  if (!inner?.title) errors.push('Missing task title');
  if (!inner?.steps || (inner.steps as unknown[]).length < 3) errors.push(`Need ≥3 steps, got ${(inner?.steps as unknown[])?.length ?? 0}`);
  if (!inner?.successCriteria?.primary) errors.push('Missing successCriteria.primary');
  if (!inner?.estimatedMinutes || inner.estimatedMinutes < 5) errors.push('estimatedMinutes too low');
  // Check for vague titles
  const vagueWords = ['do', 'complete', 'finish', 'work on', 'task for'];
  if (inner?.title && vagueWords.some(v => inner.title!.toLowerCase().startsWith(v))) {
    errors.push(`Vague title: "${inner.title}"`);
  }
  return { pass: errors.length === 0, errors };
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runTestCase(domainCase: DomainCase, stone: StoneType): Promise<TestResult> {
  const start = performance.now();
  const result: TestResult = {
    domain: domainCase.domain,
    stone,
    agent1: { pass: false, errors: [] },
    agent2: { pass: false, errors: [] },
    agent3: { pass: false, errors: [] },
    agent4: { pass: false, errors: [] },
    latencyMs: 0,
    overallPass: false,
  };

  try {
    // Agent 1 + 2
    const { goalAnalysis } = await runOnboardingAgents(
      domainCase.goal, domainCase.timeline, domainCase.dailyTime, [], { category: domainCase.category }
    );
    result.agent1 = validateAgent1(goalAnalysis);

    // Agent 2 — extract stones with forced stone profile
    const stoneAnswers = makeStoneAnswers(stone);
    const stoneProfile = await extractStones(
      { userId: 'test', goal: domainCase.goal, timeline: domainCase.timeline, dailyTimeAvailable: domainCase.dailyTime },
      goalAnalysis,
      stoneAnswers
    );
    result.agent2 = validateAgent2(stoneProfile);

    // Agent 3
    const roadmap = await runCurriculumBuilder(
      domainCase.goal, domainCase.timeline, domainCase.dailyTime, goalAnalysis, stoneProfile
    );
    result.agent3 = validateAgent3(roadmap);

    // Agent 4 — generate day 1 task
    const task = await runTaskGenerator(1, roadmap, stoneProfile, domainCase.dailyTime, undefined, domainCase.goal, domainCase.category);
    result.agent4 = validateAgent4(task as unknown as Record<string, unknown>);

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Attribute error to the agent that failed
    if (!result.agent1.pass && result.agent1.errors.length === 0) {
      result.agent1 = { pass: false, errors: [`Exception: ${errMsg}`] };
    } else if (!result.agent2.pass && result.agent2.errors.length === 0) {
      result.agent2 = { pass: false, errors: [`Exception: ${errMsg}`] };
    } else if (!result.agent3.pass && result.agent3.errors.length === 0) {
      result.agent3 = { pass: false, errors: [`Exception: ${errMsg}`] };
    } else {
      result.agent4 = { pass: false, errors: [`Exception: ${errMsg}`] };
    }
  }

  result.latencyMs = Math.round(performance.now() - start);
  result.overallPass = result.agent1.pass && result.agent2.pass && result.agent3.pass && result.agent4.pass;
  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick');
  const domainFilter = args.find(a => a.startsWith('--domain='))?.split('=')[1];
  const stoneFilter = args.find(a => a.startsWith('--stone='))?.split('=')[1] as StoneType | undefined;

  let domains = DOMAINS;
  let stones = STONES;

  if (domainFilter) {
    domains = DOMAINS.filter(d => d.domain.toLowerCase() === domainFilter.toLowerCase());
    if (domains.length === 0) { console.error(`Unknown domain: ${domainFilter}`); process.exit(1); }
  }
  if (stoneFilter) {
    if (!STONES.includes(stoneFilter)) { console.error(`Unknown stone: ${stoneFilter}`); process.exit(1); }
    stones = [stoneFilter];
  }
  if (quick) stones = [stones[0]];

  const totalTests = domains.length * stones.length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`E2E TEST MATRIX: ${domains.length} domains × ${stones.length} stones = ${totalTests} tests`);
  console.log(`${'='.repeat(60)}\n`);

  const results: TestResult[] = [];
  let completed = 0;

  for (const domain of domains) {
    for (const stone of stones) {
      completed++;
      const label = `[${completed}/${totalTests}] ${domain.domain} × ${stone}`;
      process.stdout.write(`${label}...`);

      const result = await runTestCase(domain, stone);
      results.push(result);

      const status = result.overallPass ? '✅ PASS' : '❌ FAIL';
      const latency = `${(result.latencyMs / 1000).toFixed(1)}s`;
      console.log(` ${status} (${latency})`);

      if (!result.overallPass) {
        const allErrors = [
          ...result.agent1.errors.map(e => `  A1: ${e}`),
          ...result.agent2.errors.map(e => `  A2: ${e}`),
          ...result.agent3.errors.map(e => `  A3: ${e}`),
          ...result.agent4.errors.map(e => `  A4: ${e}`),
        ];
        console.log(allErrors.join('\n'));
      }

      // Rate-limit: 2s between tests to avoid API throttling
      if (completed < totalTests) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);

  const passed = results.filter(r => r.overallPass).length;
  const failed = results.filter(r => !r.overallPass).length;
  const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Pass rate: ${(passed / results.length * 100).toFixed(1)}%`);
  console.log(`Avg latency: ${(avgLatency / 1000).toFixed(1)}s`);

  // Per-agent pass rates
  console.log('\nPer-agent pass rates:');
  for (const [key, label] of Object.entries({
    agent1: 'Agent 1 (Goal)',
    agent2: 'Agent 2 (Stone)',
    agent3: 'Agent 3 (Curriculum)',
    agent4: 'Agent 4 (Task)',
  })) {
    const agentPassed = results.filter(r => (r[key as keyof TestResult] as { pass: boolean }).pass).length;
    console.log(`  ${label}: ${agentPassed}/${results.length} (${(agentPassed / results.length * 100).toFixed(0)}%)`);
  }

  // Per-domain pass rates
  console.log('\nPer-domain:');
  for (const domain of domains) {
    const domainResults = results.filter(r => r.domain === domain.domain);
    const domainPassed = domainResults.filter(r => r.overallPass).length;
    console.log(`  ${domain.domain}: ${domainPassed}/${domainResults.length}`);
  }

  // Per-stone pass rates (if more than 1 stone)
  if (stones.length > 1) {
    console.log('\nPer-stone:');
    for (const stone of stones) {
      const stoneResults = results.filter(r => r.stone === stone);
      const stonePassed = stoneResults.filter(r => r.overallPass).length;
      console.log(`  ${stone}: ${stonePassed}/${stoneResults.length}`);
    }
  }

  // Failures detail
  if (failed > 0) {
    console.log('\n--- FAILURES ---');
    for (const r of results.filter(r => !r.overallPass)) {
      console.log(`\n${r.domain} × ${r.stone}:`);
      for (const [key, label] of [['agent1', 'A1'], ['agent2', 'A2'], ['agent3', 'A3'], ['agent4', 'A4']] as const) {
        const agent = r[key] as { pass: boolean; errors: string[] };
        if (!agent.pass) {
          console.log(`  ${label}: ${agent.errors.join('; ')}`);
        }
      }
    }
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Matrix test crashed:', err);
  process.exit(2);
});
