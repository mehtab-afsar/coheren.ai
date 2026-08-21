/**
 * A Google OAuth sign-in is a full-page redirect, which wipes React state.
 * Everything the value-first onboarding chat collects is already persisted
 * to the zustand store (roadmap, tasks, agentRoadmap, stoneProfile, currentGoal)
 * EXCEPT the raw Agent 1 goal analysis and stone-question answers, which only
 * exist as component state in ChatOnboarding. Stash just those two before
 * redirecting so App.tsx can finish the DB sync when the user lands back.
 */
import type { Agent1Output, StoneAnswer } from '@core/agents';

const KEY = 'coheren_pending_oauth_sync';

export interface PendingOAuthSync {
  goalAnalysis: Agent1Output;
  answers: StoneAnswer[];
}

export function stashPendingOAuthSync(data: PendingOAuthSync): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private browsing / quota exceeded — sync will just be skipped on return.
  }
}

export function readPendingOAuthSync(): PendingOAuthSync | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingOAuthSync) : null;
  } catch {
    return null;
  }
}

export function clearPendingOAuthSync(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
