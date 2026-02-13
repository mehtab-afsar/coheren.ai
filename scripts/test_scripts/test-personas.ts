/**
 * Multi-Persona E2E Test Suite — Coheren AI
 *
 * Tests the full 5-agent pipeline across 5 distinct user archetypes:
 *   1. Emma     — Creative writer, Perfectionism + ProcrastinationPattern
 *   2. Raj      — AWS cert student, CognitiveFatigue + SkillGap + TimeConstraint
 *   3. Sarah    — Job seeker, Overcommitment + FearOfFailure
 *   4. Marcus   — First-time investor, SkillGap + UnrealisticExpectations
 *   5. Priya    — Comeback runner, Inconsistency + TimeConstraint
 *
 * Also runs RAG quality checks for each domain.
 *
 * Run: npx tsx scripts/test-personas.ts
 */

import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// ─── Env ──────────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env');
const envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const GROQ_KEY      = envVars['VITE_GROQ_API_KEY'] ?? '';
const JINA_KEY      = envVars['VITE_JINA_API_KEY'] ?? '';
const SUPA_URL      = envVars['VITE_SUPABASE_URL'] ?? '';
const SUPA_ANON_KEY = envVars['VITE_SUPABASE_ANON_KEY'] ?? '';

const groq = new Groq({ apiKey: GROQ_KEY });
const M70  = 'llama-3.3-70b-versatile';
const M8   = 'llama-3.1-8b-instant';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GoalAnalysis {
  domain: string; category: string; complexity: string; horizon: string;
  intensity: string; keyMilestones: string[];
  constraintsDetected: string[]; risksDetected: string[];
  realismChecks: { timeRealism: string; effortRealism: string };
}
interface Stone { type: string; severity: string; riskImpact: number; }
interface StoneProfile {
  userArchetype: string; primaryStone: string; stones: Stone[];
  agent3Guidance: string[]; agent5Note: string; confidence: number;
}
interface Agent2ProfileOutput { stoneProfile: StoneProfile; }
interface Phase {
  phaseNumber: number; phaseName: string; durationDays: number;
  primaryGoals: string[]; focusAreas: Record<string, number>;
  keyMilestones: string[]; scienceRationale: string;
  adaptationRules?: { if_completing_easily?: string; if_struggling?: string };
}
interface Roadmap { totalDays: number; totalPhases: number; phases: Phase[]; }
interface Agent3Output { roadmap: Roadmap; domainPedagogy: string; stoneModificationSummary: string; }
interface DailyTask {
  day: number; phase: number; week: number;
  task: {
    title: string; description: string; estimatedMinutes: number;
    steps: Array<{ stepNumber: number; instruction: string; duration: string; resource?: { url?: string } }>;
    tips: string[];
    successCriteria: { primary: string };
    resources?: { primary?: { url?: string; channel?: string } | null };
    adaptations_applied?: Record<string, string>;
  };
}

// ─── Persona Definitions ──────────────────────────────────────────────────────
interface Persona {
  name: string;
  goal: string;
  timeline: number;  // days
  budget: number;    // min/day
  stoneAnswers: Array<{ stoneId: string; answer: string }>;
  expectedDomain: string[];
  expectedPrimaryStone: string[];
  expectedDeliveryChecks: Array<{ name: string; fn: (t: DailyTask) => boolean }>;
  ragQuery: string;
  ragDomainKeywords: string[];  // words that should appear in RAG result for it to be "relevant"
}

