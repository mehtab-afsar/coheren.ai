import { useStore } from '@core/store/useStore';

export type UserTier = 'novice' | 'builder' | 'practitioner' | 'expert' | 'master';

export interface UserLevel {
  tier: UserTier;
  label: string;
  score: number;
  nextAt: number;
  progress: number; // 0–100, progress toward next level
  color: string;
  tagline: string; // identity-reinforcing phrase
}

const TIERS: Array<{
  tier: UserTier;
  label: string;
  min: number;
  max: number;
  color: string;
  tagline: string;
}> = [
  { tier: 'novice',       label: 'Novice',       min: 0,   max: 20,  color: '#94a3b8', tagline: 'You\'re just getting started' },
  { tier: 'builder',      label: 'Builder',      min: 20,  max: 50,  color: '#0ea5e9', tagline: 'You\'re building real habits' },
  { tier: 'practitioner', label: 'Practitioner', min: 50,  max: 100, color: '#C4552D', tagline: 'You\'ve moved past the beginner phase' },
  { tier: 'expert',       label: 'Expert',       min: 100, max: 200, color: '#f97316', tagline: 'You\'re operating at a high level' },
  { tier: 'master',       label: 'Master',       min: 200, max: 999, color: '#f59e0b', tagline: 'You\'ve hardcoded the transition' },
];

export function useUserLevel(): UserLevel {
  const streak    = useStore(s => s.streak);
  const tasks     = useStore(s => s.tasks);
  const currentDay = useStore(s => s.currentDay);

  const completed = tasks.filter(t => t.completed).length;
  // Score formula: each completed task = 2pts, each streak day = 3pts, each week = 5pts
  const score = completed * 2 + streak * 3 + Math.floor(currentDay / 7) * 5;

  const current = TIERS.find(t => score >= t.min && score < t.max) ?? TIERS[TIERS.length - 1];
  const progress = current.tier === 'master'
    ? 100
    : Math.round(((score - current.min) / (current.max - current.min)) * 100);

  return {
    tier:     current.tier,
    label:    current.label,
    score,
    nextAt:   current.max,
    progress: Math.min(progress, 100),
    color:    current.color,
    tagline:  current.tagline,
  };
}
