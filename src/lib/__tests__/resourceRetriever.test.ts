/**
 * Golden-output tests for getEmbeddableVideoFallback's live-verification loop.
 *
 * Confirms the "guaranteed embeddable" contract actually holds post-Phase-3: a
 * candidate that fails oEmbed verification (deleted/private video) is skipped in
 * favor of the next candidate, and if every candidate fails, the function falls
 * back to an honest search-link rather than returning a dead embed.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@lib/resourceLibrary', () => ({
  getResourcesForGoal: vi.fn(),
}));
vi.mock('@lib/youtube', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lib/youtube')>();
  return { ...actual, verifyYouTubeVideoLive: vi.fn() };
});

import { getResourcesForGoal } from '@lib/resourceLibrary';
import { verifyYouTubeVideoLive } from '@lib/youtube';
import { getEmbeddableVideoFallback } from '@lib/resourceRetriever';
import type { ResourceLink } from '@lib/resourceLibrary';

function videoLink(url: string, title = 'A Video'): ResourceLink {
  return { type: 'video', title, url, description: '', why: '' } as ResourceLink;
}

beforeEach(() => {
  vi.mocked(getResourcesForGoal).mockReset();
  vi.mocked(verifyYouTubeVideoLive).mockReset();
});

describe('getEmbeddableVideoFallback — live verification', () => {
  it('returns the first candidate that verifies live', async () => {
    vi.mocked(getResourcesForGoal).mockReturnValue([
      videoLink('https://www.youtube.com/watch?v=aaaaaaaaaa1', 'First'),
    ]);
    vi.mocked(verifyYouTubeVideoLive).mockResolvedValueOnce(true);

    const result = await getEmbeddableVideoFallback('learn guitar', 30);
    expect(result?.title).toBe('First');
  });

  it('skips a dead candidate and falls through to the next live one', async () => {
    vi.mocked(getResourcesForGoal).mockReturnValue([
      videoLink('https://www.youtube.com/watch?v=bbbbbbbbbb2', 'Dead Video'),
      videoLink('https://www.youtube.com/watch?v=cccccccccc3', 'Live Video'),
    ]);
    vi.mocked(verifyYouTubeVideoLive)
      .mockResolvedValueOnce(false) // Dead Video
      .mockResolvedValueOnce(true); // Live Video

    const result = await getEmbeddableVideoFallback('learn guitar', 30);
    expect(result?.title).toBe('Live Video');
  });

  it('falls back to an honest search link when every candidate fails verification', async () => {
    vi.mocked(getResourcesForGoal).mockReturnValue([
      videoLink('https://www.youtube.com/watch?v=dddddddddd4', 'Dead 1'),
      videoLink('https://www.youtube.com/watch?v=eeeeeeeeee5', 'Dead 2'),
    ]);
    vi.mocked(verifyYouTubeVideoLive).mockResolvedValue(false);

    const result = await getEmbeddableVideoFallback('learn guitar', 30);
    expect(result?.url).toContain('youtube.com/results?search_query=');
    expect(result?.title).not.toBe('Dead 1');
    expect(result?.title).not.toBe('Dead 2');
  });

  it('falls back to a search link when no candidates exist at all (unchanged behavior)', async () => {
    vi.mocked(getResourcesForGoal).mockReturnValue([]);
    const result = await getEmbeddableVideoFallback('an extremely niche goal', 30);
    expect(result?.url).toContain('youtube.com/results?search_query=');
    expect(verifyYouTubeVideoLive).not.toHaveBeenCalled();
  });

  it('caps verification at 3 candidates', async () => {
    vi.mocked(getResourcesForGoal).mockReturnValue([
      videoLink('https://www.youtube.com/watch?v=f1111111111', 'v1'),
      videoLink('https://www.youtube.com/watch?v=f2222222222', 'v2'),
      videoLink('https://www.youtube.com/watch?v=f3333333333', 'v3'),
      videoLink('https://www.youtube.com/watch?v=f4444444444', 'v4'),
    ]);
    vi.mocked(verifyYouTubeVideoLive).mockResolvedValue(false);

    await getEmbeddableVideoFallback('learn guitar', 30);
    expect(verifyYouTubeVideoLive).toHaveBeenCalledTimes(3);
  });

  it('checks candidates concurrently but still returns the first-priority live one, even if a lower-priority check resolves first', async () => {
    vi.mocked(getResourcesForGoal).mockReturnValue([
      videoLink('https://www.youtube.com/watch?v=g1111111111', 'Priority 1 (slow)'),
      videoLink('https://www.youtube.com/watch?v=g2222222222', 'Priority 2 (fast)'),
    ]);
    // Priority 2 resolves first in wall-clock time, but Priority 1 is still live —
    // original order must win, not first-to-resolve.
    vi.mocked(verifyYouTubeVideoLive).mockImplementation((url) => {
      if (url?.includes('g1111111111')) {
        return new Promise(resolve => setTimeout(() => resolve(true), 10));
      }
      return Promise.resolve(true);
    });

    const result = await getEmbeddableVideoFallback('learn guitar', 30);
    expect(result?.title).toBe('Priority 1 (slow)');
  });
});