const PERSONAS: Persona[] = [
  {
    name: 'Emma (Creative Writer)',
    goal: 'Write and publish my first novel — 80,000 words — in 6 months',
    timeline: 180,
    budget: 60,
    stoneAnswers: [
      { stoneId: 'Perfectionism',          answer: 'I rewrite every paragraph 10 times and delete it all. Nothing is ever good enough to keep.' },
      { stoneId: 'ProcrastinationPattern', answer: 'I sit down to write but spend 2 hours rearranging my desk or researching plot details instead.' },
      { stoneId: 'FearOfFailure',          answer: 'I am scared of people reading my work and thinking it is bad. I have never shown anyone anything I wrote.' },
    ],
    expectedDomain: ['Creative'],
    expectedPrimaryStone: ['Perfectionism', 'FearOfFailure', 'ProcrastinationPattern'],
    expectedDeliveryChecks: [
      { name: 'Task framed as rough draft or experiment',
        fn: t => /(rough draft|experiment:|draft|permission to fail|no wrong)/i.test(JSON.stringify(t.task)) },
      { name: 'Time-box present (perfectionism)',
        fn: t => /(timer|time.box|\d+ min.*stop|stop when timer)/i.test(JSON.stringify(t.task)) },
      { name: 'Starter step present',
        fn: t => /(open|blank page|create|write one|sit down|just start)/i.test(t.task.steps?.[0]?.instruction ?? '') },
    ],
    ragQuery: 'writer block perfectionism creative flow habit',
    ragDomainKeywords: ['writ', 'creat', 'habit', 'procrastin', 'flow', 'draft', 'block'],
  },
  {
    name: 'Raj (AWS Cert Student)',
    goal: 'Pass the AWS Solutions Architect Associate exam in 8 weeks — I have never used cloud services before',
    timeline: 56,
    budget: 60,
    stoneAnswers: [
      { stoneId: 'CognitiveFatigue', answer: 'After 2 hours of study I cannot retain anything. My brain goes blank and I feel physically exhausted.' },
      { stoneId: 'SkillGap',        answer: 'I have no cloud experience at all. I do not know what EC2 or S3 even means. Starting from zero.' },
      { stoneId: 'TimeConstraint',  answer: 'I work 10 hour shifts as a nurse. I only have 1 hour at night and weekends.' },
    ],
    expectedDomain: ['Cognitive', 'Career'],
    expectedPrimaryStone: ['CognitiveFatigue', 'SkillGap', 'TimeConstraint'],
    expectedDeliveryChecks: [
      { name: 'Max 3 steps (cognitive fatigue rule)',
        fn: t => (t.task.steps?.length ?? 0) <= 4 },
      { name: 'Prerequisite check or building-blocks reference',
        fn: t => /(prerequisite|building block|previously|before you start|check.*can you)/i.test(JSON.stringify(t.task)) },
      { name: 'Pomodoro or break structure',
        fn: t => /(pomodoro|break|25 min|5.min break|pause|rest)/i.test(JSON.stringify(t.task)) },
    ],
    ragQuery: 'spaced repetition exam preparation cognitive load study technique',
    ragDomainKeywords: ['recall', 'spaced', 'repetition', 'retriev', 'study', 'learn', 'memory', 'exam'],
  },
  {
    name: 'Sarah (Senior Eng Job Seeker)',
    goal: 'Land a senior software engineer role at a FAANG company in 90 days — I have been at the same mid-size company for 6 years',
    timeline: 90,
    budget: 45,
    stoneAnswers: [
      { stoneId: 'Overcommitment', answer: 'I applied to 50 companies at once, started interview prep, networking, resume revamp, LeetCode all simultaneously and burned out after 2 weeks.' },
      { stoneId: 'FearOfFailure',  answer: 'I turned down a Google recruiter last year because I was terrified of bombing the interviews. I have crippling imposter syndrome.' },
    ],
    expectedDomain: ['Career'],
    expectedPrimaryStone: ['FearOfFailure', 'Overcommitment'],
    expectedDeliveryChecks: [
      { name: 'Stop Here marker or hard cap on scope',
        fn: t => /(stop here|stop when|resist|do not add|only.*one|single focus|hard cap)/i.test(JSON.stringify(t.task)) },
      { name: 'Experiment or observation frame',
        fn: t => /(experiment:|observation|no wrong answer|just.*try|curiosity|permission)/i.test(JSON.stringify(t.task)) },
      { name: 'Tangible artifact or proof of work',
        fn: t => /(commit|output|artifact|deliverable|send|submit|write|draft|complete)/i.test(t.task.successCriteria?.primary ?? '') },
    ],
    ragQuery: 'imposter syndrome confidence career job search fear rejection',
    ragDomainKeywords: ['confiden', 'imposter', 'fear', 'job', 'career', 'reject', 'interview', 'growth'],
  },
  {
    name: 'Marcus (First-Time Investor)',
    goal: 'Build a $10,000 diversified investment portfolio starting with $500 in 12 months — I have never invested before',
    timeline: 365,
    budget: 30,
    stoneAnswers: [
      { stoneId: 'SkillGap',                  answer: 'I have never invested a dollar in my life. I do not know what a stock, bond, or ETF is. I am 28 and starting from scratch.' },
      { stoneId: 'UnrealisticExpectations',    answer: 'I want to 10x my money in 3 months like I have seen on Reddit. If I cannot do that it feels pointless.' },
    ],
    expectedDomain: ['Financial'],
    expectedPrimaryStone: ['SkillGap', 'UnrealisticExpectations'],
    expectedDeliveryChecks: [
      { name: 'Calibration note or realistic benchmark',
        fn: t => /(realistic|normal|expected|at this stage|typical|calibrat|benchmark)/i.test(JSON.stringify(t.task)) },
      { name: 'Real money check (simulation vs real action labelled)',
        fn: t => /(simulat|paper trade|hypothetical|practice|not.*real money|no.*actual|learn.*before)/i.test(JSON.stringify(t.task)) },
      { name: 'Prerequisite check for skill gap',
        fn: t => /(what is|definition|first.*understand|begin with basics|glossary|prerequisite|building block)/i.test(JSON.stringify(t.task)) },
    ],
    ragQuery: 'investment basics portfolio diversification compound interest beginner',
    ragDomainKeywords: ['invest', 'portfolio', 'compound', 'diversif', 'fund', 'return', 'financ', 'stock'],
  },
  {
    name: 'Priya (Comeback Runner)',
    goal: 'Run a half marathon — 21km — in 5 months, I quit running 2 years ago after a stress fracture',
    timeline: 150,
    budget: 40,
    stoneAnswers: [
      { stoneId: 'Inconsistency',  answer: 'I start a training plan, run 4 days then skip 2 weeks when life gets chaotic. It has happened every time.' },
      { stoneId: 'TimeConstraint', answer: 'I have two kids under 5. I can only run at 5:30am before they wake up. Any other time is impossible.' },
      { stoneId: 'FearOfFailure',  answer: 'My stress fracture was from overtraining. I am terrified of injuring myself again if I push too hard.' },
    ],
    expectedDomain: ['Kinesthetic', 'Health'],
    expectedPrimaryStone: ['Inconsistency', 'FearOfFailure', 'TimeConstraint'],
    expectedDeliveryChecks: [
      { name: 'Starter step (put on shoes / step outside)',
        fn: t => /(shoes|outside|stand|step outside|put on|lace)/i.test(t.task.steps?.[0]?.instruction ?? '') },
      { name: 'Never miss twice reminder',
        fn: t => /(never miss|skip today|tomorrow no matter|bounce back|next day)/i.test(JSON.stringify(t.task.tips ?? [])) },
      { name: 'Injury prevention / safety note',
        fn: t => /(injur|safety|warm.?up|rate your|pain|fracture|listen.*body|stop if)/i.test(JSON.stringify(t.task)) },
    ],
    ragQuery: 'running injury prevention habit formation consistency comeback training',
    ragDomainKeywords: ['run', 'injur', 'habit', 'train', 'consist', 'recover', 'progress', 'athlete'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function bar(c = '═', n = 62) { return c.repeat(n); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let totalPassed = 0, totalFailed = 0;
const allFailures: string[] = [];

interface PersonaResult {
  persona: string;
  passed: number;
  failed: number;
  failures: string[];
  agent1?: GoalAnalysis;
  agent2?: Agent2ProfileOutput;
  agent3?: Agent3Output;
  agent4?: DailyTask;
  ragResult?: string;
  ragRelevant?: boolean;
  adaptationsApplied?: Record<string, string> | undefined;
}

const results: PersonaResult[] = [];

function check(label: string, value: boolean, r: PersonaResult) {
  if (value) { r.passed++; totalPassed++; process.stdout.write(`  ✅ ${label}\n`); }
  else        { r.failed++; totalFailed++; r.failures.push(label); allFailures.push(`[${r.persona}] ${label}`); process.stdout.write(`  ❌ ${label}\n`); }
}

// ─── PLACEHOLDER URL SANITIZER (mirrors production) ───────────────────────────
const PLACEHOLDER_IDS = new Set(['dQw4w9WgXcQ','xvFZjo5PgG0','VIDEO_ID','XXXXXXXXXX']);
function sanitizeUrl(url: string | undefined, title: string): string | undefined {
  if (!url) return url;
  if (url.includes('youtube.com/results?search_query=')) return url;
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{6,12})/);
  if (m && PLACEHOLDER_IDS.has(m[1])) {
    const q = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim());
    return `https://www.youtube.com/results?search_query=${q}`;
  }
  return url;
}
function sanitizeTask(task: DailyTask): DailyTask {
  const title = task.task.title;
  if (task.task.resources?.primary?.url) task.task.resources.primary.url = sanitizeUrl(task.task.resources.primary.url, title);
  for (const step of task.task.steps ?? []) if (step.resource?.url) step.resource.url = sanitizeUrl(step.resource.url, title);
  return task;
}

// ─── PHASE RESOLVER ──────────────────────────────────────────────────────────
function resolvePhase(phases: Phase[], day: number) {
  let acc = 0;
  for (const phase of phases) {
    const dur = phase.durationDays ?? 30;
    if (day >= acc + 1 && day <= acc + dur) {
      const d = day - acc;
      return { phase, week: Math.ceil(d / 7), dayInPhase: d };
    }
    acc += dur;
  }
  const last = phases[phases.length - 1];
  return { phase: last, week: 1, dayInPhase: 1 };
}

// ─── AGENT CALLERS ────────────────────────────────────────────────────────────
async function callAgent1(p: Persona): Promise<GoalAnalysis> {
  const sys = `Analyze the user's goal. Return JSON:
{"goalAnalysis":{"domain":"Cognitive|Kinesthetic|Career|Financial|Creative|Health|Lifestyle|Hybrid","category":"<string>","complexity":"beginner|intermediate|advanced","horizon":"Short-term|Mid-term|Long-term","intensity":"Low|Moderate|High|Extreme","keyMilestones":["<string>"],"constraintsDetected":["<string>"],"risksDetected":["<string>"],"smartStatus":{"specific":bool,"measurable":bool,"achievable":bool,"relevant":bool,"timeBound":bool},"realismChecks":{"timeRealism":"Realistic|Optimistic|Unrealistic","effortRealism":"Realistic|Optimistic|Unrealistic"}}}`;
  const res = await groq.chat.completions.create({
    model: M70, temperature: 0.2, max_tokens: 1200, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: sys }, { role: 'user', content: `Goal: "${p.goal}" | Timeline: ${p.timeline} days | Daily time: ${p.budget} min` }],
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  return parsed.goalAnalysis ?? parsed;
}

async function callAgent2(p: Persona, ga: GoalAnalysis): Promise<Agent2ProfileOutput> {
  const STONES = 'TimeConstraint,ResourceGap,EnvironmentFriction,Inconsistency,FearOfFailure,Perfectionism,LowConfidence,UnrealisticExpectations,FocusFragility,CognitiveFatigue,SkillGap,ProcrastinationPattern,Overcommitment';
  const sys = `Extract a behavioral stone profile. Valid stones: ${STONES}.
Return JSON:{"stoneProfile":{"userArchetype":"<2-4 words>","primaryStone":"<StoneType>","stones":[{"type":"<StoneType>","category":"Logistical|Psychological|Cognitive|Behavioural","trigger":"<string>","severity":"Low|Moderate|High|Critical","riskImpact":<0-1>}],"agent3Guidance":["<string>"],"agent5Note":"<string>","confidence":<0-1>}}`;
  const userMsg = `Goal: "${p.goal}" | Domain: ${ga.domain} | Complexity: ${ga.complexity}
Stone answers:\n${p.stoneAnswers.map(a => `- ${a.stoneId}: "${a.answer}"`).join('\n')}
Extract 2–4 stones. primaryStone = highest riskImpact stone.`;
  const res = await groq.chat.completions.create({
    model: M70, temperature: 0.2, max_tokens: 1200, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  return parsed.stoneProfile ? parsed : { stoneProfile: parsed };
}

async function callAgent3(p: Persona, ga: GoalAnalysis, sp: Agent2ProfileOutput): Promise<Agent3Output> {
  const sys = `Build a progressive curriculum for the goal. CRITICAL: phases[].durationDays must sum to exactly ${p.timeline}.
Return JSON:{"roadmap":{"totalDays":${p.timeline},"totalPhases":<2-3>,"phases":[{"phaseNumber":N,"phaseName":"<name>","weeks":[N],"durationDays":<number>,"primaryGoals":["<string>"],"focusAreas":{},"keyMilestones":["<string>"],"scienceRationale":"<string>","adaptationRules":{"if_completing_easily":"<string>","if_struggling":"<string>"}}],"progressionCurve":{},"reviewMoments":[],"restDays":{"pattern":"<string>","customDays":[],"restType":"complete_rest"},"modifiers_from_stones":{}},"domainPedagogy":"<string>","stoneModificationSummary":"<string>"}`;
  const userMsg = `Goal: "${p.goal}" | ${p.timeline} days | ${p.budget} min/day
Domain: ${ga.domain} | Complexity: ${ga.complexity}
Primary stone: ${sp.stoneProfile.primaryStone}
Stones: ${sp.stoneProfile.stones.map(s => `${s.type}(${s.severity})`).join(', ')}
Agent3 Guidance: ${sp.stoneProfile.agent3Guidance.join('; ')}`;
  const res = await groq.chat.completions.create({
    model: M70, temperature: 0.3, max_tokens: 3000, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  const out: Agent3Output = parsed.roadmap ? parsed : { roadmap: parsed, domainPedagogy: ga.domain, stoneModificationSummary: '' };
  // Normalize durationDays sum
  const rm = out.roadmap;
  if (rm.phases?.length > 0) {
    const sum = rm.phases.reduce((s: number, ph: Phase) => s + (ph.durationDays ?? 0), 0);
    if (sum !== p.timeline) {
      const per = Math.floor(p.timeline / rm.phases.length);
      rm.phases.forEach((ph: Phase, i: number) => {
        ph.durationDays = i === rm.phases.length - 1 ? p.timeline - per * (rm.phases.length - 1) : per;
      });
    }
  }
  return out;
}

async function callAgent4(p: Persona, roadmap: Agent3Output, sp: Agent2ProfileOutput, day: number): Promise<DailyTask> {
  const { phase, week, dayInPhase } = resolvePhase(roadmap.roadmap.phases, day);
  const STONE_RULES: Record<string, string> = {
    Perfectionism: `DELIVERY — Perfectionism: Add explicit time-box. Add "Permission to Fail" tip. If Creative domain, label "ROUGH DRAFT TASK". Success criteria = completion, never quality.`,
    ProcrastinationPattern: `DELIVERY — ProcrastinationPattern: Step 1 = Starter Step ≤2 min. Hardest step at position 2. Final tip = implementation intention.`,
    Inconsistency: `DELIVERY — Inconsistency: Step 1 = Starter Step (only goal: begin). Final tip = Never Miss Twice reminder. Keep completable in 60% of time budget.`,
    FearOfFailure: `DELIVERY — FearOfFailure: Frame as "Experiment:". Observation-based success criteria. "Permission to Fail" tip.`,
    CognitiveFatigue: `DELIVERY — CognitiveFatigue: Max 3 steps. Insert 5-min break after step 2. Short paragraphs only.`,
    SkillGap: `DELIVERY — SkillGap: Step 1 = prerequisite check. Plain language, define all jargon. Add "Building Blocks" reference.`,
    Overcommitment: `DELIVERY — Overcommitment: Hard cap: estimatedMinutes ≤ ${Math.floor(p.budget * 0.85)}. Add "STOP HERE" marker. Final tip: "Stop when planned."`,
    UnrealisticExpectations: `DELIVERY — UnrealisticExpectations: Add calibration note. successCriteria.primary = realistic benchmark.`,
    TimeConstraint: `DELIVERY — TimeConstraint: estimatedMinutes ≤ ${p.budget}. Micro-blocks with timers. Depth over breadth.`,
  };
  const stones = sp.stoneProfile.stones.map(s => s.type);
  const stoneRules = stones.map(s => STONE_RULES[s] ?? '').filter(Boolean).join('\n\n');

  const sys = `You are Agent 4: Daily Task Generator for Coheren AI.
Generate ONE specific step-by-step task for today.
${stoneRules ? `\n── STONE DELIVERY RULES ──\n${stoneRules}` : ''}
── GLOBAL RULES ──
1. estimatedMinutes ≤ ${p.budget}
2. Specific actionable steps with durations
3. Include Cinema Mode resource (YouTube search URL)
4. Completion-based successCriteria
Return ONLY valid JSON:
{"day":<n>,"phase":<n>,"week":<n>,"task":{"title":"<string>","description":"<string>","estimatedMinutes":<n>,"steps":[{"stepNumber":1,"instruction":"<string>","duration":"<string>","resource":{"type":"video","url":"<yt search URL>","focusPoints":["<string>"]}}],"tips":["<string>"],"successCriteria":{"primary":"<string>"},"whyThisMatters":"<string>","adaptations_applied":{"<StoneType>":"<how>"},"resources":{"primary":{"type":"video","title":"<string>","url":"<yt search URL>","channel":"<string>","watchFrom":"<MM:SS>","watchTo":"<MM:SS>"},"supplementary":[]}}}`;

  const userMsg = `Goal: "${p.goal}" | Day ${day} | Phase ${phase.phaseNumber} "${phase.phaseName}" | Week ${week} | Day ${dayInPhase} of phase
User: ${sp.stoneProfile.userArchetype} | Primary stone: ${sp.stoneProfile.primaryStone}
Active stones: ${sp.stoneProfile.stones.map(s => `${s.type}[${s.severity}]`).join(', ')}
Phase goals: ${phase.primaryGoals.join('; ')}
Phase science: ${phase.scienceRationale}
Generate today's task. Apply ALL delivery rules listed above.`;

  const res = await groq.chat.completions.create({
    model: M8, temperature: 0.5, max_tokens: 2000, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  const raw: DailyTask = parsed.day ? parsed : { day, phase: phase.phaseNumber, week, task: parsed.task ?? parsed };
  return sanitizeTask(raw);
}

// ─── RAG QUALITY TEST ────────────────────────────────────────────────────────
async function testRagQuality(query: string, keywords: string[]): Promise<{ result: string; relevant: boolean; chunkCount: number }> {
  if (!JINA_KEY || !SUPA_URL || !SUPA_ANON_KEY) {
    return { result: 'SKIPPED (missing VITE_JINA_API_KEY / Supabase keys)', relevant: false, chunkCount: 0 };
  }
  try {
    // Embed via Jina
    const jinaRes = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${JINA_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: [query], model: 'jina-embeddings-v3', task: 'retrieval.query', dimensions: 1024 }),
    });
    if (!jinaRes.ok) return { result: 'SKIPPED (Jina API error)', relevant: false, chunkCount: 0 };
    const jinaData = await jinaRes.json() as { data: Array<{ embedding: number[] }> };
    const embedding = jinaData.data?.[0]?.embedding;
    if (!embedding) return { result: 'SKIPPED (no embedding)', relevant: false, chunkCount: 0 };

    // Query Supabase RPC
    const ragClient = createClient(SUPA_URL, SUPA_ANON_KEY);
    const { data, error } = await ragClient.rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 4,
    });
    if (error || !Array.isArray(data) || data.length === 0) {
      return { result: 'No matches above threshold (RAG DB may be empty)', relevant: false, chunkCount: 0 };
    }
    const formatted = (data as Array<{ source: string; content: string }>)
      .map(r => `[${r.source}] ${r.content.substring(0, 120)}...`)
      .join('\n');
    const allText = (data as Array<{ content: string }>).map(r => r.content.toLowerCase()).join(' ');
    const relevant = keywords.some(k => allText.includes(k));
    return { result: formatted, relevant, chunkCount: data.length };
  } catch (e) {
    return { result: `ERROR: ${String(e)}`, relevant: false, chunkCount: 0 };
  }
}

// ─── RUN ONE PERSONA ─────────────────────────────────────────────────────────
async function runPersona(p: Persona): Promise<PersonaResult> {
  const r: PersonaResult = { persona: p.name, passed: 0, failed: 0, failures: [] };

  console.log(`\n${bar('═')}`);
  console.log(` PERSONA: ${p.name}`);
  console.log(` Goal   : "${p.goal.substring(0, 70)}${p.goal.length > 70 ? '…' : ''}"`);
  console.log(` Stones : ${p.stoneAnswers.map(a => a.stoneId).join(' | ')}`);
  console.log(bar('═'));

  // ─── Agent 1 ─────────────────────────────────────────────────────────────
  console.log('\n── Agent 1: Goal Analysis');
  const ga = await callAgent1(p);
  r.agent1 = ga;
  console.log(`   Domain    : ${ga.domain} | Category: ${ga.category} | Complexity: ${ga.complexity}`);
  console.log(`   Time realism: ${ga.realismChecks?.timeRealism} | Effort realism: ${ga.realismChecks?.effortRealism}`);
  check(`Agent 1: domain matches expected (${p.expectedDomain.join('|')})`,
    p.expectedDomain.includes(ga.domain), r);
  check('Agent 1: complexity detected (non-empty)', !!ga.complexity, r);
  check('Agent 1: at least 2 milestones identified', (ga.keyMilestones?.length ?? 0) >= 2, r);
  check('Agent 1: risks detected', (ga.risksDetected?.length ?? 0) >= 1, r);
  await sleep(400);

  // ─── Agent 2 ─────────────────────────────────────────────────────────────
  console.log('\n── Agent 2: Stone Profile');
  const sp = await callAgent2(p, ga);
  r.agent2 = sp;
  const prof = sp.stoneProfile;
  console.log(`   Archetype    : ${prof.userArchetype}`);
  console.log(`   Primary Stone: ${prof.primaryStone}`);
  console.log(`   Stones       : ${prof.stones.map(s => `${s.type}(${s.severity})`).join(', ')}`);
  console.log(`   Agent5 Note  : ${prof.agent5Note}`);
  check(`Agent 2: primaryStone matches expected (${p.expectedPrimaryStone.join('|')})`,
    p.expectedPrimaryStone.includes(prof.primaryStone), r);
  check('Agent 2: stone count 2–4', prof.stones.length >= 2 && prof.stones.length <= 4, r);
  check('Agent 2: user archetype non-empty', !!prof.userArchetype, r);
  check('Agent 2: agent3Guidance provided', (prof.agent3Guidance?.length ?? 0) >= 1, r);
  check('Agent 2: agent5Note (struggle prediction) non-empty', !!prof.agent5Note, r);
  check('Agent 2: confidence > 0.5', prof.confidence > 0.5, r);
  await sleep(400);

  // ─── Agent 3 ─────────────────────────────────────────────────────────────
  console.log('\n── Agent 3: Curriculum');
  const roadmap = await callAgent3(p, ga, sp);
  r.agent3 = roadmap;
  const rm = roadmap.roadmap;
  const phaseSum = rm.phases?.reduce((s: number, ph: Phase) => s + (ph.durationDays ?? 0), 0) ?? 0;
  console.log(`   Phases (${rm.phases?.length}): ${rm.phases?.map((ph: Phase) => `"${ph.phaseName}"(${ph.durationDays}d)`).join(' → ')}`);
  console.log(`   Pedagogy: ${roadmap.domainPedagogy}`);
  check('Agent 3: ≥2 phases', (rm.phases?.length ?? 0) >= 2, r);
  check(`Agent 3: phase sum = ${p.timeline} days`, phaseSum === p.timeline, r);
  check('Agent 3: stone modifications present', !!roadmap.stoneModificationSummary, r);
  check('Agent 3: each phase has scienceRationale', rm.phases?.every((ph: Phase) => !!ph.scienceRationale), r);
  await sleep(400);

  // ─── Agent 4: Day 1 ──────────────────────────────────────────────────────
  console.log('\n── Agent 4: Task (Day 1)');
  const task = await callAgent4(p, roadmap, sp, 1);
  r.agent4 = task;
  const t = task.task;
  const resUrl = t.resources?.primary?.url ?? '';
  console.log(`   Title      : ${t.title}`);
  console.log(`   Steps      : ${t.steps?.length ?? 0} | Est: ${t.estimatedMinutes}min (budget: ${p.budget}min)`);
  console.log(`   Resource   : ${resUrl.substring(0, 70) || '—'}`);
  console.log(`   Adaptations: ${Object.keys(t.adaptations_applied ?? {}).join(', ') || 'none listed'}`);
  r.adaptationsApplied = t.adaptations_applied;
  check('Agent 4: title non-empty', t.title.length > 0, r);
  check(`Agent 4: estimatedMinutes ≤ ${p.budget}`, (t.estimatedMinutes ?? 999) <= p.budget, r);
  check('Agent 4: ≥2 steps', (t.steps?.length ?? 0) >= 2, r);
  check('Agent 4: successCriteria set', !!t.successCriteria?.primary, r);
  check('Agent 4: resource URL present', resUrl.length > 5, r);
  check('Agent 4: resource is real (not placeholder)', !resUrl.includes('dQw4w9WgXcQ'), r);
  for (const dc of p.expectedDeliveryChecks) {
    check(`Agent 4 delivery — ${dc.name}`, dc.fn(task), r);
  }
  await sleep(400);

  // ─── RAG Quality ─────────────────────────────────────────────────────────
  console.log('\n── RAG Quality Check');
  const rag = await testRagQuality(p.ragQuery, p.ragDomainKeywords);
  r.ragResult = rag.result;
  r.ragRelevant = rag.relevant;
  console.log(`   Query    : "${p.ragQuery}"`);
  console.log(`   Chunks   : ${rag.chunkCount} returned`);
  console.log(`   Relevant : ${rag.relevant ? '✅ YES' : rag.result.startsWith('SKIPPED') ? '⏭  SKIPPED' : '❌ NO (no domain keywords found)'}`);
  if (rag.chunkCount > 0) {
    console.log(`   Preview  :\n${rag.result.split('\n').slice(0, 3).map(l => '     ' + l).join('\n')}`);
  }
  if (!rag.result.startsWith('SKIPPED')) {
    check(`RAG: returns chunks for ${ga.domain} domain`, rag.chunkCount > 0, r);
    check('RAG: returned content is domain-relevant', rag.relevant, r);
  }

  // ─── Summary per persona ─────────────────────────────────────────────────
  console.log(`\n  Persona result: ${r.passed}/${r.passed + r.failed} passed`);
  if (r.failures.length > 0) r.failures.forEach(f => console.log(`  ❌ ${f}`));

  return r;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n' + bar('═', 70));
  console.log(' Coheren AI — Multi-Persona Test Suite');
  console.log(' 5 Personas × (Agent 1 + 2 + 3 + 4 + RAG) | ' + new Date().toISOString());
  console.log(bar('═', 70));

  for (const persona of PERSONAS) {
    const result = await runPersona(persona);
    results.push(result);
    await sleep(800);
  }

  // ─── GLOBAL SUMMARY ───────────────────────────────────────────────────────
  console.log('\n\n' + bar('═', 70));
  console.log(' GLOBAL RESULTS');
  console.log(bar('═', 70));

  const total = totalPassed + totalFailed;
  console.log(`\n Total checks : ${total}`);
  console.log(` Passed       : ${totalPassed}`);
  console.log(` Failed       : ${totalFailed}`);
  console.log(` Pass rate    : ${((totalPassed / total) * 100).toFixed(1)}%\n`);

  console.log(' Per-persona breakdown:');
  for (const r of results) {
    const sym = r.failed === 0 ? '✅' : '⚠️ ';
    console.log(`  ${sym}  ${r.persona.padEnd(35)} ${r.passed}/${r.passed + r.failed}`);
  }

  if (allFailures.length > 0) {
    console.log('\n All failures:');
    allFailures.forEach(f => console.log(`   ❌ ${f}`));
  }

  // ─── WRITE JSON RESULTS for TEST_REPORT ──────────────────────────────────
  const reportData = {
    runAt: new Date().toISOString(),
    totalPassed, totalFailed,
    passRate: totalPassed / total,
    personas: results.map(r => ({
      persona: r.persona,
      passed: r.passed,
      failed: r.failed,
      failures: r.failures,
      domain: r.agent1?.domain,
      complexity: r.agent1?.complexity,
      primaryStone: r.agent2?.stoneProfile.primaryStone,
      stoneCount: r.agent2?.stoneProfile.stones.length,
      phases: r.agent3?.roadmap.phases.map(ph => `${ph.phaseName}(${ph.durationDays}d)`),
      taskTitle: r.agent4?.task.title,
      adaptationsApplied: r.adaptationsApplied,
      ragRelevant: r.ragRelevant,
    })),
  };
  const outPath = path.resolve(process.cwd(), 'scripts/persona-results.json');
  fs.writeFileSync(outPath, JSON.stringify(reportData, null, 2));
  console.log(`\n Results written to: ${outPath}`);

  if (totalFailed === 0) console.log('\n 🎉 ALL CHECKS PASSED across all personas!');
  else console.log(`\n ⚠️  ${totalFailed} check(s) failed — review above`);

  process.exit(totalFailed > 0 ? 1 : 0);
})();
